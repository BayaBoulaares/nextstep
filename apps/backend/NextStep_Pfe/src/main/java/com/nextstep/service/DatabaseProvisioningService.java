package com.nextstep.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.nextstep.entity.*;
import com.nextstep.repository.DatabaseResourceRepository;
import com.nextstep.repository.DeploymentRepository;
import io.fabric8.kubernetes.api.model.ObjectMetaBuilder;
import io.fabric8.kubernetes.client.KubernetesClient;
import io.fabric8.kubernetes.client.dsl.base.CustomResourceDefinitionContext;
import jakarta.persistence.EntityNotFoundException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.Base64;
import java.util.Map;

@Service
@RequiredArgsConstructor
@Slf4j
public class DatabaseProvisioningService {

    private final KubernetesClient        k8sClient;
    private final DatabaseResourceRepository dbResourceRepository;
    private final DeploymentRepository    deploymentRepository;
    private final DeploymentService       deploymentService;
    private final NamespaceService        namespaceService;

    @Value("${openshift.storage-class:nfs-storage}")
    private String defaultStorageClass;
    @Value("${openshift.node-ip}")
    private String nodeIp;

    // ── CRD context CloudNativePG ──────────────────────────────────────────
    private static final CustomResourceDefinitionContext CNPG_CLUSTER_CTX =
            new CustomResourceDefinitionContext.Builder()
                    .withGroup("postgresql.cnpg.io")
                    .withVersion("v1")
                    .withScope("Namespaced")
                    .withPlural("clusters")
                    .build();

    // ── Provisionnement asynchrone ─────────────────────────────────────────

    @Async
    public void provisionAsync(Long deploymentId) {
        // ✅ Empêcher le double appel concurrent
        if (inProgress.putIfAbsent(deploymentId, Boolean.TRUE) != null) {
            log.warn("[DB] Provisionnement déjà en cours pour deployment {} — ignoré", deploymentId);
            return;
        }
        try {
            provision(deploymentId);
        } catch (Exception e) {
            log.error("[DB] Provisionnement échoué pour deployment {}: {}",
                    deploymentId, e.getMessage(), e);
            markFailed(deploymentId, e.getMessage());
        } finally {
            inProgress.remove(deploymentId);
        }
    }

    @Transactional
    public void provision(Long deploymentId) {
        Deployment deployment = deploymentRepository.findByIdWithUserAndPlan(deploymentId)
                .orElseThrow(() -> new EntityNotFoundException(
                        "Déploiement introuvable : " + deploymentId));

        Plan   plan     = deployment.getPlan();
        String email    = deployment.getUser().getEmail();
        String username = email.split("@")[0]
                .toLowerCase()
                .replaceAll("[^a-z0-9-]", "-");

        String namespace = namespaceService.getNamespaceForUser(username);
        namespaceService.provisionIfAbsent(username);

        int storageGb = plan.getStorageGb() != null ? plan.getStorageGb() : 10;
        if (deployment.getAdditionalStorageGb() != null) {
            storageGb += deployment.getAdditionalStorageGb();
        }
        int instances = resolveInstances(plan);

        // ✅ UPSERT — chercher AVANT d'insérer
        DatabaseResource dbResource = dbResourceRepository
                .findByDeploymentId(deploymentId)
                .orElse(null);

        final String clusterName;

        if (dbResource == null) {
            clusterName = "db-" + sanitize(deployment.getResourceName()) + "-" + deploymentId;
            dbResource = DatabaseResource.builder()
                    .deployment(deployment)
                    .clusterName(clusterName)
                    .namespace(namespace)
                    .instances(instances)
                    .storageGb(storageGb)
                    .storageClassName(defaultStorageClass)
                    .credentialsSecret(clusterName + "-app")
                    .hostRw(clusterName + "-rw." + namespace + ".svc.cluster.local")
                    .hostRo(clusterName + "-ro." + namespace + ".svc.cluster.local")
                    .status(DatabaseStatus.PROVISIONING)
                    .build();
            log.info("[DB] Nouvelle DatabaseResource pour deployment {}", deploymentId);
        } else {
            clusterName = dbResource.getClusterName();
            dbResource.setStatus(DatabaseStatus.PROVISIONING);
            dbResource.setErrorMessage(null);
            dbResource.setReadyAt(null);
            log.info("[DB] Retry — cluster {} pour deployment {}", clusterName, deploymentId);
        }

        dbResourceRepository.save(dbResource);
        createCnpgCluster(clusterName, namespace, instances, storageGb);
        createExternalNodePortService(clusterName, namespace); // ← ajouter entre les deux
        waitForClusterReady(clusterName, namespace, dbResource);
    }



    // ── Création du Cluster CNPG via l'API custom resource ────────────────

    private void createCnpgCluster(String clusterName, String namespace,
                                   int instances, int storageGb) {
        Map<String, Object> cluster = Map.of(
                "apiVersion", "postgresql.cnpg.io/v1",
                "kind",       "Cluster",
                "metadata",   Map.of(
                        "name",      clusterName,
                        "namespace", namespace,
                        "labels",    Map.of("portal/managed", "true")
                ),
                "spec", Map.of(
                        "instances",  instances,
                        "storage",    Map.of(
                                "size",         storageGb + "Gi",
                                "storageClass", defaultStorageClass
                        ),
                        "postgresql", Map.of(
                                "parameters", Map.of(
                                        "max_connections", "100",
                                        "shared_buffers",  "128MB"
                                )
                        ),
                        "resources",  Map.of(
                                "requests", Map.of("memory", "256Mi", "cpu", "250m"),
                                "limits",   Map.of("memory", "512Mi", "cpu", "500m")
                        ),
                        "enableSuperuserAccess", false
                )
        );

        k8sClient.genericKubernetesResources(CNPG_CLUSTER_CTX)
                .inNamespace(namespace)
                .resource(new io.fabric8.kubernetes.api.model.GenericKubernetesResourceBuilder()
                        .withMetadata(new ObjectMetaBuilder()
                                .withName(clusterName)
                                .withNamespace(namespace)
                                .build())
                        .withAdditionalProperties(cluster)
                        .build())
                .createOrReplace();

        log.info("[DB] Cluster CNPG {} créé dans {}", clusterName, namespace);
    }

    // ── Attendre que le cluster soit Ready (polling) ───────────────────────

    private void waitForClusterReady(String clusterName, String namespace,
                                     DatabaseResource dbResource) {
        int maxAttempts = 60;   // 5 minutes (60 × 5s)
        int attempt     = 0;

        while (attempt < maxAttempts) {
            try {
                Thread.sleep(5_000);

                var raw = k8sClient.genericKubernetesResources(CNPG_CLUSTER_CTX)
                        .inNamespace(namespace)
                        .withName(clusterName)
                        .get();

                if (raw == null) { attempt++; continue; }

                @SuppressWarnings("unchecked")
                Map<String, Object> status =
                        (Map<String, Object>) raw.getAdditionalProperties()
                                .getOrDefault("status", Map.of());

                String phase         = (String) status.getOrDefault("phase", "");
                int    readyInstances = toInt(status.get("readyInstances"));
                int    total          = toInt(status.get("instances"));

                log.info("[DB] {} — phase: {}, ready: {}/{}", clusterName, phase, readyInstances, total);

                if ("Cluster in healthy state".equals(phase)
                        && readyInstances > 0 && readyInstances == total) {
                    markReady(dbResource, namespace);
                    return;
                }

            } catch (InterruptedException e) {
                Thread.currentThread().interrupt();
                throw new RuntimeException("Provisionnement interrompu", e);
            } catch (Exception e) {
                log.warn("[DB] Polling erreur attempt {}: {}", attempt, e.getMessage());
            }
            attempt++;
        }

        throw new RuntimeException("Timeout : cluster " + clusterName + " non prêt après 5 minutes");
    }

    // ── Marquer comme READY ────────────────────────────────────────────────

    @Transactional
    protected void markReady(DatabaseResource dbResource, String namespace) {
        var svc = k8sClient.services()
                .inNamespace(namespace)
                .withName(dbResource.getClusterName() + "-external")
                .get();

        if (svc != null) {
            Integer nodePort = svc.getSpec().getPorts().get(0).getNodePort();
            dbResource.setExternalPort(nodePort); // ← champ à ajouter dans DatabaseResource
            dbResource.setExternalHost(nodeIp); // ← nouveau champ

            log.info("[DB] NodePort alloué: {}", nodePort);
        }
        // Récupérer le mot de passe depuis le secret Kubernetes
        String password = extractPasswordFromSecret(dbResource.getCredentialsSecret(), namespace);
        dbResource.setDbPassword(password);
        dbResource.setStatus(DatabaseStatus.READY);
        dbResource.setReadyAt(LocalDateTime.now());
        dbResourceRepository.save(dbResource);

        // Marquer le déploiement EN_LIGNE
        deploymentService.changeStatus(dbResource.getDeployment().getId(), DeploymentStatus.EN_LIGNE);
        log.info("[DB] Cluster {} READY", dbResource.getClusterName());
    }

    @Transactional
    protected void markFailed(Long deploymentId, String message) {
        dbResourceRepository.findByDeploymentId(deploymentId).ifPresent(r -> {
            String shortMessage = message != null && message.length() > 500
                    ? message.substring(0, 500)
                    : message;
            r.setStatus(DatabaseStatus.FAILED);
            r.setErrorMessage(shortMessage);
            dbResourceRepository.save(r);
        });
        deploymentService.changeStatus(deploymentId, DeploymentStatus.ECHEC);
    }

    // ── Suppression ────────────────────────────────────────────────────────

    @Transactional
    public void deleteDatabaseResource(Long deploymentId) {
        DatabaseResource dbResource = dbResourceRepository.findByDeploymentId(deploymentId)
                .orElseThrow(() -> new EntityNotFoundException(
                        "DatabaseResource introuvable pour deployment " + deploymentId));

        dbResource.setStatus(DatabaseStatus.DELETING);
        dbResourceRepository.save(dbResource);

        try {
            k8sClient.genericKubernetesResources(CNPG_CLUSTER_CTX)
                    .inNamespace(dbResource.getNamespace())
                    .withName(dbResource.getClusterName())
                    .delete();

            log.info("[DB] Cluster CNPG {} supprimé", dbResource.getClusterName());
        } catch (Exception e) {
            log.error("[DB] Erreur suppression cluster {}: {}", dbResource.getClusterName(), e.getMessage());
        }

        dbResource.setStatus(DatabaseStatus.DELETED);
        dbResourceRepository.save(dbResource);
        deploymentService.changeStatus(deploymentId, DeploymentStatus.ARRETE);
    }

    // ── Helpers ────────────────────────────────────────────────────────────

    private String extractPasswordFromSecret(String secretName, String namespace) {
        try {
            var secret = k8sClient.secrets()
                    .inNamespace(namespace)
                    .withName(secretName)
                    .get();
            if (secret == null || secret.getData() == null) return null;
            String encoded = secret.getData().get("password");
            if (encoded == null) return null;
            return new String(Base64.getDecoder().decode(encoded));
        } catch (Exception e) {
            log.warn("[DB] Impossible de lire le secret {}: {}", secretName, e.getMessage());
            return null;
        }
    }

    private int resolveInstances(Plan plan) {
        // Logique métier : nombre d'instances selon le tier du plan
        if (plan.getTier() == null) return 1;
        return switch (plan.getTier().name()) {
            case "S", "SMALL"  -> 1;
            case "M", "MEDIUM" -> 3;
            case "L", "LARGE",
                 "XL"          -> 3;
            default             -> 1;
        };
    }

    private String sanitize(String name) {
        return name.toLowerCase()
                .replaceAll("[^a-z0-9-]", "-")
                .replaceAll("-+", "-")
                .replaceAll("^-|-$", "");
    }

    private int toInt(Object val) {
        if (val instanceof Number n) return n.intValue();
        return 0;
    }
    // 1. Ajouter un verrou par deploymentId pour éviter les appels concurrents
    private final java.util.concurrent.ConcurrentHashMap<Long, Boolean> inProgress =
            new java.util.concurrent.ConcurrentHashMap<>();
    private void createExternalNodePortService(String clusterName, String namespace) {
        var nodePortSvc = new io.fabric8.kubernetes.api.model.ServiceBuilder()
                .withNewMetadata()
                .withName(clusterName + "-external")
                .withNamespace(namespace)
                .addToLabels("portal/managed", "true")
                .endMetadata()
                .withNewSpec()
                .withType("NodePort")
                .addNewPort()
                .withName("postgres")
                .withPort(5432)
                .withNewTargetPort(5432)
                .endPort()
                .withSelector(Map.of("cnpg.io/cluster", clusterName))
                .endSpec()
                .build();

        k8sClient.services()
                .inNamespace(namespace)
                .resource(nodePortSvc)
                .createOrReplace();

        log.info("[DB] NodePort externe créé pour cluster {}", clusterName);
    }
}
