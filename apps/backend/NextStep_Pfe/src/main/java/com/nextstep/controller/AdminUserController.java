package com.nextstep.controller;

import com.nextstep.dto.SuspendRequestDTO;
import com.nextstep.dto.UserAdminDTO;
import com.nextstep.service.UserAdminService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.*;

@RestController
@PreAuthorize("hasRole('admin')")  // ✅ cherche ROLE_ADMIN → correct
@RequestMapping("/api/admin/users")
@RequiredArgsConstructor
public class AdminUserController {

    private final UserAdminService userAdminService;

    // GET /api/admin/users?page=0&size=10
    @GetMapping
    public ResponseEntity<Page<UserAdminDTO>> getClients(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size,
            @AuthenticationPrincipal Jwt jwt) {

        // LOG TEMPORAIRE — à retirer après debug
        System.out.println("=== DEBUG AUTHORITIES ===");
        System.out.println("Subject: " + (jwt != null ? jwt.getSubject() : "NULL"));
        org.springframework.security.core.context.SecurityContextHolder
                .getContext().getAuthentication().getAuthorities()
                .forEach(a -> System.out.println("Authority: " + a.getAuthority()));
        System.out.println("=========================");

        return ResponseEntity.ok(userAdminService.getAllClients(page, size));
    }

    // PATCH /api/admin/users/{keycloakId}/suspend
    @PatchMapping("/{keycloakId}/suspend")
    public ResponseEntity<Void> suspendUser(
            @PathVariable String keycloakId,
            @RequestBody @Valid SuspendRequestDTO request,
            @AuthenticationPrincipal Jwt jwt) {
        String adminKeycloakId = jwt.getSubject();
        userAdminService.suspendUser(keycloakId, request.reason(), adminKeycloakId);
        return ResponseEntity.noContent().build();  // 204 au lieu de 200
    }

    // PATCH /api/admin/users/{keycloakId}/reactivate
    @PatchMapping("/{keycloakId}/reactivate")
    public ResponseEntity<Void> reactivateUser(@PathVariable String keycloakId) {
        userAdminService.reactivateUser(keycloakId);
        return ResponseEntity.noContent().build();  // 204 au lieu de 200
    }
}