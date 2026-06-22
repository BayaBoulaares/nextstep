package com.nextstep.controller;

import com.nextstep.dto.ImageRegistryRequest;
import com.nextstep.dto.ImageRegistryResponse;
import com.nextstep.service.ImageRegistryService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/v1/registries")
@RequiredArgsConstructor
@Slf4j
public class ImageRegistryController {

    private final ImageRegistryService registryService;

    // ── GET /api/v1/registries
    @GetMapping
    public ResponseEntity<List<ImageRegistryResponse>> getMyRegistries(
            @AuthenticationPrincipal Jwt jwt) {
        return ResponseEntity.ok(registryService.getByOwner(jwt.getSubject()));
    }

    // ── GET /api/v1/registries/{id}
    @GetMapping("/{id}")
    public ResponseEntity<ImageRegistryResponse> getById(
            @PathVariable Long id,
            @AuthenticationPrincipal Jwt jwt) {
        return ResponseEntity.ok(registryService.getById(id, jwt.getSubject()));
    }

    // ── POST /api/v1/registries
    // Body: { "name": "mon-registry", "description": "..." }
    // Pas de champ registryType — toujours INTERNAL
    @PostMapping
    public ResponseEntity<ImageRegistryResponse> create(
            @RequestBody ImageRegistryRequest request,
            @AuthenticationPrincipal Jwt jwt) {

        String keycloakId = jwt.getSubject();
        log.info("[REGISTRY] CREATE {} — tenant: {}", request.getName(), keycloakId);
        return ResponseEntity
                .status(HttpStatus.CREATED)
                .body(registryService.create(request, keycloakId));
    }

    // ── DELETE /api/v1/registries/{id}
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(
            @PathVariable Long id,
            @AuthenticationPrincipal Jwt jwt) {

        log.info("[REGISTRY] DELETE {} — tenant: {}", id, jwt.getSubject());
        registryService.delete(id, jwt.getSubject());
        return ResponseEntity.noContent().build();
    }
}