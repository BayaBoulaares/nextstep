package com.nextstep.multitenancy;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletRequestWrapper;

import java.util.*;

/**
 * Wrapper qui injecte le header X-User-ID dans la requête HTTP.
 * nginx lit ce header comme clé de rate limiting (L1).
 */
public class UserIdRequestWrapper extends HttpServletRequestWrapper {

    private static final String USER_ID_HEADER = "X-User-ID";
    private final String userId;

    public UserIdRequestWrapper(HttpServletRequest request, String userId) {
        super(request);
        this.userId = userId;
    }

    @Override
    public String getHeader(String name) {
        if (USER_ID_HEADER.equalsIgnoreCase(name)) return userId;
        return super.getHeader(name);
    }

    @Override
    public Enumeration<String> getHeaders(String name) {
        if (USER_ID_HEADER.equalsIgnoreCase(name)) {
            return Collections.enumeration(List.of(userId));
        }
        return super.getHeaders(name);
    }

    @Override
    public Enumeration<String> getHeaderNames() {
        List<String> names = Collections.list(super.getHeaderNames());
        if (!names.contains(USER_ID_HEADER)) {
            names.add(USER_ID_HEADER);
        }
        return Collections.enumeration(names);
    }
}
