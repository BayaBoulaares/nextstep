package com.nextstep.service;

import io.fabric8.kubernetes.client.KubernetesClient;
import io.fabric8.kubernetes.client.dsl.base.ResourceDefinitionContext;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.stereotype.Service;

import java.util.*;

@Slf4j
@Service
@RequiredArgsConstructor
public class VmNetworkService {

    private final KubernetesClient kubernetesClient;
    private final NamespaceService namespaceService;

    private static final ResourceDefinitionContext VM_CTX =
            new ResourceDefinitionContext.Builder()
                    .withGroup("kubevirt.io").withVersion("v1")
                    .withPlural("virtualmachines").withNamespaced(true)
                    .build();

    private String getNamespace() {
        var auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null) return null;
        if (auth.getPrincipal() instanceof Jwt jwt) {
            String email = jwt.getClaimAsString("email");
            if (email != null)
                return namespaceService.getNamespaceForUser(email.split("@")[0].replace(".", "-"));
            String uname = jwt.getClaimAsString("preferred_username");
            return uname != null ? namespaceService.getNamespaceForUser(uname) : null;
        }
        return namespaceService.getNamespaceForUser(auth.getName());
    }

    @SuppressWarnings("unchecked")
    private Map<String, Object> getOrCreate(Map<String, Object> parent, String key) {
        Object val = parent.get(key);
        if (val instanceof Map) return (Map<String, Object>) val;
        Map<String, Object> m = new LinkedHashMap<>();
        parent.put(key, m);
        return m;
    }

    private void assertStopped(String vmName, String namespace) {
        var vmRes = kubernetesClient.genericKubernetesResources(VM_CTX)
                .inNamespace(namespace).withName(vmName).get();
        if (vmRes != null) {
            @SuppressWarnings("unchecked")
            Map<String, Object> status = (Map<String, Object>)
                    vmRes.getAdditionalProperties().getOrDefault("status", Map.of());
            String state = (String) status.getOrDefault("printableStatus", "");
            if (!"Stopped".equals(state)) {
                throw new IllegalStateException(
                        "La VM doit être arrêtée (état actuel : " + state + ")");
            }
        }
    }

    // ─────────────────────────────────────────────
    // AJOUTER une interface réseau
    // ─────────────────────────────────────────────
    @SuppressWarnings("unchecked")
    public void addInterface(String vmName, String ifaceName, String model, String type) {
        String namespace = getNamespace();
        log.info("[NETWORK] addInterface vm={} iface={} model={} type={} ns={}",
                vmName, ifaceName, model, type, namespace);

        assertStopped(vmName, namespace);

        kubernetesClient.genericKubernetesResources(VM_CTX)
                .inNamespace(namespace)
                .withName(vmName)
                .edit(vm -> {
                    Map<String, Object> props    = vm.getAdditionalProperties();
                    Map<String, Object> spec     = getOrCreate(props,    "spec");
                    Map<String, Object> template = getOrCreate(spec,     "template");
                    Map<String, Object> tSpec    = getOrCreate(template, "spec");
                    Map<String, Object> domain   = getOrCreate(tSpec,    "domain");
                    Map<String, Object> devices  = getOrCreate(domain,   "devices");

                    // Ajouter dans interfaces
                    List<Map<String, Object>> interfaces = new ArrayList<>(
                            (List<Map<String, Object>>) devices.getOrDefault("interfaces", new ArrayList<>()));

                    Map<String, Object> newIface = new LinkedHashMap<>();
                    newIface.put("name", ifaceName);
                    newIface.put("model", model);
                    newIface.put(type, new LinkedHashMap<>()); // {"masquerade":{}} ou {"bridge":{}}
                    interfaces.add(newIface);
                    devices.put("interfaces", interfaces);

                    // Ajouter dans networks
                    List<Map<String, Object>> networks = new ArrayList<>(
                            (List<Map<String, Object>>) tSpec.getOrDefault("networks", new ArrayList<>()));

                    Map<String, Object> newNetwork = new LinkedHashMap<>();
                    newNetwork.put("name", ifaceName);
                    if ("masquerade".equals(type)) {
                        newNetwork.put("pod", new LinkedHashMap<>());
                    } else {
                        Map<String, Object> multus = new LinkedHashMap<>();
                        multus.put("networkName", "default/" + ifaceName);
                        newNetwork.put("multus", multus);
                    }
                    networks.add(newNetwork);

                    domain.put("devices", devices);
                    tSpec.put("domain", domain);
                    tSpec.put("networks", networks);
                    template.put("spec", tSpec);
                    spec.put("template", template);
                    props.put("spec", spec);
                    return vm;
                });

        log.info("[NETWORK] Interface {} ajoutée à {}", ifaceName, vmName);
    }

    // ─────────────────────────────────────────────
    // LIEN up/down
    // ─────────────────────────────────────────────
    @SuppressWarnings("unchecked")
    public void setLinkState(String vmName, String ifaceName, boolean linkDown) {
        String namespace = getNamespace();
        log.info("[NETWORK] setLinkState vm={} iface={} linkDown={} ns={}", vmName, ifaceName, linkDown, namespace);

        kubernetesClient.genericKubernetesResources(VM_CTX)
                .inNamespace(namespace)
                .withName(vmName)
                .edit(vm -> {
                    Map<String, Object> props    = vm.getAdditionalProperties();
                    Map<String, Object> spec     = getOrCreate(props,    "spec");
                    Map<String, Object> template = getOrCreate(spec,     "template");
                    Map<String, Object> tSpec    = getOrCreate(template, "spec");
                    Map<String, Object> domain   = getOrCreate(tSpec,    "domain");
                    Map<String, Object> devices  = getOrCreate(domain,   "devices");

                    List<Map<String, Object>> interfaces = (List<Map<String, Object>>)
                            devices.getOrDefault("interfaces", new ArrayList<>());

                    for (Map<String, Object> iface : interfaces) {
                        if (ifaceName.equals(iface.get("name"))) {
                            if (linkDown) iface.put("state", "down");
                            else iface.remove("state");
                            log.info("[NETWORK] Interface {} → state={}", ifaceName, linkDown ? "down" : "up");
                            break;
                        }
                    }

                    devices.put("interfaces", interfaces);
                    domain.put("devices", devices);
                    tSpec.put("domain", domain);
                    template.put("spec", tSpec);
                    spec.put("template", template);
                    props.put("spec", spec);
                    return vm;
                });
    }

    // ─────────────────────────────────────────────
    // MODIFIER le modèle
    // ─────────────────────────────────────────────
    @SuppressWarnings("unchecked")
    public void updateInterface(String vmName, String ifaceName, String model) {
        String namespace = getNamespace();
        log.info("[NETWORK] updateInterface vm={} iface={} model={} ns={}", vmName, ifaceName, model, namespace);

        kubernetesClient.genericKubernetesResources(VM_CTX)
                .inNamespace(namespace)
                .withName(vmName)
                .edit(vm -> {
                    Map<String, Object> props    = vm.getAdditionalProperties();
                    Map<String, Object> spec     = getOrCreate(props,    "spec");
                    Map<String, Object> template = getOrCreate(spec,     "template");
                    Map<String, Object> tSpec    = getOrCreate(template, "spec");
                    Map<String, Object> domain   = getOrCreate(tSpec,    "domain");
                    Map<String, Object> devices  = getOrCreate(domain,   "devices");

                    List<Map<String, Object>> interfaces = (List<Map<String, Object>>)
                            devices.getOrDefault("interfaces", new ArrayList<>());

                    for (Map<String, Object> iface : interfaces) {
                        if (ifaceName.equals(iface.get("name"))) {
                            iface.put("model", model);
                            log.info("[NETWORK] Interface {} → model={}", ifaceName, model);
                            break;
                        }
                    }

                    devices.put("interfaces", interfaces);
                    domain.put("devices", devices);
                    tSpec.put("domain", domain);
                    template.put("spec", tSpec);
                    spec.put("template", template);
                    props.put("spec", spec);
                    return vm;
                });
    }

    // ─────────────────────────────────────────────
    // SUPPRIMER une interface
    // ─────────────────────────────────────────────
    @SuppressWarnings("unchecked")
    public void deleteInterface(String vmName, String ifaceName) {
        String namespace = getNamespace();
        log.info("[NETWORK] deleteInterface vm={} iface={} ns={}", vmName, ifaceName, namespace);

        assertStopped(vmName, namespace);

        kubernetesClient.genericKubernetesResources(VM_CTX)
                .inNamespace(namespace)
                .withName(vmName)
                .edit(vm -> {
                    Map<String, Object> props    = vm.getAdditionalProperties();
                    Map<String, Object> spec     = getOrCreate(props,    "spec");
                    Map<String, Object> template = getOrCreate(spec,     "template");
                    Map<String, Object> tSpec    = getOrCreate(template, "spec");
                    Map<String, Object> domain   = getOrCreate(tSpec,    "domain");
                    Map<String, Object> devices  = getOrCreate(domain,   "devices");

                    List<Map<String, Object>> interfaces = new ArrayList<>(
                            (List<Map<String, Object>>) devices.getOrDefault("interfaces", new ArrayList<>()));
                    interfaces.removeIf(i -> ifaceName.equals(i.get("name")));
                    devices.put("interfaces", interfaces);

                    List<Map<String, Object>> networks = new ArrayList<>(
                            (List<Map<String, Object>>) tSpec.getOrDefault("networks", new ArrayList<>()));
                    networks.removeIf(n -> ifaceName.equals(n.get("name")));
                    tSpec.put("networks", networks);

                    domain.put("devices", devices);
                    tSpec.put("domain", domain);
                    template.put("spec", tSpec);
                    spec.put("template", template);
                    props.put("spec", spec);
                    return vm;
                });

        log.info("[NETWORK] Interface {} supprimée de {}", ifaceName, vmName);
    }
}