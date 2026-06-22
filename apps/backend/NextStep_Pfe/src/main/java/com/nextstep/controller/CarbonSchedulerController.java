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
@RequestMapping("/api/ia/carbon")
@CrossOrigin(origins = "${cors.allowed-origins}")
@Slf4j
public class CarbonSchedulerController {

    private final WebClient webClient;

    public CarbonSchedulerController(
            @Value("${services.carbon-scheduler.url:http://localhost:8003}") String serviceUrl
    ) {
        this.webClient = WebClient.builder()
                .baseUrl(serviceUrl)
                .build();
    }

    // ─────────────────────────────────────────────────────────────────────────
    // GET /api/ia/carbon/current
    // ─────────────────────────────────────────────────────────────────────────
    @GetMapping("/current")
    public Mono<Map> getCurrentCarbon(HttpServletRequest httpRequest) {
        return webClient.get()
                .uri("/carbon/current")// d'ou elle trouve cet uri
                .header("Authorization", getBearer(httpRequest))
                .retrieve()
                .bodyToMono(Map.class);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // GET /api/ia/carbon/history?limit=24
    // ─────────────────────────────────────────────────────────────────────────
    @GetMapping("/history")
    public Mono<List<Map>> getHistory(
            @RequestParam(defaultValue = "24") int limit,
            HttpServletRequest httpRequest
    ) {
        return webClient.get()
                .uri("/carbon/history?limit=" + limit)
                .header("Authorization", getBearer(httpRequest))
                .retrieve()
                .bodyToFlux(Map.class)
                .collectList();
    }

    // ─────────────────────────────────────────────────────────────────────────
    // POST /api/ia/carbon/jobs/submit
    // ─────────────────────────────────────────────────────────────────────────
    @PostMapping(value = "/jobs/submit", produces = MediaType.APPLICATION_JSON_VALUE)
    public Mono<Map> submitJob(
            @RequestBody Map<String, Object> jobRequest,
            HttpServletRequest httpRequest
    ) {
        log.info("[CARBON] Submit job: {}", jobRequest.get("job_name"));
        return webClient.post()
                .uri("/jobs/submit")
                .header("Authorization", getBearer(httpRequest))
                .contentType(MediaType.APPLICATION_JSON)
                .bodyValue(jobRequest)
                .retrieve()
                .bodyToMono(Map.class);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // GET /api/ia/carbon/jobs/deferred
    // ─────────────────────────────────────────────────────────────────────────
    @GetMapping("/jobs/deferred")
    public Mono<List<Map>> getDeferredJobs(HttpServletRequest httpRequest) {
        return webClient.get()
                .uri("/jobs/deferred")
                .header("Authorization", getBearer(httpRequest))
                .retrieve()
                .bodyToFlux(Map.class)
                .collectList();
    }

    // ─────────────────────────────────────────────────────────────────────────
    // DELETE /api/ia/carbon/jobs/deferred/{jobName}
    // Annuler un job en attente
    // ─────────────────────────────────────────────────────────────────────────
    @DeleteMapping("/jobs/deferred/{jobName}")
    public Mono<Map> cancelJob(
            @PathVariable String jobName,
            HttpServletRequest httpRequest
    ) {
        log.info("[CARBON] Cancel job: {}", jobName);
        return webClient.delete()
                .uri("/jobs/deferred/" + jobName)
                .header("Authorization", getBearer(httpRequest))
                .retrieve()
                .bodyToMono(Map.class);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // GET /api/ia/carbon/stats
    // ─────────────────────────────────────────────────────────────────────────
    @GetMapping("/stats")
    public Mono<Map> getStats(HttpServletRequest httpRequest) {
        return webClient.get()
                .uri("/jobs/stats")
                .header("Authorization", getBearer(httpRequest))
                .retrieve()
                .bodyToMono(Map.class);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // GET /api/ia/carbon/health
    // ─────────────────────────────────────────────────────────────────────────
    @GetMapping("/health")
    public Mono<Map> health() {
        return webClient.get()
                .uri("/health")
                .retrieve()
                .bodyToMono(Map.class);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Helper — récupère le token Bearer depuis la requête HTTP
    // ─────────────────────────────────────────────────────────────────────────
    private String getBearer(HttpServletRequest req) {
        String header = req.getHeader("Authorization");
        return header != null ? header : "";
    }
}