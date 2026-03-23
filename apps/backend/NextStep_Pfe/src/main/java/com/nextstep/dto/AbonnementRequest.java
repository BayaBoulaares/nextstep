package com.nextstep.dto;


import jakarta.validation.constraints.NotNull;
import lombok.Data;

/**
 * Corps de la requête POST /api/abonnements
 */
@Data
public class AbonnementRequest {

    @NotNull(message = "L'ID du plan est obligatoire")
    private Long planId;

    /** Optionnel : lier immédiatement à un déploiement existant. */
    private Long deploymentId;

    /** Par défaut true : renouvellement automatique à l'échéance. */
    private Boolean autoRenouvellement = true;
}