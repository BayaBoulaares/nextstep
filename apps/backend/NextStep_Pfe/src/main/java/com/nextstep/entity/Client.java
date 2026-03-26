package com.nextstep.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Set;

@Entity
@DiscriminatorValue("CLIENT")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class Client extends User {

    // ----- Champs spécifiques client -----
    @Column(length = 20)
    private String telephone;

    @Column(length = 255)
    private String adresse;

    //@Column(nullable = false)
    private BigDecimal soldePayAsYouGo = BigDecimal.ZERO;
    @OneToMany(mappedBy = "owner", cascade = CascadeType.ALL)
    private List<Project> projects;

    @OneToMany(mappedBy = "user", cascade = CascadeType.ALL)
    private List<Deployment> deployments;
    // ── NOUVEAU — Abonnements ─────────────────────────────────────────────────

    /**
     * Tous les abonnements du client (actifs, résiliés, expirés…).
     * Utiliser AbonnementRepository.findByClientIdAndStatus pour filtrer.
     */
    @OneToMany(mappedBy = "client", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<Abonnement> abonnements = new ArrayList<>();

    // ── NOUVEAU — Factures ────────────────────────────────────────────────────

    @OneToMany(mappedBy = "client", cascade = CascadeType.ALL)
    private List<Invoice> invoices = new ArrayList<>();
    // ----- Plan global actif (STANDARD / PREMIUM / ENTERPRISE) -----
    /*@ManyToOne
    @JoinColumn(name = "plan_global_id")
    private Offre planGlobal;

    // ----- Packs abonnés (modules / services cloud) -----
    @ManyToMany
    @JoinTable(
            name = "client_abonnements_packs",
            joinColumns = @JoinColumn(name = "client_id"),
            inverseJoinColumns = @JoinColumn(name = "offre_id")
    )
    private Set<Offre> packsAbonnes = new HashSet<>();

    // ----- Services achetés (optionnels, PAYG) -----
    @ManyToMany
    @JoinTable(
            name = "client_services_achats",
            joinColumns = @JoinColumn(name = "client_id"),
            inverseJoinColumns = @JoinColumn(name = "service_id")
    )
    private Set<Services> servicesAchetes = new HashSet<>();

    // ----- Historique des abonnements -----
    @OneToMany(mappedBy = "client", cascade = CascadeType.ALL, orphanRemoval = true)
    private Set<Abonnement> abonnements = new HashSet<>();


    public void ajouterService(Services service) {
        this.servicesAchetes.add(service);
    }

    public void retirerService(Services service) {
        this.servicesAchetes.remove(service);
    }*/

}