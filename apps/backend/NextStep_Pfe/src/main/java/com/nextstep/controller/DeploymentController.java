package com.nextstep.controller;

import com.nextstep.dto.DeploymentDTO;
import com.nextstep.dto.DeploymentRequest;
import com.nextstep.entity.DeploymentStatus;
import com.nextstep.entity.User;
import com.nextstep.service.DeploymentService;
import com.nextstep.service.UserService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

/**
 * Endpoints correspondant au tunnel de déploiement des maquettes :
 *
 *  POST   /api/deployments              → confirme et crée le déploiement (récapitulatif s2 → s3)
 *  GET    /api/deployments/user/{userId} → liste les services actifs du dashboard s4
 *  GET    /api/deployments/{id}          → détail d'un service (ligne du dashboard)
 *  PATCH  /api/deployments/{id}/provision → déclenche le provisionnement (maquette s3)
 *  PATCH  /api/deployments/{id}/running   → marque le service comme opérationnel
 *  PATCH  /api/deployments/{id}/status    → changement de statut (MAINTENANCE, STOPPED…)
 *  DELETE /api/deployments/{id}           → suppression du service
 */
@RestController
@RequestMapping("/api/deployments")
@RequiredArgsConstructor
@Tag(name = "Déploiements", description = "Tunnel de déploiement et gestion des ressources actives")
@SecurityRequirement(name = "bearerAuth")
public class DeploymentController {

    private final DeploymentService deploymentService;
    private final UserService userService;


    // ✅ Correction dans le controller
    @GetMapping("/user/{userId}")
    /*public List<DeploymentDTO> getByUser(@PathVariable UUID userId,
                                         @AuthenticationPrincipal Jwt jwt) {
        // Vérifier que l'userId demandé = l'utilisateur connecté (sauf admin)
        String keycloakId = jwt.getSubject();
        User caller = userService.findByKeycloakId(keycloakId);
        if (!caller.getId().equals(userId)) {
            throw new AccessDeniedException("Accès interdit");
        }
        return deploymentService.getByUser(userId);
    }*/
    public List<DeploymentDTO> getByUser(@PathVariable UUID userId,
                                         @AuthenticationPrincipal Jwt jwt) {
        String keycloakId = jwt.getSubject();
        User caller = userService.findByKeycloakId(keycloakId);

        // ✅ Utiliser l'ID DB du caller, pas le {userId} de l'URL
        return deploymentService.getByUser(caller.getId());
    }

    @GetMapping("/{id}")
    @Operation(summary = "Détail d'un déploiement")
    public DeploymentDTO getById(@PathVariable Long id) {
        return deploymentService.getById(id);
    }

    /*@PostMapping("/user/{userId}")
    @Operation(summary = "Créer un déploiement — confirmer la commande (étape récapitulatif)")
    public ResponseEntity<DeploymentDTO> create(
            @PathVariable UUID userId,
            @Valid @RequestBody DeploymentRequest request) {
        return ResponseEntity
                .status(HttpStatus.CREATED)
                .body(deploymentService.create(caller.getId(), request));
    }*/
    @PostMapping("/user/{userId}")
    public ResponseEntity<DeploymentDTO> create(
            @PathVariable UUID userId,
            @AuthenticationPrincipal Jwt jwt,        // ← ajouter
            @Valid @RequestBody DeploymentRequest request) {

        // Résoudre l'utilisateur via le JWT (keycloakId = jwt.sub)
        String keycloakId = jwt.getSubject();
        User caller = userService.findByKeycloakId(keycloakId);

        return ResponseEntity
                .status(HttpStatus.CREATED)
                .body(deploymentService.create(caller.getId(), request)); // ← UUID DB réel
    }

    @PatchMapping("/{id}/provision")
    @Operation(summary = "Démarrer le provisionnement (étape 3 — spinner maquette)")
    public DeploymentDTO startProvisioning(@PathVariable Long id) {
        return deploymentService.startProvisioning(id);
    }

    @PatchMapping("/{id}/running")
    @Operation(summary = "Marquer le déploiement comme opérationnel (fin du provisionnement)")
    public DeploymentDTO markRunning(@PathVariable Long id) {
        return deploymentService.markRunning(id);
    }

    @PatchMapping("/{id}/status")
    @Operation(summary = "Changer le statut d'un déploiement (MAINTENANCE, STOPPED, TERMINATED…)")
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
}