package com.nextstep.multitenancy;

import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.servlet.*;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;

import java.io.IOException;
import java.util.Base64;
import java.util.Map;

/**
 * Lit le sub Keycloak depuis le JWT Bearer et :
 * 1. Le stocke dans TenantContext (pour les logs MDC et le rate limiting)
 * 2. L1 : Injecte X-User-ID dans la requête sortante vers Spring Boot
 *    → nginx utilise ce header comme clé de rate limiting (pas l'IP)
 */
@Slf4j
@Component
@Order(1)
@RequiredArgsConstructor
public class TenantFilter implements Filter {

    private final ObjectMapper objectMapper;

    @Override
    public void doFilter(ServletRequest request, ServletResponse response, FilterChain chain)
            throws IOException, ServletException {

        HttpServletRequest  req = (HttpServletRequest)  request;
        HttpServletResponse res = (HttpServletResponse) response;

        String uri = req.getRequestURI();
        if (isPublicUri(uri)) {
            chain.doFilter(request, response);
            return;
        }

        try {
            String userId = extractSubFromJwt(req);
            if (userId == null || userId.isBlank()) {
                userId = "anonymous";
            }

            TenantContext.setCurrentTenant(userId);
            log.debug("[Tenant] userId={} uri={}", userId, uri);

            // L1 : wrapper la requête pour injecter X-User-ID
            // nginx utilise ce header comme clé de rate limiting
            HttpServletRequest wrappedRequest = new UserIdRequestWrapper(req, userId);
            chain.doFilter(wrappedRequest, response);

        } finally {
            TenantContext.clear();
        }
    }

    private boolean isPublicUri(String uri) {
        return uri.startsWith("/actuator")
                || uri.startsWith("/auth")
                || uri.startsWith("/api/auth")
                || uri.startsWith("/swagger-ui")
                || uri.startsWith("/v3/api-docs")
                || uri.equals("/nginx-health")
                || uri.equals("/error");
    }

    @SuppressWarnings("unchecked")
    private String extractSubFromJwt(HttpServletRequest req) {
        String auth = req.getHeader("Authorization");
        if (auth == null || !auth.startsWith("Bearer ")) return null;
        try {
            String[] parts = auth.substring(7).split("\\.");
            if (parts.length < 2) return null;
            String padded = parts[1];
            int pad = 4 - (padded.length() % 4);
            if (pad != 4) padded += "=".repeat(pad);
            byte[] decoded = Base64.getUrlDecoder().decode(padded);
            Map<String, Object> claims = objectMapper.readValue(decoded, Map.class);
            Object sub = claims.get("sub");
            return sub != null ? sub.toString() : null;
        } catch (Exception e) {
            return null;
        }
    }
}
