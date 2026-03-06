package com.nextstep.controller;



import com.nextstep.dto.AuditLogDTO;
import com.nextstep.dto.ForgotPasswordRequest;
import com.nextstep.dto.ResetPasswordRequest;
import com.nextstep.exceptions.InvalidTokenException;
import com.nextstep.filter.AuditLogFilter;
import com.nextstep.service.AuditLogService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.UUID;

/**
 * ✅ FIX 7 — @PreAuthorize adapté aux rôles réels de Keycloak
 *
 * PROBLÈME ORIGINAL :
 *   @PreAuthorize("hasRole('AUDIT_VIEWER') or hasRole('ADMIN')")
 *   → Ces rôles (AUDIT_VIEWER, AUDIT_EXPORTER) n'existent probablement pas dans Keycloak
 *   → Avec sécurité désactivée, @PreAuthorize était ignoré (pas de @EnableMethodSecurity)
 *   → Maintenant que @EnableMethodSecurity est activé, ces endpoints retourneraient 403
 *
 * CORRECTION :
 *   Les rôles sont remplacés par les rôles réels de votre Keycloak : "admin" et "client"
 *   Seul l'admin peut voir/exporter les logs d'audit.
 *
 * IMPORTANT : hasRole('admin') cherche l'authority "ROLE_admin" dans le SecurityContext.
 *   Vérifiez que KeycloakJwtConverter produit bien "ROLE_admin" pour vos utilisateurs admin.
 */
@RestController
@RequestMapping("/audit-logs")
@RequiredArgsConstructor
public class AuditLogController {

    private final AuditLogService auditLogService;

    @GetMapping
    @PreAuthorize("hasRole('admin')")   // ✅ rôle réel Keycloak
    public ResponseEntity<Page<AuditLogDTO>> getAll(
            @RequestParam(required = false) String search,
            @RequestParam(required = false) String action,
            @RequestParam(required = false) String module,
            @RequestParam(required = false) String outcome,
            @RequestParam(required = false) String userId,
            @RequestParam(required = false) String userEmail,
            @RequestParam(required = false) String resourceType,
            @RequestParam(required = false) String resourceId,
            @RequestParam(required = false) String ipAddress,
            @RequestParam(required = false)
            @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime dateFrom,
            @RequestParam(required = false)
            @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime dateTo,
            @RequestParam(defaultValue = "0")  int page,
            @RequestParam(defaultValue = "20") int size) {

        Pageable pageable = PageRequest.of(
                Math.max(0, page),
                Math.min(100, Math.max(1, size)),
                Sort.by(Sort.Direction.DESC, "createdAt")
        );

        AuditLogFilter filter = AuditLogFilter.builder()
                .search(search).action(action).module(module).outcome(outcome)
                .userId(userId).userEmail(userEmail)
                .resourceType(resourceType).resourceId(resourceId)
                .ipAddress(ipAddress).dateFrom(dateFrom).dateTo(dateTo)
                .build();

        return ResponseEntity.ok(auditLogService.findAll(filter, pageable));
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasRole('admin')")
    public ResponseEntity<AuditLogDTO> getById(@PathVariable UUID id) {
        return ResponseEntity.ok(auditLogService.findById(id));
    }

    @GetMapping("/resource/{resourceType}/{resourceId}")
    @PreAuthorize("hasRole('admin')")
    public ResponseEntity<List<AuditLogDTO>> getByResource(
            @PathVariable String resourceType,
            @PathVariable String resourceId) {
        return ResponseEntity.ok(auditLogService.findByResource(resourceType, resourceId));
    }

    @GetMapping("/me")
    @PreAuthorize("isAuthenticated()")   // tout utilisateur connecté peut voir ses propres logs
    public ResponseEntity<Page<AuditLogDTO>> getMyLogs(
            @AuthenticationPrincipal Jwt jwt,
            @RequestParam(defaultValue = "0")  int page,
            @RequestParam(defaultValue = "20") int size) {

        Pageable pageable = PageRequest.of(
                Math.max(0, page), Math.min(100, size),
                Sort.by(Sort.Direction.DESC, "createdAt")
        );
        return ResponseEntity.ok(auditLogService.findByUser(jwt.getSubject(), pageable));
    }

    @GetMapping("/user/{userId}")
    @PreAuthorize("hasRole('admin')")
    public ResponseEntity<Page<AuditLogDTO>> getByUser(
            @PathVariable String userId,
            @RequestParam(defaultValue = "0")  int page,
            @RequestParam(defaultValue = "20") int size) {

        Pageable pageable = PageRequest.of(
                Math.max(0, page), Math.min(100, size),
                Sort.by(Sort.Direction.DESC, "createdAt")
        );
        return ResponseEntity.ok(auditLogService.findByUser(userId, pageable));
    }

    @GetMapping("/stats")
    @PreAuthorize("hasRole('admin')")
    public ResponseEntity<Map<String, Object>> getStats(
            @RequestParam(required = false)
            @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime from,
            @RequestParam(required = false)
            @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime to) {

        LocalDateTime start = from != null ? from : LocalDateTime.now().minusDays(30);
        LocalDateTime end   = to   != null ? to   : LocalDateTime.now();
        return ResponseEntity.ok(auditLogService.getStats(start, end));
    }

    @GetMapping("/export")
    @PreAuthorize("hasRole('admin')")
    public ResponseEntity<byte[]> export(
            @RequestParam(required = false) String action,
            @RequestParam(required = false) String module,
            @RequestParam(required = false) String outcome,
            @RequestParam(required = false) String search,
            @RequestParam(required = false)
            @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime dateFrom,
            @RequestParam(required = false)
            @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime dateTo) {

        AuditLogFilter filter = AuditLogFilter.builder()
                .search(search).action(action).module(module).outcome(outcome)
                .dateFrom(dateFrom).dateTo(dateTo)
                .build();

        byte[] csv = auditLogService.exportCsv(filter);

        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"audit-logs.csv\"")
                .contentType(MediaType.parseMediaType("text/csv; charset=UTF-8"))
                .contentLength(csv.length)
                .body(csv);
    }
    // ── Mot de passe oublié ────────────────────────────────────────────────────
    /*@PostMapping("/forgot-password")
    public ResponseEntity<?> forgotPassword(@RequestBody ForgotPasswordRequest request) {
        String email = request.getEmail();
        if (email == null || email.isBlank())
            return ResponseEntity.badRequest().body(Map.of("message", "Email requis"));

        try {
            if (userRepository.existsByEmail(email)) {
                String firstName = userRepository.findByEmail(email)
                        .map(u -> u.getFirstName()).orElse("");
                emailVerificationService.sendResetPasswordLink(email, firstName);
            }
            // ✅ Toujours 200 — évite l'énumération d'emails
            return ResponseEntity.ok(Map.of("message",
                    "Si un compte existe pour cet email, un lien a été envoyé."));
        } catch (RuntimeException e) {
            return ResponseEntity.ok(Map.of("message",
                    "Si un compte existe pour cet email, un lien a été envoyé."));
        }
    }

    // ── Reset password ─────────────────────────────────────────────────────────
    @PostMapping("/reset-password")
    public ResponseEntity<?> resetPassword(@Valid @RequestBody ResetPasswordRequest request) {
        try {
            emailVerificationService.verifyToken(
                    request.getToken(), request.getEmail(), "RESET_PASSWORD");
            keycloakAdminService.resetPassword(request.getEmail(), request.getPassword());
            return ResponseEntity.ok(Map.of("message", "Mot de passe modifié avec succès"));
        } catch (InvalidTokenException e) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body(Map.of("message", e.getMessage()));
        } catch (RuntimeException e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("message", "Erreur serveur : " + e.getMessage()));
        }
    }*/
}