package com.nextstep.dto;


import com.nextstep.entity.AbonnementStatus;
import com.nextstep.entity.BillingCycle;
import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDateTime;

/**
 * DTO retourné par les endpoints /api/abonnements
 */
@Data
public class AbonnementResponse {
    private Long id;

    // Plan info
    private Long planId;
    private String planName;
    private String serviceName;
    private Boolean isPayAsYouGo;

    // Abonnement
    private AbonnementStatus status;
    private BigDecimal prixSnapshot;
    private BillingCycle billingCycle;
    private LocalDateTime dateDebut;
    private LocalDateTime dateFin;
    private LocalDateTime dateResiliation;
    private Boolean autoRenouvellement;

    // Déploiement lié (si présent)
    private Long deploymentId;
    private String resourceName;

    private LocalDateTime createdAt;
}