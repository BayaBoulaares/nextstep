package com.nextstep.controller;

/*import com.nextstep.dto.TerraformResult;
import com.nextstep.dto.VmRequest;
import com.nextstep.entity.VirtualMachine;
import com.nextstep.repository.VirtualMachineRepository;
import com.nextstep.service.NamespaceService;
import com.nextstep.service.TerraformService;
import com.nextstep.service.VmFabric8Service;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.beans.factory.annotation.Value;

import java.util.Map;

@RestController
@RequestMapping("/api/vms")
@RequiredArgsConstructor
@Slf4j
public class VmController {

    private final TerraformService terraformService;
    private final VmFabric8Service vmFabric8Service;
    private final NamespaceService namespaceService;
    private final VirtualMachineRepository vmRepository;
    @Value("${openshift.token}")
    private String openshiftToken;

    @Value("${openshift.api-url}")
    private String openshiftApiUrl;
    // Créer une VM
    /*@PostMapping("/create")
    @PreAuthorize("hasRole('client') or hasRole('admin')")
    public ResponseEntity<?> createVm(
            @Valid @RequestBody VmRequest request,
            @AuthenticationPrincipal Jwt jwt) {
        try {
            String username = jwt.getClaimAsString("preferred_username");
            String namespace = namespaceService.getNamespaceForUser(username);

            // Lazy provisioning du namespace
            namespaceService.provisionIfAbsent(username);

            // Créer la VM via Terraform
            TerraformResult result = terraformService
                    .createVm(request, namespace);

            // Sauvegarder en BDD
            VirtualMachine vm = new VirtualMachine();
            vm.setName(request.getVmName());
            vm.setNamespace(namespace);
            vm.setKeycloakUserId(jwt.getSubject());
            vm.setUsername(username);
            vm.setCpuCores(request.getCpuCores());
            vm.setRamGb(request.getRamGb());
            vm.setDiskGb(request.getDiskGb());
            vm.setOsImage(request.getOsImage());
            vmRepository.save(vm);

            return ResponseEntity.ok(result);

        } catch (Exception e) {
            log.error("Erreur création VM", e);
            return ResponseEntity.status(500)
                    .body(Map.of("error", e.getMessage()));
        }
    }*/
    /*@PostMapping("/create")
    @PreAuthorize("hasRole('client') or hasRole('admin')")
    public ResponseEntity<?> createVm(
            @Valid @RequestBody VmRequest request,
            @AuthenticationPrincipal Jwt jwt) {
        try {
            String username  = jwt.getClaimAsString("preferred_username");
            String namespace = namespaceService.getNamespaceForUser(username);
            namespaceService.provisionIfAbsent(username);

            TerraformResult result = terraformService.createVm(request, namespace);

            // ✅ Sauvegarder avec le password généré
            VirtualMachine vm = new VirtualMachine();
            vm.setName(request.getVmName());
            vm.setNamespace(namespace);
            vm.setKeycloakUserId(jwt.getSubject());
            vm.setUsername(username);
            vm.setCpuCores(request.getCpuCores());
            vm.setRamGb(request.getRamGb());
            vm.setDiskGb(request.getDiskGb());
            vm.setOsImage(request.getOsImage());
            vm.setVmPassword(result.getPassword()); // ✅
            vmRepository.save(vm);

            return ResponseEntity.ok(result);

        } catch (Exception e) {
            log.error("Erreur création VM", e);
            return ResponseEntity.status(500).body(Map.of("error", e.getMessage()));
        }
    }

    // Lister mes VMs (statut live via Fabric8)
    @GetMapping
    @PreAuthorize("hasRole('client')")
    public ResponseEntity<?> listMyVms(@AuthenticationPrincipal Jwt jwt) {
        String namespace = getNamespace(jwt);
        log.info("[VMS] listMyVms → namespace={}", namespace);
        return ResponseEntity.ok(vmFabric8Service.listVms(namespace));
    }

    @PostMapping("/{name}/start")
    @PreAuthorize("hasRole('client')")
    public ResponseEntity<?> startVm(@PathVariable String name,
                                     @AuthenticationPrincipal Jwt jwt) {
        vmFabric8Service.startVm(name, getNamespace(jwt));
        return ResponseEntity.ok(Map.of("message", "VM démarrée"));
    }


    // Arrêter une VM
    @PostMapping("/{name}/stop")
    @PreAuthorize("hasRole('client')")
    public ResponseEntity<?> stopVm(@PathVariable String name,
                                    @AuthenticationPrincipal Jwt jwt) {
        vmFabric8Service.stopVm(name, getNamespace(jwt));
        return ResponseEntity.ok(Map.of("message", "VM arrêtée"));
    }

    // Supprimer une VM
    @DeleteMapping("/{name}")
    @PreAuthorize("hasRole('client')")
    public ResponseEntity<?> deleteVm(@PathVariable String name,
                                      @AuthenticationPrincipal Jwt jwt) {
        String namespace = getNamespace(jwt);
        vmFabric8Service.deleteVm(name, namespace);
        vmRepository.deleteByNameAndUsername(name,
                jwt.getClaimAsString("email").split("@")[0].replace(".", "-"));
        return ResponseEntity.noContent().build();
    }

    // Admin : toutes les VMs
    @GetMapping("/admin/all")
    @PreAuthorize("hasRole('admin')")
    public ResponseEntity<?> listAllVms() {
        return ResponseEntity.ok(vmRepository.findAll());
    }
    /*@GetMapping("/{name}/vnc-url")
    public ResponseEntity<VncUrlResponse> getVncUrl(
            @PathVariable String name,
            @AuthenticationPrincipal Jwt jwt) {

        String namespace = getNamespace(jwt);
        // URL VNC via virtctl proxy — expose WebSocket sur le cluster
        String vncUrl = String.format(
                "%s/apis/subresources.kubevirt.io/v1/namespaces/%s/virtualmachineinstances/%s/vnc",
                System.getProperty("openshift.api-url", "https://api.ocp4.nextstep-it.com:6443"),
                namespace, name
        );
        return ResponseEntity.ok(new VncUrlResponse(vncUrl,
                System.getProperty("openshift.token", "")));
    }*/
    /*private String getNamespace(Jwt jwt) {
        String email     = jwt.getClaimAsString("email");
        String username  = email.split("@")[0].replace(".", "-");
        String namespace = namespaceService.getNamespaceForUser(username);
        log.info("[VMS] email={} → username={} → namespace={}", email, username, namespace);
        return namespace;
    }

    @GetMapping("/{name}/vnc-url")
    public ResponseEntity<VncUrlResponse> getVncUrl(
            @PathVariable String name,
            @AuthenticationPrincipal Jwt jwt) {

        String namespace = getNamespace(jwt);

        // ✅ URL relative → browser → Next.js → Spring Boot → OpenShift
        // Le browser se connecte à Spring Boot, pas à OpenShift directement
        String vncWsUrl = String.format("/api/vms/%s/%s/vnc-ws", namespace, name);

        return ResponseEntity.ok(new VncUrlResponse(vncWsUrl, ""));
        // token vide : Spring Boot l'injecte lui-même côté serveur
    }
    public record VncUrlResponse(String url, String token) {}
    @GetMapping("/{name}/credentials")
    @PreAuthorize("hasRole('client')")
    public ResponseEntity<?> getVmCredentials(
            @PathVariable String name,
            @AuthenticationPrincipal Jwt jwt) {

        String username = jwt.getClaimAsString("preferred_username");
        return vmRepository.findByNameAndUsername(name, username)
                .map(vm -> ResponseEntity.ok(Map.of(
                        "login",    "ubuntu",
                        "password", vm.getVmPassword() != null ? vm.getVmPassword() : "N/A"
                )))
                .orElse(ResponseEntity.notFound().build());
    }

}*/

import com.nextstep.dto.*;
import com.nextstep.entity.VirtualMachine;
import com.nextstep.entity.VmStatus;
import com.nextstep.repository.VirtualMachineRepository;
import com.nextstep.service.NamespaceService;
import com.nextstep.service.TerraformService;
import com.nextstep.service.VmFabric8Service;
import com.nextstep.service.VmMetricsService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/vms")
@RequiredArgsConstructor
@Slf4j
public class VmController {

    private final TerraformService          terraformService;
    private final VmFabric8Service          vmFabric8Service;
    private final NamespaceService          namespaceService;
    private final VirtualMachineRepository  vmRepository;
    private final VmMetricsService vmMetricsService;

    @Value("${openshift.token}")
    private String openshiftToken;

    @Value("${openshift.api-url}")
    private String openshiftApiUrl;

    // ── Créer une VM ──────────────────────────────────────────────────────
    @PostMapping("/create")
    @PreAuthorize("hasRole('client') or hasRole('admin')")
    public ResponseEntity<?> createVm(
            @Valid @RequestBody VmRequest request,
            @AuthenticationPrincipal Jwt jwt) {
        try {
            String username  = jwt.getClaimAsString("preferred_username");
            String namespace = namespaceService.getNamespaceForUser(username);
            namespaceService.provisionIfAbsent(username);

            TerraformResult result = terraformService.createVm(request, namespace);

            VirtualMachine vm = new VirtualMachine();
            vm.setName(request.getVmName());
            vm.setNamespace(namespace);
            vm.setKeycloakUserId(jwt.getSubject());
            vm.setUsername(username);
            vm.setCpuCores(request.getCpuCores());
            vm.setRamGb(request.getRamGb());
            vm.setDiskGb(request.getDiskGb());
            vm.setOsImage(request.getOsImage());
            vm.setVmPassword(result.getPassword()); // ✅ stocker le password généré
            vm.setInstanceType(request.getInstanceType() != null
                    ? request.getInstanceType()
                    : "u1.small");
            vmRepository.save(vm);

            return ResponseEntity.ok(result);

        } catch (Exception e) {
            log.error("Erreur création VM", e);
            return ResponseEntity.status(500).body(Map.of("error", e.getMessage()));
        }
    }

    // ── Lister mes VMs ────────────────────────────────────────────────────
    @GetMapping
    @PreAuthorize("hasRole('client')")
    public ResponseEntity<?> listMyVms(@AuthenticationPrincipal Jwt jwt) {
        String namespace = getNamespace(jwt);
        log.info("[VMS] listMyVms → namespace={}", namespace);
        return ResponseEntity.ok(vmFabric8Service.listVms(namespace));
    }

    // ── Démarrer une VM ───────────────────────────────────────────────────
    @PostMapping("/{name}/start")
    @PreAuthorize("hasRole('client')")
    public ResponseEntity<?> startVm(
            @PathVariable String name,
            @AuthenticationPrincipal Jwt jwt) {
        vmFabric8Service.startVm(name, getNamespace(jwt));
        return ResponseEntity.ok(Map.of("message", "VM démarrée"));
    }

    // ── Arrêter une VM ────────────────────────────────────────────────────
    @PostMapping("/{name}/stop")
    @PreAuthorize("hasRole('client')")
    public ResponseEntity<?> stopVm(
            @PathVariable String name,
            @AuthenticationPrincipal Jwt jwt) {
        vmFabric8Service.stopVm(name, getNamespace(jwt));
        return ResponseEntity.ok(Map.of("message", "VM arrêtée"));
    }

    // ── Supprimer une VM ──────────────────────────────────────────────────
    @DeleteMapping("/{name}")
    @Transactional  // ← AJOUTER CETTE ANNOTATION
    @PreAuthorize("hasRole('client')")
    public ResponseEntity<?> deleteVm(
            @PathVariable String name,
            @AuthenticationPrincipal Jwt jwt) {
        String username = jwt.getClaimAsString("preferred_username");
        String namespace = getNamespace(jwt);
        vmFabric8Service.deleteVm(name, namespace);
        vmRepository.deleteByNameAndUsername(name, username); // ✅ username cohérent
        return ResponseEntity.noContent().build();
    }

    // ── Credentials d'une VM ─────────────────────────────────────────────
// VmController.java — getVmCredentials
    @GetMapping("/{name}/credentials")
    @PreAuthorize("hasRole('client')")
    public ResponseEntity<?> getVmCredentials(
            @PathVariable String name,
            @AuthenticationPrincipal Jwt jwt) {

        String username = jwt.getClaimAsString("preferred_username");
        log.info("[CREDENTIALS] name={} username={}", name, username);

        return vmRepository.findByNameAndUsername(name, username)
                .or(() -> vmRepository.findByNameAndKeycloakUserId(name, jwt.getSubject()))
                .map(vm -> ResponseEntity.ok(Map.of(
                        "login",    "ubuntu",
                        "password", vm.getVmPassword() != null
                                ? vm.getVmPassword()
                                : "non-disponible"
                )))
                // ✅ VM non en BDD → retourner 200 avec message clair
                .orElseGet(() -> ResponseEntity.ok(Map.of(
                        "login",    "ubuntu",
                        "password", "non-disponible"
                )));
    }

    // ── URL VNC ───────────────────────────────────────────────────────────
    @GetMapping("/{name}/vnc-url")
    public ResponseEntity<VncUrlResponse> getVncUrl(
            @PathVariable String name,
            @AuthenticationPrincipal Jwt jwt) {

        String namespace = getNamespace(jwt);
        String vncWsUrl  = String.format("/api/vms/%s/%s/vnc-ws", namespace, name);
        return ResponseEntity.ok(new VncUrlResponse(vncWsUrl, ""));
    }

    // ── Admin : toutes les VMs ────────────────────────────────────────────
    @GetMapping("/admin/all")
    @PreAuthorize("hasRole('admin')")
    public ResponseEntity<?> listAllVms() {
        return ResponseEntity.ok(vmRepository.findAll());
    }

    // ── Helper ────────────────────────────────────────────────────────────
    private String getNamespace(Jwt jwt) {
        String email     = jwt.getClaimAsString("email");
        String username  = email.split("@")[0].replace(".", "-");
        String namespace = namespaceService.getNamespaceForUser(username);
        log.info("[VMS] email={} → username={} → namespace={}", email, username, namespace);
        return namespace;
    }
    // Reboot gracieux
    @PostMapping("/{name}/reboot")
    @PreAuthorize("hasRole('client')")
    public ResponseEntity<?> rebootVm(
            @PathVariable String name,
            @AuthenticationPrincipal Jwt jwt) {
        try {
            vmFabric8Service.rebootVm(name, getNamespace(jwt));
            return ResponseEntity.ok(Map.of("message", "VM redémarrée"));
        } catch (Exception e) {
            log.error("Erreur reboot VM {}", name, e);
            return ResponseEntity.status(500).body(Map.of("error", e.getMessage()));
        }
    }

    public record VncUrlResponse(String url, String token) {}
    // Ajouter dans VmController.java

// ── Réseau / IP publique SSH ──────────────────────────────────────────

    @PostMapping("/{name}/expose-ssh")
    @PreAuthorize("hasRole('client')")
    public ResponseEntity<?> exposeVmSsh(
            @PathVariable String name,
            @AuthenticationPrincipal Jwt jwt) {
        try {
            String namespace = getNamespace(jwt);

            // ✅ Vérifier que c'est bien un namespace client
            if (!namespaceService.isClientNamespace(namespace)) {
                return ResponseEntity.status(403)
                        .body(Map.of("error", "Namespace invalide"));
            }

            Map<String, Object> info = vmFabric8Service.exposeVmSsh(name, namespace);
            return ResponseEntity.ok(info);
        } catch (Exception e) {
            log.error("Erreur exposition SSH VM {}", name, e);
            return ResponseEntity.status(500).body(Map.of("error", e.getMessage()));
        }
    }

    @DeleteMapping("/{name}/expose-ssh")
    @PreAuthorize("hasRole('client')")
    public ResponseEntity<?> unexposeVmSsh(
            @PathVariable String name,
            @AuthenticationPrincipal Jwt jwt) {
        try {
            vmFabric8Service.unexposeVmSsh(name, getNamespace(jwt));
            return ResponseEntity.noContent().build();
        } catch (Exception e) {
            log.error("Erreur suppression SSH VM {}", name, e);
            return ResponseEntity.status(500).body(Map.of("error", e.getMessage()));
        }
    }

    @GetMapping("/{name}/network")
    @PreAuthorize("hasRole('client')")
    public ResponseEntity<?> getVmNetwork(
            @PathVariable String name,
            @AuthenticationPrincipal Jwt jwt) {
        String namespace = getNamespace(jwt);
        return ResponseEntity.ok(vmFabric8Service.listVmServices(name, namespace));
    }



    // ── Extrait à remplacer dans VmController.java ───────────────────────────────
// Remplacer les 2 endpoints metrics/events (lignes avec hasRole('CLIENT'))
// par ceux-ci avec hasRole('client') pour être cohérent avec le reste

    /**
     * GET /api/vms/{name}/metrics
     */
    @GetMapping("/{name}/metrics")
    @PreAuthorize("hasRole('client') or hasRole('admin')")   // ✅ minuscule comme les autres
    public ResponseEntity<?> getMetrics(
            @PathVariable String name,
            @AuthenticationPrincipal Jwt jwt) {
        VmMetricsDTO metrics = vmMetricsService.getMetrics(name);
        if (metrics == null) {
            // ✅ 204 No Content → frontend sait qu'il n'y a pas de données
            return ResponseEntity.noContent().build();
        }
        return ResponseEntity.ok(metrics);
    }

    /**
     * GET /api/vms/{name}/events
     */
    @GetMapping("/{name}/events")
    @PreAuthorize("hasRole('client') or hasRole('admin')")   // ✅ minuscule comme les autres
    public ResponseEntity<List<VmEventDTO>> getEvents(
            @PathVariable String name,
            @AuthenticationPrincipal Jwt jwt) {
        List<VmEventDTO> events = vmMetricsService.getEvents(name);
        return ResponseEntity.ok(events);
    }
    /**
     * POST /api/vms/{sourceVmName}/clone
     *
     * Clone une VM existante dans le même tenant.
     * La VM source doit être dans l'état Stopped ou Running avec DataVolume Succeeded.
     */
    @PostMapping("/{sourceVmName}/clone")
    public ResponseEntity<TerraformResult> cloneVm(
            @PathVariable String sourceVmName,
            @RequestBody @Valid VmCloneRequest cloneRequest,
            @AuthenticationPrincipal Jwt jwt) {

        String keycloakUserId = jwt.getSubject();
        String namespace = getNamespace(jwt);

        log.info("[CLONE] {} → {} dans namespace={}",
                sourceVmName, cloneRequest.getCloneName(), namespace);

        // 1. Vérifier que la VM source appartient au tenant courant
        vmRepository.findByNameAndNamespace(sourceVmName, namespace)
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.NOT_FOUND,
                        "VM source introuvable : " + sourceVmName));

        // 2. Vérifier que le nom cible n'est pas déjà pris
        if (vmRepository.existsByNameAndNamespace(
                cloneRequest.getCloneName(), namespace)) {
            throw new ResponseStatusException(
                    HttpStatus.CONFLICT,
                    "Une VM avec ce nom existe déjà : " + cloneRequest.getCloneName());
        }

        try {
            // 3. Résoudre le PVC source (vérifie existence + phase=Succeeded)
            String sourcePvcName = vmFabric8Service.resolveSourcePvc(
                    sourceVmName, namespace);

            // 4. Construire le VmRequest pour Terraform
            VirtualMachine sourceVm = vmRepository
                    .findByNameAndNamespace(sourceVmName, namespace).get();

            VmRequest cloneVmReq = VmRequest.builder()
                    .vmName(cloneRequest.getCloneName())
                    .instanceType(sourceVm.getInstanceType() != null
                            ? sourceVm.getInstanceType()
                            : "u1.small")          // ← fallback si null
                    .diskGb(sourceVm.getDiskGb() > 0
                            ? sourceVm.getDiskGb()
                            : 20)                  // ← fallback si 0
                    .vmPassword(cloneRequest.getVmPassword())
                    .useDataVolume(true)
                    .build();

            // 5. Lancer Terraform clone (async possible, ici synchrone)
            TerraformResult result = terraformService.cloneVm(
                    cloneVmReq, namespace, sourcePvcName);

            // 6. Persister la VM clonée en base
            VirtualMachine clonedVm = new VirtualMachine();
            clonedVm.setName(cloneRequest.getCloneName());
            clonedVm.setNamespace(namespace);
            clonedVm.setKeycloakUserId(keycloakUserId);
            clonedVm.setUsername(jwt.getClaimAsString("preferred_username"));
            clonedVm.setDiskGb(sourceVm.getDiskGb());
            clonedVm.setOsImage(sourceVm.getOsImage());
            clonedVm.setVmPassword(result.getPassword());
            clonedVm.setStatus(VmStatus.PENDING);
            vmRepository.save(clonedVm);

            return ResponseEntity.ok(result);

        } catch (IllegalStateException e) {
            throw new ResponseStatusException(HttpStatus.UNPROCESSABLE_ENTITY, e.getMessage());
        } catch (Exception e) {
            log.error("[CLONE] Erreur clonage {} → {}", sourceVmName,
                    cloneRequest.getCloneName(), e);
            throw new ResponseStatusException(
                    HttpStatus.INTERNAL_SERVER_ERROR,
                    "Échec du clonage : " + e.getMessage());
        }
    }


// ─────────────────────────────────────────────────────────────────────────────
}