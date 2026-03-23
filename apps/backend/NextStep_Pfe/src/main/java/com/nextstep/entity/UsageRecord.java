package com.nextstep.entity;


import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;
import java.time.LocalDateTime;

/**
 * Enregistrement d'une consommation mesurée pour un abonnement PAYG.
 *
 * Créé automatiquement par UsageCollectorScheduler toutes les heures
 * pour chaque déploiement actif lié à un plan Pay-As-You-Go.
 *
 * Entité en append-only (jamais d'UPDATE).
 * Table : usage_records
 */
@Entity
@Table(name = "usage_records",
        indexes = {
                @Index(name = "idx_usage_abo_period",  columnList = "abonnement_id, period_start"),
                @Index(name = "idx_usage_deployment",  columnList = "deployment_id")
        })
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class UsageRecord {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    /** Abonnement PAYG auquel cette consommation est rattachée. */
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "abonnement_id", nullable = false)
    private Abonnement abonnement;

    /** Déploiement source de la consommation. */
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "deployment_id", nullable = false)
    private Deployment deployment;

    /** Type de ressource mesurée. */
    @Enumerated(EnumType.STRING)
    @Column(name = "metric_type", nullable = false)
    private UsageMetricType metricType;

    /** Quantité consommée pendant la période (ex: 4.0 vCPU·h). */
    @Column(nullable = false, precision = 15, scale = 4)
    private BigDecimal quantity;

    /**
     * Coût calculé = max(0, quantity - freeQuota) × pricePerUnit.
     * Stocké pour audit — pas recalculé a posteriori.
     */
    @Column(nullable = false, precision = 10, scale = 4)
    private BigDecimal cost;

    /** Début de la fenêtre de mesure. */
    @Column(name = "period_start", nullable = false)
    private LocalDateTime periodStart;

    /** Fin de la fenêtre de mesure. */
    @Column(name = "period_end", nullable = false)
    private LocalDateTime periodEnd;

    @Column(name = "recorded_at", nullable = false, updatable = false)
    private LocalDateTime recordedAt;

    @PrePersist
    protected void onCreate() {
        recordedAt = LocalDateTime.now();
    }
}