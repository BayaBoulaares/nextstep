package com.nextstep.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record SuspendRequestDTO(
        @NotBlank(message = "Le motif est obligatoire")
        @Size(min = 10, message = "Le motif doit contenir au moins 10 caractères")
        String reason
) {}