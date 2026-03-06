package com.nextstep.entity;

public enum AlertSeverity {
    INFO,         // Information simple
    AVERTISSEMENT, // Avertissement (CPU > 85% dans le dashboard)
    CRITIQUE      // Critique — service dégradé ou indisponible
}
