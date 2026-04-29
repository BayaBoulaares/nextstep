package com.nextstep.controller;

import com.nextstep.dto.DeploymentDTO;
import com.nextstep.dto.DeploymentRequest;
import com.nextstep.entity.DeploymentStatus;
import com.nextstep.entity.User;
import com.nextstep.entity.VirtualMachine;
import com.nextstep.repository.VirtualMachineRepository;
import com.nextstep.service.DeploymentService;
import com.nextstep.service.UserService;
import com.nextstep.service.VmProvisioningService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/deployments")
@RequiredArgsConstructor
@Tag(name = "Déploiements", description = "Tunnel de déploiement et gestion des ressources actives")
@SecurityRequirement(name = "bearerAuth")
public class DeploymentController {

    private final DeploymentService        deploymentService;
    private final UserService              userService;
    private final VirtualMachineRepository vmRepository; // ✅ nouveau

    @Autowired
    private VmProvisioningService vmProvisioningService;

    @GetMapping("/user/{userId}")
    public List<DeploymentDTO> getByUser(
            @PathVariable UUID userId,
            @AuthenticationPrincipal Jwt jwt) {
        String keycloakId = jwt.getSubject();
        User caller = userService.findByKeycloakId(keycloakId);
        return deploymentService.getByUser(caller.getId());
    }

    // ✅ Retourne le vmPassword quand statut = EN_LIGNE
    @GetMapping("/{id}")
    @Operation(summary = "Détail d'un déploiement")
    public ResponseEntity<?> getById(
            @PathVariable Long id,
            @AuthenticationPrincipal Jwt jwt) {

        DeploymentDTO dto = deploymentService.getById(id);

        // Si EN_LIGNE → chercher le password en BDD
        String vmPassword = null;
        if (DeploymentStatus.EN_LIGNE.name().equals(dto.getStatus())) {
            String username = jwt.getClaimAsString("email")
                    .split("@")[0].replace(".", "-");
            String vmName   = sanitize(dto.getResourceName());

            vmPassword = vmRepository
                    .findByNameAndUsername(vmName, username)
                    .map(VirtualMachine::getVmPassword)
                    .orElse(null);
        }

        // ✅ Enrichir la réponse avec vmPassword
        Map<String, Object> response = new HashMap<>();
        response.put("id",         dto.getId());
        response.put("status",     dto.getStatus());
        response.put("resourceName", dto.getResourceName());
        response.put("vmPassword", vmPassword != null ? vmPassword : "");
        // Ajouter les autres champs du DTO si nécessaire
        response.put("planId",     dto.getPlanId());
        response.put("createdAt",  dto.getCreatedAt());

        return ResponseEntity.ok(response);
    }

    @PostMapping("/user/{userId}")
    public ResponseEntity<DeploymentDTO> create(
            @PathVariable UUID userId,
            @AuthenticationPrincipal Jwt jwt,
            @Valid @RequestBody DeploymentRequest request) {

        String keycloakId = jwt.getSubject();
        User caller = userService.findByKeycloakId(keycloakId);
        return ResponseEntity
                .status(HttpStatus.CREATED)
                .body(deploymentService.create(caller.getId(), request));
    }

    @PatchMapping("/{id}/provision")
    public ResponseEntity<DeploymentDTO> startProvisioning(@PathVariable Long id) {
        DeploymentDTO dto = deploymentService.startProvisioning(id);
        vmProvisioningService.provisionAsync(id);
        return ResponseEntity.ok(dto);
    }

    @PatchMapping("/{id}/running")
    @Operation(summary = "Marquer le déploiement comme opérationnel")
    public DeploymentDTO markRunning(@PathVariable Long id) {
        return deploymentService.markRunning(id);
    }

    @PatchMapping("/{id}/status")
    @Operation(summary = "Changer le statut d'un déploiement")
    public DeploymentDTO changeStatus(
            @PathVariable Long id,
            @RequestParam DeploymentStatus status) {
        return deploymentService.changeStatus(id, status);
    }

    @DeleteMapping("/{id}")
    @Operation(summary = "Supprimer un déploiement")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        deploymentService.delete(id);
        return ResponseEntity.noContent().build();
    }

    private String sanitize(String name) {
        return name.toLowerCase()
                .replaceAll("[^a-z0-9-]", "-")
                .replaceAll("-+", "-")
                .replaceAll("^-|-$", "");
    }
}