package com.nextstep.multitenancy;

import org.slf4j.MDC;

/**
 * Stocke l'identifiant Keycloak (sub) de l'utilisateur courant.
 * ThreadLocal simple — une seule DB PostgreSQL, pas de routing DataSource.
 */
public final class TenantContext {

    private static final ThreadLocal<String> CURRENT_USER = new InheritableThreadLocal<>();
    public static final  String              MDC_KEY       = "userId";

    private TenantContext() {}

    public static void setCurrentTenant(String userId) {
        CURRENT_USER.set(userId);
        MDC.put(MDC_KEY, userId != null ? userId : "anonymous");
    }

    public static String getCurrentTenant() {
        return CURRENT_USER.get();
    }

    public static void clear() {
        CURRENT_USER.remove();
        MDC.remove(MDC_KEY);
    }
}
