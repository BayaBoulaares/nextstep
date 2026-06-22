package com.nextstep.service;

import com.nextstep.dto.VmConfigDTO;
import com.nextstep.dto.VmConfigUpdateDTO;
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
public class VmConfigService {

    private final KubernetesClient kubernetesClient;
    private final NamespaceService namespaceService;

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
    public VmConfigDTO getConfig(String vmName) {
        String namespace = getNamespace();
        log.info("[CONFIG] vmName={} namespace={}", vmName, namespace);

        try {
            // ── Lire le CR VirtualMachine via Fabric8 genericKubernetesResources ──
            ResourceDefinitionContext ctx = new ResourceDefinitionContext.Builder()
                    .withGroup("kubevirt.io")
                    .withVersion("v1")
                    .withKind("VirtualMachine")
                    .withPlural("virtualmachines")
                    .withNamespaced(true)
                    .build();

            Map<String, Object> vm = kubernetesClient
                    .genericKubernetesResources(ctx)
                    .inNamespace(namespace)
                    .withName(vmName)
                    .get()
                    .getAdditionalProperties();

            Map<String, Object> spec     = getMap(vm, "spec");
            Map<String, Object> template = getMap(spec, "template");
            Map<String, Object> tSpec    = getMap(template, "spec");

            // ── DÉTAILS ──────────────────────────────────────────────────────
            Map<String, Object> domain  = getMap(tSpec, "domain");
            Map<String, Object> cpu     = getMap(domain, "cpu");
            Map<String, Object> memory  = getMap(getMap(domain, "resources"), "requests");

            String cpuCores  = cpu.getOrDefault("cores", "1").toString();
            String ram       = memory.getOrDefault("memory", "1Gi").toString();
            String machine   = getString(getMap(domain, "machine"), "type", "pc-q35-rhel9.6.0");
            String hostname  = getString(tSpec, "hostname", vmName);

            // Options (annotations ou runStrategy)
            Map<String, Object> annotations = getMap(getMap(vm, "metadata"), "annotations");
            boolean headless      = "true".equals(annotations.get("vm.kubevirt.io/headless"));
            boolean guestLog      = !"false".equals(annotations.get("vm.kubevirt.io/guest-log-access"));
            boolean deleteProtect = spec.containsKey("running")
                    && "true".equals(annotations.get("kubevirt.io/protection"));

            VmConfigDTO.Details details = VmConfigDTO.Details.builder()
                    .description((String) annotations.getOrDefault("description", null))
                    .cpuCores(cpuCores)
                    .ram(ram)
                    .machineType(machine)
                    .hostname(hostname)
                    .headlessMode(headless)
                    .guestLogAccess(guestLog)
                    .deleteProtection(deleteProtect)
                    .build();

            // ── DISQUES ──────────────────────────────────────────────────────
            List<Map<String, Object>> volumes = getList(tSpec, "volumes");
            List<Map<String, Object>> disks   = getList(domain, "devices", "disks");

            // Map volume name → volume info
            Map<String, Map<String, Object>> volMap = new LinkedHashMap<>();
            for (Map<String, Object> vol : volumes)
                volMap.put((String) vol.get("name"), vol);

            List<VmConfigDTO.Disk> diskList = new ArrayList<>();
            for (Map<String, Object> disk : disks) {
                String dName  = (String) disk.get("name");
                String iface  = disk.containsKey("disk")
                        ? getString(getMap(disk, "disk"), "bus", "virtio")
                        : disk.containsKey("cdrom") ? "cdrom" : "virtio";
                boolean boot  = disk.containsKey("bootOrder");

                Map<String, Object> vol     = volMap.getOrDefault(dName, Map.of());
                String source   = "Other";
                String sourceRef = "-";
                String size     = "Dynamic";
                String sc       = "-";

                if (vol.containsKey("dataVolume")) {           // ← bloc à remplacer ici
                    source    = "DataVolume";
                    sourceRef = getString(getMap(vol, "dataVolume"), "name", dName);
                    // Récupérer taille depuis DataVolume
                    try {
                        Map<String, Object> dvCr = kubernetesClient
                                .genericKubernetesResources(new ResourceDefinitionContext.Builder()
                                        .withGroup("cdi.kubevirt.io")
                                        .withVersion("v1beta1")
                                        .withKind("DataVolume")
                                        .withPlural("datavolumes")
                                        .withNamespaced(true)
                                        .build())
                                .inNamespace(namespace)
                                .withName(sourceRef)
                                .get()
                                .getAdditionalProperties();
                        Map<String, Object> dvSpec = getMap(dvCr, "spec");
                        Map<String, Object> pvc    = getMap(dvSpec, "pvc");
                        size = getString(getMap(pvc, "resources", "requests"), "storage", "Dynamic");
                        sc   = getString(pvc, "storageClassName", "-");
                    } catch (Exception e) {
                        log.debug("[CONFIG] DataVolume {} non lisible: {}", sourceRef, e.getMessage());
                    }
                } else if (vol.containsKey("cloudInitNoCloud") || vol.containsKey("cloudInitConfigDrive")) {
                    source = "CloudInit";
                } else if (vol.containsKey("containerDisk")) {
                    source    = "ContainerDisk";
                    sourceRef = getString(getMap(vol, "containerDisk"), "image", "-");
                }
                // ← juste avant cette accolade fermante, le bloc if/else se termine

                diskList.add(VmConfigDTO.Disk.builder()
                        .name(dName)
                        .source(source)
                        .sourceRef(sourceRef)
                        .size(formatSize(size))
                        .reader("Disk")
                        .iface(iface)
                        .storageClass(sc)
                        .bootable(boot)
                        .build());
            }

            // ── RÉSEAU ───────────────────────────────────────────────────────
            List<Map<String, Object>> interfaces = getList(domain, "devices", "interfaces");
            List<Map<String, Object>> networks   = getList(tSpec, "networks");

            Map<String, String> netNameMap = new LinkedHashMap<>();
            for (Map<String, Object> n : networks) {
                String nName = (String) n.get("name");
                String nNet  = n.containsKey("pod") ? "Pod Networking"
                        : getString(getMap(n, "multus"), "networkName", "default");
                netNameMap.put(nName, nNet);
            }

            List<VmConfigDTO.Network> netList = new ArrayList<>();
            for (Map<String, Object> iface : interfaces) {
                String iName  = (String) iface.get("name");
                String model  = iface.containsKey("masquerade") ? "masquerade"
                        : iface.containsKey("bridge") ? "bridge" : "virtio";
                String mac    = (String) iface.getOrDefault("macAddress", "—");
                String netNet = netNameMap.getOrDefault(iName, "Pod Networking");

                netList.add(VmConfigDTO.Network.builder()
                        .name(iName)
                        .model(model)
                        .networkName(netNet)
                        .macAddress(mac)
                        .build());
            }

            // ── PLANIFICATION ────────────────────────────────────────────────
            Map<String, Object> affinity    = getMap(tSpec, "affinity");
            List<?>             tolerations = (List<?>) tSpec.getOrDefault("tolerations", List.of());
            Map<String, Object> nodeSelector= getMap(tSpec, "nodeSelector");
            String eviction = getString(tSpec, "evictionStrategy", "LiveMigrate");

            int affinityCount = 0;
            if (!affinity.isEmpty()) {
                List<?> na = (boolean) getMap(affinity, "nodeAffinity")
                        .getOrDefault("requiredDuringSchedulingIgnoredDuringExecution", Map.of())
                        .toString().equals("{}") ? List.of() : List.of("x");
                affinityCount = 1; // simplifié
            }

            VmConfigDTO.Scheduling scheduling = VmConfigDTO.Scheduling.builder()
                    .nodeSelector(nodeSelector.isEmpty() ? "Aucun sélecteur"
                            : nodeSelector.toString())
                    .tolerations(tolerations.size() + " Règles de tolérance")
                    .affinityRules(affinityCount + " Règles d'affinité")
                    .evictionStrategy(eviction)
                    .deschedulerEnabled(false)
                    .dedicatedResources("Aucune ressource dédiée appliquée")
                    .build();

            return VmConfigDTO.builder()
                    .details(details)
                    .disks(diskList)
                    .networks(netList)
                    .scheduling(scheduling)
                    .build();

        } catch (Exception e) {
            log.error("[CONFIG] Erreur lecture config VM {}: {}", vmName, e.getMessage(), e);
            throw new RuntimeException("Impossible de lire la configuration de la VM : " + e.getMessage());
        }
    }

    // ── Helpers ──────────────────────────────────────────────────────────────

    @SuppressWarnings("unchecked")
    private Map<String, Object> getMap(Map<String, Object> m, String... keys) {
        Object cur = m;
        for (String k : keys) {
            if (!(cur instanceof Map)) return new LinkedHashMap<>();
            cur = ((Map<?, ?>) cur).get(k);
            if (cur == null) return new LinkedHashMap<>();
        }
        return cur instanceof Map ? (Map<String, Object>) cur : new LinkedHashMap<>();
    }

    @SuppressWarnings("unchecked")
    private List<Map<String, Object>> getList(Map<String, Object> m, String... keys) {
        Object cur = m;
        for (String k : keys) {
            if (!(cur instanceof Map)) return List.of();
            cur = ((Map<?, ?>) cur).get(k);
            if (cur == null) return List.of();
        }
        return cur instanceof List ? (List<Map<String, Object>>) cur : List.of();
    }

    private String getString(Map<String, Object> m, String key, String def) {
        Object v = m.get(key);
        return v != null ? v.toString() : def;
    }

    private String formatSize(String raw) {
        if (raw == null || raw.isBlank() || raw.equals("Dynamic")) return "Dynamic";
        // "21474836480" → "21.2 GiB" ; "21Gi" → "21 GiB"
        try {
            if (raw.endsWith("Gi")) return raw.replace("Gi", " GiB");
            if (raw.endsWith("Mi")) return raw.replace("Mi", " MiB");
            if (raw.endsWith("G"))  return raw.replace("G", " GB");
            long bytes = Long.parseLong(raw);
            double gib = bytes / (1024.0 * 1024 * 1024);
            return String.format("%.1f GiB", gib);
        } catch (Exception e) { return raw; }
    }
    // ── Ajouter dans VmConfigService.java ────────────────────────────────────────

    /**
     * PATCH /api/vms/{name}/config
     * Met à jour : description, CPU, RAM, hostname, options (headless, guestLog, deleteProtect)
     * via un patch stratégique sur le CR VirtualMachine.
     */
    @SuppressWarnings("unchecked")
    public void updateConfig(String vmName, VmConfigUpdateDTO dto) {
        String namespace = getNamespace();
        log.info("[CONFIG UPDATE] vmName={} namespace={} dto={}", vmName, namespace, dto);

        ResourceDefinitionContext ctx = new ResourceDefinitionContext.Builder()
                .withGroup("kubevirt.io")
                .withVersion("v1")
                .withPlural("virtualmachines")
                .withNamespaced(true)
                .build();

        kubernetesClient.genericKubernetesResources(ctx)
                .inNamespace(namespace)
                .withName(vmName)
                .edit(vm -> {
                    Map<String, Object> props    = vm.getAdditionalProperties();
                    Map<String, Object> spec     = getOrCreate(props, "spec");
                    Map<String, Object> template = getOrCreate(spec, "template");
                    Map<String, Object> tSpec    = getOrCreate(template, "spec");
                    Map<String, Object> domain   = getOrCreate(tSpec, "domain");
                    Map<String, Object> cpu      = getOrCreate(domain, "cpu");
                    Map<String, Object> memory   = getOrCreate(domain, "memory");
                    Map<String, Object> meta     = (Map<String, Object>) props.getOrDefault("metadata", new LinkedHashMap<>());
                    Map<String, Object> annotations = getOrCreate(meta, "annotations");

                    // ── Description ──
                    if (dto.getDescription() != null) {
                        annotations.put("description", dto.getDescription());
                    }

                    // ── CPU ──
                    if (dto.getCpuCores() != null && !dto.getCpuCores().isBlank()) {
                        try { cpu.put("cores", Integer.parseInt(dto.getCpuCores().trim())); }
                        catch (NumberFormatException ignored) {}
                    }

                    // ── RAM ──
                    if (dto.getRam() != null && !dto.getRam().isBlank()) {
                        memory.put("guest", dto.getRam().trim());
                    }

                    // ── Hostname ──
                    if (dto.getHostname() != null && !dto.getHostname().isBlank()) {
                        tSpec.put("hostname", dto.getHostname().trim());
                    }

                    // ── Options ──
                    if (dto.getHeadlessMode() != null) {
                        annotations.put("vm.kubevirt.io/headless",
                                dto.getHeadlessMode().toString());
                    }
                    if (dto.getGuestLogAccess() != null) {
                        annotations.put("vm.kubevirt.io/guest-log-access",
                                dto.getGuestLogAccess().toString());
                    }
                    if (dto.getDeleteProtection() != null) {
                        annotations.put("kubevirt.io/protection",
                                dto.getDeleteProtection() ? "true" : "false");
                    }

                    // Remettre en place les maps modifiées
                    domain.put("cpu", cpu);
                    domain.put("memory", memory);
                    tSpec.put("domain", domain);
                    if (dto.getHostname() != null) tSpec.put("hostname", dto.getHostname().trim());
                    template.put("spec", tSpec);
                    spec.put("template", template);
                    meta.put("annotations", annotations);
                    props.put("spec", spec);
                    props.put("metadata", meta);

                    return vm;
                });

        log.info("[CONFIG UPDATE] Patch appliqué pour {}", vmName);
    }

    @SuppressWarnings("unchecked")
    private Map<String, Object> getOrCreate(Map<String, Object> parent, String key) {
        Object val = parent.get(key);
        if (val instanceof Map) return (Map<String, Object>) val;
        Map<String, Object> m = new java.util.LinkedHashMap<>();
        parent.put(key, m);
        return m;
    }
}
