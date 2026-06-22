package com.nextstep.controller;


import jakarta.servlet.http.HttpServletRequest;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.MediaType;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.reactive.function.client.WebClient;
import reactor.core.publisher.Mono;

import java.util.List;
import java.util.Map;


@RestController
@RequestMapping("/api/ia/healer")
@CrossOrigin(origins = "${cors.allowed-origins}")
@Slf4j
public class AutoHealerController {

    private final WebClient webClient;

    public AutoHealerController(
            @Value("${services.auto-healer.url:http://localhost:8002}") String serviceUrl
    ) {
        this.webClient = WebClient.builder()
                .baseUrl(serviceUrl)
                .build();
    }

    // ─────────────────────────────────────────────────────────────────────────
    // GET /api/ia/healer/incidents
    // Retourne tous les incidents, filtrables par namespace et status
    // ─────────────────────────────────────────────────────────────────────────
    @GetMapping("/incidents")
    public Mono<List<Map<String, Object>>> getIncidents(
            @RequestParam(required = false) String namespace,
            @RequestParam(required = false) String status,
            HttpServletRequest httpRequest
    ) {
        String bearer = getBearer(httpRequest);
        String uri    = buildUri("/incidents", namespace, status);

        log.info("[HEALER] GET incidents — ns:{} status:{}", namespace, status);

        return webClient.get()
                .uri(uri)
                .header("Authorization", bearer)
                .retrieve()
                .bodyToFlux(Map.class)
                .cast(Map.class)
                .map(m -> (Map<String, Object>) m)
                .collectList();
    }

    // ─────────────────────────────────────────────────────────────────────────
    // GET /api/ia/healer/incidents/stats
    // ─────────────────────────────────────────────────────────────────────────
    @GetMapping("/incidents/stats")
    public Mono<Map> getStats(HttpServletRequest httpRequest) {
        String bearer = getBearer(httpRequest);
        return webClient.get()
                .uri("/incidents/stats")
                .header("Authorization", bearer)
                .retrieve()
                .bodyToMono(Map.class);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // DELETE /api/ia/healer/incidents
    // Vider tous les incidents (admin uniquement)
    // ─────────────────────────────────────────────────────────────────────────
    @DeleteMapping("/incidents")
    public Mono<Map> clearIncidents(HttpServletRequest httpRequest) {
        String bearer = getBearer(httpRequest);
        log.info("[HEALER] DELETE incidents — clear all");
        return webClient.delete()
                .uri("/incidents")
                .header("Authorization", bearer)
                .retrieve()
                .bodyToMono(Map.class);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // GET /api/ia/healer/health
    // ─────────────────────────────────────────────────────────────────────────
    @GetMapping("/health")
    public Mono<Map> health() {
        return webClient.get()
                .uri("/health")
                .retrieve()
                .bodyToMono(Map.class);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Helpers
    // ─────────────────────────────────────────────────────────────────────────
    private String getBearer(HttpServletRequest req) {
        String header = req.getHeader("Authorization");
        return header != null ? header : "";
    }

    private String buildUri(String base, String namespace, String status) {
        StringBuilder sb = new StringBuilder(base);
        boolean hasParam = false;
        if (namespace != null && !namespace.isBlank()) {
            sb.append("?namespace=").append(namespace);
            hasParam = true;
        }
        if (status != null && !status.isBlank()) {
            sb.append(hasParam ? "&" : "?").append("status=").append(status);
        }
        return sb.toString();
    }
}