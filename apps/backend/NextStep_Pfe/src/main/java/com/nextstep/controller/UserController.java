package com.nextstep.controller;

import com.nextstep.dto.ChangePasswordRequest;
import com.nextstep.dto.UpdateProfileRequest;
import com.nextstep.dto.UserResponse;
import com.nextstep.entity.User;
import com.nextstep.service.KeycloakAdminService;
import com.nextstep.service.UserService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/users")
public class UserController {

    private final UserService          userService;
    private final KeycloakAdminService keycloakAdminService;

    public UserController(UserService userService,
                          KeycloakAdminService keycloakAdminService) {
        this.userService          = userService;
        this.keycloakAdminService = keycloakAdminService;
    }

    // ── GET /api/users/me ─────────────────────────────────────────────────────

    @GetMapping("/me")
    public ResponseEntity<UserResponse> getMe(@AuthenticationPrincipal Jwt jwt) {
        String keycloakId = jwt.getSubject();
        String email      = jwt.getClaimAsString("email");
        String firstName  = jwt.getClaimAsString("given_name");
        String lastName   = jwt.getClaimAsString("family_name");

        // ✅ Extraire les rôles depuis le JWT pour déterminer Admin ou Client
        boolean isAdmin = extractRoles(jwt).stream()
                .anyMatch(role -> role.equalsIgnoreCase("admin"));
        User user = userService.findOrProvision(
                keycloakId, email, firstName, lastName, isAdmin
        );
        return ResponseEntity.ok(new UserResponse(user));
    }
    // ── Extraction des rôles depuis realm_access ──────────────────────────────

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
    // ── PATCH /api/users/me ───────────────────────────────────────────────────

    @PatchMapping("/me")
    public ResponseEntity<?> updateMe(
            @AuthenticationPrincipal Jwt jwt,
            @Valid @RequestBody UpdateProfileRequest request
    ) {
        try {
            User updated = userService.updateProfile(jwt.getSubject(), request);
            return ResponseEntity.ok(new UserResponse(updated));
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(Map.of("message", e.getMessage()));
        }
    }

    // ── GET /api/users/me/sessions ────────────────────────────────────────────
    // Retourne les sessions Keycloak actives de l'utilisateur courant

    @GetMapping("/me/sessions")
    public ResponseEntity<?> getMySessions(
            @AuthenticationPrincipal Jwt jwt,
            @RequestHeader(value = "X-User-Agent", required = false) String browserUserAgent
    ) {
        try {
            String keycloakId = jwt.getSubject();
            List<Map<String, Object>> sessions =
                    keycloakAdminService.getUserSessions(keycloakId, browserUserAgent);
            return ResponseEntity.ok(sessions);
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(Map.of("message", e.getMessage()));
        }
    }
    // ── DELETE /api/users/me/sessions/{sessionId} ─────────────────────────────
    // Révoque une session spécifique (autre appareil ou session courante)

    @DeleteMapping("/me/sessions/{sessionId}")
    public ResponseEntity<?> revokeSession(
            @AuthenticationPrincipal Jwt jwt,
            @PathVariable String sessionId
    ) {
        try {
            keycloakAdminService.revokeSession(sessionId);
            return ResponseEntity.ok(Map.of("message", "Session révoquée"));
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(Map.of("message", e.getMessage()));
        }
    }
    // ── POST /api/users/me/change-password ────────────────────────────────────
    // Change le mot de passe de l'utilisateur connecté dans Keycloak

    @PostMapping("/me/change-password")
    public ResponseEntity<?> changePassword(
            @AuthenticationPrincipal Jwt jwt,
            @Valid @RequestBody ChangePasswordRequest request
    ) {
        try {
            String email = jwt.getClaimAsString("email");
            keycloakAdminService.resetPassword(email, request.getNewPassword());
            return ResponseEntity.ok(Map.of("message", "Mot de passe modifié avec succès"));
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest()
                    .body(Map.of("message", e.getMessage()));
        }
    }
    // ── DELETE /api/users/me ──────────────────────────────────────────────────────
// Supprime le compte de l'utilisateur connecté (DB + Keycloak)

    @DeleteMapping("/me")
    public ResponseEntity<?> deleteMyAccount(@AuthenticationPrincipal Jwt jwt) {
        try {
            String keycloakId = jwt.getSubject();
            String email      = jwt.getClaimAsString("email");

            // ✅ Vérifier que ce n'est pas un admin
            boolean isAdmin = extractRoles(jwt).stream()
                    .anyMatch(role -> role.equalsIgnoreCase("admin"));
            if (isAdmin) {
                return ResponseEntity.status(HttpStatus.FORBIDDEN)
                        .body(Map.of("message", "Un administrateur ne peut pas supprimer son propre compte."));
            }

            // 1. Supprimer de la DB
            userService.deleteByKeycloakId(keycloakId);

            // 2. Supprimer de Keycloak
            keycloakAdminService.deleteUserById(keycloakId);

            return ResponseEntity.noContent().build(); // 204

        } catch (RuntimeException e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("message", e.getMessage()));
        }
    }
}