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
    IA(
            true, "🤖",
            "cx1.xlarge",
            List.of("cx1.large","cx1.xlarge","cx1.2xlarge","cx1.4xlarge")
    ),

    // ── Services managés — pas de VM ──────────────────────────────────────
    STOCKAGE        (false, "💾", null, List.of()),
    BASE_DONNEES    (false, "🗄️", null, List.of()),
    RESEAU          (false, "🔀", null, List.of()),
    EMAIL           (false, "📧", null, List.of()),
    SECURITE        (false, "🔒", null, List.of()),
    IAM             (false, "👤", null, List.of()),
    HEBERGEMENT(false, "🌐",null,List.of()),
    // ── Sous-types de stockage (provisioning OpenShift) ───────────────────
    OBJECT_STORAGE  (false, "🪣", null, List.of()),
    BLOCK_STORAGE   (false, "💿", null, List.of()),
    FILE_STORAGE    (false, "📁", null, List.of());

    // ─────────────────────────────────────────────────────────────────────

    public final boolean      requiresVm;
    public final String       defaultIcon;
    public final String       defaultInstanceType;
    public final List<String> availableInstanceTypes;

    ServiceCategory(boolean requiresVm,
                    String defaultIcon,
                    String defaultInstanceType,
                    List<String> availableInstanceTypes) {
        this.requiresVm             = requiresVm;
        this.defaultIcon            = defaultIcon;
        this.defaultInstanceType    = defaultInstanceType;
        this.availableInstanceTypes = availableInstanceTypes;
    }

    public boolean requiresVm() { return requiresVm; }
}