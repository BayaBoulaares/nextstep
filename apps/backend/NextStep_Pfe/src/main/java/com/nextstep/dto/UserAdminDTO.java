package com.nextstep.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

import java.time.LocalDateTime;

// UserAdminDTO.java
public record UserAdminDTO(
        String keycloakId,
        String username,
        String email,
        String role,
        boolean enabled,
        boolean isOnline,           // true si session Keycloak active
        String suspensionReason,
        String suspendedBy,
        LocalDateTime suspendedAt
) {}

// SuspendRequestDTO.java
