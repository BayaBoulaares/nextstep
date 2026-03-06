package com.nextstep.dto;


import lombok.*;

/**
 * DTO de demande d'enregistrement d'un log d'audit.
 * Utilisé en interne par le service et le filtre HTTP.
 *
 * Exemple d'utilisation :
 * <pre>
 *   auditLogService.log(AuditLogRequest.builder()
 *       .action("DELETE")
 *       .module("USER_MANAGEMENT")
 *       .description("Suppression de l'utilisateur john.doe@example.com")
 *       .resourceType("USER")
 *       .resourceId("42")
 *       .outcome("SUCCESS")
 *       .build());
 * </pre>
 */
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class AuditLogRequest {

    // ── Qui ───────────────────────────────────────────────────────────────
    private String userId;
    private String userEmail;
    private String userName;
    private String userRoles;

    // ── Quoi ──────────────────────────────────────────────────────────────
    /** LOGIN | LOGOUT | CREATE | READ | UPDATE | DELETE | EXPORT | SEARCH | ... */
    private String action;

    /** USER_MANAGEMENT | TRANSACTION | REPORT | SETTINGS | SECURITY | ... */
    private String module;

    private String description;

    // ── Sur quoi ──────────────────────────────────────────────────────────
    private String resourceType;
    private String resourceId;
    private String resourceLabel;

    // ── Technique ─────────────────────────────────────────────────────────
    private String  httpMethod;
    private String  endpoint;
    private Integer httpStatus;
    private String  ipAddress;
    private String  userAgent;
    private String  realm;
    private String  keycloakClientId;
    private Long    durationMs;

    // ── Données ───────────────────────────────────────────────────────────
    private String requestPayload;
    private String beforeState;
    private String afterState;

    // ── Résultat ──────────────────────────────────────────────────────────
    /** SUCCESS | FAILURE | PARTIAL | ACCESS_DENIED */
    @Builder.Default
    private String outcome = "SUCCESS";

    private String errorMessage;
}