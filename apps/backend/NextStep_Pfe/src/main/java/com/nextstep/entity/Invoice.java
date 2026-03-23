package com.nextstep.entity;


import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;
import java.time.LocalDateTime;

/**
 * Facture mensuelle consolidée générée depuis les UsageRecord.
 *
 * Générée automatiquement le 1er de chaque mois par InvoiceScheduler
 * pour tous les abonnements PAYG actifs du mois précédent.
 *
 * Table : invoices
 */
@Entity
@Table(name = "invoices",
        indexes = {
                @Index(name = "idx_invoice_client",      columnList = "client_id"),
                @Index(name = "idx_invoice_abonnement",  columnList = "abonnement_id, period_start")
        })
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class Invoice {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "client_id", nullable = false)
    private Client client;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "abonnement_id", nullable = false)
    private Abonnement abonnement;

    /** Début de la période facturée (ex: 2026-03-01T00:00:00). */
    @Column(name = "period_start", nullable = false)
    private LocalDateTime periodStart;

    /** Fin de la période facturée (ex: 2026-03-31T23:59:59). */
    @Column(name = "period_end", nullable = false)
    private LocalDateTime periodEnd;

    /** Montant total HT : somme des UsageRecord.cost sur la période. */
    @Column(name = "total_ht", nullable = false, precision = 10, scale = 2)
    private BigDecimal totalHt;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    @Builder.Default
    private InvoiceStatus status = InvoiceStatus.BROUILLON;

    /** Date d'émission au client. */
    @Column(name = "issued_at")
    private LocalDateTime issuedAt;

    /** Date de règlement effectif. */
    @Column(name = "paid_at")
    private LocalDateTime paidAt;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
    }
}