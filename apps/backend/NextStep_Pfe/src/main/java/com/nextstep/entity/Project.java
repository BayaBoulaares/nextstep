package com.nextstep.entity;

import jakarta.persistence.*;
import lombok.*;

import java.util.List;

/**
 * Projet organisationnel d'un utilisateur.
 * Visible dans la maquette s1_configuration : sélecteur "Production — E-Commerce".
 * Le dashboard s4 affiche "Projet Production E-Commerce" sous le nom de l'utilisateur.
 */
@Entity
@Table(name = "projects")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor
public class Project {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String name;   // ex: "Production — E-Commerce"

    private String description;

    /** Propriétaire du projet */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "owner_id", nullable = false)
    private User owner;

    /** Tous les déploiements rattachés à ce projet */
    @OneToMany(mappedBy = "project", cascade = CascadeType.ALL)
    private List<Deployment> deployments;
}