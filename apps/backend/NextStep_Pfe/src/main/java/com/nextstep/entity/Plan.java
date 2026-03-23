package com.nextstep.entity;

import jakarta.persistence.*;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.*;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;

/**
 * Plan tarifaire associé à un CloudService.
 *
 * MODIFICATIONS :
 *  - price devient nullable (null si isPayAsYouGo = true)
 *  - isPayAsYouGo ajouté : bascule le plan en mode Pay-As-You-Go
 *  - relation OneToMany vers PlanPricing (grille tarifaire PAYG)
 */
@Entity
@Table(name = "plans")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class Plan {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @NotBlank
    @Column(nullable = false)
    private String name;

    @Column(columnDefinition = "TEXT")
    private String description;

    @Column(nullable = false)
    private PlanTier tier;

    /**
     * MODIFICATION : nullable.
     * null quand isPayAsYouGo = true (pas de prix fixe mensuel).
     * Obligatoire quand isPayAsYouGo = false.
     */
    @Column(nullable = true)
    private BigDecimal price;

    @Column(name = "billing_cycle")
    private BillingCycle billingCycle;

    private Integer vcores;
    private Integer ramGb;
    private Integer storageGb;

    @Column(name = "is_active")
    @Builder.Default
    private Boolean isActive = true;

    private String badge;

    @Column(nullable = false)
    @Builder.Default
    private Boolean isPopular = false;

    /**
     * NOUVEAU — true = plan Pay-As-You-Go.
     * Dans ce cas : price = null, billingCycle = USAGE,
     * et les tarifs unitaires sont dans planPricings.
     */
    @Column(name = "is_pay_as_you_go", nullable = false)
    @Builder.Default
    private Boolean isPayAsYouGo = false;

    /**
     * NOUVEAU — Grille de tarification PAYG (une ligne par métrique).
     * Vide pour les plans à prix fixe.
     */
    @OneToMany(mappedBy = "plan", cascade = CascadeType.ALL, orphanRemoval = true)
    @Builder.Default
    private List<PlanPricing> planPricings = new ArrayList<>();

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "service_id", nullable = false)
    private CloudService service;
}