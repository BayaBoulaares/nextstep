package com.nextstep.service;

import com.nextstep.dto.KnativeServiceRequest;
import com.nextstep.dto.KnativeServiceResponse;
import com.nextstep.entity.KnativeService;
import com.nextstep.entity.KnativeStatus;
import com.nextstep.entity.KnativeType;
import com.nextstep.repository.KnativeServiceRepository;
import io.fabric8.kubernetes.api.model.GenericKubernetesResource;
import io.fabric8.kubernetes.api.model.GenericKubernetesResourceBuilder;
import io.fabric8.kubernetes.client.KubernetesClient;
import io.fabric8.kubernetes.client.dsl.base.ResourceDefinitionContext;
import jakarta.persistence.EntityNotFoundException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Service
@RequiredArgsConstructor
@Transactional
@Slf4j
public class KnativeManagementService {

    private final KnativeServiceRepository knativeRepository;
    private final KubernetesClient         k8sClient;
    private final NamespaceService         namespaceService;

    // ── ResourceDefinitionContext pour les CRDs Knative ──────────────────────

    // Knative Serving : serving.knative.dev/v1 Kind=Service
    private static final ResourceDefinitionContext KNATIVE_SERVING_CTX =
            new ResourceDefinitionContext.Builder()
                    .withGroup("serving.knative.dev")
                    .withVersion("v1")
                    .withKind("Service")
                    .withPlural("services")
                    .withNamespaced(true)
                    .build();

    // Knative Eventing : sources.knative.dev/v1 Kind=PingSource
    private static final ResourceDefinitionContext PING_SOURCE_CTX =
            new ResourceDefinitionContext.Builder()
                    .withGroup("sources.knative.dev")
                    .withVersion("v1")
                    .withKind("PingSource")
                    .withPlural("pingsources")
                    .withNamespaced(true)
                    .build();

    // Knative Eventing : sources.knative.dev/v1beta1 Kind=KafkaSource
    private static final ResourceDefinitionContext KAFKA_SOURCE_CTX =
            new ResourceDefinitionContext.Builder()
                    .withGroup("sources.knative.dev")
                    .withVersion("v1beta1")
                    .withKind("KafkaSource")
                    .withPlural("kafkasources")
                    .withNamespaced(true)
                    .build();

    // ─────────────────────────────────────────────────────────────────────────
    //  LISTER
    // ─────────────────────────────────────────────────────────────────────────

    @Transactional(readOnly = true)
    public List<KnativeServiceResponse> getByOwner(String keycloakId) {
        return knativeRepository.findByOwnerKeycloakId(keycloakId)
                .stream().map(this::toResponse).toList();
    }

    @Transactional(readOnly = true)
    public List<KnativeServiceResponse> getByOwnerAndType(String keycloakId, KnativeType type) {
        return knativeRepository.findByOwnerKeycloakIdAndKnativeType(keycloakId, type)
                .stream().map(this::toResponse).toList();
    }

    @Transactional(readOnly = true)
    public KnativeServiceResponse getById(Long id, String keycloakId) {
        KnativeService svc = findOrThrow(id);
        checkOwnership(svc, keycloakId);
        return toResponse(svc);
    }

    // ─────────────────────────────────────────────────────────────────────────
    //  CRÉER — routing SERVING vs FUNCTION
    // ─────────────────────────────────────────────────────────────────────────

    public KnativeServiceResponse create(KnativeServiceRequest request, String keycloakId) {

        if (knativeRepository.existsByNameAndOwnerKeycloakId(request.getName(), keycloakId)) {
            throw new IllegalArgumentException(
                    "Un service Knative avec ce nom existe déjà : " + request.getName());
        }

        // S'assurer que le namespace du tenant existe
        String username  = keycloakId.substring(0, 8).toLowerCase();
        String namespace = namespaceService.getNamespaceForUser(username);
        namespaceService.provisionIfAbsent(username);

        // Valeurs par défaut
        int    minScale    = request.getMinScale()    != null ? request.getMinScale()    : 0;
        int    maxScale    = request.getMaxScale()    != null ? request.getMaxScale()    : 10;
        String cpuLimit    = request.getCpuLimit()    != null ? request.getCpuLimit()    : "500m";
        String memoryLimit = request.getMemoryLimit() != null ? request.getMemoryLimit() : "256Mi";

        KnativeService entity = KnativeService.builder()
                .name(request.getName())
                .knativeType(request.getKnativeType())
                .status(KnativeStatus.DEPLOYING)
                .containerImage(request.getContainerImage())
                .openshiftNamespace(namespace)
                .minScale(minScale)
                .maxScale(maxScale)
                .cpuLimit(cpuLimit)
                .memoryLimit(memoryLimit)
                .eventSource(request.getEventSource())
                .kafkaTopic(request.getKafkaTopic())
                .cronSchedule(request.getCronSchedule())
                .ownerKeycloakId(keycloakId)
                .build();

        entity = knativeRepository.save(entity);

        try {
            if (request.getKnativeType() == KnativeType.SERVING) {
                deployKnativeServing(entity);
            } else {
                deployKnativeFunction(entity);
            }
            entity.setStatus(KnativeStatus.ACTIVE);
        } catch (Exception e) {
            log.error("[KNATIVE] Déploiement échoué pour {} : {}", entity.getName(), e.getMessage());
            entity.setStatus(KnativeStatus.ERROR);
        }

        return toResponse(knativeRepository.save(entity));
    }

    // ─────────────────────────────────────────────────────────────────────────
    //  SUPPRIMER
    // ─────────────────────────────────────────────────────────────────────────

    public void delete(Long id, String keycloakId) {
        KnativeService svc = findOrThrow(id);
        checkOwnership(svc, keycloakId);

        svc.setStatus(KnativeStatus.DELETING);
        knativeRepository.save(svc);

        try {
            String namespace = svc.getOpenshiftNamespace();
            String name      = svc.getName();

            if (svc.getKnativeType() == KnativeType.SERVING) {
                k8sClient.genericKubernetesResources(KNATIVE_SERVING_CTX)
                        .inNamespace(namespace)
                        .withName(name)
                        .delete();
                log.info("[KNATIVE-SERVING] Service {} supprimé dans {}", name, namespace);

            } else {
                // Supprimer la Knative Service + la source d'événement
                k8sClient.genericKubernetesResources(KNATIVE_SERVING_CTX)
                        .inNamespace(namespace)
                        .withName(name)
                        .delete();

                deleteEventSource(svc);
                log.info("[KNATIVE-FUNCTION] Function {} supprimée dans {}", name, namespace);
            }
        } catch (Exception e) {
            log.warn("[KNATIVE] Nettoyage partiel pour {} : {}", svc.getName(), e.getMessage());
        }

        knativeRepository.delete(svc);
    }

    // ─────────────────────────────────────────────────────────────────────────
    //  SYNC STATUT depuis le cluster — appelé par un scheduler ou webhook
    //  Permet de détecter SCALED_TO_ZERO vs ACTIVE en temps réel
    // ─────────────────────────────────────────────────────────────────────────

    public KnativeServiceResponse syncStatus(Long id, String keycloakId) {
        KnativeService svc = findOrThrow(id);
        checkOwnership(svc, keycloakId);

        try {
            GenericKubernetesResource ksvc = k8sClient
                    .genericKubernetesResources(KNATIVE_SERVING_CTX)
                    .inNamespace(svc.getOpenshiftNamespace())
                    .withName(svc.getName())
                    .get();

            if (ksvc == null) {
                svc.setStatus(KnativeStatus.ERROR);
            } else {
                // Lire le champ status.conditions[Ready]
                Map<String, Object> status = getNestedMap(ksvc.getAdditionalProperties(), "status");
                String url = status != null ? (String) status.get("url") : null;
                if (url != null && !url.isBlank()) {
                    svc.setServiceUrl(url);
                }

                // Détecter scale-to-zero : desiredScale == 0
                Map<String, Object> scaling = getNestedMap(status, "desiredScale");
                Object desiredScale = status != null ? status.get("desiredScale") : null;
                if (Integer.valueOf(0).equals(desiredScale)) {
                    svc.setStatus(KnativeStatus.SCALED_TO_ZERO);
                } else {
                    svc.setStatus(KnativeStatus.ACTIVE);
                }
            }
        } catch (Exception e) {
            log.warn("[KNATIVE] syncStatus échoué pour {} : {}", svc.getName(), e.getMessage());
        }

        return toResponse(knativeRepository.save(svc));
    }

    // ─────────────────────────────────────────────────────────────────────────
    //  DÉPLOIEMENT KNATIVE SERVING
    //  Crée une serving.knative.dev/v1 Service dans le namespace du tenant
    // ─────────────────────────────────────────────────────────────────────────

    private void deployKnativeServing(KnativeService entity) {
        String namespace = entity.getOpenshiftNamespace();
        String name      = entity.getName();

        /*
         * Manifeste équivalent YAML :
         *
         * apiVersion: serving.knative.dev/v1
         * kind: Service
         * metadata:
         *   name: {name}
         *   namespace: {namespace}
         *   annotations:
         *     autoscaling.knative.dev/minScale: "0"
         *     autoscaling.knative.dev/maxScale: "10"
         * spec:
         *   template:
         *     spec:
         *       containers:
         *         - image: {containerImage}
         *           resources:
         *             limits:
         *               cpu: "500m"
         *               memory: "256Mi"
         */

        Map<String, Object> manifest = buildKnativeServiceManifest(
                name, namespace,
                entity.getContainerImage(),
                entity.getMinScale(),
                entity.getMaxScale(),
                entity.getCpuLimit(),
                entity.getMemoryLimit()
        );

        GenericKubernetesResource resource = new GenericKubernetesResourceBuilder()
                .withApiVersion("serving.knative.dev/v1")
                .withKind("Service")
                .withNewMetadata()
                .withName(name)
                .withNamespace(namespace)
                .addToLabels("portal/managed", "true")
                .addToLabels("portal/tenant",  entity.getOwnerKeycloakId().substring(0, 8))
                .endMetadata()
                .build();

        resource.setAdditionalProperty("spec", manifest.get("spec"));

        k8sClient.genericKubernetesResources(KNATIVE_SERVING_CTX)
                .inNamespace(namespace)
                .resource(resource)
                .createOrReplace();

        log.info("[KNATIVE-SERVING] Service {} déployé dans {}", name, namespace);

        // Récupérer l'URL générée (disponible après quelques secondes)
        fetchAndStoreServiceUrl(entity);
    }

    // ─────────────────────────────────────────────────────────────────────────
    //  DÉPLOIEMENT KNATIVE FUNCTION
    //  Crée la Knative Service (runtime) + la source d'événement selon le type
    // ─────────────────────────────────────────────────────────────────────────

    private void deployKnativeFunction(KnativeService entity) {
        String namespace = entity.getOpenshiftNamespace();
        String name      = entity.getName();

        // 1. Déployer le runtime de la fonction (même CRD que Serving)
        deployKnativeServing(entity);

        // 2. Créer la source d'événement selon le choix du tenant
        if (entity.getEventSource() == null) {
            log.warn("[KNATIVE-FUNCTION] Aucune source d'événement définie pour {}", name);
            return;
        }

        switch (entity.getEventSource()) {
            case PING        -> deployPingSource(entity);
            case KAFKA       -> deployKafkaSource(entity);
            case API_SERVER  -> deployApiServerSource(entity);
            case SINK_BINDING -> deploySinkBinding(entity);
        }
    }

    // ─────────────────────────────────────────────────────────────────────────
    //  SOURCES D'ÉVÉNEMENTS
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * PingSource : déclenche la fonction selon un cron schedule.
     *
     * apiVersion: sources.knative.dev/v1
     * kind: PingSource
     * metadata:
     *   name: {name}-ping
     *   namespace: {namespace}
     * spec:
     *   schedule: "* /5 * * * *"
     *   sink:
     *     ref:
     *       apiVersion: serving.knative.dev/v1
     *       kind: Service
     *       name: {name}
     */
    private void deployPingSource(KnativeService entity) {
        String schedule = entity.getCronSchedule() != null
                ? entity.getCronSchedule() : "*/5 * * * *";

        Map<String, Object> spec = new HashMap<>();
        spec.put("schedule", schedule);
        spec.put("sink", Map.of(
                "ref", Map.of(
                        "apiVersion", "serving.knative.dev/v1",
                        "kind",       "Service",
                        "name",       entity.getName(),
                        "namespace",  entity.getOpenshiftNamespace()
                )
        ));

        GenericKubernetesResource resource = new GenericKubernetesResourceBuilder()
                .withApiVersion("sources.knative.dev/v1")
                .withKind("PingSource")
                .withNewMetadata()
                .withName(entity.getName() + "-ping")
                .withNamespace(entity.getOpenshiftNamespace())
                .addToLabels("portal/managed", "true")
                .endMetadata()
                .build();
        resource.setAdditionalProperty("spec", spec);

        k8sClient.genericKubernetesResources(PING_SOURCE_CTX)
                .inNamespace(entity.getOpenshiftNamespace())
                .resource(resource)
                .createOrReplace();

        log.info("[KNATIVE-FUNCTION] PingSource créée : schedule={}", schedule);
    }

    /**
     * KafkaSource : déclenche la fonction sur chaque message Kafka.
     *
     * apiVersion: sources.knative.dev/v1beta1
     * kind: KafkaSource
     * spec:
     *   bootstrapServers: ["kafka:9092"]
     *   topics: ["{topic}"]
     *   sink:
     *     ref:
     *       apiVersion: serving.knative.dev/v1
     *       kind: Service
     *       name: {name}
     */
    private void deployKafkaSource(KnativeService entity) {
        String topic = entity.getKafkaTopic() != null
                ? entity.getKafkaTopic() : "nextstep-events";

        Map<String, Object> spec = new HashMap<>();
        spec.put("bootstrapServers", List.of("kafka-cluster-kafka-bootstrap.kafka:9092"));
        spec.put("topics", List.of(topic));
        spec.put("sink", Map.of(
                "ref", Map.of(
                        "apiVersion", "serving.knative.dev/v1",
                        "kind",       "Service",
                        "name",       entity.getName(),
                        "namespace",  entity.getOpenshiftNamespace()
                )
        ));

        GenericKubernetesResource resource = new GenericKubernetesResourceBuilder()
                .withApiVersion("sources.knative.dev/v1beta1")
                .withKind("KafkaSource")
                .withNewMetadata()
                .withName(entity.getName() + "-kafka")
                .withNamespace(entity.getOpenshiftNamespace())
                .addToLabels("portal/managed", "true")
                .endMetadata()
                .build();
        resource.setAdditionalProperty("spec", spec);

        k8sClient.genericKubernetesResources(KAFKA_SOURCE_CTX)
                .inNamespace(entity.getOpenshiftNamespace())
                .resource(resource)
                .createOrReplace();

        log.info("[KNATIVE-FUNCTION] KafkaSource créée : topic={}", topic);
    }

    /**
     * ApiServerSource : déclenche la fonction sur les events Kubernetes.
     * Utile pour réagir à des créations/suppressions de ressources dans le cluster.
     */
    private void deployApiServerSource(KnativeService entity) {
        ResourceDefinitionContext apiSourceCtx = new ResourceDefinitionContext.Builder()
                .withGroup("sources.knative.dev")
                .withVersion("v1")
                .withKind("ApiServerSource")
                .withPlural("apiserversources")
                .withNamespaced(true)
                .build();

        Map<String, Object> spec = new HashMap<>();
        spec.put("serviceAccountName", "default");
        spec.put("mode", "Resource");
        spec.put("resources", List.of(Map.of(
                "apiVersion", "v1",
                "kind",       "Event"
        )));
        spec.put("sink", Map.of(
                "ref", Map.of(
                        "apiVersion", "serving.knative.dev/v1",
                        "kind",       "Service",
                        "name",       entity.getName(),
                        "namespace",  entity.getOpenshiftNamespace()
                )
        ));

        GenericKubernetesResource resource = new GenericKubernetesResourceBuilder()
                .withApiVersion("sources.knative.dev/v1")
                .withKind("ApiServerSource")
                .withNewMetadata()
                .withName(entity.getName() + "-apiserversource")
                .withNamespace(entity.getOpenshiftNamespace())
                .addToLabels("portal/managed", "true")
                .endMetadata()
                .build();
        resource.setAdditionalProperty("spec", spec);

        k8sClient.genericKubernetesResources(apiSourceCtx)
                .inNamespace(entity.getOpenshiftNamespace())
                .resource(resource)
                .createOrReplace();

        log.info("[KNATIVE-FUNCTION] ApiServerSource créée pour {}", entity.getName());
    }

    /**
     * SinkBinding : lie un pod existant comme producteur d'événements vers la fonction.
     */
    private void deploySinkBinding(KnativeService entity) {
        ResourceDefinitionContext sinkBindingCtx = new ResourceDefinitionContext.Builder()
                .withGroup("sources.knative.dev")
                .withVersion("v1")
                .withKind("SinkBinding")
                .withPlural("sinkbindings")
                .withNamespaced(true)
                .build();

        Map<String, Object> spec = new HashMap<>();
        spec.put("subject", Map.of(
                "apiVersion", "apps/v1",
                "kind",       "Deployment",
                "namespace",  entity.getOpenshiftNamespace(),
                "selector",   Map.of("matchLabels",
                        Map.of("portal/tenant", entity.getOwnerKeycloakId().substring(0, 8)))
        ));
        spec.put("sink", Map.of(
                "ref", Map.of(
                        "apiVersion", "serving.knative.dev/v1",
                        "kind",       "Service",
                        "name",       entity.getName(),
                        "namespace",  entity.getOpenshiftNamespace()
                )
        ));

        GenericKubernetesResource resource = new GenericKubernetesResourceBuilder()
                .withApiVersion("sources.knative.dev/v1")
                .withKind("SinkBinding")
                .withNewMetadata()
                .withName(entity.getName() + "-sinkbinding")
                .withNamespace(entity.getOpenshiftNamespace())
                .addToLabels("portal/managed", "true")
                .endMetadata()
                .build();
        resource.setAdditionalProperty("spec", spec);

        k8sClient.genericKubernetesResources(sinkBindingCtx)
                .inNamespace(entity.getOpenshiftNamespace())
                .resource(resource)
                .createOrReplace();

        log.info("[KNATIVE-FUNCTION] SinkBinding créée pour {}", entity.getName());
    }

    // ─────────────────────────────────────────────────────────────────────────
    //  SUPPRESSION SOURCE D'ÉVÉNEMENT
    // ─────────────────────────────────────────────────────────────────────────

    private void deleteEventSource(KnativeService svc) {
        if (svc.getEventSource() == null) return;
        String namespace = svc.getOpenshiftNamespace();
        String name      = svc.getName();

        try {
            switch (svc.getEventSource()) {
                case PING -> k8sClient.genericKubernetesResources(PING_SOURCE_CTX)
                        .inNamespace(namespace).withName(name + "-ping").delete();
                case KAFKA -> k8sClient.genericKubernetesResources(KAFKA_SOURCE_CTX)
                        .inNamespace(namespace).withName(name + "-kafka").delete();
                default -> log.info("[KNATIVE] Source {} non supprimée (type non géré)",
                        svc.getEventSource());
            }
        } catch (Exception e) {
            log.warn("[KNATIVE] Suppression source échouée : {}", e.getMessage());
        }
    }

    // ─────────────────────────────────────────────────────────────────────────
    //  BUILDERS MANIFESTE
    // ─────────────────────────────────────────────────────────────────────────

    @SuppressWarnings("unchecked")
    private Map<String, Object> buildKnativeServiceManifest(
            String name, String namespace,
            String image,
            int minScale, int maxScale,
            String cpuLimit, String memoryLimit) {

        Map<String, Object> container = new HashMap<>();
        container.put("image", image);
        container.put("resources", Map.of(
                "limits", Map.of(
                        "cpu",    cpuLimit,
                        "memory", memoryLimit
                )
        ));

        Map<String, Object> podSpec = new HashMap<>();
        podSpec.put("containers", List.of(container));

        Map<String, Object> templateMetadata = new HashMap<>();
        templateMetadata.put("annotations", Map.of(
                "autoscaling.knative.dev/minScale", String.valueOf(minScale),
                "autoscaling.knative.dev/maxScale", String.valueOf(maxScale)
        ));

        Map<String, Object> template = new HashMap<>();
        template.put("metadata", templateMetadata);
        template.put("spec", podSpec);

        Map<String, Object> spec = new HashMap<>();
        spec.put("template", template);

        return Map.of("spec", spec);
    }

    // ─────────────────────────────────────────────────────────────────────────
    //  FETCH URL — récupère l'URL Knative après déploiement (max 15s)
    // ─────────────────────────────────────────────────────────────────────────

    private void fetchAndStoreServiceUrl(KnativeService entity) {
        for (int i = 0; i < 15; i++) {
            try {
                Thread.sleep(1000);
            } catch (InterruptedException ignored) {
                Thread.currentThread().interrupt();
            }
            try {
                GenericKubernetesResource ksvc = k8sClient
                        .genericKubernetesResources(KNATIVE_SERVING_CTX)
                        .inNamespace(entity.getOpenshiftNamespace())
                        .withName(entity.getName())
                        .get();

                if (ksvc != null) {
                    Map<String, Object> statusMap =
                            getNestedMap(ksvc.getAdditionalProperties(), "status");
                    if (statusMap != null) {
                        String url = (String) statusMap.get("url");
                        if (url != null && !url.isBlank()) {
                            entity.setServiceUrl(url);
                            log.info("[KNATIVE] URL récupérée : {}", url);
                            return;
                        }
                    }
                }
            } catch (Exception e) {
                log.debug("[KNATIVE] fetchAndStoreServiceUrl tentative {} : {}", i + 1, e.getMessage());
            }
        }
        log.warn("[KNATIVE] URL non disponible après 15s pour {}", entity.getName());
    }

    // ─────────────────────────────────────────────────────────────────────────
    //  UTILS
    // ─────────────────────────────────────────────────────────────────────────

    @SuppressWarnings("unchecked")
    private Map<String, Object> getNestedMap(Map<String, Object> map, String key) {
        if (map == null) return null;
        Object val = map.get(key);
        return val instanceof Map ? (Map<String, Object>) val : null;
    }

    private void checkOwnership(KnativeService svc, String keycloakId) {
        if (!svc.getOwnerKeycloakId().equals(keycloakId)) {
            throw new AccessDeniedException("Action non autorisée sur ce service Knative");
        }
    }

    private KnativeService findOrThrow(Long id) {
        return knativeRepository.findById(id)
                .orElseThrow(() -> new EntityNotFoundException(
                        "Service Knative introuvable : " + id));
    }

    private KnativeServiceResponse toResponse(KnativeService s) {
        KnativeServiceResponse dto = new KnativeServiceResponse();
        dto.setId(s.getId());
        dto.setName(s.getName());
        dto.setKnativeType(s.getKnativeType());
        dto.setStatus(s.getStatus());
        dto.setContainerImage(s.getContainerImage());
        dto.setServiceUrl(s.getServiceUrl());
        dto.setOpenshiftNamespace(s.getOpenshiftNamespace());
        dto.setMinScale(s.getMinScale());
        dto.setMaxScale(s.getMaxScale());
        dto.setCpuLimit(s.getCpuLimit());
        dto.setMemoryLimit(s.getMemoryLimit());
        dto.setEventSource(s.getEventSource());
        dto.setKafkaTopic(s.getKafkaTopic());
        dto.setCronSchedule(s.getCronSchedule());
        dto.setCreatedAt(s.getCreatedAt());
        dto.setUpdatedAt(s.getUpdatedAt());
        return dto;
    }
}