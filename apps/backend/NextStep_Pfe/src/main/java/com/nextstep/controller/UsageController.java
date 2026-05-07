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
@Tag(name = "Facturation", description = "Factures mensuelles")
@SecurityRequirement(name = "bearerAuth")
public class UsageController {

    private final UsageService usageService;
    private final UserService  userService;

    @GetMapping("/factures")
    @Operation(summary = "Factures du client connecté")
    public List<InvoiceResponse> mesFactures(@AuthenticationPrincipal Jwt jwt) {
        UUID clientId = userService.findByKeycloakId(jwt.getSubject()).getId();
        return usageService.getFacturesParClient(clientId);
    }
}