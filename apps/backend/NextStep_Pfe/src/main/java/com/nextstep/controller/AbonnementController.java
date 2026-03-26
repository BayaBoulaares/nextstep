package com.nextstep.controller;


import com.nextstep.dto.AbonnementRequest;
import com.nextstep.dto.AbonnementResponse;
import com.nextstep.entity.User;
import com.nextstep.service.AbonnementService;
import com.nextstep.service.UserService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/abonnements")
@RequiredArgsConstructor
@Tag(name = "Abonnements", description = "Gestion des abonnements clients aux plans cloud")
@SecurityRequirement(name = "bearerAuth")
public class AbonnementController {

    private final AbonnementService abonnementService;
    private final UserService       userService;

    /** Souscrire à un plan. */
    @PostMapping
    @Operation(summary = "Souscrire à un plan")
    public ResponseEntity<AbonnementResponse> souscrire(
            @AuthenticationPrincipal Jwt jwt,
            @Valid @RequestBody AbonnementRequest request) {

        UUID clientId = resolveClientId(jwt);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(abonnementService.souscrire(clientId, request));
    }

    /** Lister mes abonnements. */
    @GetMapping("/mes-abonnements")
    @Operation(summary = "Lister les abonnements du client connecté")
    public List<AbonnementResponse> mesAbonnements(@AuthenticationPrincipal Jwt jwt) {
        return abonnementService.listerParClient(resolveClientId(jwt));
    }

    /** Détail d'un abonnement. */
    @GetMapping("/{id}")
    @Operation(summary = "Détail d'un abonnement")
    public AbonnementResponse getById(@PathVariable Long id) {
        return abonnementService.getById(id);
    }

    /** Résilier un abonnement. */
    @DeleteMapping("/{id}/resilier")
    @Operation(summary = "Résilier un abonnement (le client connecté doit en être propriétaire)")
    public AbonnementResponse resilier(
            @PathVariable Long id,
            @AuthenticationPrincipal Jwt jwt) {
        return abonnementService.resilier(id, resolveClientId(jwt));
    }

    /** Lier un déploiement à un abonnement existant. */
    @PatchMapping("/{id}/deployment/{deploymentId}")
    @Operation(summary = "Associer un déploiement à un abonnement")
    public AbonnementResponse lierDeployment(
            @PathVariable Long id,
            @PathVariable Long deploymentId) {
        return abonnementService.lierDeployment(id, deploymentId);
    }

    // ── Helper ────────────────────────────────────────────────────────────────
    private UUID resolveClientId(Jwt jwt) {
        String keycloakId = jwt.getSubject();

        boolean isAdmin = extractRoles(jwt).stream()
                .anyMatch(role -> role.equalsIgnoreCase("admin"));

        User user = userService.findOrProvision(
                keycloakId,
                jwt.getClaimAsString("email"),
                jwt.getClaimAsString("given_name"),
                jwt.getClaimAsString("family_name"),
                isAdmin   // ✅ CORRECTION ICI
        );

        return user.getId();
    }
    @SuppressWarnings("unchecked")
    private List<String> extractRoles(Jwt jwt) {
        try {
            Map<String, Object> realmAccess = jwt.getClaim("realm_access");
            if (realmAccess == null) return List.of();
            Object roles = realmAccess.get("roles");
            return roles instanceof List<?> l ? (List<String>) l : List.of();
        } catch (Exception e) {
            return List.of();
        }
    }
}