// com/nextstep/service/VmProvisioningService.java
package com.nextstep.service;

/*import com.nextstep.dto.VmRequest;
import com.nextstep.entity.Deployment;
import com.nextstep.entity.DeploymentStatus;
import com.nextstep.repository.DeploymentRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
@Slf4j
public class VmProvisioningService {

    private final DeploymentRepository deploymentRepository;
    private final NamespaceService     namespaceService;
    private final TerraformService     terraformService;

    /**
     * Appelé par DeploymentController.startProvisioning().
     * Tourne dans un thread séparé (@Async) pour ne pas bloquer le HTTP.
     * Le frontend poll /api/deployments/{id} toutes les 3s — c'est ce que
     * DeploiementPage.tsx fait déjà via useDeploymentTunnel.pollUntilRunning().
     */
    /*@Async
    public void provisionAsync(Long deploymentId) {

        // ✅ Recharge le deployment avec le user en EAGER dans ce thread
        Deployment d = deploymentRepository.findByIdWithUser(deploymentId)
                .orElseThrow(() -> new IllegalArgumentException(
                        "Déploiement introuvable : " + deploymentId));
        String username = d.getUser().getEmail()
                .split("@")[0]
                .replace(".", "-");  // ← baya.boulaares72 → baya-boulaares72

        String namespace = namespaceService.getNamespaceForUser(username);

        try {
            namespaceService.provisionIfAbsent(username);
            log.info("[PROVISION {}] Namespace {} prêt", deploymentId, namespace);
        } catch (Exception e) {
            log.error("[PROVISION {}] Erreur namespace: {}", deploymentId, e.getMessage());
            markFailed(d);
            return;
        }

        // ── 2. Construire VmRequest depuis le Deployment + Plan ───────────
        VmRequest vmRequest = VmRequest.builder()
                .vmName(sanitize(d.getResourceName()))
                .cpuCores(d.getPlan().getVcores()    != null ? d.getPlan().getVcores()    : 2)
                .ramGb   (d.getPlan().getRamGb()     != null ? d.getPlan().getRamGb()     : 4)
                .diskGb  (d.getPlan().getStorageGb() != null ? d.getPlan().getStorageGb() : 20)
                .osImage (d.getOperatingSystem() != null
                        ? d.getOperatingSystem().getTerraformImage()
                        : "ubuntu-24.04")
                .build();

        log.info("[PROVISION {}] Lancement Terraform — VM={} NS={} OS={}",
                deploymentId, vmRequest.getVmName(), namespace, vmRequest.getOsImage());

        // ── 3. Appel Terraform ────────────────────────────────────────────
        try {
            terraformService.createVm(vmRequest, namespace);
            log.info("[PROVISION {}] Terraform OK", deploymentId);
        } catch (Exception e) {
            log.error("[PROVISION {}] Terraform FAILED: {}", deploymentId, e.getMessage());
            markFailed(d);
            return;
        }

        // ── 4. Marquer EN_LIGNE ───────────────────────────────────────────
        d.setStatus(DeploymentStatus.EN_LIGNE);
        deploymentRepository.save(d);
        log.info("[PROVISION {}] Statut → EN_LIGNE", deploymentId);
    }

    // ── Helpers ───────────────────────────────────────────────────────────

    private void markFailed(Deployment d) {
        d.setStatus(DeploymentStatus.ECHEC);
        deploymentRepository.save(d);
    }

    /** Kubernetes n'accepte que des noms RFC-1123 (minuscules, tirets) */
   /* private String sanitize(String name) {
        return name.toLowerCase()
                .replaceAll("[^a-z0-9-]", "-")
                .replaceAll("-+", "-")
                .replaceAll("^-|-$", "");
    }
}*/
// com/nextstep/service/VmProvisioningService.java

/*import com.nextstep.dto.TerraformResult;
import com.nextstep.dto.VmRequest;
import com.nextstep.entity.Deployment;
import com.nextstep.entity.DeploymentStatus;
import com.nextstep.entity.ServiceCategory;
import com.nextstep.entity.VirtualMachine;
import com.nextstep.repository.DeploymentRepository;
import com.nextstep.repository.VirtualMachineRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
@Slf4j
public class VmProvisioningService {

    private final DeploymentRepository     deploymentRepository;
    private final VirtualMachineRepository vmRepository;      // ✅ nouveau
    private final NamespaceService         namespaceService;
    private final TerraformService         terraformService;

    @Async
    public void provisionAsync(Long deploymentId) {

        Deployment d = deploymentRepository.findByIdWithUser(deploymentId)
                .orElseThrow(() -> new IllegalArgumentException(
                        "Déploiement introuvable : " + deploymentId));

        String username  = d.getUser().getEmail()
                .split("@")[0].replace(".", "-");
        String namespace = namespaceService.getNamespaceForUser(username);

        // ── 1. Namespace ──────────────────────────────────────────────────
        try {
            namespaceService.provisionIfAbsent(username);
            log.info("[PROVISION {}] Namespace {} prêt", deploymentId, namespace);
        } catch (Exception e) {
            log.error("[PROVISION {}] Erreur namespace: {}", deploymentId, e.getMessage());
            markFailed(d);
            return;
        }

        // ── 2. Construire VmRequest ───────────────────────────────────────
        ServiceCategory category = d.getPlan().getService().getCategory();

        if (!category.requiresVm()) {
            log.warn("[PROVISION {}] Catégorie {} sans VM — marqué EN_LIGNE directement",
                    deploymentId, category);
            d.setStatus(DeploymentStatus.EN_LIGNE);
            deploymentRepository.save(d);
            return;
        }

        VmRequest vmRequest = VmRequest.builder()
                .vmName      (sanitize(d.getResourceName()))
                .instanceType(category.defaultInstanceType)
                .diskGb      (d.getPlan().getStorageGb() != null ? d.getPlan().getStorageGb() : 20)
                .osImage     (d.getOperatingSystem() != null
                        ? d.getOperatingSystem().getTerraformImage()
                        : "quay.io/containerdisks/ubuntu:24.04")
                .build();

        log.info("[PROVISION {}] Lancement Terraform — VM={} NS={} OS={}",
                deploymentId, vmRequest.getVmName(), namespace, vmRequest.getOsImage());

        // ── 3. Terraform ──────────────────────────────────────────────────
        try {
            TerraformResult result = terraformService.createVm(vmRequest, namespace);
            log.info("[PROVISION {}] Terraform OK — password={}", deploymentId,
                    result.getPassword() != null ? "généré" : "null");

            // ✅ Sauvegarder la VM avec le password en BDD
            VirtualMachine vm = new VirtualMachine();
            vm.setName(vmRequest.getVmName());
            vm.setNamespace(namespace);
            vm.setKeycloakUserId(d.getUser().getKeycloakId() != null
                    ? d.getUser().getKeycloakId() : "");
            vm.setUsername(username);
            vm.setCpuCores(vmRequest.getCpuCores());
            vm.setRamGb(vmRequest.getRamGb());
            vm.setDiskGb(vmRequest.getDiskGb());
            vm.setOsImage(vmRequest.getOsImage());
            vm.setVmPassword(result.getPassword()); // ✅ password cloud-init
            vmRepository.save(vm);

            log.info("[PROVISION {}] VM sauvegardée en BDD — name={} username={}",
                    deploymentId, vm.getName(), username);

        } catch (Exception e) {
            log.error("[PROVISION {}] Terraform FAILED: {}", deploymentId, e.getMessage());
            markFailed(d);
            return;
        }

        // ── 4. Marquer EN_LIGNE ───────────────────────────────────────────
        d.setStatus(DeploymentStatus.EN_LIGNE);
        deploymentRepository.save(d);
        log.info("[PROVISION {}] Statut → EN_LIGNE", deploymentId);
    }

    private void markFailed(Deployment d) {
        d.setStatus(DeploymentStatus.ECHEC);
        deploymentRepository.save(d);
    }

    private String sanitize(String name) {
        return name.toLowerCase()
                .replaceAll("[^a-z0-9-]", "-")
                .replaceAll("-+", "-")
                .replaceAll("^-|-$", "");
    }

}*/
// VmProvisioningService.java — VERSION CORRIGÉE COMPLÈTE

import com.nextstep.dto.TerraformResult;
import com.nextstep.dto.VmRequest;
import com.nextstep.entity.*;
import com.nextstep.repository.DeploymentRepository;
import com.nextstep.repository.VirtualMachineRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
@Slf4j
public class VmProvisioningService {

    private final DeploymentRepository     deploymentRepository;
    private final VirtualMachineRepository vmRepository;
    private final NamespaceService         namespaceService;
    private final TerraformService         terraformService;
    private final DeploymentService        deploymentService;
    private final VmFabric8Service         vmFabric8Service; // ← était VmService

    // ── Flux async (appelé depuis DeploymentController) ──────────────────────

    @Async
    public void provisionAsync(Long deploymentId) {

        Deployment d = deploymentRepository.findByIdWithUser(deploymentId)
                .orElseThrow(() -> new IllegalArgumentException(
                        "Déploiement introuvable : " + deploymentId));

        String username  = sanitizeUsername(d.getUser().getEmail());
        String namespace = namespaceService.getNamespaceForUser(username);

        // 1. Namespace
        try {
            namespaceService.provisionIfAbsent(username);
            log.info("[PROVISION {}] Namespace {} prêt", deploymentId, namespace);
        } catch (Exception e) {
            log.error("[PROVISION {}] Erreur namespace: {}", deploymentId, e.getMessage());
            markFailed(d);
            return;
        }

        // 2. Vérifier si la catégorie nécessite une VM
        ServiceCategory category = d.getPlan().getService().getCategory();
        if (!category.requiresVm()) {
            log.warn("[PROVISION {}] Catégorie {} sans VM — EN_LIGNE directement",
                    deploymentId, category);
            d.setStatus(DeploymentStatus.EN_LIGNE);
            deploymentRepository.save(d);
            return;
        }

        // 3. Construire VmRequest
        String osImage = d.getOperatingSystem() != null
                ? d.getOperatingSystem().getTerraformImage()   // ← utilise directement l'enum
                : OperatingSystem.UBUNTU_24_04_LTS.getTerraformImage();

        /* vesrion kbal availabilty set
        VmRequest vmRequest = VmRequest.builder()

                .vmName      (sanitize(d.getResourceName()))
                .instanceType(category.defaultInstanceType)
                .cpuCores    (d.getPlan().getVcores()    != null ? d.getPlan().getVcores()    : 2)
                .ramGb       (d.getPlan().getRamGb()     != null ? d.getPlan().getRamGb()     : 4)
                .diskGb      (d.getPlan().getStorageGb() != null ? d.getPlan().getStorageGb() : 20)
                .osImage     (osImage)
                .build();*/
        VmRequest vmRequest = VmRequest.builder()
                .vmName          (sanitize(d.getResourceName()))
                .instanceType    (category.defaultInstanceType)
                .cpuCores        (d.getPlan().getVcores()    != null ? d.getPlan().getVcores()    : 2)
                .ramGb           (d.getPlan().getRamGb()     != null ? d.getPlan().getRamGb()     : 4)
                .diskGb          (d.getPlan().getStorageGb() != null ? d.getPlan().getStorageGb() : 20)
                .osImage         (osImage)
                .availabilitySet (d.getAvailabilitySet())   // ← champ à ajouter dans Deployment
                .build();

        log.info("[PROVISION {}] VM={} NS={} OS={}",
                deploymentId, vmRequest.getVmName(), namespace, vmRequest.getOsImage());

        // 4. Terraform
        try {
            TerraformResult result = terraformService.createVm(vmRequest, namespace);

            VirtualMachine vm = new VirtualMachine();
            vm.setName       (vmRequest.getVmName());
            vm.setNamespace  (namespace);
            vm.setKeycloakUserId(d.getUser().getKeycloakId() != null
                    ? d.getUser().getKeycloakId() : "");
            vm.setUsername   (username);
            vm.setCpuCores   (vmRequest.getCpuCores());
            vm.setRamGb      (vmRequest.getRamGb());
            vm.setDiskGb     (vmRequest.getDiskGb());
            vm.setOsImage    (vmRequest.getOsImage());
            vm.setVmPassword (result.getPassword());
            vmRepository.save(vm);

            // Lier la VM au Deployment
            d.setVirtualMachine(vm);
            d.setStatus(DeploymentStatus.ACTIF);
            deploymentRepository.save(d);

            log.info("[PROVISION {}] → EN_LIGNE, VM={}", deploymentId, vm.getName());

        } catch (Exception e) {
            log.error("[PROVISION {}] Terraform FAILED: {}", deploymentId, e.getMessage());
            markFailed(d);
        }
    }

    // ── Flux sync (appelé depuis DeploymentFactory) ───────────────────────────

    public VirtualMachine provisionner(Deployment deployment, Plan plan, Client client) {

        deploymentService.startProvisioning(deployment.getId());

        String username  = sanitizeUsername(client.getEmail());
        String namespace = namespaceService.getNamespaceForUser(username);
        String vmName    = sanitize(plan.getService().getName() + "-"
                + client.getId().toString().substring(0, 8));

        String osImage = deployment.getOperatingSystem() != null
                ? deployment.getOperatingSystem().getTerraformImage()
                : OperatingSystem.UBUNTU_24_04_LTS.getTerraformImage();

        try {
            namespaceService.provisionIfAbsent(username);

            // Exposer SSH via NodePort (optionnel, non bloquant)
            try {
                vmFabric8Service.exposeVmSsh(vmName, namespace);
            } catch (Exception ex) {
                log.warn("[PROVISION] Exposition SSH échouée (non bloquant): {}", ex.getMessage());
            }

            /* version kbal availabilty set
            VmRequest vmRequest = VmRequest.builder()
                    .vmName      (vmName)
                    .instanceType(plan.getService().getCategory().defaultInstanceType)
                    .cpuCores    (plan.getVcores()    != null ? plan.getVcores()    : 2)
                    .ramGb       (plan.getRamGb()     != null ? plan.getRamGb()     : 4)
                    .diskGb      (plan.getStorageGb() != null ? plan.getStorageGb() : 20)
                    .osImage     (osImage)
                    .build();*/
            VmRequest vmRequest = VmRequest.builder()
                    .vmName          (vmName)
                    .instanceType    (plan.getService().getCategory().defaultInstanceType)
                    .cpuCores        (plan.getVcores()    != null ? plan.getVcores()    : 2)
                    .ramGb           (plan.getRamGb()     != null ? plan.getRamGb()     : 4)
                    .diskGb          (plan.getStorageGb() != null ? plan.getStorageGb() : 20)
                    .osImage         (osImage)
                    .availabilitySet (deployment.getAvailabilitySet())  // ←
                    .useDataVolume(true)
                    .build();

            TerraformResult result = terraformService.createVm(vmRequest, namespace);

            VirtualMachine vm = new VirtualMachine();
            vm.setName       (vmName);
            vm.setNamespace  (namespace);
            vm.setKeycloakUserId(client.getKeycloakId() != null ? client.getKeycloakId() : "");
            vm.setUsername   (username);
            vm.setCpuCores   (vmRequest.getCpuCores());
            vm.setRamGb      (vmRequest.getRamGb());
            vm.setDiskGb     (vmRequest.getDiskGb());
            vm.setOsImage    (vmRequest.getOsImage());
            vm.setVmPassword (result.getPassword());
            vmRepository.save(vm);

            deploymentService.markRunning(deployment.getId());
            return vm;

        } catch (Exception ex) {
            log.error("[PROVISION] Échec pour deployment {}: {}", deployment.getId(), ex.getMessage());
            deploymentService.changeStatus(deployment.getId(), DeploymentStatus.ECHEC);
            throw new RuntimeException("Provisionnement échoué : " + ex.getMessage(), ex);
        }
    }

    // ── Helpers ───────────────────────────────────────────────────────────────

    private void markFailed(Deployment d) {
        d.setStatus(DeploymentStatus.ECHEC);
        deploymentRepository.save(d);
    }

    /** email → username Kubernetes-safe  (baya.b@nextstep.tn → baya-b) */
    private String sanitizeUsername(String email) {
        return sanitize(email.split("@")[0]);
    }

    /** RFC-1123 : minuscules, tirets uniquement */
    private String sanitize(String name) {
        return name.toLowerCase()
                .replaceAll("[^a-z0-9-]", "-")
                .replaceAll("-+", "-")
                .replaceAll("^-|-$", "");
    }
}