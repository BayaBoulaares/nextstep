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

import io.fabric8.kubernetes.api.model.*;
import io.fabric8.kubernetes.api.model.networking.v1.*;
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
                .replaceAll("[^a-z0-9-]", "-")
                .replaceAll("-+", "-")
                .replaceAll("^-|-$", "");
        return namespacePrefix + "-" + clean;
        // ex: baya-tenant-baya-boulaares72
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

    public void provisionIfAbsent(String username) {
        String namespace = getNamespaceForUser(username);

        // ✅ Sécurité : ne jamais toucher au namespace opérateur
        if (isOperatorNamespace(namespace)) {
            throw new IllegalArgumentException(
                    "Impossible de provisionner le namespace opérateur: " + namespace
            );
        }

        if (namespaceExists(namespace)) {
            log.info("Namespace {} existe déjà", namespace);
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
}