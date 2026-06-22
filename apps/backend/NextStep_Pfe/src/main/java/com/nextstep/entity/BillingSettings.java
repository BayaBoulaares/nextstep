package com.nextstep.entity;

import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity
@Table(name = "billing_settings")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class BillingSettings {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @OneToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "client_id", nullable = false, unique = true)
    private Client client;

    // Seuil de déclenchement de la facture (style OVH prépayé)
    // null = facturation mensuelle classique
    @Column(name = "prepaid_threshold", precision = 10, scale = 2)
    private BigDecimal prepaidThreshold;

    // Solde prépayé courant (positif = crédit disponible)
    @Column(name = "credit_balance", precision = 10, scale = 2)
    @Builder.Default
    private BigDecimal creditBalance = BigDecimal.ZERO;

    // Taux de TVA applicable (ex: 0.19 pour 19%)
    @Column(name = "vat_rate", precision = 5, scale = 4)
    @Builder.Default
    private BigDecimal vatRate = BigDecimal.ZERO; // 0 = hors TVA

    // Email de facturation (peut différer de l'email de connexion)
    @Column(name = "billing_email")
    private String billingEmail;

    // Référence client pour l'imputation comptable
    @Column(name = "accounting_ref")
    private String accountingRef;

    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    @PreUpdate
    protected void onUpdate() { updatedAt = LocalDateTime.now(); }
}