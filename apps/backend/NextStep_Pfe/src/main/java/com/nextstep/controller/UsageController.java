package com.nextstep.controller;

import com.nextstep.dto.InvoiceResponse;
import com.nextstep.dto.UsageRecordResponse;
import com.nextstep.entity.User;
import com.nextstep.service.UsageService;
import com.nextstep.service.UserService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/usage")
@RequiredArgsConstructor
@Tag(name = "Usage PAYG", description = "Consommation et factures Pay-As-You-Go")
@SecurityRequirement(name = "bearerAuth")
public class UsageController {

    private final UsageService usageService;
    private final UserService  userService;

    /**
     * Records de consommation d'un abonnement sur une période.
     * GET /api/usage/abonnements/{id}?debut=...&fin=...
     */
    @GetMapping("/abonnements/{abonnementId}")
    @Operation(summary = "Consommation d'un abonnement PAYG sur une période")
    public List<UsageRecordResponse> getUsage(
            @PathVariable Long abonnementId,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime debut,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime fin) {
        return usageService.getUsageParAbonnement(abonnementId, debut, fin);
    }

    /**
     * Factures du client connecté.
     * GET /api/usage/factures
     */
    @GetMapping("/factures")
    @Operation(summary = "Factures PAYG du client connecté")
    public List<InvoiceResponse> mesFactures(@AuthenticationPrincipal Jwt jwt) {
        UUID clientId = userService.findByKeycloakId(jwt.getSubject()).getId();
        return usageService.getFacturesParClient(clientId);
    }
}