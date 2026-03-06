package com.nextstep.controller;

import com.nextstep.dto.ChangePasswordRequest;
import com.nextstep.dto.UpdateProfileRequest;
import com.nextstep.dto.UserResponse;
import com.nextstep.entity.User;
import com.nextstep.service.KeycloakAdminService;
import com.nextstep.service.UserService;
import jakarta.validation.Valid;
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

        User user = userService.findOrProvision(keycloakId, email, firstName, lastName);
        return ResponseEntity.ok(new UserResponse(user));
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
}