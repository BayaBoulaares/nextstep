package com.nextstep.dto;

import com.nextstep.entity.BillingCycle;
import com.nextstep.entity.PlanTier;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;
import java.math.BigDecimal;

@Data
public class PlanRequest {

    @NotBlank(message = "Le nom est obligatoire")
    private String name;

    private String description;

    @NotNull(message = "Le tier est obligatoire")
    private PlanTier tier;

    @NotNull(message = "Le prix est obligatoire")
    private BigDecimal price;
    @NotNull(message = "Le billingCycle est obligatoire")
    private BillingCycle billingCycle;
    private Integer vcores;
    private Integer ramGb;
    private Integer storageGb;
    /** NOUVEAU — Badge affiché (ex: "POPULAIRE"). Optionnel. */
    private String badge;
    /** NOUVEAU — Plan mis en avant visuellement. Défaut false. */
    private Boolean isPopular = false;
    @NotNull(message = "L'ID du service est obligatoire")
    private Long serviceId;

}