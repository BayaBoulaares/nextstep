package com.nextstep.controller;

import com.nextstep.service.VmNetworkService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/vms")
@RequiredArgsConstructor
@Slf4j
public class VmNetworkController {

    private final VmNetworkService vmNetworkService;

    /**
     * POST /api/vms/{name}/interfaces
     * Ajouter une nouvelle interface réseau (VM doit être arrêtée)
     * Body: { "name": "eth1", "model": "virtio", "type": "masquerade" }
     */
    @PostMapping("/{name}/interfaces")
    @PreAuthorize("hasRole('client') or hasRole('admin')")
    public ResponseEntity<?> addInterface(
            @PathVariable String name,
            @RequestBody Map<String, String> body,
            @AuthenticationPrincipal Jwt jwt) {
        try {
            String ifaceName = body.get("name");
            String model     = body.getOrDefault("model", "virtio");
            String type      = body.getOrDefault("type", "masquerade");

            if (ifaceName == null || ifaceName.isBlank())
                return ResponseEntity.badRequest().body(Map.of("error", "name requis"));

            vmNetworkService.addInterface(name, ifaceName, model, type);
            return ResponseEntity.ok(Map.of("message", "Interface " + ifaceName + " ajoutée"));

        } catch (IllegalStateException e) {
            return ResponseEntity.status(409).body(Map.of("error", e.getMessage()));
        } catch (Exception e) {
            log.error("[NETWORK] addInterface error: {}", e.getMessage());
            return ResponseEntity.status(500).body(Map.of("error", e.getMessage()));
        }
    }

    /**
     * PATCH /api/vms/{name}/interfaces/{ifaceName}/link
     * Définir le lien vers le bas (linkDown=true) ou le remettre (linkDown=false)
     * Body: { "linkDown": true }
     */
    @PatchMapping("/{name}/interfaces/{ifaceName}/link")
    @PreAuthorize("hasRole('client') or hasRole('admin')")
    public ResponseEntity<?> setLinkState(
            @PathVariable String name,
            @PathVariable String ifaceName,
            @RequestBody Map<String, Boolean> body,
            @AuthenticationPrincipal Jwt jwt) {
        try {
            boolean linkDown = Boolean.TRUE.equals(body.get("linkDown"));
            vmNetworkService.setLinkState(name, ifaceName, linkDown);
            return ResponseEntity.ok(Map.of(
                    "message", "Lien " + ifaceName + " → " + (linkDown ? "down" : "up")));
        } catch (Exception e) {
            log.error("[NETWORK] setLinkState error: {}", e.getMessage());
            return ResponseEntity.status(500).body(Map.of("error", e.getMessage()));
        }
    }

    /**
     * PATCH /api/vms/{name}/interfaces/{ifaceName}
     * Modifier le modèle d'une interface
     * Body: { "model": "virtio" }
     */
    @PatchMapping("/{name}/interfaces/{ifaceName}")
    @PreAuthorize("hasRole('client') or hasRole('admin')")
    public ResponseEntity<?> updateInterface(
            @PathVariable String name,
            @PathVariable String ifaceName,
            @RequestBody Map<String, String> body,
            @AuthenticationPrincipal Jwt jwt) {
        try {
            String model = body.get("model");
            if (model == null || model.isBlank())
                return ResponseEntity.badRequest().body(Map.of("error", "model requis"));
            vmNetworkService.updateInterface(name, ifaceName, model);
            return ResponseEntity.ok(Map.of("message", "Interface " + ifaceName + " mise à jour"));
        } catch (Exception e) {
            log.error("[NETWORK] updateInterface error: {}", e.getMessage());
            return ResponseEntity.status(500).body(Map.of("error", e.getMessage()));
        }
    }

    /**
     * DELETE /api/vms/{name}/interfaces/{ifaceName}
     * Supprimer une interface réseau (VM doit être arrêtée)
     */
    @DeleteMapping("/{name}/interfaces/{ifaceName}")
    @PreAuthorize("hasRole('client') or hasRole('admin')")
    public ResponseEntity<?> deleteInterface(
            @PathVariable String name,
            @PathVariable String ifaceName,
            @AuthenticationPrincipal Jwt jwt) {
        try {
            vmNetworkService.deleteInterface(name, ifaceName);
            return ResponseEntity.noContent().build();
        } catch (IllegalStateException e) {
            return ResponseEntity.status(409).body(Map.of("error", e.getMessage()));
        } catch (Exception e) {
            log.error("[NETWORK] deleteInterface error: {}", e.getMessage());
            return ResponseEntity.status(500).body(Map.of("error", e.getMessage()));
        }
    }
}