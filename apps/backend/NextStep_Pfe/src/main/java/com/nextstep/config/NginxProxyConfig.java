package com.nextstep.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.filter.ForwardedHeaderFilter;

/**
 * Spring Boot lit les headers X-Forwarded-* injectés par nginx.
 * Sans ça, les redirections Keycloak utilisent http:// au lieu de https://
 * et request.getRemoteAddr() retourne l'IP de nginx, pas celle du client.
 */
@Configuration
public class NginxProxyConfig {

    @Bean
    public ForwardedHeaderFilter forwardedHeaderFilter() {
        return new ForwardedHeaderFilter();
    }
}
