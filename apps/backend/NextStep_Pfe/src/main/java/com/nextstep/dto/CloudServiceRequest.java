package com.nextstep.dto;

import com.nextstep.entity.ServiceCategory;
import com.nextstep.entity.ServiceStatus;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

@Data
public class CloudServiceRequest {

    @NotBlank(message = "Le nom est obligatoire")
    private String name;

    private String description;


    /**
     * NOUVEAU — Icône emoji du service (ex: "💾", "🖥️").
     * Optionnel mais recommandé pour l'affichage frontend.
     */
    private String icon;
    @NotNull(message = "La categorie est obligatoire")
    private ServiceCategory category;
    @NotNull(message = "Le statut est obligatoire")
    private ServiceStatus status;
}