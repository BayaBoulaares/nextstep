package com.nextstep.controller;

import com.nextstep.dto.KnativeServiceRequest;
import com.nextstep.dto.KnativeServiceResponse;
import com.nextstep.entity.KnativeType;
import com.nextstep.service.KnativeManagementService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/v1/serverless")
@RequiredArgsConstructor
@Slf4j
public class KnativeController {

    private final KnativeManagementService knativeService;

    // ── GET /api/v1/serverless
    // Liste tous les services Knative du tenant (SERVING + FUNCTION)
    @GetMapping
    public ResponseEntity<List<KnativeServiceResponse>> getAll(
            @AuthenticationPrincipal Jwt jwt) {

        return ResponseEntity.ok(knativeService.getByOwner(jwt.getSubject()));
    }

    // ── GET /api/v1/serverless?type=SERVING
    // Filtre par type : SERVING | FUNCTION
    @GetMapping(params = "type")
    public ResponseEntity<List<KnativeServiceResponse>> getByType(
            @RequestParam KnativeType type,
            @AuthenticationPrincipal Jwt jwt) {

        return ResponseEntity.ok(
                knativeService.getByOwnerAndType(jwt.getSubject(), type));
    }

    // ── GET /api/v1/serverless/{id}
    @GetMapping("/{id}")
    public ResponseEntity<KnativeServiceResponse> getById(
            @PathVariable Long id,
            @AuthenticationPrincipal Jwt jwt) {

        return ResponseEntity.ok(knativeService.getById(id, jwt.getSubject()));
    }

    // ── POST /api/v1/serverless
    // Déploie un Knative Serving ou une Knative Function
    //
    // Exemple body Knative Serving :
    // {
    //   "name": "mon-api",
    //   "knativeType": "SERVING",
    //   "containerImage": "quay.io/nextstep-abc12345/mon-api:latest",
    //   "minScale": 0,
    //   "maxScale": 5,
    //   "cpuLimit": "500m",
    //   "memoryLimit": "256Mi"
    // }
    //
    // Exemple body Knative Function (cron) :
    // {
    //   "name": "ma-fonction",
    //   "knativeType": "FUNCTION",
    //   "containerImage": "quay.io/nextstep-abc12345/ma-fonction:latest",
    //   "eventSource": "PING",
    //   "cronSchedule": "*/10 * * * *"
    // }
    @PostMapping
    public ResponseEntity<KnativeServiceResponse> create(
            @RequestBody KnativeServiceRequest request,
            @AuthenticationPrincipal Jwt jwt) {

        String keycloakId = jwt.getSubject();
        log.info("[KNATIVE] CREATE {} ({}/{}) — tenant: {}",
                request.getName(), request.getKnativeType(),
                request.getEventSource(), keycloakId);

        KnativeServiceResponse response = knativeService.create(request, keycloakId);
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    // ── POST /api/v1/serverless/{id}/sync
    // Synchronise le statut depuis le cluster OpenShift
    // (détecte SCALED_TO_ZERO vs ACTIVE, met à jour l'URL)
    @PostMapping("/{id}/sync")
    public ResponseEntity<KnativeServiceResponse> syncStatus(
            @PathVariable Long id,
            @AuthenticationPrincipal Jwt jwt) {

        log.info("[KNATIVE] SYNC status {} — tenant: {}", id, jwt.getSubject());
        return ResponseEntity.ok(knativeService.syncStatus(id, jwt.getSubject()));
    }

    // ── DELETE /api/v1/serverless/{id}
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(
            @PathVariable Long id,
            @AuthenticationPrincipal Jwt jwt) {

        String keycloakId = jwt.getSubject();
        log.info("[KNATIVE] DELETE {} — tenant: {}", id, keycloakId);
        knativeService.delete(id, keycloakId);
        return ResponseEntity.noContent().build();
    }
}