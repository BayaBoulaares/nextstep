package com.nextstep.dto;


import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import lombok.Data;

@Data
public class VmCloneRequest {

    /**
     * Nom de la VM cible (clone).
     * Doit respecter les conventions Kubernetes : lowercase alphanumérique + tirets.
     */
    @NotBlank
    @Pattern(regexp = "^[a-z0-9][a-z0-9\\-]{1,30}[a-z0-9]$",
            message = "Le nom doit être en minuscules, 3-32 caractères, sans espaces")
    private String cloneName;

    /**
     * Mot de passe pour le clone (optionnel — généré si absent).
     */
    private String vmPassword;
    private String sourceVmName;  // ← Ajouter ce champ
}