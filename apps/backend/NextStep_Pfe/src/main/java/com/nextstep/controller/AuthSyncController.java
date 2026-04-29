package com.nextstep.controller;

import com.nextstep.dto.UserResponse;
import com.nextstep.entity.User;
import com.nextstep.service.UserService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import lombok.Data;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
@Tag(name = "Auth", description = "Synchronisation des utilisateurs Keycloak")
public class AuthSyncController {

    private final UserService userService;

    @Data
    public static class SyncRequest {
        @NotBlank private String keycloakId;
        @NotBlank private String email;
        private String firstName;
        private String lastName;
    }

    /**
     * POST /api/auth/sync
     * Appelé par Next.js auth.ts à chaque premier login (credentials ou OAuth).
     * Crée l'utilisateur en DB si inexistant. Idempotent.
     * ⚠️ Pas de @AuthenticationPrincipal — route publique (SecurityConfig @Order 1)
     */
    @PostMapping("/sync")
    @Operation(summary = "Upsert utilisateur Keycloak dans la base locale")
    public ResponseEntity<?> sync(@Valid @RequestBody SyncRequest req) {
        try {
            // isAdmin = false par défaut au sync — les rôles sont gérés
            // dynamiquement dans UserController.getMe() via le JWT
            User user = userService.findOrProvision(
                    req.getKeycloakId(),
                    req.getEmail(),
                    req.getFirstName()  != null ? req.getFirstName()  : "",
                    req.getLastName()   != null ? req.getLastName()   : "",
                    false
            );
            return ResponseEntity.ok(new UserResponse(user));
        } catch (Exception e) {
            return ResponseEntity.internalServerError()
                    .body(Map.of("message", e.getMessage()));
        }
    }
}