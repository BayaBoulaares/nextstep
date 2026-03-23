package com.nextstep.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import com.nextstep.entity.BillingCycle;
import com.nextstep.entity.PlanTier;
import lombok.Data;
import java.math.BigDecimal;
import java.util.List;

@Data
public class PlanDTO {
    @JsonProperty("id")
    private Long id;
    private String name;
    private String description;
    private PlanTier tier;
    private BigDecimal price;
    private BillingCycle billingCycle;
    private Integer vcores;
    private Integer ramGb;
    private Integer storageGb;
    private Boolean isActive;
    private Long serviceId;
    private String serviceName;
    /** NOUVEAU — ex: "POPULAIRE", "RECOMMANDÉ", null */
    private String badge;
    /** NOUVEAU */
    private Boolean isPopular;
    /** NOUVEAU */
    private Boolean isPayAsYouGo;
    /** NOUVEAU — grille tarifaire PAYG (liste vide pour les plans fixes) */
    private List<PlanPricingDTO> planPricings;
}