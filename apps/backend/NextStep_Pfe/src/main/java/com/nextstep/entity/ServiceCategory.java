package com.nextstep.entity;

import java.util.List;

public enum ServiceCategory {

    // ── Services qui créent une VM sur OpenShift ───────────────────────────
    CALCUL(
            true, "🖥️",
            "u1.small",
            List.of("u1.nano","u1.micro","u1.small","u1.medium",
                    "u1.large","u1.xlarge","u1.2xlarge")
    ),
    HEBERGEMENT(
            true, "🌐",
            "o1.small",
            List.of("o1.nano","o1.micro","o1.small","o1.medium","o1.large")
    ),
    IA(
            true, "🤖",
            "cx1.xlarge",
            List.of("cx1.large","cx1.xlarge","cx1.2xlarge","cx1.4xlarge")
    ),

    // ── Services managés — pas de VM ──────────────────────────────────────
    STOCKAGE    (false, "💾", null, List.of()),
    BASE_DONNEES(false, "🗄️", null, List.of()),
    RESEAU      (false, "🔀", null, List.of()),
    EMAIL       (false, "📧", null, List.of()),
    SECURITE    (false, "🔒", null, List.of()),
    IAM         (false, "👤", null, List.of());

    public final boolean      requiresVm;
    public final String       defaultIcon;
    public final String       defaultInstanceType;   // null si pas de VM
    public final List<String> availableInstanceTypes;

    ServiceCategory(boolean requiresVm, String defaultIcon,
                    String defaultInstanceType,
                    List<String> availableInstanceTypes) {
        this.requiresVm             = requiresVm;
        this.defaultIcon            = defaultIcon;
        this.defaultInstanceType    = defaultInstanceType;
        this.availableInstanceTypes = availableInstanceTypes;
    }

    public boolean requiresVm() { return requiresVm; }
}