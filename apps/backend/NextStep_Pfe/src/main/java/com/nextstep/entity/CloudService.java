package com.nextstep.entity;

import jakarta.persistence.*;
import jakarta.validation.constraints.NotBlank;
import lombok.*;

import java.util.List;

@Entity
@Table(name = "cloud_services")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor
public class CloudService {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @NotBlank
    @Column(nullable = false, unique = true)
    private String name;        // ex: VPS, Web Hosting

    @Column(columnDefinition = "TEXT")
    private String description;

    @Column(nullable = false)
    @Enumerated(EnumType.STRING)
    private ServiceCategory category;    // ex: COMPUTE, HOSTING, DATABASE
    /**
     * NOUVEAU — Type de cloud auquel ce service appartient.
     * Permet de filtrer /api/services?cloudType=PRIVATE pour la page Cloud Privé du marketplace.
     */
    @Column(nullable = false)
    @Enumerated(EnumType.STRING)
    private CloudType cloudType;        // PRIVATE, PUBLIC, HYBRID

    /**
     * NOUVEAU — Icône emoji affichée dans la carte du service (ex: "💾", "🖥️", "☸️").
     * Correspond aux icônes visibles dans les maquettes vue2_cloud_prive et vue4_cloud_public.
     */
    private String icon;

    @Column(nullable = false)
    private ServiceStatus status ;  // ACTIVE ou INACTIVE

    // Un service a plusieurs plans
    @OneToMany(mappedBy = "service", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<Plan> plans;
}