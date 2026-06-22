package com.nextstep.service;

import com.nextstep.dto.ImageRegistryRequest;
import com.nextstep.dto.ImageRegistryResponse;
import com.nextstep.entity.ImageRegistry;
import com.nextstep.entity.RegistryStatus;
import com.nextstep.entity.RegistryType;
import com.nextstep.repository.ImageRegistryRepository;
import io.fabric8.kubernetes.api.model.*;
import io.fabric8.kubernetes.api.model.rbac.*;
import io.fabric8.kubernetes.client.KubernetesClient;
import jakarta.persistence.EntityNotFoundException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.nio.charset.StandardCharsets;
import java.util.Base64;
import java.util.List;
import java.util.Map;

@Service
@RequiredArgsConstructor
@Transactional
@Slf4j
public class ImageRegistryService {

    private final ImageRegistryRepository registryRepository;
    private final KubernetesClient        k8sClient;
    private final NamespaceService        namespaceService;

    @Value("${openshift.internal-registry.url:image-registry.openshift-image-registry.svc:5000}")
    private String internalRegistryUrl;

    // URL exacte récupérée depuis ton cluster :
    // oc get route default-route -n openshift-image-registry -o jsonpath='{.spec.host}'
    @Value("${openshift.internal-registry.external-url:default-route-openshift-image-registry.apps.ocp4.nextstep-it.com}")
    private String externalRegistryUrl;

    // ─────────────────────────────────────────────────────────────────────────
    //  LISTER
    // ─────────────────────────────────────────────────────────────────────────

    @Transactional(readOnly = true)
    public List<ImageRegistryResponse> getByOwner(String keycloakId) {
        return registryRepository.findByOwnerKeycloakId(keycloakId)
                .stream().map(this::toResponse).toList();
    }

    @Transactional(readOnly = true)
    public ImageRegistryResponse getById(Long id, String keycloakId) {
        ImageRegistry registry = findOrThrow(id);
        checkOwnership(registry, keycloakId);
        return toResponse(registry);
    }

    // ─────────────────────────────────────────────────────────────────────────
    //  CRÉER
    // ─────────────────────────────────────────────────────────────────────────

    public ImageRegistryResponse create(ImageRegistryRequest request, String keycloakId) {

        if (registryRepository.existsByNameAndOwnerKeycloakId(request.getName(), keycloakId)) {
            throw new IllegalArgumentException(
                    "Un registry avec ce nom existe déjà : " + request.getName());
        }

        String username  = keycloakId.substring(0, 8).toLowerCase();
        String namespace = namespaceService.getNamespaceForUser(username);
        namespaceService.provisionIfAbsent(username);

        ImageRegistry registry = ImageRegistry.builder()
                .name(request.getName())
                .description(request.getDescription())
                .registryType(RegistryType.INTERNAL)
                .status(RegistryStatus.PROVISIONING)
                .openshiftNamespace(namespace)
                .ownerKeycloakId(keycloakId)
                .build();
        registry = registryRepository.save(registry);

        try {
            provisionInternal(registry);
            registry.setStatus(RegistryStatus.ACTIVE);
            log.info("[REGISTRY] ✅ Registry {} actif dans {}", registry.getName(), namespace);
        } catch (Exception e) {
            log.error("[REGISTRY] ❌ Provisioning échoué pour {} : {}",
                    registry.getName(), e.getMessage(), e);
            registry.setStatus(RegistryStatus.ERROR);
        }

        return toResponse(registryRepository.save(registry));
    }

    // ─────────────────────────────────────────────────────────────────────────
    //  SUPPRIMER
    // ─────────────────────────────────────────────────────────────────────────

    public void delete(Long id, String keycloakId) {
        ImageRegistry registry = findOrThrow(id);
        checkOwnership(registry, keycloakId);
        registry.setStatus(RegistryStatus.DELETING);
        registryRepository.save(registry);

        String namespace = registry.getOpenshiftNamespace();
        String name      = registry.getName().toLowerCase();

        try {
            // Secret dockerconfigjson
            if (registry.getPullSecretName() != null)
                k8sClient.secrets().inNamespace(namespace)
                        .withName(registry.getPullSecretName()).delete();

            // Secret token SA
            String tokenSecretName = "registry-sa-" + name + "-token";
            k8sClient.secrets().inNamespace(namespace).withName(tokenSecretName).delete();

            // RoleBindings
            for (String rbName : List.of(
                    "registry-rb-push-" + name,
                    "registry-rb-pull-" + name))
                k8sClient.rbac().roleBindings()
                        .inNamespace(namespace).withName(rbName).delete();

            // ServiceAccount
            if (registry.getServiceAccountName() != null)
                k8sClient.serviceAccounts().inNamespace(namespace)
                        .withName(registry.getServiceAccountName()).delete();

        } catch (Exception e) {
            log.warn("[REGISTRY] Nettoyage partiel pour {} : {}",
                    registry.getName(), e.getMessage());
        }

        registryRepository.delete(registry);
        log.info("[REGISTRY] Registry {} supprimé", registry.getName());
    }

    // ─────────────────────────────────────────────────────────────────────────
    //  PROVISIONING
    // ─────────────────────────────────────────────────────────────────────────

    private void provisionInternal(ImageRegistry registry) {
        String namespace = registry.getOpenshiftNamespace();
        String saName    = "registry-sa-" + registry.getName().toLowerCase();

        // ── 1. ServiceAccount ─────────────────────────────────────────────────
        ServiceAccount sa = new ServiceAccountBuilder()
                .withNewMetadata()
                .withName(saName)
                .withNamespace(namespace)
                .addToLabels("portal/managed",  "true")
                .addToLabels("portal/service",  "internal-registry")
                .addToLabels("portal/registry", registry.getName())
                .endMetadata()
                .build();

        k8sClient.serviceAccounts().inNamespace(namespace).resource(sa).createOrReplace();
        registry.setServiceAccountName(saName);
        log.info("[INTERNAL-REGISTRY] SA {} créé dans {}", saName, namespace);
        sleep(2000);

        // ── 2. RoleBindings image-pusher + image-puller ───────────────────────
        applyRoleBinding("registry-rb-push-" + registry.getName().toLowerCase(),
                namespace, saName, "system:image-pusher");
        applyRoleBinding("registry-rb-pull-" + registry.getName().toLowerCase(),
                namespace, saName, "system:image-puller");
        log.info("[INTERNAL-REGISTRY] RoleBindings image-pusher + image-puller sur {}",
                namespace);
        sleep(2000);

        // ── 3. Obtenir le token SA ────────────────────────────────────────────
        //
        // Contexte cluster :
        //   - Client oc : 4.8.11 (pas de --duration sur create token)
        //   - Serveur OCP : 4.21.3 (tokens SA ne sont plus auto-créés)
        //   - get-token échoue si aucun Secret token existant
        //
        // Stratégie : créer un Secret service-account-token annoté
        // et attendre que le token controller OCP le remplisse.
        // C'est la méthode compatible OCP 4.21 + client 4.8.
        String saToken = obtainSaToken(namespace, saName);

        // ── 4. URLs ───────────────────────────────────────────────────────────
        String internalUrl = internalRegistryUrl + "/" + namespace;
        String extUrl      = externalRegistryUrl  + "/" + namespace;
        registry.setRegistryUrl(internalUrl);
        registry.setExternalRegistryUrl(extUrl);

        // ── 5. Secret dockerconfigjson ────────────────────────────────────────
        String secretName = "registry-dockerconfig-" + registry.getName().toLowerCase();
        injectDockerConfigSecret(namespace, secretName, internalUrl, extUrl, saName, saToken);
        registry.setPullSecretName(secretName);

        log.info("[INTERNAL-REGISTRY] ✅ interne:{} | externe:{}", internalUrl, extUrl);
    }

    // ─────────────────────────────────────────────────────────────────────────
    //  OBTENIR LE TOKEN SA
    //
    //  OCP 4.21 ne crée plus de token SA automatiquement.
    //  Solution : créer un Secret annoté kubernetes.io/service-account-token
    //  → le token-controller OCP va le remplir dans les secondes qui suivent.
    //
    //  Fallback : oc create token (sans --duration, compatible client 4.8)
    // ─────────────────────────────────────────────────────────────────────────

    private String obtainSaToken(String namespace, String saName) {

        // ── Méthode principale : Secret service-account-token ─────────────────
        String tokenSecretName = saName + "-token";
        try {
            log.info("[TOKEN] Création Secret token pour {}", saName);

            // Supprimer l'éventuel secret précédent (delete/recreate registry)
            try {
                k8sClient.secrets().inNamespace(namespace)
                        .withName(tokenSecretName).delete();
                sleep(500);
            } catch (Exception ignored) {}

            Secret tokenSecret = new SecretBuilder()
                    .withNewMetadata()
                    .withName(tokenSecretName)
                    .withNamespace(namespace)
                    .addToAnnotations(
                            "kubernetes.io/service-account.name", saName)
                    .addToLabels("portal/managed", "true")
                    .endMetadata()
                    .withType("kubernetes.io/service-account-token")
                    .build();

            k8sClient.secrets().inNamespace(namespace)
                    .resource(tokenSecret).create();

            log.info("[TOKEN] Secret {} créé, attente remplissage OCP (max 40s)...",
                    tokenSecretName);

            // OCP 4.21 remplit le token en général en 2–5s
            // On attend jusqu'à 40s pour les clusters chargés
            for (int i = 0; i < 40; i++) {
                sleep(1000);
                Secret s = k8sClient.secrets()
                        .inNamespace(namespace)
                        .withName(tokenSecretName)
                        .get();

                if (s != null
                        && s.getData() != null
                        && s.getData().containsKey("token")) {

                    String tokenRaw = s.getData().get("token");
                    if (tokenRaw != null && !tokenRaw.isBlank()) {
                        String token = new String(
                                Base64.getDecoder().decode(tokenRaw),
                                StandardCharsets.UTF_8);
                        if (!token.isBlank()) {
                            log.info("[TOKEN] ✅ Secret rempli après {}s", i + 1);
                            return token;
                        }
                    }
                }
                log.debug("[TOKEN] Attente token secret, {}s/40s...", i + 1);
            }
            log.warn("[TOKEN] Secret non rempli après 40s — tentative fallback");

        } catch (Exception e) {
            log.warn("[TOKEN] Échec création Secret token : {}", e.getMessage());
        }

        // ── Fallback : oc create token (sans --duration, client 4.8 compatible)
        try {
            log.info("[TOKEN] Fallback — oc create token {} -n {}", saName, namespace);
            ProcessBuilder pb = new ProcessBuilder(
                    "oc", "create", "token", saName, "-n", namespace);
            pb.redirectErrorStream(true);
            Process process = pb.start();
            String output = new String(
                    process.getInputStream().readAllBytes(),
                    StandardCharsets.UTF_8).trim();
            int exitCode = process.waitFor();

            if (exitCode == 0 && !output.isBlank()
                    && !output.toLowerCase().startsWith("error")) {
                log.info("[TOKEN] ✅ Fallback oc create token réussi");
                return output;
            }
            log.warn("[TOKEN] oc create token — exit:{} | output:{}", exitCode, output);

        } catch (Exception e) {
            log.warn("[TOKEN] Fallback oc create token échoué : {}", e.getMessage());
        }

        // ── Fallback 2 : oc serviceaccounts get-token ─────────────────────────
        // Fonctionne uniquement si un Secret token existe déjà dans le namespace
        try {
            log.info("[TOKEN] Fallback 2 — oc serviceaccounts get-token {} -n {}",
                    saName, namespace);
            ProcessBuilder pb = new ProcessBuilder(
                    "oc", "serviceaccounts", "get-token", saName, "-n", namespace);
            pb.redirectErrorStream(true);
            Process process = pb.start();
            String output = new String(
                    process.getInputStream().readAllBytes(),
                    StandardCharsets.UTF_8).trim();
            int exitCode = process.waitFor();

            if (exitCode == 0 && !output.isBlank()
                    && !output.toLowerCase().startsWith("error")) {
                log.info("[TOKEN] ✅ Fallback 2 get-token réussi");
                return output;
            }
            log.warn("[TOKEN] get-token — exit:{} | output:{}", exitCode, output);

        } catch (Exception e) {
            log.warn("[TOKEN] Fallback 2 get-token échoué : {}", e.getMessage());
        }

        throw new RuntimeException(
                "Impossible d'obtenir un token SA pour " + saName
                        + " dans " + namespace
                        + ". Vérifiez les logs [TOKEN] pour identifier la stratégie en échec.");
    }

    // ─────────────────────────────────────────────────────────────────────────
    //  HELPERS
    // ─────────────────────────────────────────────────────────────────────────

    private void applyRoleBinding(String rbName, String namespace,
                                  String saName, String clusterRoleName) {
        RoleBinding rb = new RoleBindingBuilder()
                .withNewMetadata()
                .withName(rbName)
                .withNamespace(namespace)
                .addToLabels("portal/managed", "true")
                .endMetadata()
                .withNewRoleRef()
                .withApiGroup("rbac.authorization.k8s.io")
                .withKind("ClusterRole")
                .withName(clusterRoleName)
                .endRoleRef()
                .addNewSubject()
                .withKind("ServiceAccount")
                .withName(saName)
                .withNamespace(namespace)
                .endSubject()
                .build();

        k8sClient.rbac().roleBindings()
                .inNamespace(namespace)
                .resource(rb)
                .createOrReplace();
    }

    private void injectDockerConfigSecret(String namespace, String secretName,
                                          String internalUrl, String externalUrl,
                                          String username, String token) {
        String auth = Base64.getEncoder()
                .encodeToString((username + ":" + token).getBytes(StandardCharsets.UTF_8));

        String dockerConfig = "{\"auths\":{"
                + "\"" + internalUrl + "\":"
                + "{\"username\":\"" + username + "\","
                + "\"password\":\"" + token + "\","
                + "\"auth\":\"" + auth + "\"},"
                + "\"" + externalUrl + "\":"
                + "{\"username\":\"" + username + "\","
                + "\"password\":\"" + token + "\","
                + "\"auth\":\"" + auth + "\"}"
                + "}}";

        String b64 = Base64.getEncoder()
                .encodeToString(dockerConfig.getBytes(StandardCharsets.UTF_8));

        Secret secret = new SecretBuilder()
                .withNewMetadata()
                .withName(secretName)
                .withNamespace(namespace)
                .addToLabels("portal/managed", "true")
                .addToLabels("portal/service", "internal-registry")
                .endMetadata()
                .withType("kubernetes.io/dockerconfigjson")
                .withData(Map.of(".dockerconfigjson", b64))
                .build();

        k8sClient.secrets().inNamespace(namespace).resource(secret).createOrReplace();
        log.info("[REGISTRY] Secret dockerconfigjson {} injecté dans {}", secretName, namespace);
    }

    private void sleep(long ms) {
        try { Thread.sleep(ms); }
        catch (InterruptedException e) { Thread.currentThread().interrupt(); }
    }

    private ImageRegistryResponse toResponse(ImageRegistry r) {
        ImageRegistryResponse dto = new ImageRegistryResponse();
        dto.setId(r.getId());
        dto.setName(r.getName());
        dto.setDescription(r.getDescription());
        dto.setStatus(r.getStatus());
        dto.setOpenshiftNamespace(r.getOpenshiftNamespace());
        dto.setRegistryUrl(r.getRegistryUrl());
        dto.setExternalRegistryUrl(r.getExternalRegistryUrl());
        dto.setServiceAccountName(r.getServiceAccountName());
        dto.setPullSecretName(r.getPullSecretName());
        dto.setCreatedAt(r.getCreatedAt());
        dto.setUpdatedAt(r.getUpdatedAt());

        if (r.getExternalRegistryUrl() != null && r.getServiceAccountName() != null) {
            String saName = r.getServiceAccountName();
            String ns     = r.getOpenshiftNamespace();
            String extUrl = r.getExternalRegistryUrl();
            dto.setLoginCommand(
                    "docker login " + extUrl
                            + " --username " + saName
                            + " --password $(oc create token " + saName + " -n " + ns + ")"
            );
            dto.setPushCommand("docker push " + extUrl + "/mon-image:latest");
            dto.setPullCommand("docker pull " + extUrl + "/mon-image:latest");
        }
        return dto;
    }

    private void checkOwnership(ImageRegistry registry, String keycloakId) {
        if (!registry.getOwnerKeycloakId().equals(keycloakId))
            throw new AccessDeniedException("Action non autorisée sur ce registry");
    }

    private ImageRegistry findOrThrow(Long id) {
        return registryRepository.findById(id)
                .orElseThrow(() -> new EntityNotFoundException(
                        "Registry introuvable : " + id));
    }
}