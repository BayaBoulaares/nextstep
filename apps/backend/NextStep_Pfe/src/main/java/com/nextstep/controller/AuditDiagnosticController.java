package com.nextstep.controller;


import com.nextstep.dto.AuditLogRequest;
import com.nextstep.service.AuditLogService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.annotation.Profile;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

/**
 * ⚠️  CONTROLLER DE DIAGNOSTIC UNIQUEMENT.
 * Permet de tester manuellement que le système d'audit fonctionne.
 *
 * Appel :  POST /audit-test/ping
 * Réponse: { "message": "Log created", "userId": "..." }
 *
 * Désactivez ou supprimez ce controller en production.
 * (ou gardez @Profile("dev") pour le limiter au profil dev)
 */



/**
 * ✅ FIX 9 — @Profile("dev") activé
 *
 * PROBLÈME ORIGINAL :
 *   Ce controller était accessible en production sans aucune restriction.
 *   N'importe qui pouvait appeler POST /audit-test/ping et insérer des logs
 *   arbitraires dans la table d'audit.
 *
 * CORRECTION :
 *   @Profile("dev") → ce controller n'existe QUE quand spring.profiles.active=dev
 *   En production, ce bean n'est pas créé du tout.
 *
 * UTILISATION :
 *   application-dev.properties : spring.profiles.active=dev
 *   Ou au démarrage : --spring.profiles.active=dev
 */
@RestController
@RequestMapping("/audit-test")
@RequiredArgsConstructor
@Slf4j
@Profile("dev")   // ✅ désactivé en production
public class AuditDiagnosticController {

    private final AuditLogService auditLogService;

    @PostMapping("/ping")
    public ResponseEntity<Map<String, Object>> ping(@AuthenticationPrincipal Jwt jwt) {
        String userId    = jwt != null ? jwt.getSubject() : "anonymous";
        String userEmail = jwt != null ? jwt.getClaimAsString("email") : "anonymous";
        String userName  = jwt != null ? jwt.getClaimAsString("preferred_username") : "anonymous";

        log.info("[AUDIT-DIAG] Manual test by userId={} email={}", userId, userEmail);

        var result = auditLogService.log(AuditLogRequest.builder()
                .userId(userId).userEmail(userEmail).userName(userName)
                .action("READ").module("GENERAL")
                .description("Manual audit test via /audit-test/ping")
                .httpMethod("POST").endpoint("/audit-test/ping")
                .httpStatus(200).outcome("SUCCESS")
                .build());

        return ResponseEntity.ok(Map.of(
                "message", "Log created successfully",
                "logId",   result != null ? result.getId().toString() : "null",
                "userId",  userId,
                "email",   userEmail
        ));
    }
}