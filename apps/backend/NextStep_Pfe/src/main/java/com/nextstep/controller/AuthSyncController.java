package com.nextstep.controller;

import com.nextstep.dto.UserResponse;
import com.nextstep.service.UserService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import lombok.Data;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;

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
     *
     * Appelé automatiquement par Next.js auth.ts lors de chaque premier login.
     * Crée l'utilisateur dans la base si inexistant (upsert par keycloakId).
     * Idempotent — safe à appeler plusieurs fois.
     */
    /*@PostMapping("/sync")
    @Operation(summary = "Upsert utilisateur Keycloak dans la base locale")
    public ResponseEntity<UserResponse> sync(@Valid @RequestBody SyncRequest req) {
        UserResponse user = userService.syncFromKeycloak(
                UUID.fromString(req.getKeycloakId()),
                req.getEmail(),
                req.getFirstName(),
                req.getLastName()
        );
        return ResponseEntity.ok(user);
    }*/
}