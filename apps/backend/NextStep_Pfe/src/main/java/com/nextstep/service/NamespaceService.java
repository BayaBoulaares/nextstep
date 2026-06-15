/*package com.nextstep.service;

import io.fabric8.kubernetes.api.model.*;
import io.fabric8.kubernetes.client.KubernetesClient;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.beans.factory.annotation.Value;

@Service
@Slf4j
public class NamespaceService {

    @Autowired
    private KubernetesClient k8sClient;

    @Value("${openshift.namespace-prefix}")
    private String namespacePrefix; // "baya-tenant"

    public String getNamespaceForUser(String username) {
        return namespacePrefix + "-" + username;
    }

    // Vérifie si le namespace existe déjà
    public boolean namespaceExists(String namespace) {
        return k8sClient.namespaces().withName(namespace).get() != null;
    }

    // Crée le namespace + quota via Fabric8
    public void provisionIfAbsent(String username) {
        String namespace = getNamespaceForUser(username);

        if (namespaceExists(namespace)) {
            log.info("Namespace {} existe déjà", namespace);
            return;
        }

        log.info("Création du namespace {}", namespace);

        // 1. Créer le namespace avec labels
        Namespace ns = new NamespaceBuilder()
                .withNewMetadata()
                .withName(namespace)
                .addToLabels("portal/owner",   "baya")
                .addToLabels("portal/client",  username)
                .addToLabels("portal/project", "nextstep-pfe")
                .endMetadata()
                .build();

        k8sClient.namespaces().resource(ns).create();

        // 2. Appliquer un ResourceQuota
        ResourceQuota quota = new ResourceQuotaBuilder()
                .withNewMetadata()
                .withName("quota-" + username)
                .withNamespace(namespace)
                .endMetadata()
                .withNewSpec()
                .addToHard("count/virtualmachines.kubevirt.io",
                        new Quantity("5"))
                .addToHard("limits.cpu",
                        new Quantity("8"))
                .addToHard("limits.memory",
                        new Quantity("16Gi"))
                .endSpec()
                .build();

        k8sClient.resourceQuotas()
                .inNamespace(namespace)
                .resource(quota)
                .create();

        log.info("Namespace {} provisionné avec quota", namespace);
    }
}*/
package com.nextstep.service;

import com.nextstep.entity.Plan;
import io.fabric8.kubernetes.api.model.*;
import io.fabric8.kubernetes.api.model.networking.v1.*;
import io.fabric8.kubernetes.api.model.rbac.RoleBindingBuilder;
import io.fabric8.kubernetes.client.KubernetesClient;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

@Service
@Slf4j
public class NamespaceService {

    @Autowired
    private KubernetesClient k8sClient;

    @Value("${openshift.namespace-prefix}")
    private String namespacePrefix;        // "baya-tenant" → pour les clients

    @Value("${openshift.operator-namespace}")
    private String operatorNamespace;      // "tenant-baya" → ton namespace

    // ✅ Namespace des CLIENTS : baya-tenant-{username}
    public String getNamespaceForUser(String username) {
        String clean = username.toLowerCase()
                .replaceAll("[^a-z0-9-]", "-")//Remplacement des caractères interdits {Tout caractère qui n'est PAS : une lettre minuscule a-z,un chiffre 0-9 un tiret -}
                .replaceAll("-+", "-") //Supprimer les doubles tirets
                .replaceAll("^-|-$", ""); //Supprimer les tirets au début et à la fin
        return namespacePrefix + "-" + clean;
    }

    // ✅ TON namespace opérateur : tenant-baya
    public String getOperatorNamespace() {
        return operatorNamespace;
    }

    // ✅ Validation — éviter confusion entre les deux types
    public boolean isClientNamespace(String namespace) {
        return namespace.startsWith(namespacePrefix + "-");
        // baya-tenant-* = namespace client
    }

    public boolean isOperatorNamespace(String namespace) {
        return namespace.equals(operatorNamespace);
        // tenant-baya = ton namespace
    }

    public boolean namespaceExists(String namespace) {
        return k8sClient.namespaces().withName(namespace).get() != null;
    }

    /*public void provisionIfAbsent(String username) {
        String namespace = getNamespaceForUser(username);

        // ✅ Sécurité : ne jamais toucher au namespace opérateur
        if (isOperatorNamespace(namespace)) {
            throw new IllegalArgumentException(
                    "Impossible de provisionner le namespace opérateur: " + namespace
            );
        }


        if (namespaceExists(namespace)) {
            log.info("Namespace {} existe déjà", namespace);
            applyCloudNativePGPermissions(namespace);
            return;
        }
        applyCloudNativePGPermissions(namespace);

        log.info("Création du namespace client {}", namespace);

        // 1. Créer le namespace avec labels
        Namespace ns = new NamespaceBuilder()
                .withNewMetadata()
                .withName(namespace)
                .addToLabels("portal/owner",   operatorNamespace)
                //.addToLabels("portal/client",  username)
                .addToLabels("portal/client", sanitizeLabel(username))

                .addToLabels("portal/project", "nextstep-pfe")
                .addToLabels("portal/type",    "client-tenant")
                .endMetadata()
                .build();

        k8sClient.namespaces().resource(ns).create();

        // 2. ResourceQuota
        ResourceQuota quota = new ResourceQuotaBuilder()
                .withNewMetadata()
                .withName("quota-" + username)
                .withNamespace(namespace)
                .endMetadata()
                .withNewSpec()
                .addToHard("count/virtualmachines.kubevirt.io", new Quantity("5"))
                .addToHard("limits.cpu",    new Quantity("8"))
                .addToHard("limits.memory", new Quantity("16Gi"))
                .endSpec()
                .build();

        k8sClient.resourceQuotas()
                .inNamespace(namespace)
                .resource(quota)
                .create();

        // 3. ✅ NetworkPolicy d'isolation tenant
        applyTenantNetworkPolicy(namespace);

        log.info("Namespace client {} provisionné avec quota + NetworkPolicy", namespace);
    }*/
    public void provisionIfAbsent(String username) {
        String namespace = getNamespaceForUser(username);

        if (isOperatorNamespace(namespace)) {
            throw new IllegalArgumentException(
                    "Impossible de provisionner le namespace opérateur: " + namespace
            );
        }

        if (namespaceExists(namespace)) {
            log.info("Namespace {} existe déjà", namespace);
            applyCloudNativePGPermissions(namespace);  // ✅ namespace existe → OK
            return;
        }

        log.info("Création du namespace client {}", namespace);

        // 1. Créer le namespace avec labels
        Namespace ns = new NamespaceBuilder()
                .withNewMetadata()
                .withName(namespace)
                .addToLabels("portal/owner",   operatorNamespace)
                .addToLabels("portal/client",  username)
                .addToLabels("portal/project", "nextstep-pfe")
                .addToLabels("portal/type",    "client-tenant")
                .endMetadata()
                .build();

        k8sClient.namespaces().resource(ns).create();

        // ✅ ATTENDRE que le namespace soit réellement Ready avant d'y créer des ressources
        waitForNamespaceReady(namespace);

        // 2. ResourceQuota
        ResourceQuota quota = new ResourceQuotaBuilder()
                .withNewMetadata()
                .withName("quota-" + username)
                .withNamespace(namespace)
                .endMetadata()
                .withNewSpec()
                .addToHard("count/virtualmachines.kubevirt.io", new Quantity("5"))
                .addToHard("limits.cpu",    new Quantity("8"))
                .addToHard("limits.memory", new Quantity("16Gi"))
                .endSpec()
                .build();

        k8sClient.resourceQuotas()
                .inNamespace(namespace)
                .resource(quota)
                .create();

        // 3. NetworkPolicy d'isolation tenant
        applyTenantNetworkPolicy(namespace);

        // 4. ✅ SCC en DERNIER — namespace garanti existant
        applyCloudNativePGPermissions(namespace);

        log.info("Namespace client {} provisionné avec quota + NetworkPolicy + SCC", namespace);
    }
    private void waitForNamespaceReady(String namespace) {
        int maxRetries = 10;
        int delayMs    = 500;

        for (int i = 0; i < maxRetries; i++) {
            try {
                var ns = k8sClient.namespaces().withName(namespace).get();
                if (ns != null
                        && ns.getStatus() != null
                        && "Active".equals(ns.getStatus().getPhase())) {
                    log.info("[NS] Namespace {} Ready après {}ms",
                            namespace, i * delayMs);
                    return;
                }
            } catch (Exception e) {
                log.debug("[NS] Attente namespace {} ({}/{}): {}",
                        namespace, i + 1, maxRetries, e.getMessage());
            }

            try {
                Thread.sleep(delayMs);
            } catch (InterruptedException ie) {
                Thread.currentThread().interrupt();
                return;
            }
        }

        log.warn("[NS] Namespace {} non Ready après {}ms — on continue quand même",
                namespace, maxRetries * delayMs);
    }

    // ✅ NetworkPolicy : isolation entre tenants
    private void applyTenantNetworkPolicy(String namespace) {
        try {
            NetworkPolicy policy = new NetworkPolicyBuilder()
                    .withNewMetadata()
                    .withName("tenant-isolation")
                    .withNamespace(namespace)
                    .addToLabels("portal/managed", "true")
                    .endMetadata()
                    .withNewSpec()
                    // Appliquer à tous les pods du namespace
                    .withPodSelector(new LabelSelectorBuilder().build())
                    .addToPolicyTypes("Ingress", "Egress")
                    // Ingress : autoriser seulement depuis le même namespace
                    .addNewIngress()
                    .addNewFrom()
                    .withPodSelector(new LabelSelectorBuilder().build())
                    .endFrom()
                    .endIngress()
                    // Egress : autoriser tout (internet + DNS cluster)
                    .addNewEgress()
                    .endEgress()
                    .endSpec()
                    .build();

            k8sClient.network().networkPolicies()
                    .inNamespace(namespace)
                    .resource(policy)
                    .create();

            log.info("[NETWORK] NetworkPolicy isolation appliquée sur {}", namespace);
        } catch (Exception e) {
            log.warn("[NETWORK] NetworkPolicy échouée sur {}: {}", namespace, e.getMessage());
        }
    }

    /**
     * CloudNativePG tourne avec UID/GID 26 (postgres).
     * Sur OpenShift, le namespace doit autoriser cet UID via SCC nonroot-v2 ou anyuid.
     */
    private void applyCloudNativePGPermissions(String namespace) {
        try {
            // 1. RoleBinding — nonroot-v2 (suffisant pour CNPG sur OCP 4.11+)
            var rb = new RoleBindingBuilder()
                    .withNewMetadata()
                    .withName("cnpg-scc-nonroot")
                    .withNamespace(namespace)
                    .addToLabels("portal/managed", "true")
                    .endMetadata()
                    .withNewRoleRef()
                    .withApiGroup("rbac.authorization.k8s.io")
                    .withKind("ClusterRole")
                    .withName("system:openshift:scc:nonroot-v2")
                    .endRoleRef()
                    .addNewSubject()
                    .withKind("ServiceAccount")
                    .withName("default")
                    .withNamespace(namespace)
                    .endSubject()
                    .build();

            k8sClient.rbac().roleBindings()
                    .inNamespace(namespace)
                    .resource(rb)
                    .createOrReplace();

            log.info("[SCC] nonroot-v2 appliqué sur {}", namespace);

        } catch (Exception e) {
            log.warn("[SCC] Erreur nonroot-v2 sur {}: {} — tentative anyuid", namespace, e.getMessage());

            // Fallback — anyuid si nonroot-v2 non disponible
            try {
                var rb2 = new RoleBindingBuilder()
                        .withNewMetadata()
                        .withName("cnpg-scc-anyuid")
                        .withNamespace(namespace)
                        .addToLabels("portal/managed", "true")
                        .endMetadata()
                        .withNewRoleRef()
                        .withApiGroup("rbac.authorization.k8s.io")
                        .withKind("ClusterRole")
                        .withName("system:openshift:scc:anyuid")
                        .endRoleRef()
                        .addNewSubject()
                        .withKind("ServiceAccount")
                        .withName("default")
                        .withNamespace(namespace)
                        .endSubject()
                        .build();

                k8sClient.rbac().roleBindings()
                        .inNamespace(namespace)
                        .resource(rb2)
                        .createOrReplace();

                log.info("[SCC] anyuid (fallback) appliqué sur {}", namespace);

            } catch (Exception e2) {
                log.error("[SCC] Impossible d'appliquer SCC sur {}: {}", namespace, e2.getMessage());
            }
        }

}

    private String sanitizeLabel(String value) {
        // Retirer le domaine si c'est un email
        String clean = value.contains("@")
                ? value.split("@")[0]
                : value;
        // Remplacer les caractères invalides
        return clean.toLowerCase()
                .replaceAll("[^a-z0-9._-]", "-")
                .replaceAll("-+", "-")
                .replaceAll("^-|-$", "");
    }
    // À ajouter dans NamespaceService.java

    /**
     * Met à jour le ResourceQuota d'un namespace selon le plan souscrit.
     * Appelée depuis AbonnementService après une souscription réussie.
     * Utilise serverSideApply() pour être idempotente.
     */
    public void updateQuotaForPlan(String username, Plan plan) {
        String namespace = getNamespaceForUser(username);

        if (!namespaceExists(namespace)) {
            log.warn("[QUOTA] Namespace {} inexistant — quota non mis à jour", namespace);
            return;
        }

        // Calculer les limites selon le tier du plan
        QuotaLimits limits = resolveQuotaLimits(plan);

        ResourceQuota quota = new ResourceQuotaBuilder()
                .withNewMetadata()
                .withName("quota-" + sanitize(username))
                .withNamespace(namespace)
                .addToLabels("portal/managed", "true")
                .addToLabels("portal/plan-tier", plan.getTier().name())
                .endMetadata()
                .withNewSpec()
                .addToHard("count/virtualmachines.kubevirt.io",
                        new Quantity(String.valueOf(limits.maxVms())))
                .addToHard("limits.cpu",
                        new Quantity(limits.maxCpu()))
                .addToHard("limits.memory",
                        new Quantity(limits.maxMemory()))
                .addToHard("requests.storage",
                        new Quantity(limits.maxStorage()))
                .endSpec()
                .build();

        k8sClient.resourceQuotas()
                .inNamespace(namespace)
                .resource(quota)
                .serverSideApply();   // idempotent — crée ou met à jour

        log.info("[QUOTA] Namespace {} mis à jour — tier={} vms={} cpu={} mem={} storage={}",
                namespace, plan.getTier(),
                limits.maxVms(), limits.maxCpu(),
                limits.maxMemory(), limits.maxStorage());
    }

    // Résoudre les limites selon le tier
    private QuotaLimits resolveQuotaLimits(Plan plan) {
        return switch (plan.getTier()) {
            case STARTER    -> new QuotaLimits(2,  "4",   "8Gi",  "100Gi");
            case BUSINESS   -> new QuotaLimits(5,  "8",   "16Gi", "500Gi");
            case ENTERPRISE -> new QuotaLimits(20, "32",  "64Gi", "2Ti");
        };
    }

    // Record interne pour les limites calculées
    private record QuotaLimits(
            int maxVms,
            String maxCpu,
            String maxMemory,
            String maxStorage
    ) {}

    private String sanitize(String input) {
        return input.toLowerCase()
                .replaceAll("[^a-z0-9-]", "-")
                .replaceAll("-+", "-")
                .replaceAll("^-|-$", "");
    }
    // Alternative plus simple dans NamespaceService.java
    public void resetToMinimumQuota(String username) {
        String namespace = getNamespaceForUser(username);
        if (!namespaceExists(namespace)) return;

        ResourceQuota quota = new ResourceQuotaBuilder()
                .withNewMetadata()
                .withName("quota-" + sanitize(username))
                .withNamespace(namespace)
                .endMetadata()
                .withNewSpec()
                .addToHard("count/virtualmachines.kubevirt.io", new Quantity("1"))
                .addToHard("limits.cpu",     new Quantity("2"))
                .addToHard("limits.memory",  new Quantity("4Gi"))
                .addToHard("requests.storage", new Quantity("50Gi"))
                .endSpec()
                .build();

        k8sClient.resourceQuotas()
                .inNamespace(namespace)
                .resource(quota)
                .serverSideApply();

        log.info("[QUOTA] Namespace {} rétrogradé au quota minimum", namespace);
    }
}