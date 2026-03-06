package com.nextstep.security;

import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.convert.converter.Converter;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.stereotype.Component;

import java.util.*;
import java.util.stream.Collectors;

/**
 * Extrait les rôles Keycloak depuis le JWT et les convertit en GrantedAuthority.
 *
 * Supporte 3 structures possibles selon la config Keycloak :
 *   A) realm_access.roles          → standard Keycloak
 *   B) resource_access.CLIENT.roles → rôles client spécifique
 *   C) roles                        → claim de 1er niveau (mapper custom)
 *
 * DEBUG : si Granted Authorities=[] → activer logging.level.com.nextstep=DEBUG
 *         pour voir exactement quels claims sont dans le JWT.
 */
@Component
@Slf4j
public class KeycloakJwtConverter implements Converter<Jwt, Collection<GrantedAuthority>> {

    // Client ID de votre application dans Keycloak — pour resource_access
    // Peut être surchargé via application.properties : keycloak.client-id=nextstep-app
    @Value("${keycloak.client-id:nextstep-app}")
    private String clientId;

    @Override
    public Collection<GrantedAuthority> convert(Jwt jwt) {
        Set<String> roles = new HashSet<>();

        // ── Logguer tous les claims pour le debug ──────────────────────────
        log.debug("[JWT] Claims disponibles : {}", jwt.getClaims().keySet());

        // ── Forme A : realm_access.roles (standard Keycloak) ──────────────
        Map<String, Object> realmAccess = jwt.getClaimAsMap("realm_access");
        if (realmAccess != null) {
            Object r = realmAccess.get("roles");
            if (r instanceof List<?> list) {
                list.stream()
                        .filter(String.class::isInstance)
                        .map(String.class::cast)
                        .forEach(roles::add);
                log.debug("[JWT] realm_access.roles = {}", roles);
            }
        }

        // ── Forme B : resource_access.<clientId>.roles ─────────────────────
        Map<String, Object> resourceAccess = jwt.getClaimAsMap("resource_access");
        if (resourceAccess != null && resourceAccess.containsKey(clientId)) {
            Object clientAccess = resourceAccess.get(clientId);
            if (clientAccess instanceof Map<?, ?> clientMap) {
                Object r = clientMap.get("roles");
                if (r instanceof List<?> list) {
                    list.stream()
                            .filter(String.class::isInstance)
                            .map(String.class::cast)
                            .forEach(roles::add);
                    log.debug("[JWT] resource_access.{}.roles = {}", clientId, roles);
                }
            }
        }

        // ── Forme C : claim "roles" de 1er niveau (mapper Keycloak custom) ─
        List<String> directRoles = jwt.getClaimAsStringList("roles");
        if (directRoles != null) {
            roles.addAll(directRoles);
            log.debug("[JWT] roles (direct) = {}", directRoles);
        }

        if (roles.isEmpty()) {
            log.warn("[JWT] ⚠️ Aucun rôle extrait du JWT pour sub={}. " +
                            "Claims présents : {}. " +
                            "Vérifiez la structure du token sur https://jwt.io",
                    jwt.getSubject(), jwt.getClaims().keySet());
        } else {
            log.debug("[JWT] ✅ Rôles extraits pour {} : {}", jwt.getSubject(), roles);
        }

        return roles.stream()
                .map(role -> new SimpleGrantedAuthority("ROLE_" + role))
                .collect(Collectors.toList());
    }
}