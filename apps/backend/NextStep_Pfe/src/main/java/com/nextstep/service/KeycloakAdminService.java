package com.nextstep.service;

import com.nextstep.dto.RegisterRequest;
import org.keycloak.admin.client.Keycloak;
import org.keycloak.representations.idm.UserRepresentation;
import org.keycloak.representations.idm.UserSessionRepresentation;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.*;
import org.springframework.stereotype.Service;
import org.springframework.util.LinkedMultiValueMap;
import org.springframework.util.MultiValueMap;
import org.springframework.web.client.RestTemplate;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

/*@Service
public class KeycloakAdminService {

    @Value("${keycloak.admin.url}")
    private String keycloakUrl;

    @Value("${keycloak.admin.realm}")
    private String realm;

    @Value("${keycloak.admin.client-id}")
    private String clientId;

    @Value("${keycloak.admin.client-secret}")
    private String clientSecret;

    private final RestTemplate restTemplate = new RestTemplate();

    // ── Créer un utilisateur ──────────────────────────────────────────────────

    public String createUser(RegisterRequest request) {
        String adminToken = getAdminToken();

        Map<String, Object> userPayload = Map.of(
                "username",      request.getEmail(),
                "email",         request.getEmail(),
                "firstName",     request.getFirstName(),
                "lastName",      request.getLastName(),
                "enabled",       false,
                "emailVerified", false,
                "credentials",   List.of(Map.of(
                        "type",      "password",
                        "value",     request.getPassword(),
                        "temporary", false
                ))
        );

        HttpHeaders headers = new HttpHeaders();
        headers.setBearerAuth(adminToken);
        headers.setContentType(MediaType.APPLICATION_JSON);

        ResponseEntity<Void> response = restTemplate.postForEntity(
                keycloakUrl + "/admin/realms/" + realm + "/users",
                new HttpEntity<>(userPayload, headers),
                Void.class
        );

        if (response.getStatusCode() != HttpStatus.CREATED) {
            throw new RuntimeException("Erreur création utilisateur Keycloak");
        }

        String location       = response.getHeaders().getLocation().toString();
        String keycloakUserId = location.substring(location.lastIndexOf("/") + 1);

        assignRole(adminToken, keycloakUserId, "client");
        return keycloakUserId;
    }

    // ── Supprimer un utilisateur (rollback) ───────────────────────────────────

    public void deleteUser(String email) {
        try {
            String adminToken = getAdminToken();
            String userId     = getUserIdByEmail(adminToken, email);
            HttpHeaders headers = new HttpHeaders();
            headers.setBearerAuth(adminToken);
            restTemplate.exchange(
                    keycloakUrl + "/admin/realms/" + realm + "/users/" + userId,
                    HttpMethod.DELETE, new HttpEntity<>(headers), Void.class
            );
        } catch (Exception e) {
            System.err.println("Rollback Keycloak échoué pour " + email + " : " + e.getMessage());
        }
    }

    // ── Activer le compte après vérification email ────────────────────────────

    public void setEmailVerified(String email, boolean verified) {
        String adminToken = getAdminToken();
        String userId     = getUserIdByEmail(adminToken, email);
        HttpHeaders headers = new HttpHeaders();
        headers.setBearerAuth(adminToken);
        headers.setContentType(MediaType.APPLICATION_JSON);
        restTemplate.exchange(
                keycloakUrl + "/admin/realms/" + realm + "/users/" + userId,
                HttpMethod.PUT,
                new HttpEntity<>(Map.of("emailVerified", verified, "enabled", verified), headers),
                Void.class
        );
    }

    // ── Vérifier si email est déjà vérifié ────────────────────────────────────

    public boolean isEmailVerified(String email) {
        String adminToken = getAdminToken();
        String userId     = getUserIdByEmail(adminToken, email);
        HttpHeaders headers = new HttpHeaders();
        headers.setBearerAuth(adminToken);
        ResponseEntity<Map> response = restTemplate.exchange(
                keycloakUrl + "/admin/realms/" + realm + "/users/" + userId,
                HttpMethod.GET, new HttpEntity<>(headers), Map.class
        );
        if (response.getBody() == null) return false;
        return Boolean.TRUE.equals(response.getBody().get("emailVerified"));
    }

    // ── Mettre à jour firstName / lastName ────────────────────────────────────

    public void updateUserNames(String keycloakId, String firstName, String lastName) {
        String adminToken = getAdminToken();
        HttpHeaders headers = new HttpHeaders();
        headers.setBearerAuth(adminToken);
        headers.setContentType(MediaType.APPLICATION_JSON);
        restTemplate.exchange(
                keycloakUrl + "/admin/realms/" + realm + "/users/" + keycloakId,
                HttpMethod.PUT,
                new HttpEntity<>(Map.of("firstName", firstName, "lastName", lastName), headers),
                Void.class
        );
    }

    // ── Changer le mot de passe ───────────────────────────────────────────────

    public void resetPassword(String email, String newPassword) {
        String adminToken = getAdminToken();
        String userId     = getUserIdByEmail(adminToken, email);
        HttpHeaders headers = new HttpHeaders();
        headers.setBearerAuth(adminToken);
        headers.setContentType(MediaType.APPLICATION_JSON);
        restTemplate.exchange(
                keycloakUrl + "/admin/realms/" + realm
                        + "/users/" + userId + "/reset-password",
                HttpMethod.PUT,
                new HttpEntity<>(
                        Map.of("type", "password", "value", newPassword, "temporary", false),
                        headers
                ),
                Void.class
        );
    }

    // ── Sessions actives enrichies avec le userAgent ──────────────────────────
    //
    // Keycloak ne renvoie pas browser/os dans /users/{id}/sessions.
    // On croise avec les events LOGIN pour récupérer le userAgent réel.
    // Le frontend parse ensuite le userAgent pour afficher OS + browser.

    @SuppressWarnings("unchecked")
    public List<Map<String, Object>> getUserSessions(String keycloakId) {
        String adminToken = getAdminToken();
        HttpHeaders headers = new HttpHeaders();
        headers.setBearerAuth(adminToken);

        // 1. Sessions actives
        ResponseEntity<List> sessionsRes = restTemplate.exchange(
                keycloakUrl + "/admin/realms/" + realm
                        + "/users/" + keycloakId + "/sessions",
                HttpMethod.GET, new HttpEntity<>(headers), List.class
        );
        List<Map<String, Object>> sessions =
                sessionsRes.getBody() != null ? sessionsRes.getBody() : List.of();

        if (sessions.isEmpty()) return List.of();

        // 2. Events LOGIN du user (max 50 — couvre toutes les sessions actives)
        ResponseEntity<List> eventsRes = restTemplate.exchange(
                keycloakUrl + "/admin/realms/" + realm
                        + "/events?type=LOGIN&userId=" + keycloakId + "&max=50",
                HttpMethod.GET, new HttpEntity<>(headers), List.class
        );
        List<Map<String, Object>> events =
                eventsRes.getBody() != null ? eventsRes.getBody() : List.of();

        // 3. Enrichir chaque session avec le userAgent de l'event LOGIN correspondant
        return sessions.stream().map(session -> {
            Map<String, Object> enriched = new HashMap<>(session);
            String sessionId = (String) session.get("id");

            // Chercher l'event LOGIN dont le sessionId correspond
            events.stream()
                    .filter(e -> sessionId.equals(e.get("sessionId")))
                    .findFirst()
                    .ifPresent(e -> {
                        Map<String, String> details =
                                (Map<String, String>) e.getOrDefault("details", Map.of());
                        String userAgent = details.getOrDefault("userAgent", "");
                        if (!userAgent.isBlank()) {
                            enriched.put("userAgent", userAgent);
                        }
                    });

            return enriched;
        }).toList();
    }

    // ── Révoquer une session par son ID ───────────────────────────────────────

    public void revokeSession(String sessionId) {
        String adminToken = getAdminToken();
        HttpHeaders headers = new HttpHeaders();
        headers.setBearerAuth(adminToken);
        restTemplate.exchange(
                keycloakUrl + "/admin/realms/" + realm
                        + "/sessions/" + sessionId,
                HttpMethod.DELETE, new HttpEntity<>(headers), Void.class
        );
    }

    // ── Vérifier si un user existe dans Keycloak par email ────────────────────

    public boolean userExistsByEmail(String email) {
        try {
            String adminToken = getAdminToken();
            getUserIdByEmail(adminToken, email);
            return true;
        } catch (RuntimeException e) {
            return false;
        }
    }

    // ── Récupérer le prénom depuis Keycloak ───────────────────────────────────

    @SuppressWarnings("unchecked")
    public String getFirstNameByEmail(String email) {
        try {
            String adminToken = getAdminToken();
            HttpHeaders headers = new HttpHeaders();
            headers.setBearerAuth(adminToken);
            ResponseEntity<List> response = restTemplate.exchange(
                    keycloakUrl + "/admin/realms/" + realm
                            + "/users?email=" + email + "&exact=true",
                    HttpMethod.GET, new HttpEntity<>(headers), List.class
            );
            if (response.getBody() == null || response.getBody().isEmpty()) return "";
            Map<String, Object> user = (Map<String, Object>) response.getBody().get(0);
            return (String) user.getOrDefault("firstName", "");
        } catch (Exception e) {
            return "";
        }
    }

    // ── Private helpers ───────────────────────────────────────────────────────

    @SuppressWarnings("unchecked")
    private String getUserIdByEmail(String adminToken, String email) {
        HttpHeaders headers = new HttpHeaders();
        headers.setBearerAuth(adminToken);
        ResponseEntity<List> response = restTemplate.exchange(
                keycloakUrl + "/admin/realms/" + realm
                        + "/users?email=" + email + "&exact=true",
                HttpMethod.GET, new HttpEntity<>(headers), List.class
        );
        if (response.getBody() == null || response.getBody().isEmpty()) {
            throw new RuntimeException("Utilisateur introuvable : " + email);
        }
        Map<String, Object> user = (Map<String, Object>) response.getBody().get(0);
        return (String) user.get("id");
    }

    @SuppressWarnings("unchecked")
    private void assignRole(String adminToken, String userId, String roleName) {
        HttpHeaders headers = new HttpHeaders();
        headers.setBearerAuth(adminToken);
        headers.setContentType(MediaType.APPLICATION_JSON);

        ResponseEntity<Map> roleResponse = restTemplate.exchange(
                keycloakUrl + "/admin/realms/" + realm + "/roles/" + roleName,
                HttpMethod.GET, new HttpEntity<>(headers), Map.class
        );
        Map<String, Object> role = roleResponse.getBody();
        if (role == null) throw new RuntimeException("Rôle '" + roleName + "' introuvable");

        restTemplate.exchange(
                keycloakUrl + "/admin/realms/" + realm
                        + "/users/" + userId + "/role-mappings/realm",
                HttpMethod.POST,
                new HttpEntity<>(List.of(role), headers),
                Void.class
        );
    }

    @SuppressWarnings("unchecked")
    private String getAdminToken() {
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_FORM_URLENCODED);
        MultiValueMap<String, String> params = new LinkedMultiValueMap<>();
        params.add("grant_type",    "client_credentials");
        params.add("client_id",     clientId);
        params.add("client_secret", clientSecret);
        ResponseEntity<Map> response = restTemplate.postForEntity(
                keycloakUrl + "/realms/" + realm + "/protocol/openid-connect/token",
                new HttpEntity<>(params, headers), Map.class
        );
        if (response.getBody() == null)
            throw new RuntimeException("Impossible d'obtenir le token admin Keycloak");
        return (String) response.getBody().get("access_token");
    }
}*/


import com.nextstep.dto.RegisterRequest;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.*;
import org.springframework.stereotype.Service;
import org.springframework.util.LinkedMultiValueMap;
import org.springframework.util.MultiValueMap;
import org.springframework.web.client.RestTemplate;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Service
public class KeycloakAdminService {

    @Value("${keycloak.admin.url}")
    private String keycloakUrl;

    @Value("${keycloak.admin.realm}")
    private String realm;

    @Value("${keycloak.admin.client-id}")
    private String clientId;

    @Value("${keycloak.admin.client-secret}")
    private String clientSecret;

    private final RestTemplate restTemplate = new RestTemplate();


    // ── Créer un utilisateur ──────────────────────────────────────────────────

    public String createUser(RegisterRequest request) {
        String adminToken = getAdminToken();

        Map<String, Object> userPayload = Map.of(
                "username",      request.getEmail(),
                "email",         request.getEmail(),
                "firstName",     request.getFirstName(),
                "lastName",      request.getLastName(),
                "enabled",       false,
                "emailVerified", false,
                "credentials",   List.of(Map.of(
                        "type",      "password",
                        "value",     request.getPassword(),
                        "temporary", false
                ))
        );

        HttpHeaders headers = new HttpHeaders();
        headers.setBearerAuth(adminToken);
        headers.setContentType(MediaType.APPLICATION_JSON);

        ResponseEntity<Void> response = restTemplate.postForEntity(
                keycloakUrl + "/admin/realms/" + realm + "/users",
                new HttpEntity<>(userPayload, headers),
                Void.class
        );

        if (response.getStatusCode() != HttpStatus.CREATED)
            throw new RuntimeException("Erreur création utilisateur Keycloak");

        String location       = response.getHeaders().getLocation().toString();
        String keycloakUserId = location.substring(location.lastIndexOf("/") + 1);
        assignRole(adminToken, keycloakUserId, "client");
        return keycloakUserId;
    }

    // ── Supprimer un utilisateur (rollback) ───────────────────────────────────

    public void deleteUser(String email) {
        try {
            String adminToken = getAdminToken();
            String userId     = getUserIdByEmail(adminToken, email);
            HttpHeaders headers = new HttpHeaders();
            headers.setBearerAuth(adminToken);
            restTemplate.exchange(
                    keycloakUrl + "/admin/realms/" + realm + "/users/" + userId,
                    HttpMethod.DELETE, new HttpEntity<>(headers), Void.class
            );
        } catch (Exception e) {
            System.err.println("Rollback Keycloak échoué : " + e.getMessage());
        }
    }

    // ── Activer le compte après vérification email ────────────────────────────

    public void setEmailVerified(String email, boolean verified) {
        String adminToken = getAdminToken();
        String userId     = getUserIdByEmail(adminToken, email);
        HttpHeaders headers = new HttpHeaders();
        headers.setBearerAuth(adminToken);
        headers.setContentType(MediaType.APPLICATION_JSON);
        restTemplate.exchange(
                keycloakUrl + "/admin/realms/" + realm + "/users/" + userId,
                HttpMethod.PUT,
                new HttpEntity<>(Map.of("emailVerified", verified, "enabled", verified), headers),
                Void.class
        );
    }

    // ── Vérifier si email est déjà vérifié ────────────────────────────────────

    public boolean isEmailVerified(String email) {
        String adminToken = getAdminToken();
        String userId     = getUserIdByEmail(adminToken, email);
        HttpHeaders headers = new HttpHeaders();
        headers.setBearerAuth(adminToken);
        ResponseEntity<Map> response = restTemplate.exchange(
                keycloakUrl + "/admin/realms/" + realm + "/users/" + userId,
                HttpMethod.GET, new HttpEntity<>(headers), Map.class
        );
        if (response.getBody() == null) return false;
        return Boolean.TRUE.equals(response.getBody().get("emailVerified"));
    }

    // ── Mettre à jour firstName / lastName ────────────────────────────────────

    public void updateUserNames(String keycloakId, String firstName, String lastName) {
        String adminToken = getAdminToken();
        HttpHeaders headers = new HttpHeaders();
        headers.setBearerAuth(adminToken);
        headers.setContentType(MediaType.APPLICATION_JSON);
        restTemplate.exchange(
                keycloakUrl + "/admin/realms/" + realm + "/users/" + keycloakId,
                HttpMethod.PUT,
                new HttpEntity<>(Map.of("firstName", firstName, "lastName", lastName), headers),
                Void.class
        );
    }

    // ── Changer le mot de passe ───────────────────────────────────────────────

    public void resetPassword(String email, String newPassword) {
        String adminToken = getAdminToken();
        String userId     = getUserIdByEmail(adminToken, email);
        HttpHeaders headers = new HttpHeaders();
        headers.setBearerAuth(adminToken);
        headers.setContentType(MediaType.APPLICATION_JSON);
        restTemplate.exchange(
                keycloakUrl + "/admin/realms/" + realm + "/users/" + userId + "/reset-password",
                HttpMethod.PUT,
                new HttpEntity<>(
                        Map.of("type", "password", "value", newPassword, "temporary", false),
                        headers
                ),
                Void.class
        );
    }

    // ── Sessions actives enrichies avec userAgent ─────────────────────────────
    //
    // Stratégie à 2 niveaux :
    //   1. Chercher le userAgent dans les events LOGIN Keycloak (si activés)
    //   2. Fallback : utiliser le X-User-Agent envoyé par le proxy Next.js
    //      (= vrai User-Agent du navigateur de l'utilisateur connecté)
    //
    // Le fallback s'applique uniquement à la session courante (la plus récente),
    // car c'est la seule pour laquelle on a le User-Agent du navigateur actuel.

    @SuppressWarnings("unchecked")
    public List<Map<String, Object>> getUserSessions(String keycloakId,
                                                     String browserUserAgent) {
        String adminToken = getAdminToken();
        HttpHeaders headers = new HttpHeaders();
        headers.setBearerAuth(adminToken);

        // 1. Sessions actives
        ResponseEntity<List> sessionsRes = restTemplate.exchange(
                keycloakUrl + "/admin/realms/" + realm + "/users/" + keycloakId + "/sessions",
                HttpMethod.GET, new HttpEntity<>(headers), List.class
        );
        List<Map<String, Object>> sessions =
                sessionsRes.getBody() != null ? sessionsRes.getBody() : List.of();

        if (sessions.isEmpty()) return List.of();

        // 2. Events LOGIN (optionnel — ne plante pas si désactivés)
        List<Map<String, Object>> events = List.of();
        try {
            ResponseEntity<List> eventsRes = restTemplate.exchange(
                    keycloakUrl + "/admin/realms/" + realm
                            + "/events?type=LOGIN&userId=" + keycloakId + "&max=50",
                    HttpMethod.GET, new HttpEntity<>(headers), List.class
            );
            events = eventsRes.getBody() != null ? eventsRes.getBody() : List.of();
        } catch (Exception e) {
            System.out.println("⚠️ Events Keycloak non disponibles : " + e.getMessage());
        }

        final List<Map<String, Object>> finalEvents = events;

        // 3. Session courante = lastAccess le plus récent
        Map<String, Object> latestSession = sessions.stream()
                .max((a, b) -> {
                    long la = toLong(a.get("lastAccess"));
                    long lb = toLong(b.get("lastAccess"));
                    return Long.compare(la, lb);
                })
                .orElse(null);

        // 4. Enrichir chaque session
        return sessions.stream().map(session -> {
            Map<String, Object> enriched = new HashMap<>(session);
            String sessionId = (String) session.get("id");

            // Priorité 1 : userAgent depuis l'event LOGIN correspondant
            boolean foundInEvents = finalEvents.stream()
                    .filter(e -> sessionId.equals(e.get("sessionId")))
                    .findFirst()
                    .map(e -> {
                        Map<String, String> details =
                                (Map<String, String>) e.getOrDefault("details", Map.of());
                        String ua = details.getOrDefault("userAgent", "");
                        if (!ua.isBlank()) {
                            enriched.put("userAgent", ua);
                            return true;
                        }
                        return false;
                    })
                    .orElse(false);

            // Priorité 2 (fallback) : X-User-Agent du navigateur courant
            // Appliqué uniquement à la session la plus récente
            if (!foundInEvents
                    && session == latestSession
                    && browserUserAgent != null
                    && !browserUserAgent.isBlank()) {
                enriched.put("userAgent", browserUserAgent);
            }

            return enriched;
        }).toList();
    }

    // ── Révoquer une session ──────────────────────────────────────────────────

    public void revokeSession(String sessionId) {
        String adminToken = getAdminToken();
        HttpHeaders headers = new HttpHeaders();
        headers.setBearerAuth(adminToken);
        restTemplate.exchange(
                keycloakUrl + "/admin/realms/" + realm + "/sessions/" + sessionId,
                HttpMethod.DELETE, new HttpEntity<>(headers), Void.class
        );
    }

    // ── Vérifier si user existe dans Keycloak par email ──────────────────────

    public boolean userExistsByEmail(String email) {
        try {
            getUserIdByEmail(getAdminToken(), email);
            return true;
        } catch (RuntimeException e) {
            return false;
        }
    }

    // ── Récupérer le prénom depuis Keycloak ───────────────────────────────────

    @SuppressWarnings("unchecked")
    public String getFirstNameByEmail(String email) {
        try {
            String adminToken = getAdminToken();
            HttpHeaders headers = new HttpHeaders();
            headers.setBearerAuth(adminToken);
            ResponseEntity<List> response = restTemplate.exchange(
                    keycloakUrl + "/admin/realms/" + realm
                            + "/users?email=" + email + "&exact=true",
                    HttpMethod.GET, new HttpEntity<>(headers), List.class
            );
            if (response.getBody() == null || response.getBody().isEmpty()) return "";
            Map<String, Object> user = (Map<String, Object>) response.getBody().get(0);
            return (String) user.getOrDefault("firstName", "");
        } catch (Exception e) {
            return "";
        }
    }

    // ── Private helpers ───────────────────────────────────────────────────────

    @SuppressWarnings("unchecked")
    private String getUserIdByEmail(String adminToken, String email) {
        HttpHeaders headers = new HttpHeaders();
        headers.setBearerAuth(adminToken);
        ResponseEntity<List> response = restTemplate.exchange(
                keycloakUrl + "/admin/realms/" + realm
                        + "/users?email=" + email + "&exact=true",
                HttpMethod.GET, new HttpEntity<>(headers), List.class
        );
        if (response.getBody() == null || response.getBody().isEmpty())
            throw new RuntimeException("Utilisateur introuvable : " + email);
        Map<String, Object> user = (Map<String, Object>) response.getBody().get(0);
        return (String) user.get("id");
    }

    @SuppressWarnings("unchecked")
    private void assignRole(String adminToken, String userId, String roleName) {
        HttpHeaders headers = new HttpHeaders();
        headers.setBearerAuth(adminToken);
        headers.setContentType(MediaType.APPLICATION_JSON);
        ResponseEntity<Map> roleResponse = restTemplate.exchange(
                keycloakUrl + "/admin/realms/" + realm + "/roles/" + roleName,
                HttpMethod.GET, new HttpEntity<>(headers), Map.class
        );
        Map<String, Object> role = roleResponse.getBody();
        if (role == null) throw new RuntimeException("Rôle '" + roleName + "' introuvable");
        restTemplate.exchange(
                keycloakUrl + "/admin/realms/" + realm
                        + "/users/" + userId + "/role-mappings/realm",
                HttpMethod.POST, new HttpEntity<>(List.of(role), headers), Void.class
        );
    }

    @SuppressWarnings("unchecked")
    private String getAdminToken() {
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_FORM_URLENCODED);
        MultiValueMap<String, String> params = new LinkedMultiValueMap<>();
        params.add("grant_type",    "client_credentials");
        params.add("client_id",     clientId);
        params.add("client_secret", clientSecret);
        ResponseEntity<Map> response = restTemplate.postForEntity(
                keycloakUrl + "/realms/" + realm + "/protocol/openid-connect/token",
                new HttpEntity<>(params, headers), Map.class
        );
        if (response.getBody() == null)
            throw new RuntimeException("Impossible d'obtenir le token admin Keycloak");
        return (String) response.getBody().get("access_token");
    }

    private long toLong(Object val) {
        if (val instanceof Number n) return n.longValue();
        return 0L;
    }
    // ── Supprimer un utilisateur par son keycloakId (UUID) ────────────────────────
// Différent de deleteUser(email) qui cherche d'abord par email

    public void deleteUserById(String keycloakId) {
        try {
            String adminToken = getAdminToken();
            HttpHeaders headers = new HttpHeaders();
            headers.setBearerAuth(adminToken);
            restTemplate.exchange(
                    keycloakUrl + "/admin/realms/" + realm + "/users/" + keycloakId,
                    HttpMethod.DELETE,
                    new HttpEntity<>(headers),
                    Void.class
            );
            System.out.println("✅ Utilisateur Keycloak supprimé : " + keycloakId);
        } catch (Exception e) {
            System.err.println("❌ Suppression Keycloak échouée : " + e.getMessage());
            throw new RuntimeException("Erreur suppression Keycloak : " + e.getMessage());
        }
    }
    @SuppressWarnings("unchecked")
    public boolean isUserOnline(String keycloakId) {
        try {
            String adminToken = getAdminToken();
            HttpHeaders headers = new HttpHeaders();
            headers.setBearerAuth(adminToken);
            ResponseEntity<List> response = restTemplate.exchange(
                    keycloakUrl + "/admin/realms/" + realm
                            + "/users/" + keycloakId + "/sessions",
                    HttpMethod.GET,
                    new HttpEntity<>(headers),
                    List.class
            );
            List<?> sessions = response.getBody();
            return sessions != null && !sessions.isEmpty();
        } catch (Exception e) {
            System.err.println("⚠️ isUserOnline error for " + keycloakId + ": " + e.getMessage());
            return false;
        }
    }

    // ── Désactiver dans Keycloak + invalider toutes les sessions ───
    public void disableUser(String keycloakId) {
        String adminToken = getAdminToken();
        HttpHeaders headers = new HttpHeaders();
        headers.setBearerAuth(adminToken);
        headers.setContentType(MediaType.APPLICATION_JSON);

        // 1. Désactiver le compte
        restTemplate.exchange(
                keycloakUrl + "/admin/realms/" + realm + "/users/" + keycloakId,
                HttpMethod.PUT,
                new HttpEntity<>(Map.of("enabled", false), headers),
                Void.class
        );

        // 2. Invalider toutes les sessions actives
        restTemplate.exchange(
                keycloakUrl + "/admin/realms/" + realm
                        + "/users/" + keycloakId + "/logout",
                HttpMethod.POST,
                new HttpEntity<>(headers),
                Void.class
        );

        System.out.println("✅ User " + keycloakId + " désactivé dans Keycloak");
    }

    // ── Réactiver dans Keycloak ────────────────────────────────────
    public void enableUser(String keycloakId) {
        String adminToken = getAdminToken();
        HttpHeaders headers = new HttpHeaders();
        headers.setBearerAuth(adminToken);
        headers.setContentType(MediaType.APPLICATION_JSON);

        restTemplate.exchange(
                keycloakUrl + "/admin/realms/" + realm + "/users/" + keycloakId,
                HttpMethod.PUT,
                new HttpEntity<>(Map.of("enabled", true), headers),
                Void.class
        );

        System.out.println("✅ User " + keycloakId + " réactivé dans Keycloak");
    }
}