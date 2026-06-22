// config/SseTokenFilter.java
package com.nextstep.config;

import jakarta.servlet.*;
import jakarta.servlet.http.*;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;

@Component
public class SseTokenFilter extends OncePerRequestFilter {

    @Override
    protected void doFilterInternal(HttpServletRequest request,
                                    HttpServletResponse response,
                                    FilterChain chain)
            throws ServletException, IOException {

        // Si c'est un SSE logs et que le token est en query param
        String path  = request.getRequestURI();
        String token = request.getParameter("token");

        if (token != null && path.contains("/api/hosting/nginx/logs")) {
            // Wrapper qui injecte le token dans le header Authorization
            HttpServletRequestWrapper wrapped = new HttpServletRequestWrapper(request) {
                @Override
                public String getHeader(String name) {
                    if ("Authorization".equalsIgnoreCase(name)) {
                        return "Bearer " + token;
                    }
                    return super.getHeader(name);
                }
            };
            chain.doFilter(wrapped, response);
            return;
        }

        chain.doFilter(request, response);
    }
}