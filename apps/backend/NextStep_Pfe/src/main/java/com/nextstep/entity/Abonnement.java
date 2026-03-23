package com.nextstep.entity;


import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;
import java.time.LocalDateTime;

/**
 * Contrat commercial entre un Client et un Plan.
 *
 * Un Abonnement ≠ un Deployment :
 *  - Abonnement = engagement commercial (durée, prix, cycle)
 *  - Deployment = ressource technique provisionnée
 *
 * Contrainte : un seul abonnement ACTIF par (client, plan).
 * Index : (client_id, status) pour les requêtes fréquentes.
 *
 * Table : abonnements
 */
@Entity
@Table(name = "abonnements",
        indexes = {
                @Index(name = "idx_abo_client_status", columnList = "client_id, status"),
                @Index(name = "idx_abo_deployment",    columnList = "deployment_id")
        })
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class Abonnement {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    // ── Relations ─────────────────────────────────────────────────────────────

    /** Client souscripteur (sous-type de User). */
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "client_id", nullable = false)
    private Client client;

    /** Plan souscrit. */
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "plan_id", nullable = false)
    private Plan plan;

    /**
     * Déploiement associé (optionnel).
     * Null si l'abonnement est PAYG sans ressource encore provisionnée.
     */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "deployment_id")
    private Deployment deployment;

    // ── Snapshot commercial ───────────────────────────────────────────────────

    /**
     * Prix figé au moment de la souscription.
     * Permet de conserver le tarif historique si le Plan est modifié ensuite.
     * 0.00 pour les plans PAYG (pas de prix fixe).
     */
    @Column(name = "prix_snapshot", nullable = false, precision = 10, scale = 2)
    @Builder.Default
    private BigDecimal prixSnapshot = BigDecimal.ZERO;

    /**
     * Cycle de facturation copié depuis le Plan à la souscription.
     * USAGE = Pay-As-You-Go.
     */
    @Enumerated(EnumType.STRING)
    @Column(name = "billing_cycle", nullable = false)
    private BillingCycle billingCycle;

    // ── Statut & dates ────────────────────────────────────────────────────────

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    @Builder.Default
    private AbonnementStatus status = AbonnementStatus.EN_ATTENTE;

    @Column(name = "date_debut", nullable = false)
    private LocalDateTime dateDebut;

    /** Null = sans fin (ex: PAYG ou mensuel reconduit tacitement). */
    @Column(name = "date_fin")
    private LocalDateTime dateFin;

    /** Rempli uniquement quand status = RESILIE. */
    @Column(name = "date_resiliation")
    private LocalDateTime dateResiliation;

    @Column(name = "auto_renouvellement", nullable = false)
    @Builder.Default
    private Boolean autoRenouvellement = true;

    // ── Audit ─────────────────────────────────────────────────────────────────

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
        updatedAt = LocalDateTime.now();
        if (dateDebut == null) dateDebut = LocalDateTime.now();
    }

    @PreUpdate
    protected void onUpdate() {
        updatedAt = LocalDateTime.now();
    }
}