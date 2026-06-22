package com.nextstep.controller;

import com.nextstep.dto.NginxDeploymentResult;
import com.nextstep.entity.Plan;
import com.nextstep.repository.AbonnementRepository;
import com.nextstep.repository.PlanRepository;
import com.nextstep.service.NginxProvisioningService;
import jakarta.persistence.EntityNotFoundException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.*;

/**
 * Endpoints pour le service Hébergement Web nginx.
 *
 * POST /api/hosting/nginx/provision   → déploie nginx pour le client
 * DELETE /api/hosting/nginx           → supprime nginx du client
 * GET /api/hosting/nginx/status       → état du déploiement
 */
@Slf4j
@RestController
@RequestMapping("/api/hosting/nginx")
@RequiredArgsConstructor
public class NginxHostingController {

    private final NginxProvisioningService nginxProvisioningService;
    private final AbonnementRepository     abonnementRepository;
    private final PlanRepository           planRepository;

    /**
     * Déclenche le déploiement nginx pour le client authentifié.
     * Vérifie qu'il a bien un abonnement actif au service nginx.
     */
    /*@PostMapping("/provision")
    @PreAuthorize("hasRole('client')")
    public ResponseEntity<NginxDeploymentResult> provision(
            @AuthenticationPrincipal Jwt jwt,
            @RequestParam Long planId) {

        String keycloakId = jwt.getSubject();
        String username   = jwt.getClaimAsString("preferred_username");

        // Vérifier que le plan existe
        Plan plan = planRepository.findById(planId)
                .orElseThrow(() -> new EntityNotFoundException("Plan introuvable : " + planId));

        log.info("[NGINX] Provision demandée par user={} plan={}", username, plan.getTier());

        NginxDeploymentResult result =
                nginxProvisioningService.provisionNginx(username, plan);

        return ResponseEntity.ok(result);
    }*/
    @PostMapping("/provision")
    @PreAuthorize("hasRole('client')")
    public ResponseEntity<NginxDeploymentResult> provision(
            @AuthenticationPrincipal Jwt jwt,
            @RequestParam Long planId) {

        String username = jwt.getClaimAsString("preferred_username");
        Plan plan = planRepository.findById(planId)
                .orElseThrow(() -> new EntityNotFoundException("Plan introuvable : " + planId));

        // ✅ Vérifier si un nginx existe déjà
        NginxDeploymentResult existing = nginxProvisioningService.getDeploymentStatus(username);
        if (!"NOT_FOUND".equals(existing.getStatus())) {
            // Retourner le statut existant plutôt que recréer
            return ResponseEntity.ok(existing);
        }

        log.info("[NGINX] Provision demandée par user={} plan={}", username, plan.getTier());
        return ResponseEntity.ok(nginxProvisioningService.provisionNginx(username, plan));
    }

    /**
     * Supprime le nginx du client (résiliation du service).
     */
    @DeleteMapping
    @PreAuthorize("hasRole('client')")
    public ResponseEntity<Void> deprovision(@AuthenticationPrincipal Jwt jwt) {
        String username = jwt.getClaimAsString("preferred_username");
        nginxProvisioningService.deprovisionNginx(username);
        return ResponseEntity.noContent().build();
    }

    /**
     * Retourne l'URL publique et l'état du déploiement nginx du client.
     */
    /*@GetMapping("/status")
    @PreAuthorize("hasRole('client')")
    public ResponseEntity<NginxDeploymentResult> status(@AuthenticationPrincipal Jwt jwt) {
        String username  = jwt.getClaimAsString("preferred_username");
        String namespace = "baya-tenant-" + username.toLowerCase()
                .replaceAll("[^a-z0-9-]", "-");
        String appName   = "nginx-" + username.toLowerCase()
                .replaceAll("[^a-z0-9-]", "-");

        // Vérifier si le déploiement existe
        var deployment = nginxProvisioningService.getDeploymentStatus(username);
        return ResponseEntity.ok(deployment);
    }*/
    @GetMapping("/status")
    @PreAuthorize("hasRole('client')")
    public ResponseEntity<NginxDeploymentResult> status(@AuthenticationPrincipal Jwt jwt) {
        String username = jwt.getClaimAsString("preferred_username");
        // ✅ Supprimer les variables namespace/appName inutilisées
        return ResponseEntity.ok(nginxProvisioningService.getDeploymentStatus(username));
    }
}
