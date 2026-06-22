package com.nextstep.controller;

import com.nextstep.service.NamespaceService;
import com.nextstep.service.UserService;
import io.fabric8.kubernetes.client.KubernetesClient;
import io.fabric8.kubernetes.client.dsl.LogWatch;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.MediaType;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import java.io.BufferedReader;
import java.io.InputStreamReader;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

@RestController
@RequestMapping("/api/hosting/nginx/logs")
@RequiredArgsConstructor
@Slf4j
public class NginxLogsController {

    private final KubernetesClient k8sClient;
    private final NamespaceService namespaceService;
    private final ExecutorService  executor = Executors.newCachedThreadPool();

    @GetMapping(produces = MediaType.TEXT_EVENT_STREAM_VALUE)
    public SseEmitter streamLogs(
            @AuthenticationPrincipal Jwt jwt,
            @RequestParam(defaultValue = "100") int tailLines) {

        String email    = jwt.getClaimAsString("email");
        String username = email.split("@")[0].toLowerCase()
                .replaceAll("[^a-z0-9-]", "-")
                .replaceAll("-+", "-").replaceAll("^-|-$", "");
        String namespace = namespaceService.getNamespaceForUser(username);
        String appName   = "nginx-" + username;

        SseEmitter emitter = new SseEmitter(5 * 60 * 1000L); // 5 min timeout

        executor.submit(() -> {
            try {
                // Trouver le pod running
                String podName = k8sClient.pods()
                        .inNamespace(namespace)
                        .withLabel("app", appName)
                        .list().getItems().stream()
                        .filter(p -> "Running".equals(p.getStatus().getPhase()))
                        .findFirst()
                        .map(p -> p.getMetadata().getName())
                        .orElseThrow(() -> new RuntimeException("Pod introuvable"));

                // Stream des logs
                LogWatch watch = k8sClient.pods()
                        .inNamespace(namespace)
                        .withName(podName)
                        .tailingLines(tailLines)
                        .watchLog();

                try (BufferedReader reader = new BufferedReader(
                        new InputStreamReader(watch.getOutput()))) {
                    String line;
                    while ((line = reader.readLine()) != null) {
                        emitter.send(SseEmitter.event()
                                .name("log")
                                .data(line));
                    }
                }
                emitter.complete();

            } catch (Exception e) {
                log.error("[LOGS] Erreur stream : {}", e.getMessage());
                emitter.completeWithError(e);
            }
        });

        emitter.onTimeout(emitter::complete);
        emitter.onError(e -> log.warn("[LOGS] SSE erreur : {}", e.getMessage()));

        return emitter;
    }
}