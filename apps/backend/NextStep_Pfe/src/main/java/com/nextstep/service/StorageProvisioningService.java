package com.nextstep.service;

import com.nextstep.entity.*;
import com.nextstep.entity.Deployment;
import com.nextstep.entity.DeploymentStatus;
import com.nextstep.repository.DeploymentRepository;
import com.nextstep.repository.StorageResourceRepository;
import io.fabric8.kubernetes.api.model.*;
import io.fabric8.kubernetes.api.model.apps.*;
import io.fabric8.kubernetes.client.KubernetesClient;
import jakarta.persistence.EntityNotFoundException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Lazy;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import io.fabric8.openshift.api.model.RouteBuilder;
import io.fabric8.openshift.client.OpenShiftClient;
import software.amazon.awssdk.auth.credentials.AwsBasicCredentials;
import software.amazon.awssdk.auth.credentials.StaticCredentialsProvider;
import software.amazon.awssdk.services.s3.S3Client;
import software.amazon.awssdk.services.s3.model.CreateBucketRequest;

import java.net.URI;
import java.time.LocalDateTime;
import java.util.*;
import java.util.concurrent.TimeUnit;

@Service
@RequiredArgsConstructor
@Slf4j
public class StorageProvisioningService {

    private final KubernetesClient          k8sClient;
    private final NamespaceService          namespaceService;
    private final DeploymentService         deploymentService;
    private final DeploymentRepository      deploymentRepository;
    private final StorageResourceRepository storageResourceRepository;
    private final OpenShiftClient   osClient;        // ← pour Routes uniquement


    @Autowired @Lazy
    private StorageProvisioningService self;

    @Value("${openshift.storage.block-storage-class:nfs-storage}")
    private String blockStorageClass;

    @Value("${openshift.storage.file-storage-class:nfs-storage}")
    private String fileStorageClass;

    @Value("${openshift.storage.object-storage-class:nfs-storage}")
    private String objectStorageClass;
    @Value("${openshift.node.ip:10.9.21.22}")
    private String nodeIp;
    // ── Constantes MinIO ──────────────────────────────────────────────────────
    private static final String MINIO_IMAGE       = "quay.io/minio/minio:latest";
    private static final String MINIO_ROOT_USER   = "minioadmin";
    private static final String MINIO_ROOT_PASS   = "minioadmin123";
    private static final int    MINIO_PORT        = 9000;
    private static final int    MINIO_CONSOLE_PORT = 9001;

    // ═════════════════════════════════════════════════════════════════════════
    // POINT D'ENTRÉE ASYNC
    // ═════════════════════════════════════════════════════════════════════════

    @Async
    public void provisionAsync(Long deploymentId) {
        log.info("[STORAGE] Début provisionnement deploymentId={}", deploymentId);
        try {
            self.doProvisionInternal(deploymentId);
        } catch (IllegalStateException e) {
            log.warn("[STORAGE] Doublon ignoré deploymentId={}", deploymentId);
        } catch (Exception e) {
            log.error("[STORAGE] Erreur: {}", e.getMessage(), e);
            deploymentService.changeStatus(deploymentId, DeploymentStatus.ECHEC);
        }
    }

    // ═════════════════════════════════════════════════════════════════════════
    // ORCHESTRATION PRINCIPALE
    // ═════════════════════════════════════════════════════════════════════════

    @Transactional
    public void doProvisionInternal(Long deploymentId) throws InterruptedException {

        // 1. Lock pessimiste
        deploymentRepository.findByIdWithLock(deploymentId)
                .orElseThrow(() -> new EntityNotFoundException(
                        "Déploiement introuvable : " + deploymentId));

        // 2. Anti-doublon
        Optional<StorageResource> existing =
                storageResourceRepository.findByDeploymentId(deploymentId);

        if (existing.isPresent()) {
            StorageResourceStatus currentStatus = existing.get().getStatus();
            if (currentStatus == StorageResourceStatus.PROVISIONING
                    || currentStatus == StorageResourceStatus.READY) {
                log.info("[STORAGE] Doublon détecté status={} → abandon", currentStatus);
                throw new IllegalStateException("Déjà en cours");
            }
            storageResourceRepository.delete(existing.get());
            storageResourceRepository.flush();
        }

        // 3. Charger le deployment
        Deployment deployment = deploymentRepository
                .findByIdWithPlanAndService(deploymentId)
                .orElseThrow(() -> new EntityNotFoundException(
                        "Déploiement introuvable : " + deploymentId));

        ServiceCategory category =
                deployment.getPlan().getService().getCategory();

        String username = sanitize(
                deployment.getUser().getEmail().split("@")[0].replace(".", "-"));
        namespaceService.provisionIfAbsent(username);
        String namespace = namespaceService.getNamespaceForUser(username);

        // 4. Provisionner selon le type
        StorageResource resource = self.doProvision(deployment, category, namespace);

        // 5. Attendre que la ressource soit prête
        boolean ready = waitUntilReady(resource, namespace);

        if (ready) {
            // Pour MinIO : enrichir avec les credentials générés
            if (category == ServiceCategory.OBJECT_STORAGE
                    || category == ServiceCategory.STOCKAGE) {
                self.enrichMinioCredentials(resource, namespace);
                self.createMinioBucket(resource);  // ← ajouter ici

            }
            self.markReady(resource.getId(), deploymentId);
            log.info("[STORAGE] Provisionnement réussi deploymentId={}", deploymentId);
        } else {
            self.markFailed(resource.getId(), deploymentId);
            log.error("[STORAGE] Timeout deploymentId={}", deploymentId);
        }
    }

    // ═════════════════════════════════════════════════════════════════════════
    // DISPATCH PAR TYPE
    // ═════════════════════════════════════════════════════════════════════════

    @Transactional
    public StorageResource doProvision(Deployment deployment,
                                       ServiceCategory category,
                                       String namespace) {
        return switch (category) {
            case STOCKAGE, OBJECT_STORAGE -> provisionObjectStorage(deployment, namespace);
            case BLOCK_STORAGE            -> provisionBlockStorage(deployment, namespace);
            case FILE_STORAGE             -> provisionFileStorage(deployment, namespace);
            default -> throw new IllegalArgumentException(
                    "Catégorie non gérée : " + category);
        };
    }

    // ═════════════════════════════════════════════════════════════════════════
    // OBJECT STORAGE — MinIO standalone dans le namespace du tenant
    // ═════════════════════════════════════════════════════════════════════════

    private StorageResource provisionObjectStorage(Deployment deployment,
                                                   String namespace) {
        String name     = sanitize(deployment.getResourceName());
        String capacity = resolveCapacity(deployment);

        log.info("[STORAGE][MINIO] namespace={} name={} capacity={}",
                namespace, name, capacity);

        // ── 1. Créer les ressources OpenShift D'ABORD ────────────────────────
        try {
            createMinioSecret(name, namespace);
            createMinioPvc(name, namespace, capacity);
            createMinioDeployment(name, namespace);
            createMinioService(name, namespace);
            createMinioNodePortService(name, namespace);  // ← ajouter ici
            createMinioRoute(name, namespace);       // ← Route créée ici
            log.info("[STORAGE][MINIO] Ressources OpenShift créées pour {}", name);
        } catch (Exception e) {
            log.warn("[STORAGE][MINIO] OpenShift indisponible: {}", e.getMessage());
        }

        // ── 2. Lire l'endpoint APRÈS création de la Route ────────────────────
        String endpoint = getRouteHost(name, namespace);
        log.info("[STORAGE][MINIO] Endpoint résolu: {}", endpoint);

        // ── 3. Enregistrer en base avec l'endpoint réel ──────────────────────
        StorageResource sr = StorageResource.builder()
                .deployment(deployment)
                .resourceName("minio-" + name)
                .namespace(namespace)
                .storageType(ServiceCategory.OBJECT_STORAGE)
                .capacity(capacity)
                .storageClassName(objectStorageClass)
                .s3Endpoint(endpoint)               // ← URL externe ou fallback
                .bucketName(name)
                .accessKeyId(MINIO_ROOT_USER)
                .secretAccessKey(MINIO_ROOT_PASS)
                .status(StorageResourceStatus.PROVISIONING)
                .build();

        sr = storageResourceRepository.save(sr);
        log.info("[STORAGE][MINIO] StorageResource id={} sauvegardée", sr.getId());

        return sr;
    }
    // ── Secret MinIO (credentials) ────────────────────────────────────────────
    private void createMinioSecret(String name, String namespace) {
        Secret secret = new SecretBuilder()
                .withNewMetadata()
                .withName("minio-" + name + "-secret")
                .withNamespace(namespace)
                .addToLabels("portal/managed", "true")
                .addToLabels("portal/component", "minio")
                .endMetadata()
                .withType("Opaque")
                .addToStringData("MINIO_ROOT_USER",     MINIO_ROOT_USER)
                .addToStringData("MINIO_ROOT_PASSWORD", MINIO_ROOT_PASS)
                .build();

        k8sClient.secrets().inNamespace(namespace)
                .resource(secret).serverSideApply();
        log.debug("[STORAGE][MINIO] Secret créé: minio-{}-secret", name);
    }

    // ── PVC pour les données MinIO ────────────────────────────────────────────
    private void createMinioPvc(String name, String namespace, String capacity) {
        PersistentVolumeClaim pvc = new PersistentVolumeClaimBuilder()
                .withNewMetadata()
                .withName("minio-" + name + "-pvc")
                .withNamespace(namespace)
                .addToLabels("portal/managed", "true")
                .endMetadata()
                .withNewSpec()
                .withAccessModes("ReadWriteOnce")
                .withStorageClassName(objectStorageClass)
                .withNewResources()
                .addToRequests("storage", new Quantity(capacity))
                .endResources()
                .endSpec()
                .build();

        k8sClient.persistentVolumeClaims().inNamespace(namespace)
                .resource(pvc).serverSideApply();
        log.debug("[STORAGE][MINIO] PVC créé: minio-{}-pvc ({})", name, capacity);
    }

    // ── Deployment MinIO ──────────────────────────────────────────────────────
    private void createMinioDeployment(String name, String namespace) {
        Map<String, String> labels = Map.of(
                "app",              "minio-" + name,
                "portal/managed",   "true",
                "portal/component", "minio"
        );

        io.fabric8.kubernetes.api.model.apps.Deployment deployment =
                new DeploymentBuilder()
                        .withNewMetadata()
                        .withName("minio-" + name)
                        .withNamespace(namespace)
                        .withLabels(labels)
                        .endMetadata()
                        .withNewSpec()
                        .withReplicas(1)
                        .withNewSelector()
                        .withMatchLabels(Map.of("app", "minio-" + name))
                        .endSelector()
                        .withNewTemplate()
                        .withNewMetadata()
                        .withLabels(labels)
                        .endMetadata()
                        .withNewSpec()
                        // ── Fix permissions NFS ──────────────
                        .withNewSecurityContext()
                        .withFsGroup(1000L)
                        .withRunAsUser(1000L)
                        .withRunAsGroup(1000L)
                        .withRunAsNonRoot(true)
                        .endSecurityContext()
                        // ─────────────────────────────────────
                        .addNewContainer()
                        .withName("minio")
                        .withImage(MINIO_IMAGE)
                        .withArgs("server", "/data",
                                "--console-address", ":" + MINIO_CONSOLE_PORT)
                        .addNewEnv()
                        .withName("MINIO_ROOT_USER")
                        .withNewValueFrom()
                        .withNewSecretKeyRef()
                        .withName("minio-" + name + "-secret")
                        .withKey("MINIO_ROOT_USER")
                        .endSecretKeyRef()
                        .endValueFrom()
                        .endEnv()
                        .addNewEnv()
                        .withName("MINIO_ROOT_PASSWORD")
                        .withNewValueFrom()
                        .withNewSecretKeyRef()
                        .withName("minio-" + name + "-secret")
                        .withKey("MINIO_ROOT_PASSWORD")
                        .endSecretKeyRef()
                        .endValueFrom()
                        .endEnv()
                        .addNewPort()
                        .withContainerPort(MINIO_PORT)
                        .withName("s3")
                        .endPort()
                        .addNewPort()
                        .withContainerPort(MINIO_CONSOLE_PORT)
                        .withName("console")
                        .endPort()
                        .addNewVolumeMount()
                        .withName("data")
                        .withMountPath("/data")
                        .endVolumeMount()
                        .withNewReadinessProbe()
                        .withNewHttpGet()
                        .withPath("/minio/health/ready")
                        .withNewPort(MINIO_PORT)
                        .endHttpGet()
                        .withInitialDelaySeconds(10)
                        .withPeriodSeconds(5)
                        .endReadinessProbe()
                        .withNewLivenessProbe()
                        .withNewHttpGet()
                        .withPath("/minio/health/live")
                        .withNewPort(MINIO_PORT)
                        .endHttpGet()
                        .withInitialDelaySeconds(20)
                        .withPeriodSeconds(10)
                        .endLivenessProbe()
                        .withNewResources()
                        .addToRequests("cpu",    new Quantity("100m"))
                        .addToRequests("memory", new Quantity("256Mi"))
                        .addToLimits("cpu",      new Quantity("500m"))
                        .addToLimits("memory",   new Quantity("512Mi"))
                        .endResources()
                        .endContainer()
                        .addNewVolume()
                        .withName("data")
                        .withNewPersistentVolumeClaim()
                        .withClaimName("minio-" + name + "-pvc")
                        .endPersistentVolumeClaim()
                        .endVolume()
                        .endSpec()
                        .endTemplate()
                        .endSpec()
                        .build();

        k8sClient.apps().deployments().inNamespace(namespace)
                .resource(deployment).serverSideApply();
        log.debug("[STORAGE][MINIO] Deployment créé: minio-{}", name);
    }
    // ── Service MinIO (exposition interne) ────────────────────────────────────
    private void createMinioService(String name, String namespace) {
        io.fabric8.kubernetes.api.model.Service svc = new ServiceBuilder()
                .withNewMetadata()
                .withName("minio-" + name)
                .withNamespace(namespace)
                .addToLabels("portal/managed", "true")
                .endMetadata()
                .withNewSpec()
                .withSelector(Map.of("app", "minio-" + name))
                .addNewPort()
                .withName("s3")
                .withPort(MINIO_PORT)
                .withNewTargetPort(MINIO_PORT)
                .endPort()
                .addNewPort()
                .withName("console")
                .withPort(MINIO_CONSOLE_PORT)
                .withNewTargetPort(MINIO_CONSOLE_PORT)
                .endPort()
                .endSpec()
                .build();

        k8sClient.services().inNamespace(namespace)
                .resource(svc).serverSideApply();
        log.debug("[STORAGE][MINIO] Service créé: minio-{}", name);
    }

    // ═════════════════════════════════════════════════════════════════════════
    // BLOCK STORAGE — PVC ReadWriteOnce
    // ═════════════════════════════════════════════════════════════════════════

    /* ki ken juste service stockage par objet
    private StorageResource provisionBlockStorage(Deployment deployment,

                                                  String namespace) {
        String name     = sanitize(deployment.getResourceName());
        String capacity = resolveCapacity(deployment);

        StorageResource sr = StorageResource.builder()
                .deployment(deployment)
                .resourceName(name + "-block")
                .namespace(namespace)
                .storageType(ServiceCategory.BLOCK_STORAGE)
                .capacity(capacity)
                .storageClassName(blockStorageClass)
                .status(StorageResourceStatus.PROVISIONING)
                .build();

        sr = storageResourceRepository.save(sr);
        log.info("[STORAGE][BLOCK] StorageResource id={} sauvegardée", sr.getId());

        try {
            PersistentVolumeClaim pvc = new PersistentVolumeClaimBuilder()
                    .withNewMetadata()
                    .withName(name + "-block")
                    .withNamespace(namespace)
                    .addToLabels("portal/managed", "true")
                    .addToLabels("portal/deployment",
                            deployment.getId().toString())
                    .endMetadata()
                    .withNewSpec()
                    .withAccessModes("ReadWriteOnce")
                    .withStorageClassName(blockStorageClass)
                    .withNewResources()
                    .addToRequests("storage", new Quantity(capacity))
                    .endResources()
                    .endSpec()
                    .build();

            k8sClient.persistentVolumeClaims().inNamespace(namespace)
                    .resource(pvc).serverSideApply();
            log.info("[STORAGE][BLOCK] PVC créé: {}-block", name);

        } catch (Exception e) {
            log.warn("[STORAGE][BLOCK] OpenShift indisponible: {}", e.getMessage());
        }

        return sr;
    }*/
    private StorageResource provisionBlockStorage(Deployment deployment,
                                                  String namespace) {
        String name     = sanitize(deployment.getResourceName());
        String capacity = resolveCapacity(deployment);

        log.info("[STORAGE][BLOCK] namespace={} name={} capacity={}",
                namespace, name, capacity);

        // ── 1. Créer le PVC D'ABORD (si ça plante → exception visible) ──
        PersistentVolumeClaim pvc = new PersistentVolumeClaimBuilder()
                .withNewMetadata()
                .withName(name + "-block")
                .withNamespace(namespace)
                .addToLabels("portal/managed",    "true")
                .addToLabels("portal/deployment", deployment.getId().toString())
                .endMetadata()
                .withNewSpec()
                .withAccessModes("ReadWriteOnce")
                .withStorageClassName(blockStorageClass)
                .withNewResources()
                .addToRequests("storage", new Quantity(capacity))
                .endResources()
                .endSpec()
                .build();

        k8sClient.persistentVolumeClaims()
                .inNamespace(namespace)
                .resource(pvc)
                .serverSideApply();                          // ← exception remonte si erreur
        log.info("[STORAGE][BLOCK] PVC créé: {}-block ({})", name, capacity);

        // ── 2. Sauvegarder en base seulement si PVC OK ──
        StorageResource sr = StorageResource.builder()
                .deployment(deployment)
                .resourceName(name + "-block")
                .namespace(namespace)
                .storageType(ServiceCategory.BLOCK_STORAGE)
                .capacity(capacity)
                .storageClassName(blockStorageClass)
                .pvcName(name + "-block")                    // ← à ajouter dans l'entité
                .accessMode("ReadWriteOnce")                 // ← à ajouter dans l'entité
                .status(StorageResourceStatus.PROVISIONING)
                .build();

        sr = storageResourceRepository.save(sr);
        log.info("[STORAGE][BLOCK] StorageResource id={} sauvegardée", sr.getId());
        return sr;
    }
    // ═════════════════════════════════════════════════════════════════════════
    // FILE STORAGE — PVC ReadWriteMany (NFS supporte RWX nativement)
    // ═════════════════════════════════════════════════════════════════════════

    private StorageResource provisionFileStorage(Deployment deployment,
                                                 String namespace) {
        String name     = sanitize(deployment.getResourceName());
        String capacity = resolveCapacity(deployment);

        log.info("[STORAGE][FILE] namespace={} name={} capacity={}",
                namespace, name, capacity);

        // ── 1. Créer le PVC D'ABORD ──
        PersistentVolumeClaim pvc = new PersistentVolumeClaimBuilder()
                .withNewMetadata()
                .withName(name + "-file")
                .withNamespace(namespace)
                .addToLabels("portal/managed",    "true")
                .addToLabels("portal/deployment", deployment.getId().toString())
                .endMetadata()
                .withNewSpec()
                .withAccessModes("ReadWriteMany")            // ← RWX pour NFS
                .withStorageClassName(fileStorageClass)
                .withNewResources()
                .addToRequests("storage", new Quantity(capacity))
                .endResources()
                .endSpec()
                .build();

        k8sClient.persistentVolumeClaims()
                .inNamespace(namespace)
                .resource(pvc)
                .serverSideApply();
        log.info("[STORAGE][FILE] PVC créé: {}-file RWX ({})", name, capacity);

        // ── 2. Sauvegarder en base ──
        StorageResource sr = StorageResource.builder()
                .deployment(deployment)
                .resourceName(name + "-file")
                .namespace(namespace)
                .storageType(ServiceCategory.FILE_STORAGE)
                .capacity(capacity)
                .storageClassName(fileStorageClass)
                .pvcName(name + "-file")                     // ← à ajouter dans l'entité
                .accessMode("ReadWriteMany")                 // ← à ajouter dans l'entité
                .status(StorageResourceStatus.PROVISIONING)
                .build();

        sr = storageResourceRepository.save(sr);
        log.info("[STORAGE][FILE] StorageResource id={} sauvegardée", sr.getId());
        return sr;
    }

    // ═════════════════════════════════════════════════════════════════════════
    // POLLING — Attendre que la ressource soit prête
    // ═════════════════════════════════════════════════════════════════════════

    private boolean waitUntilReady(StorageResource resource, String namespace)
            throws InterruptedException {
        int maxAttempts = 40; // 40 × 5s = 3min20
        int attempt     = 0;

        while (attempt < maxAttempts) {
            TimeUnit.SECONDS.sleep(5);
            attempt++;

            boolean ready = switch (resource.getStorageType()) {
                // MinIO : vérifier que le Deployment est Available
                case OBJECT_STORAGE, STOCKAGE ->
                        isMinioReady(resource.getResourceName(), namespace);
                // Block/File : vérifier que le PVC est Bound
                case BLOCK_STORAGE ->
                        isPvcBound(resource.getResourceName(), namespace);
                case FILE_STORAGE ->
                        isPvcBound(resource.getResourceName(), namespace);
                default -> false;
            };

            log.debug("[STORAGE] Polling {}/{} resource={} ready={}",
                    attempt, maxAttempts, resource.getResourceName(), ready);

            if (ready) return true;
        }
        return false;
    }

    // ── Vérifier que le Deployment MinIO est Available ────────────────────────
    private boolean isMinioReady(String resourceName, String namespace) {
        try {
            // Lire le Deployment
            var dep = k8sClient.apps().deployments()
                    .inNamespace(namespace)
                    .withName(resourceName)
                    .get();

            if (dep == null || dep.getStatus() == null) return false;

            Integer available = dep.getStatus().getAvailableReplicas();
            Integer desired   = dep.getSpec().getReplicas();
            return available != null && available >= desired;

        } catch (Exception e) {
            log.warn("[STORAGE][MINIO] Deployment inaccessible, fallback Pod: {}", e.getMessage());

            // ── Fallback — lire les pods directement ──────────────────────────
            try {
                var pods = k8sClient.pods()
                        .inNamespace(namespace)
                        .withLabel("app", resourceName)   // ← label "app=minio-vb"
                        .list();

                if (pods == null || pods.getItems().isEmpty()) return false;

                return pods.getItems().stream().anyMatch(pod -> {
                    if (pod.getStatus() == null) return false;
                    // Pod Running + Ready
                    return "Running".equals(pod.getStatus().getPhase())
                            && pod.getStatus().getContainerStatuses() != null
                            && pod.getStatus().getContainerStatuses().stream()
                            .allMatch(cs -> Boolean.TRUE.equals(cs.getReady()));
                });

            } catch (Exception e2) {
                log.warn("[STORAGE][MINIO] Fallback Pod aussi échoué: {}", e2.getMessage());
                return false;
            }
        }
    }

    // ── Vérifier que le PVC est Bound ────────────────────────────────────────
    private boolean isPvcBound(String name, String namespace) {
        try {
            PersistentVolumeClaim pvc = k8sClient
                    .persistentVolumeClaims()
                    .inNamespace(namespace).withName(name).get();
            if (pvc == null || pvc.getStatus() == null) return false;
            return "Bound".equalsIgnoreCase(pvc.getStatus().getPhase());
        } catch (Exception e) {
            log.warn("[STORAGE][PVC] Erreur polling {}: {}", name, e.getMessage());
            return false;
        }
    }

    // ═════════════════════════════════════════════════════════════════════════
    // CREDENTIALS MinIO — déjà connus à la création, pas besoin de les lire
    // ═════════════════════════════════════════════════════════════════════════

    @Transactional
    public void enrichMinioCredentials(StorageResource resource, String namespace) {
        // Les credentials MinIO sont définis statiquement à la création.
        // On peut optionnellement les relire depuis le Secret pour confirmer.
        try {
            Secret secret = k8sClient.secrets()
                    .inNamespace(namespace)
                    .withName("minio-" + resource.getBucketName() + "-secret")
                    .get();

            if (secret != null && secret.getData() != null) {
                resource.setAccessKeyId(
                        decodeBase64(secret.getData().get("MINIO_ROOT_USER")));
                resource.setSecretAccessKey(
                        decodeBase64(secret.getData().get("MINIO_ROOT_PASSWORD")));
            }
            storageResourceRepository.save(resource);
            log.info("[STORAGE][MINIO] Credentials confirmés pour bucket={}",
                    resource.getBucketName());
        } catch (Exception e) {
            log.warn("[STORAGE][MINIO] Credentials déjà en base, skip: {}", e.getMessage());
        }
    }

    // ═════════════════════════════════════════════════════════════════════════
    // MARK READY / FAILED
    // ═════════════════════════════════════════════════════════════════════════

    @Transactional
    public void markReady(Long storageResourceId, Long deploymentId) {
        storageResourceRepository.findById(storageResourceId).ifPresent(sr -> {
            sr.setStatus(StorageResourceStatus.READY);
            sr.setReadyAt(LocalDateTime.now());
            storageResourceRepository.save(sr);
        });
        deploymentService.markRunning(deploymentId);
    }

    @Transactional
    public void markFailed(Long storageResourceId, Long deploymentId) {
        storageResourceRepository.findById(storageResourceId).ifPresent(sr -> {
            sr.setStatus(StorageResourceStatus.FAILED);
            storageResourceRepository.save(sr);
        });
        deploymentService.changeStatus(deploymentId, DeploymentStatus.ECHEC);
    }

    // ═════════════════════════════════════════════════════════════════════════
    // SUPPRESSION
    // ═════════════════════════════════════════════════════════════════════════

    @Transactional
    public void deleteStorageResource(Long deploymentId) {
        storageResourceRepository.findByDeploymentId(deploymentId).ifPresentOrElse(sr -> {
            String name      = sr.getResourceName();
            String namespace = sr.getNamespace();
            String bucket    = sr.getBucketName();

            log.info("[STORAGE] Suppression type={} name={} ns={}",
                    sr.getStorageType(), name, namespace);

            try {
                switch (sr.getStorageType()) {
                    case OBJECT_STORAGE, STOCKAGE -> {
                        // Supprimer Deployment + Service + PVC + Secret MinIO
                        k8sClient.apps().deployments()
                                .inNamespace(namespace).withName(name).delete();
                        k8sClient.services()
                                .inNamespace(namespace).withName(name).delete();
                        k8sClient.services()                                     // ← NodePort manquait
                                .inNamespace(namespace).withName(name + "-nodeport").delete();
                        k8sClient.persistentVolumeClaims()
                                .inNamespace(namespace)
                                .withName(name + "-pvc").delete();
                        k8sClient.secrets()
                                .inNamespace(namespace)
                                .withName(name + "-secret").delete();
                        osClient.routes()                                        // ← Route manquait
                                .inNamespace(namespace).withName(name).delete();
                        log.info("[STORAGE][MINIO] Toutes ressources supprimées pour {}", name);

                    }
                    case BLOCK_STORAGE, FILE_STORAGE ->
                            k8sClient.persistentVolumeClaims()
                                    .inNamespace(namespace).withName(name).delete();
                    default ->
                            log.warn("[STORAGE] Type non géré: {}", sr.getStorageType());
                }
            } catch (Exception e) {
                log.warn("[STORAGE] Erreur suppression OpenShift: {}", e.getMessage());
            }

            sr.setStatus(StorageResourceStatus.DELETED);
            storageResourceRepository.save(sr);
            deploymentService.changeStatus(deploymentId, DeploymentStatus.SUPPRIME);

        }, () -> {
            log.warn("[STORAGE] Aucune StorageResource pour deploymentId={}", deploymentId);
            deploymentService.changeStatus(deploymentId, DeploymentStatus.SUPPRIME);
        });
    }

    // ═════════════════════════════════════════════════════════════════════════
    // HELPERS
    // ═════════════════════════════════════════════════════════════════════════

    private String resolveCapacity(Deployment deployment) {
        int base = deployment.getPlan().getStorageGb() != null
                ? deployment.getPlan().getStorageGb() : 50;
        int add  = deployment.getAdditionalStorageGb() != null
                ? deployment.getAdditionalStorageGb() : 0;
        return (base + add) + "Gi";
    }

    private String sanitize(String name) {
        return name.toLowerCase()
                .replaceAll("[^a-z0-9-]", "-")
                .replaceAll("-+", "-")
                .replaceAll("^-|-$", "");
    }

    private String decodeBase64(String encoded) {
        if (encoded == null) return null;
        return new String(java.util.Base64.getDecoder().decode(encoded));
    }
    private void createMinioRoute(String name, String namespace) {
        try {
            var route = new io.fabric8.openshift.api.model.RouteBuilder()
                    .withNewMetadata()
                    .withName("minio-" + name)
                    .withNamespace(namespace)
                    .addToLabels("portal/managed", "true")
                    .endMetadata()
                    .withNewSpec()
                    .withNewTo()
                    .withKind("Service")
                    .withName("minio-" + name)
                    .endTo()
                    .withNewPort()
                    .withNewTargetPort(MINIO_PORT)
                    .endPort()
                    .withNewTls()
                    .withTermination("edge")
                    .withInsecureEdgeTerminationPolicy("Redirect")
                    .endTls()
                    .endSpec()
                    .build();

            osClient.routes()           // ← osClient directement, plus de cast
                    .inNamespace(namespace)
                    .resource(route)
                    .serverSideApply();

            log.info("[STORAGE][MINIO] Route créée: minio-{}", name);

        } catch (Exception e) {
            log.warn("[STORAGE][MINIO] Erreur création Route: {}", e.getMessage());
        }
    }

    private String getRouteHost(String name, String namespace) {
        try {
            var route = osClient.routes()   // ← osClient directement, plus de cast
                    .inNamespace(namespace)
                    .withName("minio-" + name)
                    .get();

            if (route != null
                    && route.getStatus() != null
                    && route.getStatus().getIngress() != null
                    && !route.getStatus().getIngress().isEmpty()) {
                String host = route.getStatus().getIngress().get(0).getHost();
                return "https://" + host;
            }
        } catch (Exception e) {
            log.warn("[STORAGE][MINIO] Impossible de lire la Route: {}", e.getMessage());
        }
        return "http://minio-" + name + "." + namespace
                + ".svc.cluster.local:" + MINIO_PORT;
    }
    @Transactional
    public void createMinioBucket(StorageResource resource) {
        try {
            String endpoint = resolveMinioNodePortEndpoint(resource);

            S3Client s3 = S3Client.builder()
                    .endpointOverride(URI.create(endpoint))
                    .credentialsProvider(StaticCredentialsProvider.create(
                            AwsBasicCredentials.create(
                                    resource.getAccessKeyId(),
                                    resource.getSecretAccessKey()
                            )
                    ))
                    .region(software.amazon.awssdk.regions.Region.US_EAST_1)                    .forcePathStyle(true)
                    .build();

            String bucket = resource.getBucketName();

            // Vérifier si le bucket existe déjà
            boolean exists = s3.listBuckets().buckets().stream()
                    .anyMatch(b -> b.name().equals(bucket));

            if (!exists) {
                s3.createBucket(CreateBucketRequest.builder()
                        .bucket(bucket)
                        .build());
                log.info("[STORAGE][MINIO] Bucket créé: {}", bucket);
            }
        } catch (Exception e) {
            log.error("[STORAGE][MINIO] Erreur création bucket: {}", e.getMessage());
        }
    }

    private String resolveMinioNodePortEndpoint(StorageResource resource) {
        try {
            String[] suffixes = {"-nodeport", "-np"};
            for (String suffix : suffixes) {
                String svcName = resource.getResourceName() + suffix;
                var svc = k8sClient.services()
                        .inNamespace(resource.getNamespace())
                        .withName(svcName)
                        .get();
                if (svc != null) {
                    Integer nodePort = svc.getSpec().getPorts().stream()
                            .filter(p -> p.getNodePort() != null)
                            .findFirst()
                            .map(p -> p.getNodePort())
                            .orElse(null);
                    if (nodePort != null) {
                        return "http://" + nodeIp + ":" + nodePort;
                    }
                }
            }
        } catch (Exception e) {
            log.warn("[STORAGE][MINIO] NodePort non trouvé: {}", e.getMessage());
        }
        return resource.getS3Endpoint();
    }
    private void createMinioNodePortService(String name, String namespace) {
        io.fabric8.kubernetes.api.model.Service svc = new ServiceBuilder()
                .withNewMetadata()
                .withName("minio-" + name + "-nodeport")
                .withNamespace(namespace)
                .addToLabels("portal/managed", "true")
                .endMetadata()
                .withNewSpec()
                .withType("NodePort")
                .withSelector(Map.of("app", "minio-" + name))
                .addNewPort()
                .withName("s3")
                .withPort(MINIO_PORT)
                .withNewTargetPort(MINIO_PORT)
                .endPort()
                .endSpec()
                .build();

        k8sClient.services().inNamespace(namespace)
                .resource(svc).serverSideApply();
        log.info("[STORAGE][MINIO] NodePort créé: minio-{}-nodeport", name);
    }
}