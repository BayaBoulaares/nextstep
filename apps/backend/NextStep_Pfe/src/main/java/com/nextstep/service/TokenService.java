package com.nextstep.service;


import com.nextstep.entity.EmailVerificationToken;
import com.nextstep.repository.EmailVerificationTokenRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;
import lombok.extern.slf4j.Slf4j;

import java.io.BufferedReader;
import java.io.InputStreamReader;
import java.nio.file.Files;
import java.nio.file.Files;
import java.nio.file.Path;
import org.springframework.beans.factory.annotation.Value;
@Slf4j
@Service
public class TokenService {

    private final EmailVerificationTokenRepository tokenRepo;

    public TokenService(EmailVerificationTokenRepository tokenRepo) {
        this.tokenRepo = tokenRepo;
    }

    // ── DELETE dans sa propre transaction — commit immédiat ───────────────
    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void deleteAndSave(String email, String type, String tokenHash) {
        tokenRepo.deleteByEmailAndType(email, type);
        tokenRepo.flush();

        EmailVerificationToken token = new EmailVerificationToken();
        token.setEmail(email);
        token.setTokenHash(tokenHash);
        token.setType(type);
        tokenRepo.save(token);
        tokenRepo.flush();
    }

    // ── Même chose pour EMAIL_VERIFICATION ────────────────────────────────
    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void deleteAndSaveVerification(String email, String tokenHash) {
        tokenRepo.deleteByEmail(email);
        tokenRepo.flush();

        EmailVerificationToken token = new EmailVerificationToken();
        token.setEmail(email);
        token.setTokenHash(tokenHash);
        token.setType("EMAIL_VERIFICATION");
        tokenRepo.save(token);
        tokenRepo.flush();
    }
       // ── OpenShift SA token (métriques) ────────────────────────────────────
    private static final Path SA_TOKEN_PATH =
            Path.of("/var/run/secrets/kubernetes.io/serviceaccount/token");

    @Value("${openshift.metrics.token:}")
    private String configuredToken;

    private String cachedSaToken   = null;
    private long   tokenLastLoaded = 0;
    private static final long REFRESH_MS = 5 * 60 * 1000L;

    /*public String resolveToken() {
        // Priorité 1 : token explicite dans application.properties (dev local)
        if (configuredToken != null && !configuredToken.isBlank()) {
            log.debug("[TOKEN] Utilisation du token configuré (application.properties)");
            return configuredToken;
        }
        // Priorité 2 : token SA monté automatiquement dans le pod OpenShift
        long now = System.currentTimeMillis();
        if (cachedSaToken == null || (now - tokenLastLoaded) > REFRESH_MS) {
            cachedSaToken   = readSaToken();
            tokenLastLoaded = now;
        }
        if (cachedSaToken == null) {
            log.warn("[TOKEN] Aucun token disponible. " +
                    "Ajouter openshift.metrics.token dans application.properties " +
                    "ou port-forward Thanos : oc port-forward svc/thanos-querier 9091:9091 -n openshift-monitoring");
        }
        return cachedSaToken;
    }*/
    public String resolveToken() {
        // Priorité au token récupéré via 'oc whoami -t'
        try {
            ProcessBuilder pb = new ProcessBuilder("oc", "whoami", "-t");
            pb.redirectErrorStream(true);
            Process process = pb.start();
            BufferedReader reader = new BufferedReader(new InputStreamReader(process.getInputStream()));
            String token = reader.readLine();
            if (token != null && !token.isEmpty()) {
                log.info("Token récupéré via oc whoami -t (longueur: {})", token.length());
                return token;
            }
        } catch (Exception e) {
            log.warn("Impossible de récupérer le token via oc: {}", e.getMessage());
        }

        // Fallback sur token configuré
        if (configuredToken != null && !configuredToken.isBlank()) {
            log.info("Utilisation du token configuré");
            return configuredToken;
        }

        log.warn("Aucun token disponible pour Thanos");
        return null;
    }
    private String readSaToken() {
        try {
            if (Files.exists(SA_TOKEN_PATH)) {
                String token = Files.readString(SA_TOKEN_PATH).trim();
                log.debug("[TOKEN] Token SA rechargé depuis {}", SA_TOKEN_PATH);
                return token;
            }
        } catch (Exception e) {
            log.warn("[TOKEN] Impossible de lire le token SA: {}", e.getMessage());
        }
        log.warn("[TOKEN] Aucun token disponible — Thanos Querier inaccessible");
        return null;
    }

}