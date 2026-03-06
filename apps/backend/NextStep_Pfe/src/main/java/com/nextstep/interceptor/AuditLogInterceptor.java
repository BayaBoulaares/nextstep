package com.nextstep.interceptor;


import com.nextstep.dto.AuditLogRequest;
import com.nextstep.service.AuditLogService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpHeaders;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.stereotype.Component;
import org.springframework.web.servlet.HandlerInterceptor;

import java.util.stream.Collectors;

@Component
@RequiredArgsConstructor
@Slf4j
public class AuditLogInterceptor implements HandlerInterceptor {

    private static final String ATTR_START   = "audit_start";
    private static final String ATTR_USER_ID = "audit_user_id";
    private static final String ATTR_EMAIL   = "audit_email";
    private static final String ATTR_NAME    = "audit_name";
    private static final String ATTR_ROLES   = "audit_roles";
    private static final String ATTR_REALM   = "audit_realm";
    private static final String ATTR_CLIENT  = "audit_client";

    private final AuditLogService auditLogService;

    /**
     * CLEF : lit le JWT ICI pendant que le SecurityContext est encore valide.
     * afterCompletion() est trop tard — Spring Security l'a déjà vidé.
     */
    @Override
    public boolean preHandle(HttpServletRequest req,
                             HttpServletResponse res,
                             Object handler) {

        req.setAttribute(ATTR_START, System.currentTimeMillis());

        Authentication auth = SecurityContextHolder.getContext().getAuthentication();

        if (auth != null && auth.isAuthenticated()
                && auth.getPrincipal() instanceof Jwt jwt) {

            req.setAttribute(ATTR_USER_ID, val(jwt.getSubject()));
            req.setAttribute(ATTR_EMAIL,   val(jwt.getClaimAsString("email")));
            req.setAttribute(ATTR_NAME,    val(jwt.getClaimAsString("preferred_username")));
            req.setAttribute(ATTR_REALM,   val(jwt.getClaimAsString("iss")));
            req.setAttribute(ATTR_CLIENT,  val(jwt.getClaimAsString("azp")));
            req.setAttribute(ATTR_ROLES,
                    auth.getAuthorities().stream()
                            .map(GrantedAuthority::getAuthority)
                            .collect(Collectors.joining(",")));

            log.debug("[AUDIT] preHandle ✓ user={} {} {}",
                    jwt.getClaimAsString("email"), req.getMethod(), req.getRequestURI());

        } else {
            req.setAttribute(ATTR_USER_ID, "anonymous");
            req.setAttribute(ATTR_EMAIL,   "anonymous");
            req.setAttribute(ATTR_NAME,    "anonymous");
            req.setAttribute(ATTR_ROLES,   "");
            req.setAttribute(ATTR_REALM,   "");
            req.setAttribute(ATTR_CLIENT,  "");
            log.debug("[AUDIT] preHandle (anonymous) {} {}", req.getMethod(), req.getRequestURI());
        }

        return true;
    }

    @Override
    public void afterCompletion(HttpServletRequest req,
                                HttpServletResponse res,
                                Object handler,
                                Exception ex) {
        try {
            String uri = req.getRequestURI();
            if (shouldSkip(uri)) return;

            String userId    = get(req, ATTR_USER_ID, "anonymous");
            String userEmail = get(req, ATTR_EMAIL,   "anonymous");
            String userName  = get(req, ATTR_NAME,    "anonymous");
            String userRoles = get(req, ATTR_ROLES,   "");
            String realm     = get(req, ATTR_REALM,   "");
            String clientId  = get(req, ATTR_CLIENT,  "");

            Long   t0       = (Long) req.getAttribute(ATTR_START);
            long   duration = t0 != null ? System.currentTimeMillis() - t0 : -1L;

            String method  = req.getMethod();
            int    status  = res.getStatus();
            String outcome = resolveOutcome(status, ex);
            String action  = resolveAction(method, uri);
            String module  = resolveModule(uri);

            log.debug("[AUDIT] afterCompletion ✓ {} {} by={} status={} outcome={}",
                    method, uri, userEmail, status, outcome);

            auditLogService.logAsync(AuditLogRequest.builder()
                    .userId(userId)
                    .userEmail(userEmail)
                    .userName(userName)
                    .userRoles(userRoles)
                    .action(action)
                    .module(module)
                    .description(method + " " + uri)
                    .resourceType(extractResourceType(uri))
                    .resourceId(extractResourceId(uri))
                    .httpMethod(method)
                    .endpoint(uri)
                    .httpStatus(status)
                    .ipAddress(extractIP(req))
                    .userAgent(req.getHeader(HttpHeaders.USER_AGENT))
                    .realm(realm)
                    .keycloakClientId(clientId)
                    .durationMs(duration)
                    .outcome(outcome)
                    .errorMessage(ex != null ? ex.getMessage() : null)
                    .build());

        } catch (Exception e) {
            log.error("[AUDIT] afterCompletion error: {}", e.getMessage(), e);
        }
    }

    private boolean shouldSkip(String uri) {
        return uri.contains("/audit-logs") || uri.contains("/actuator")
                || uri.contains("/swagger")    || uri.contains("/v3/api-docs")
                || uri.contains("/favicon")    || uri.contains("/error");
    }

    private String resolveAction(String m, String uri) {
        if (uri.contains("export"))  return "EXPORT";
        if (uri.contains("login"))   return "LOGIN";
        if (uri.contains("logout"))  return "LOGOUT";
        return switch (m.toUpperCase()) {
            case "GET"          -> "READ";
            case "POST"         -> "CREATE";
            case "PUT","PATCH"  -> "UPDATE";
            case "DELETE"       -> "DELETE";
            default             -> m;
        };
    }

    private String resolveModule(String uri) {
        String u = uri.toLowerCase();
        if (u.contains("/users")     || u.contains("/user"))        return "USER_MANAGEMENT";
        if (u.contains("/transactions"))                             return "TRANSACTION";
        if (u.contains("/reports")   || u.contains("/report"))      return "REPORT";
        if (u.contains("/settings"))                                 return "SETTINGS";
        if (u.contains("/roles")     || u.contains("/permissions")) return "SECURITY";
        if (u.contains("/services")  || u.contains("/service"))     return "SERVICE";
        return "GENERAL";
    }

    private String resolveOutcome(int s, Exception ex) {
        if (ex != null)           return "FAILURE";
        if (s == 401 || s == 403) return "ACCESS_DENIED";
        if (s >= 500)             return "FAILURE";
        if (s >= 400)             return "FAILURE";
        return "SUCCESS";
    }

    private String extractResourceType(String uri) {
        String c = uri.replaceAll("(?i)^/api/", "");
        String[] p = c.split("/");
        return (p.length > 0 && !p[0].isBlank())
                ? p[0].toUpperCase().replaceAll("S$", "") : null;
    }

    private String extractResourceId(String uri) {
        for (String p : uri.split("/")) {
            if (p.matches("\\d+") || p.matches(
                    "[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}"))
                return p;
        }
        return null;
    }

    private String extractIP(HttpServletRequest req) {
        String xff = req.getHeader("X-Forwarded-For");
        if (xff != null && !xff.isBlank()) return xff.split(",")[0].trim();
        return req.getRemoteAddr();
    }

    private String val(String s) { return s != null && !s.isBlank() ? s : "unknown"; }
    private String get(HttpServletRequest r, String k, String d) {
        Object v = r.getAttribute(k);
        return v != null && !v.toString().isBlank() ? v.toString() : d;
    }
}