package com.nextstep.filter;


import lombok.*;
import org.springframework.format.annotation.DateTimeFormat;

import java.time.LocalDateTime;

/**
 * Filtre pour les audit logs — construit manuellement dans le contrôleur
 * à partir des @RequestParam pour éviter tout conflit avec Pageable.
 */
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@ToString
public class AuditLogFilter {

    /** Recherche full-text : email, userId, description, resourceId, IP */
    private String search;

    /** CREATE | READ | UPDATE | DELETE | LOGIN | LOGOUT | EXPORT | SEARCH */
    private String action;

    /** USER_MANAGEMENT | TRANSACTION | REPORT | SETTINGS | SECURITY | GENERAL */
    private String module;

    /** SUCCESS | FAILURE | PARTIAL | ACCESS_DENIED */
    private String outcome;

    private String userId;
    private String userEmail;
    private String resourceType;
    private String resourceId;
    private String ipAddress;

    @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME)
    private LocalDateTime dateFrom;

    @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME)
    private LocalDateTime dateTo;
}