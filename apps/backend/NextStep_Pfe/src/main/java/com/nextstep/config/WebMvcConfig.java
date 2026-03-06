package com.nextstep.config;



import com.nextstep.interceptor.AuditLogInterceptor;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.InterceptorRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

/**
 * ✅ FIX 6 — WebMvcConfig ne redéfinit plus le CORS
 *
 * PROBLÈME ORIGINAL :
 *   CorsConfig.java créait un @Bean CorsFilter
 *   SecurityConfig.java configurait aussi le CORS via .cors(...)
 *   → Deux configurations CORS en conflit → comportement imprévisible
 *   → Peut bloquer les requêtes OPTIONS du frontend
 *
 * CORRECTION :
 *   - CorsConfig.java → SUPPRIMER ce fichier
 *   - Le CORS est géré UNIQUEMENT dans SecurityConfig.corsConfigurationSource()
 *   - Ce fichier gère uniquement l'enregistrement de l'intercepteur d'audit
 *
 * NOTE SUR L'INTERCEPTEUR :
 *   L'intercepteur fonctionne maintenant car :
 *   1. preHandle() lit le JWT quand SecurityContext est encore valide ✓
 *   2. afterCompletion() récupère les données depuis les attributs de requête ✓
 *   3. logAsync() fonctionne car @EnableAsync est activé ✓
 */
@Configuration
@RequiredArgsConstructor
@Slf4j
public class WebMvcConfig implements WebMvcConfigurer {

    private final AuditLogInterceptor auditLogInterceptor;

    @Override
    public void addInterceptors(InterceptorRegistry registry) {
        log.info("[AUDIT] ✅ addInterceptors() called — registering AuditLogInterceptor");

        registry
                .addInterceptor(auditLogInterceptor)
                .addPathPatterns("/**")
                .excludePathPatterns(
                        "/audit-logs",
                        "/audit-logs/**",
                        "/actuator/**",
                        "/swagger-ui/**",
                        "/swagger-ui.html",
                        "/v3/api-docs/**",
                        "/favicon.ico",
                        "/error"
                );

        log.info("[AUDIT] ✅ AuditLogInterceptor registered on /**");
    }
}