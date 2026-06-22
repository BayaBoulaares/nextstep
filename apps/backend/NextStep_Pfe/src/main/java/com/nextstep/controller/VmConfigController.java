package com.nextstep.controller;

import com.nextstep.dto.VmConfigDTO;
import com.nextstep.dto.VmConfigUpdateDTO;
import com.nextstep.service.VmConfigService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.*;

import java.util.Map;
@Slf4j
@RestController
@RequestMapping("/api/vms")
@RequiredArgsConstructor
public class VmConfigController {

    private final VmConfigService vmConfigService;

    /**
     * GET /api/vms/{name}/config
     * Retourne la configuration complète d'une VM :
     * détails, disques, interfaces réseau, planification.
     */
    @GetMapping("/{name}/config")
    @PreAuthorize("hasRole('client') or hasRole('admin')")
    public ResponseEntity<?> getVmConfig(
            @PathVariable String name,
            @AuthenticationPrincipal Jwt jwt) {
        try {
            VmConfigDTO config = vmConfigService.getConfig(name);
            return ResponseEntity.ok(config);
        } catch (Exception e) {
            return ResponseEntity.status(500).body(
                    java.util.Map.of("error", e.getMessage()));
        }
    }
    // ── Ajouter dans VmConfigController.java (ou VmController.java) ──────────────

    /**
     * PATCH /api/vms/{name}/config
     * Modifie la configuration (description, CPU, RAM, hostname, options).
     */
    @PatchMapping("/{name}/config")
    @PreAuthorize("hasRole('client') or hasRole('admin')")
    public ResponseEntity<?> updateVmConfig(
            @PathVariable String name,
            @RequestBody VmConfigUpdateDTO dto,
            @AuthenticationPrincipal Jwt jwt) {
        try {
            vmConfigService.updateConfig(name, dto);
            return ResponseEntity.ok(Map.of("message", "Configuration mise à jour"));
        } catch (Exception e) {
            log.error("[CONFIG UPDATE] Erreur pour VM {}: {}", name, e.getMessage());
            return ResponseEntity.status(500).body(Map.of("error", e.getMessage()));
        }
    }
}