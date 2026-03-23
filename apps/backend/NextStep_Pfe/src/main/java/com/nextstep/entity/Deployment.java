package com.nextstep.entity;


import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;
import java.time.LocalDateTime;

/**
 * Représente une ressource déployée par un utilisateur.
 *
 * Correspond au tunnel 4 étapes des maquettes :
 *   s1_configuration  → choix plan + config technique
 *   s2_recapitulatif  → récapitulatif avant confirmation
 *   s3_provisionnement → étapes de provisionnement en temps réel
 *   s4_dashboard       → ressource visible dans "Mes Services"
 *
 * Exemples de ressources du dashboard :
 *   - prod-backend-01         (Cloud Privé · vCore M · Paris Zone A)
 *   - prod-db-postgres-01     (Cloud Privé · SQL Managé M · Paris Zone A)
 *   - storage-assets-prod     (Cloud Public · Object Storage S3 Standard)
 *   - hybrid-direct-link-1G   (Cloud Hybride · Direct Link 1G · Paris ↔ On-prem)
 */
@Entity
@Table(name = "deployments")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class Deployment {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    // ── Identification ────────────────────────────────────────────────────────

    /** Nom de la ressource saisi par l'utilisateur (ex: "prod-backend-01") */
    @Column(nullable = false)
    private String resourceName;

    /** Description optionnelle */
    private String description;

    // ── Relations ─────────────────────────────────────────────────────────────

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "project_id")
    private Project project;

    /** Plan choisi (contient le service, le tier, le prix de base) */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "plan_id", nullable = false)
    private Plan plan;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "region_id")
    private Region region;

    /**
     * Zone de disponibilité choisie (enum fixe).
     * Correspond aux 3 boutons radio de la maquette s1_configuration.
     */
    @Enumerated(EnumType.STRING)
    private AvailabilityZone availabilityZone;

    // ── Configuration technique (peut surcharger le plan) ────────────────────

    /**
     * MODIFICATION : était String operatingSystem (texte libre).
     * Maintenant enum OperatingSystem pour garantir les valeurs valides.
     * Nullable : certains plans (stockage, réseau) n'ont pas d'OS.
     */
    @Enumerated(EnumType.STRING)
    @Column(name = "operating_system")
    private OperatingSystem operatingSystem;

    /** Stockage additionnel en Go au-delà du plan de base */
    private Integer additionalStorageGb;

    /** Tags JSON sérialisés (ex: '["production","backend"]') */
    @Column(columnDefinition = "TEXT")
    private String tagsJson;

    // ── Options & services managés ────────────────────────────────────────────

    /** Backup automatique activé (+19 €/mois dans la maquette récapitulatif) */
    @Column(nullable = false)
    @Builder.Default
    private Boolean backupEnabled = false;

    /** Monitoring & alertes activé (+9 €/mois) */
    @Column(nullable = false)
    @Builder.Default
    private Boolean monitoringEnabled = false;

    /** Protection Anti-DDoS avancée (+29 €/mois) */
    @Column(nullable = false)
    @Builder.Default
    private Boolean antiDdosEnabled = false;

    /** Gestion des clés SSH (inclus dans le plan) */
    @Column(nullable = false)
    @Builder.Default
    private Boolean sshKeyManagement = true;

    // ── Réseau ────────────────────────────────────────────────────────────────

    /** VPC / réseau privé virtuel (ex: "vpc-prod-main (10.0.0.0/16)") */
    private String vpcId;

    /** Sous-réseau (ex: "subnet-private-a (10.0.1.0/24)") */
    private String subnetId;

    /** Groupe de sécurité (ex: "sg-backend (SSH, HTTP, HTTPS)") */
    private String securityGroup;

    // ── Tarification ─────────────────────────────────────────────────────────

    /** Montant mensuel HT total calculé (plan + options + stockage add.) */
    @Column(nullable = false)
    private BigDecimal monthlyPriceHt;

    // ── Statut & cycle de vie ─────────────────────────────────────────────────

    @Column(nullable = false)
    @Enumerated(EnumType.STRING)
    @Builder.Default
    private DeploymentStatus status = DeploymentStatus.EN_ATTENTE;

    @Column(nullable = false, updatable = false)
    @Builder.Default
    private LocalDateTime createdAt = LocalDateTime.now();

    private LocalDateTime deployedAt;

    private LocalDateTime terminatedAt;
}