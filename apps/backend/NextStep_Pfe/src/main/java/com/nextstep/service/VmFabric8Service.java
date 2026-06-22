

package com.nextstep.service;

import com.nextstep.dto.VmDTO;
import io.fabric8.kubernetes.api.model.GenericKubernetesResource;
import io.fabric8.kubernetes.api.model.IntOrString;
import io.fabric8.kubernetes.api.model.NodeAddress;
import io.fabric8.kubernetes.api.model.ServiceBuilder;
import io.fabric8.kubernetes.client.KubernetesClient;
import com.nextstep.dto.VmResponse;
import io.fabric8.kubernetes.client.dsl.base.ResourceDefinitionContext;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import com.nextstep.dto.VmDTO;
import com.nextstep.dto.VmResponse;
import io.fabric8.kubernetes.api.model.GenericKubernetesResource;
import io.fabric8.kubernetes.api.model.IntOrString;
import io.fabric8.kubernetes.api.model.NodeAddress;
// ✅ Import explicite du Service Kubernetes avec alias
import io.fabric8.kubernetes.api.model.Service;
import io.fabric8.kubernetes.api.model.ServiceBuilder;
import io.fabric8.kubernetes.client.KubernetesClient;
import io.fabric8.kubernetes.client.dsl.base.ResourceDefinitionContext;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
// ✅ PAS d'import org.springframework.stereotype.Service — utiliser l'annotation complète
import org.springframework.stereotype.Component;
import io.fabric8.kubernetes.client.dsl.base.PatchType;  // ← celui qui manquait

import java.time.LocalDateTime;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Component
@RequiredArgsConstructor
@Slf4j
public class VmFabric8Service {

    private final KubernetesClient k8sClient;

    /*public List<VmResponse> listVms(String namespace) {
        return k8sClient.genericKubernetesResources(
                        "kubevirt.io/v1", "VirtualMachine")
                .inNamespace(namespace)
                .list()
                .getItems()
                .stream()
                .map(this::toVmResponse)
                .collect(Collectors.toList());
    }
*/
    public void startVm(String name, String namespace) {
        patchVmRunning(name, namespace, true);
    }

    public void stopVm(String name, String namespace) {
        patchVmRunning(name, namespace, false);
    }

    public void deleteVm(String name, String namespace) {
        k8sClient.genericKubernetesResources(
                        "kubevirt.io/v1", "VirtualMachine")
                .inNamespace(namespace)
                .withName(name)
                .delete();
    }

   /* private void patchVmRunning(String name,
                                String namespace,
                                boolean running) {
        String patch = """
        {"spec": {"running": %b}}
        """.formatted(running);

        k8sClient.genericKubernetesResources(
                        "kubevirt.io/v1", "VirtualMachine")
                .inNamespace(namespace)
                .withName(name)
                .patch(patch);  // ← sans PatchType, juste la string
    }*/
   private void patchVmRunning(String name, String namespace, boolean running) {
       k8sClient.genericKubernetesResources(VM_CTX)
               .inNamespace(namespace)
               .withName(name)
               .edit(vm -> {
                   Map<String, Object> spec = (Map<String, Object>) vm
                           .getAdditionalProperties()
                           .getOrDefault("spec", new java.util.HashMap<>());
                   spec.put("running", running);
                   vm.getAdditionalProperties().put("spec", spec);
                   return vm;
               });
   }

    private VmResponse toVmResponse(GenericKubernetesResource res) {
        Map<String, Object> spec   = (Map<String, Object>) res.getAdditionalProperties().get("spec");
        Map<String, Object> status = (Map<String, Object>) res.getAdditionalProperties().get("status");

        String ip = null;
        if (status != null) {
            try {
                List<Map<String, Object>> ifaces =
                        (List<Map<String, Object>>) status.get("interfaces");
                if (ifaces != null && !ifaces.isEmpty()) {
                    ip = (String) ifaces.get(0).get("ipAddress");
                }
            } catch (Exception ignored) {}
        }

        // ✅ Conversion ici
        LocalDateTime createdAt = null;
        if (res.getMetadata().getCreationTimestamp() != null) {
            createdAt = OffsetDateTime
                    .parse(res.getMetadata().getCreationTimestamp())
                    .toLocalDateTime();
        }

        return VmResponse.builder()
                .name(res.getMetadata().getName())
                .namespace(res.getMetadata().getNamespace())
                .status(extractStatus(res))
                .ip(ip)
                .createdAt(createdAt)
                .build();
    }

    @SuppressWarnings("unchecked")
    private String extractStatus(GenericKubernetesResource res) {
        try {
            Map<String, Object> status =
                    (Map<String, Object>) res.getAdditionalProperties()
                            .get("status");
            if (status == null) return "EN_ATTENTE";
            return (String) status.getOrDefault(
                    "printableStatus", "EN_ATTENTE");
        } catch (Exception e) {
            return "INCONNU";
        }
    }
    private static final ResourceDefinitionContext VM_CTX =
            new ResourceDefinitionContext.Builder()
                    .withGroup("kubevirt.io")
                    .withVersion("v1")
                    .withPlural("virtualmachines")
                    .withNamespaced(true)
                    .build();

    public List<VmDTO> listVms(String namespace) {
        log.info("Listing VMs in namespace: {}", namespace);
        return k8sClient
                .genericKubernetesResources(VM_CTX)
                .inNamespace(namespace)
                .list()
                .getItems()
                .stream()
                .map(vm -> toVmDTO(vm, namespace))
                .collect(Collectors.toList());
    }

    @SuppressWarnings("unchecked")
    private VmDTO toVmDTO(GenericKubernetesResource vm, String namespace) {
        Map<String, Object> status = (Map<String, Object>) vm
                .getAdditionalProperties().getOrDefault("status", Map.of());
        Map<String, Object> spec = (Map<String, Object>) vm
                .getAdditionalProperties().getOrDefault("spec", Map.of());
        Map<String, Object> template = (Map<String, Object>) spec
                .getOrDefault("template", Map.of());
        Map<String, Object> templateSpec = (Map<String, Object>) template
                .getOrDefault("spec", Map.of());
        Map<String, Object> domain = (Map<String, Object>) templateSpec
                .getOrDefault("domain", Map.of());
        Map<String, Object> cpu = (Map<String, Object>) domain
                .getOrDefault("cpu", Map.of());
        Map<String, Object> memory = (Map<String, Object>) domain
                .getOrDefault("memory", Map.of());

        // ✅ Extraire l'IP depuis status.interfaces[0].ipAddress
        String ip = extractVmIp(vm.getMetadata().getName(), namespace);
        try {
            List<Map<String, Object>> interfaces = (List<Map<String, Object>>)
                    status.getOrDefault("interfaces", List.of());
            if (!interfaces.isEmpty()) {
                ip = (String) interfaces.get(0).get("ipAddress");
                // Nettoyer si format CIDR : "10.128.0.41/24" → "10.128.0.41"
                if (ip != null && ip.contains("/")) {
                    ip = ip.split("/")[0];
                }
            }
        } catch (Exception e) {
            log.debug("[VM] Impossible d'extraire l'IP pour {}: {}", vm.getMetadata().getName(), e.getMessage());
        }

        // ✅ Extraire node depuis status.nodeName (via VMI)
        String nodeName = null;
        try {
            ResourceDefinitionContext vmiCtx = new ResourceDefinitionContext.Builder()
                    .withGroup("kubevirt.io")
                    .withVersion("v1")
                    .withPlural("virtualmachineinstances")
                    .withNamespaced(true)
                    .build();
            var vmi = k8sClient.genericKubernetesResources(vmiCtx)
                    .inNamespace(namespace)
                    .withName(vm.getMetadata().getName())
                    .get();
            if (vmi != null) {
                Map<String, Object> vmiStatus = (Map<String, Object>)
                        vmi.getAdditionalProperties().getOrDefault("status", Map.of());
                nodeName = (String) vmiStatus.get("nodeName");
            }
        } catch (Exception ignored) {}

        Map<String, String> labels = vm.getMetadata().getLabels();
        String availabilitySet = null;
        if (labels != null) {
            String asLabel = labels.get("portal/availability-set");
            if (asLabel != null && !asLabel.equals("none")) {
                availabilitySet = asLabel;
            }
        }

        // OS image (DataVolume ou containerDisk)
        List<Map<String, Object>> volumes = (List<Map<String, Object>>) templateSpec
                .getOrDefault("volumes", List.of());
        String osImage = volumes.stream()
                .filter(v -> v.containsKey("dataVolume"))
                .map(v -> {
                    List<Map<String, Object>> dvTemplates = (List<Map<String, Object>>)
                            ((Map<String, Object>) vm.getAdditionalProperties()
                                    .getOrDefault("spec", Map.of()))
                                    .getOrDefault("dataVolumeTemplates", List.of());
                    return dvTemplates.stream()
                            .map(dv -> {
                                Map<String, Object> dvSpec = (Map<String, Object>) dv.getOrDefault("spec", Map.of());
                                Map<String, Object> source = (Map<String, Object>) dvSpec.getOrDefault("source", Map.of());
                                Map<String, Object> http   = (Map<String, Object>) source.getOrDefault("http", Map.of());
                                String httpUrl = (String) http.getOrDefault("url", "");
                                if (!httpUrl.isBlank()) return httpUrl;
                                Map<String, Object> sourceRef = (Map<String, Object>) dvSpec.getOrDefault("sourceRef", Map.of());
                                return (String) sourceRef.getOrDefault("name", "");
                            })
                            .findFirst().orElse("");
                })
                .findFirst()
                .orElse(
                        volumes.stream()
                                .filter(v -> v.containsKey("containerDisk"))
                                .map(v -> (String) ((Map<String, Object>) v.get("containerDisk"))
                                        .getOrDefault("image", ""))
                                .findFirst().orElse("")
                );

        // DataVolume phase
        String dataVolumePhase = null;
        try {
            ResourceDefinitionContext dvCtx = new ResourceDefinitionContext.Builder()
                    .withGroup("cdi.kubevirt.io")
                    .withVersion("v1beta1")
                    .withPlural("datavolumes")
                    .withNamespaced(true)
                    .build();
            var dv = k8sClient.genericKubernetesResources(dvCtx)
                    .inNamespace(namespace)
                    .withName(vm.getMetadata().getName() + "-rootdisk")
                    .get();
            if (dv != null) {
                Map<String, Object> dvStatus = (Map<String, Object>)
                        dv.getAdditionalProperties().getOrDefault("status", Map.of());
                dataVolumePhase = (String) dvStatus.getOrDefault("phase", null);
            }
        } catch (Exception ignored) {}

        return VmDTO.builder()
                .name(vm.getMetadata().getName())
                .namespace(namespace)
                .status((String) status.getOrDefault("printableStatus", "Unknown"))
                .ip(ip)                          // ✅ IP maintenant extraite
                .node(nodeName)                  // ✅ Node extrait depuis VMI
                .cpuCores(cpu.containsKey("cores")
                        ? ((Number) cpu.get("cores")).intValue() : 0)
                .ramGb((String) memory.getOrDefault("guest", ""))
                .osImage(osImage)
                .createdAt(vm.getMetadata().getCreationTimestamp())
                .availabilitySet(availabilitySet)
                .dataVolumePhase(dataVolumePhase)
                .build();
    }    public void rebootVm(String name, String namespace) {
        log.info("[VM] Reboot de {} dans {}", name, namespace);

        // ✅ Utiliser edit() qui gère correctement le Content-Type
        k8sClient.genericKubernetesResources(VM_CTX)
                .inNamespace(namespace)
                .withName(name)
                .edit(vm -> {
                    Map<String, Object> spec = (Map<String, Object>) vm
                            .getAdditionalProperties()
                            .getOrDefault("spec", new java.util.HashMap<>());
                    spec.put("running", false);
                    vm.getAdditionalProperties().put("spec", spec);
                    return vm;
                });

        // Attendre que la VM soit Stopped (max 30s)
        long deadline = System.currentTimeMillis() + 30_000;
        while (System.currentTimeMillis() < deadline) {
            try { Thread.sleep(2000); } catch (InterruptedException ignored) {}
            GenericKubernetesResource vm = k8sClient
                    .genericKubernetesResources(VM_CTX)
                    .inNamespace(namespace).withName(name).get();
            if (vm != null) {
                Map<String, Object> status = (Map<String, Object>) vm
                        .getAdditionalProperties().getOrDefault("status", Map.of());
                String s = (String) status.getOrDefault("printableStatus", "");
                log.info("[VM] Reboot attente: status={}", s);
                if ("Stopped".equals(s)) break;
            }
        }

        // ✅ Redémarrer
        k8sClient.genericKubernetesResources(VM_CTX)
                .inNamespace(namespace)
                .withName(name)
                .edit(vm -> {
                    Map<String, Object> spec = (Map<String, Object>) vm
                            .getAdditionalProperties()
                            .getOrDefault("spec", new java.util.HashMap<>());
                    spec.put("running", true);
                    vm.getAdditionalProperties().put("spec", spec);
                    return vm;
                });

        log.info("[VM] Reboot terminé pour {}", name);
    }
    // Ajouter dans VmFabric8Service.java

// ── Réseau : NodePort SSH ─────────────────────────────────────────────

    public Map<String, Object> exposeVmSsh(String vmName, String namespace) {
        String serviceName = vmName + "-ssh";

        // Vérifier si le service existe déjà
        Service existing = k8sClient.services()
                .inNamespace(namespace)
                .withName(serviceName)
                .get();

        if (existing != null) {
            log.info("[NETWORK] Service SSH déjà existant pour {}", vmName);
            return extractServiceInfo(existing);
        }

        // Créer le Service NodePort
        Service service = new ServiceBuilder()
                .withNewMetadata()
                .withName(serviceName)
                .withNamespace(namespace)
                .addToLabels("portal/vm",      vmName)
                .addToLabels("portal/managed", "true")
                .endMetadata()
                .withNewSpec()
                .withType("NodePort")
                .addToSelector("kubevirt.io/vm", vmName)
                .addNewPort()
                .withName("ssh")
                .withPort(22)
                .withTargetPort(new IntOrString(22))
                .withProtocol("TCP")
                .endPort()
                .endSpec()
                .build();

        Service created = k8sClient.services()
                .inNamespace(namespace)
                .resource(service)
                .create();

        log.info("[NETWORK] Service NodePort SSH créé pour {}", vmName);
        return extractServiceInfo(created);
    }

    public void unexposeVmSsh(String vmName, String namespace) {
        String serviceName = vmName + "-ssh";
        Service existing = k8sClient.services()
                .inNamespace(namespace)
                .withName(serviceName)
                .get();

        if (existing != null) {
            k8sClient.services()
                    .inNamespace(namespace)
                    .withName(serviceName)
                    .delete();
            log.info("[NETWORK] Service SSH supprimé pour {}", vmName);
        }
    }

    public List<Map<String, Object>> listVmServices(String vmName, String namespace) {
        return k8sClient.services()
                .inNamespace(namespace)
                .withLabel("portal/vm", vmName)
                .list()
                .getItems()
                .stream()
                .map(this::extractServiceInfo)
                .collect(Collectors.toList());
    }

    @SuppressWarnings("unchecked")
    private Map<String, Object> extractServiceInfo(Service svc) {
        int nodePort = 0;
        if (svc.getSpec().getPorts() != null && !svc.getSpec().getPorts().isEmpty()) {
            Integer np = svc.getSpec().getPorts().get(0).getNodePort();
            nodePort = np != null ? np : 0;
        }

        // Récupérer l'IP d'un node (node1 = 10.9.21.22)
        String nodeIp = k8sClient.nodes().list().getItems().stream()
                .flatMap(n -> n.getStatus().getAddresses().stream())
                .filter(a -> "InternalIP".equals(a.getType()))
                .map(NodeAddress::getAddress)
                .findFirst()
                .orElse("unknown");

        return Map.of(
                "serviceName", svc.getMetadata().getName(),
                "type",        svc.getSpec().getType(),
                "nodePort",    nodePort,
                "nodeIp",      nodeIp,
                "sshCommand",  nodePort > 0
                        ? "ssh ubuntu@" + nodeIp + " -p " + nodePort
                        : "NodePort non disponible"
        );
    }
    /**
     * Liste toutes les VMs appartenant à un Availability Set donné.
     * Utilise le label portal/availability-set posé par Terraform.
     */
    public List<VmDTO> listVmsByAvailabilitySet(String availabilitySet, String namespace) {
        log.info("[AS] Listing VMs for availability-set={} in ns={}", availabilitySet, namespace);
        return k8sClient
                .genericKubernetesResources(VM_CTX)
                .inNamespace(namespace)
                .withLabel("portal/availability-set", availabilitySet)
                .list()
                .getItems()
                .stream()
                .map(vm -> toVmDTO(vm, namespace))
                .collect(Collectors.toList());
    }

    /**
     * Retourne les nodes sur lesquels les VMs d'un AS sont schedulées.
     * Permet de vérifier que l'anti-affinité fonctionne.
     */
    public Map<String, String> getAvailabilitySetDistribution(String availabilitySet,
                                                              String namespace) {
        // VMI = VirtualMachineInstance (la VM en cours d'exécution)
        ResourceDefinitionContext vmiCtx = new ResourceDefinitionContext.Builder()
                .withGroup("kubevirt.io")
                .withVersion("v1")
                .withPlural("virtualmachineinstances")
                .withNamespaced(true)
                .build();

        return k8sClient
                .genericKubernetesResources(vmiCtx)
                .inNamespace(namespace)
                .withLabel("portal/availability-set", availabilitySet)
                .list()
                .getItems()
                .stream()
                .collect(Collectors.toMap(
                        vmi -> vmi.getMetadata().getName(),
                        vmi -> {
                            Map<String, Object> status = (Map<String, Object>)
                                    vmi.getAdditionalProperties().getOrDefault("status", Map.of());
                            return (String) status.getOrDefault("nodeName", "unknown");
                        }
                ));
    }
    /**
     * Vérifie que le PVC rootdisk de la VM source existe et est prêt.
     * Retourne le nom du PVC : "<vmName>-rootdisk"
     *
     * @throws IllegalStateException si la VM source est encore en train d'importer
     *                               ou si le PVC n'existe pas
     */
    /*avant clonagepublic String resolveSourcePvc(String sourceVmName, String namespace) {
        String pvcName = sourceVmName + "-rootdisk";

        ResourceDefinitionContext dvCtx = new ResourceDefinitionContext.Builder()
                .withGroup("cdi.kubevirt.io")
                .withVersion("v1beta1")
                .withPlural("datavolumes")
                .withNamespaced(true)
                .build();


        GenericKubernetesResource dv = k8sClient
                .genericKubernetesResources(dvCtx)
                .inNamespace(namespace)
                .withName(pvcName)
                .get();

        if (dv == null) {
            throw new IllegalStateException(
                    "DataVolume introuvable pour la VM source : " + pvcName
                            + ". Vérifiez que la VM source existe et a été déployée avec DataVolume.");
        }

        @SuppressWarnings("unchecked")
        Map<String, Object> dvStatus = (Map<String, Object>)
                dv.getAdditionalProperties().getOrDefault("status", Map.of());
        String phase = (String) dvStatus.getOrDefault("phase", "Unknown");

        if (!"Succeeded".equals(phase)) {
            throw new IllegalStateException(
                    "Le DataVolume " + pvcName + " n'est pas prêt (phase=" + phase + "). "
                            + "Attendez que l'import soit terminé avant de cloner.");
        }

        log.info("[CLONE] PVC source résolu : {} (phase={})", pvcName, phase);
        return pvcName;
    }*/
    public String resolveSourcePvc(String sourceVmName, String namespace) {
        String pvcName = sourceVmName + "-rootdisk";

        ResourceDefinitionContext dvCtx = new ResourceDefinitionContext.Builder()
                .withGroup("cdi.kubevirt.io")
                .withVersion("v1beta1")
                .withPlural("datavolumes")
                .withNamespaced(true)
                .build();

        try {
            var dv = k8sClient.genericKubernetesResources(dvCtx)
                    .inNamespace(namespace)
                    .withName(pvcName)
                    .get();

            if (dv == null) {
                log.warn("[CLONE] DataVolume {} non trouvé, tentative avec PVC direct", pvcName);
                // Vérifier si le PVC existe directement
                var pvc = k8sClient.persistentVolumeClaims()
                        .inNamespace(namespace)
                        .withName(pvcName)
                        .get();
                if (pvc == null) {
                    throw new IllegalStateException("DataVolume/PVC introuvable: " + pvcName);
                }
                return pvcName;
            }

            @SuppressWarnings("unchecked")
            Map<String, Object> dvStatus = (Map<String, Object>)
                    dv.getAdditionalProperties().getOrDefault("status", Map.of());
            String phase = (String) dvStatus.getOrDefault("phase", "Unknown");

            if (!"Succeeded".equals(phase)) {
                log.warn("[CLONE] DataVolume {} phase={}, tentative quand même", pvcName, phase);
            }

            log.info("[CLONE] PVC source résolu : {}", pvcName);
            return pvcName;

        } catch (Exception e) {
            log.warn("[CLONE] Impossible de vérifier le DataVolume: {}", e.getMessage());
            return pvcName;
        }
    }    // Modifiez la méthode toVmDTO pour extraire l'IP correctement :

    @SuppressWarnings("unchecked")
    private String extractVmIp(String vmName, String namespace) {
        try {
            ResourceDefinitionContext vmiCtx = new ResourceDefinitionContext.Builder()
                    .withGroup("kubevirt.io")
                    .withVersion("v1")
                    .withPlural("virtualmachineinstances")
                    .withNamespaced(true)
                    .build();

            var vmi = k8sClient.genericKubernetesResources(vmiCtx)
                    .inNamespace(namespace)
                    .withName(vmName)
                    .get();

            if (vmi != null) {
                Map<String, Object> vmiStatus = (Map<String, Object>)
                        vmi.getAdditionalProperties().getOrDefault("status", Map.of());
                List<Map<String, Object>> interfaces = (List<Map<String, Object>>)
                        vmiStatus.getOrDefault("interfaces", List.of());
                if (!interfaces.isEmpty()) {
                    String ip = (String) interfaces.get(0).get("ipAddress");
                    if (ip != null && ip.contains("/")) {
                        ip = ip.split("/")[0];
                    }
                    log.info("[VM] IP extraite pour {}: {}", vmName, ip);
                    return ip;
                }
            }
        } catch (Exception e) {
            log.warn("[VM] Impossible d'extraire l'IP pour {}: {}", vmName, e.getMessage());
        }
        return null;
    }
    /**
     * Attache un PVC existant (Block ou File Storage) à une VM en ajoutant
     * un disk + volume dans le spec KubeVirt. La VM doit être arrêtée pour
     * appliquer le changement proprement (KubeVirt recharge le spec au redémarrage).
     */
    @SuppressWarnings("unchecked")
    public void attachPvcToVm(String vmName, String namespace, String pvcName, String diskName) {
        k8sClient.genericKubernetesResources(VM_CTX)
                .inNamespace(namespace)
                .withName(vmName)
                .edit(vm -> {
                    Map<String, Object> spec = (Map<String, Object>) vm
                            .getAdditionalProperties()
                            .getOrDefault("spec", new java.util.HashMap<>());
                    Map<String, Object> template = (Map<String, Object>) spec
                            .getOrDefault("template", new java.util.HashMap<>());
                    Map<String, Object> templateSpec = (Map<String, Object>) template
                            .getOrDefault("spec", new java.util.HashMap<>());
                    Map<String, Object> domain = (Map<String, Object>) templateSpec
                            .getOrDefault("domain", new java.util.HashMap<>());

                    // ── 1. Ajouter le disk dans domain.devices.disks ──
                    Map<String, Object> devices = (Map<String, Object>) domain
                            .getOrDefault("devices", new java.util.HashMap<>());
                    List<Map<String, Object>> disks = (List<Map<String, Object>>) devices
                            .getOrDefault("disks", new java.util.ArrayList<>());

                    boolean diskExists = disks.stream()
                            .anyMatch(d -> diskName.equals(d.get("name")));
                    if (!diskExists) {
                        Map<String, Object> newDisk = new java.util.HashMap<>();
                        newDisk.put("name", diskName);
                        Map<String, Object> diskDevice = new java.util.HashMap<>();
                        diskDevice.put("bus", "virtio");
                        Map<String, Object> diskInner = new java.util.HashMap<>();
                        diskInner.put("disk", diskDevice);
                        newDisk.put("disk", diskDevice);
                        disks.add(newDisk);
                    }
                    devices.put("disks", disks);
                    domain.put("devices", devices);
                    templateSpec.put("domain", domain);

                    // ── 2. Ajouter le volume dans templateSpec.volumes ──
                    List<Map<String, Object>> volumes = (List<Map<String, Object>>) templateSpec
                            .getOrDefault("volumes", new java.util.ArrayList<>());

                    boolean volumeExists = volumes.stream()
                            .anyMatch(v -> diskName.equals(v.get("name")));
                    if (!volumeExists) {
                        Map<String, Object> newVolume = new java.util.HashMap<>();
                        newVolume.put("name", diskName);
                        Map<String, Object> pvcRef = new java.util.HashMap<>();
                        pvcRef.put("claimName", pvcName);
                        newVolume.put("persistentVolumeClaim", pvcRef);
                        volumes.add(newVolume);
                    }
                    templateSpec.put("volumes", volumes);

                    template.put("spec", templateSpec);
                    spec.put("template", template);
                    vm.getAdditionalProperties().put("spec", spec);
                    return vm;
                });

        log.info("[STORAGE] PVC {} attaché à la VM {} comme disk={}", pvcName, vmName, diskName);
    }

    /**
     * Détache un disk/volume précédemment attaché (pour la suppression du storage).
     */
    @SuppressWarnings("unchecked")
    public void detachPvcFromVm(String vmName, String namespace, String diskName) {
        k8sClient.genericKubernetesResources(VM_CTX)
                .inNamespace(namespace)
                .withName(vmName)
                .edit(vm -> {
                    Map<String, Object> spec = (Map<String, Object>) vm
                            .getAdditionalProperties().getOrDefault("spec", Map.of());
                    Map<String, Object> template = (Map<String, Object>) spec
                            .getOrDefault("template", Map.of());
                    Map<String, Object> templateSpec = (Map<String, Object>) template
                            .getOrDefault("spec", Map.of());
                    Map<String, Object> domain = (Map<String, Object>) templateSpec
                            .getOrDefault("domain", Map.of());
                    Map<String, Object> devices = (Map<String, Object>) domain
                            .getOrDefault("devices", Map.of());

                    List<Map<String, Object>> disks = (List<Map<String, Object>>) devices
                            .getOrDefault("disks", new java.util.ArrayList<>());
                    disks.removeIf(d -> diskName.equals(d.get("name")));
                    devices.put("disks", disks);
                    domain.put("devices", devices);
                    templateSpec.put("domain", domain);

                    List<Map<String, Object>> volumes = (List<Map<String, Object>>) templateSpec
                            .getOrDefault("volumes", new java.util.ArrayList<>());
                    volumes.removeIf(v -> diskName.equals(v.get("name")));
                    templateSpec.put("volumes", volumes);

                    template.put("spec", templateSpec);
                    spec.put("template", template);
                    vm.getAdditionalProperties().put("spec", spec);
                    return vm;
                });

        log.info("[STORAGE] Disk {} détaché de la VM {}", diskName, vmName);
    }
// Appelez cette méthode dans toVmDTO


}