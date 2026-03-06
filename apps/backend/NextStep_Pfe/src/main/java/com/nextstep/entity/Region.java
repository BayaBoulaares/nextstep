package com.nextstep.entity;

import jakarta.persistence.*;
import lombok.*;

import java.util.List;

/**
 * Représente l'un des 3 datacenters fixes de la plateforme :
 *
 *   Paris DC1     — EU-WEST    — 🇫🇷
 *   Francfort DC2 — EU-CENTRAL — 🇩🇪
 *   Londres DC3   — EU-NORTH   — 🇬🇧
 *
 * Les zones de disponibilité (ZONE_A, ZONE_B, MULTI_ZONE) sont portées
 * par l'enum AvailabilityZone et stockées directement dans Deployment.
 * Plus besoin de List<String> ni de table de jointure region_zones.
 */
@Entity
@Table(name = "regions")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor
public class Region {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    /** Code court unique — ex: "EU-WEST", "EU-CENTRAL", "EU-NORTH" */
    @Column(nullable = false, unique = true)
    private String code;

    /** Nom affiché dans l'UI — ex: "Paris", "Francfort", "Londres" */
    @Column(nullable = false)
    private String displayName;

    /** Étiquette datacenter — ex: "DC1", "DC2", "DC3" */
    @Column(nullable = false)
    private String address;

    /** Disponibilité du datacenter */
    @Column(nullable = false)
    @Enumerated(EnumType.STRING)
    private ServiceStatus status = ServiceStatus.ACTIF;

    @OneToMany(mappedBy = "region")
    private List<Deployment> deployments;
}