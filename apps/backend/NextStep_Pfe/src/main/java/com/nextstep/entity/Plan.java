package com.nextstep.entity;

import jakarta.persistence.*;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.*;

import java.math.BigDecimal;

@Entity
@Table(name = "plans")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class Plan {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @NotBlank
    @Column(nullable = false)
    private String name;        // ex: VPS Starter, VPS Essential

    @Column(columnDefinition = "TEXT")
    private String description;

    @Column(nullable = false)
    private PlanTier tier;        // STARTER, ESSENTIAL, BUSINESS...

    @NotNull
    @Column(nullable = false)
    private BigDecimal price;

    @Column(name = "billing_cycle")

    private BillingCycle billingCycle;  // MONTHLY, ANNUAL, HOURLY

    // Specs techniques
    private Integer vcores;
    private Integer ramGb;
    private Integer storageGb;

    @Column(name = "is_active")
    @Builder.Default
    private Boolean isActive = true;
    /**
     * NOUVEAU — Badge textuel visible sur la carte du plan dans la modale vue3_dialogue_plans.
     * Exemples : "POPULAIRE", "RECOMMANDÉ", "HA", "ENTERPRISE", "GRATUIT", "LLM READY"
     * Null = aucun badge affiché.
     */
    private String badge;

    /**
     * NOUVEAU — Indique si ce plan est le plus recommandé du service (mis en avant visuellement).
     * Correspond aux plans badgés "RECOMMANDÉ" / "POPULAIRE" dans les maquettes.
     */
    @Column(nullable = false)
    @Builder.Default
    private Boolean isPopular = false;

    // Cle etrangere vers CloudService
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "service_id", nullable = false)
    private CloudService service;
}