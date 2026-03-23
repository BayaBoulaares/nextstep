package com.nextstep.entity;


import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;

/**
 * Grille tarifaire unitaire d'un plan Pay-As-You-Go.
 *
 * Exemple : plan "Compute PAYG"
 *   → PlanPricing(VCPU_HEURE,     pricePerUnit=0.020000, freeQuota=0)
 *   → PlanPricing(RAM_GB_HEURE,   pricePerUnit=0.005000, freeQuota=0)
 *   → PlanPricing(STOCKAGE_GB_MOIS, pricePerUnit=0.080000, freeQuota=10)
 *
 * Table : plan_pricings
 */
@Entity
@Table(name = "plan_pricings",
        uniqueConstraints = @UniqueConstraint(columnNames = {"plan_id", "metric_type"}))
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class PlanPricing {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "plan_id", nullable = false)
    private Plan plan;

    /** Métrique facturée (vCPU/h, RAM/h, stockage/mois…) */
    @Enumerated(EnumType.STRING)
    @Column(name = "metric_type", nullable = false)
    private UsageMetricType metricType;

    /** Prix unitaire par unité de cette métrique (6 décimales). */
    @Column(name = "price_per_unit", nullable = false, precision = 10, scale = 6)
    private BigDecimal pricePerUnit;

    /** Unité lisible pour l'affichage (ex: "heure", "Go", "1000 req"). */
    @Column(nullable = false)
    private String unit;

    /**
     * Quota gratuit inclus dans le plan (ex: 10 Go de stockage offerts).
     * La facturation ne démarre qu'au-delà de ce quota.
     */
    @Column(name = "free_quota", nullable = false, precision = 15, scale = 4)
    @Builder.Default
    private BigDecimal freeQuota = BigDecimal.ZERO;
}