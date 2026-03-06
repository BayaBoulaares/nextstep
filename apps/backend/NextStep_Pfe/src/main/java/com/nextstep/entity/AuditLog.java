package com.nextstep.entity;


import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import java.time.LocalDateTime;
import java.util.UUID;

/**
 * Entité immuable représentant une entrée dans le journal d'audit.
 *
 * RÈGLE D'OR : Jamais d'UPDATE ni de DELETE sur cette table.
 * Chaque action de l'application génère une nouvelle entrée.
 */
@Entity
@Table(
        name = "audit_logs",
        indexes = {
                @Index(name = "idx_al_user",      columnList = "user_id"),
                @Index(name = "idx_al_email",     columnList = "user_email"),
                @Index(name = "idx_al_action",    columnList = "action"),
                @Index(name = "idx_al_module",    columnList = "module"),
                @Index(name = "idx_al_outcome",   columnList = "outcome"),
                @Index(name = "idx_al_created",   columnList = "created_at DESC"),
                @Index(name = "idx_al_resource",  columnList = "resource_type, resource_id")
        }
)
@Getter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class AuditLog {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(name = "id", updatable = false, nullable = false)
    private UUID id;

    // ── Qui a fait l'action ───────────────────────────────────────────────

    /** Subject UUID Keycloak de l'utilisateur */
    @Column(name = "user_id", nullable = false, length = 255)
    private String userId;

    @Column(name = "user_email", length = 255)
    private String userEmail;

    @Column(name = "user_name", length = 255)
    private String userName;

    /** Rôles Keycloak au moment de l'action (ex: "ADMIN,VIEWER") */
    @Column(name = "user_roles", length = 500)
    private String userRoles;

    // ── Ce qui a été fait ─────────────────────────────────────────────────

    /**
     * Action réalisée :
     * LOGIN | LOGOUT | CREATE | READ | UPDATE | DELETE |
     * EXPORT | IMPORT | SEARCH | ACCESS_DENIED | PASSWORD_RESET | ...
     */
    @Column(name = "action", nullable = false, length = 100)
    private String action;

    /**
     * Module / fonctionnalité concerné :
     * USER_MANAGEMENT | TRANSACTION | REPORT | SETTINGS | SECURITY | ...
     */
    @Column(name = "module", length = 100)
    private String module;

    /** Description lisible de l'opération */
    @Column(name = "description", columnDefinition = "TEXT")
    private String description;

    // ── Sur quoi ──────────────────────────────────────────────────────────

    /** Type de ressource concernée (ex: "USER", "REPORT", "CONFIG") */
    @Column(name = "resource_type", length = 100)
    private String resourceType;

    /** ID de la ressource concernée */
    @Column(name = "resource_id", length = 255)
    private String resourceId;

    /** Nom/label de la ressource pour la lisibilité */
    @Column(name = "resource_label", length = 500)
    private String resourceLabel;

    // ── Détails techniques ────────────────────────────────────────────────

    /** Endpoint HTTP appelé (ex: "GET /api/v1/users/42") */
    @Column(name = "http_method", length = 10)
    private String httpMethod;

    @Column(name = "endpoint", length = 500)
    private String endpoint;

    /** Code HTTP retourné */
    @Column(name = "http_status")
    private Integer httpStatus;

    @Column(name = "ip_address", length = 45)
    private String ipAddress;

    @Column(name = "user_agent", columnDefinition = "TEXT")
    private String userAgent;

    /** Realm Keycloak */
    @Column(name = "realm", length = 100)
    private String realm;

    /** Client Keycloak utilisé (ex: "nextjs-app") */
    @Column(name = "keycloak_client_id", length = 100)
    private String keycloakClientId;

    /** Durée d'exécution en millisecondes */
    @Column(name = "duration_ms")
    private Long durationMs;

    // ── Données de l'opération ────────────────────────────────────────────

    /** Données soumises / paramètres JSON (payload de la requête) */
    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "request_payload", columnDefinition = "jsonb")
    private String requestPayload;

    /** État de la ressource AVANT modification */
    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "before_state", columnDefinition = "jsonb")
    private String beforeState;

    /** État de la ressource APRÈS modification */
    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "after_state", columnDefinition = "jsonb")
    private String afterState;

    // ── Résultat ──────────────────────────────────────────────────────────

    /**
     * Résultat de l'opération :
     * SUCCESS | FAILURE | PARTIAL | ACCESS_DENIED
     */
    @Column(name = "outcome", nullable = false, length = 20)
    private String outcome;

    /** Message d'erreur si outcome != SUCCESS */
    @Column(name = "error_message", columnDefinition = "TEXT")
    private String errorMessage;

    // ── Timestamp ─────────────────────────────────────────────────────────

    /** Immuable — jamais mis à jour */
    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;
}