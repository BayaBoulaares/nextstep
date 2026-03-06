package com.nextstep.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

@Entity
@Table(name = "users")
@Inheritance(strategy = InheritanceType.SINGLE_TABLE)
@DiscriminatorColumn(name = "user_type")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public abstract class User {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(unique = true, nullable = false)
    private String email;

    @Column(nullable = false)
    private String firstName;

    @Column(nullable = false)
    private String lastName;
    // ← nouveau : URL de la photo de profil (stockée sur S3 / Cloudinary / etc.)
    @Column(length = 512)
    private String avatarUrl;


    @Column(unique = true)
    private String keycloakId;  // sub du JWT
    // 🔴 NOUVEAUX CHAMPS POUR L'AUTH SOCIALE
    @Column(nullable = false)
    private Boolean emailVerified = false;  // Email vérifié ?

    @Column(nullable = false)
    private Boolean enabled = true;         // Compte activé ?

    @Column(length = 50)
    private String provider;                // google, keycloak, credentials, etc.

    @Column(length = 500)
    private String providerId;              // ID chez le provider

    @CreationTimestamp
    @Column(nullable = false, updatable = false)
    private LocalDateTime createdAt;
    @OneToMany(mappedBy = "user", cascade = CascadeType.ALL)
    private List<Alert> alerts;
    @UpdateTimestamp
    private LocalDateTime dateModification;
    public enum UserType { ADMIN, CLIENT }
    @PrePersist
    public void prePersist() {
        if (this.createdAt == null) {
            this.createdAt = LocalDateTime.now();
        }
        // Valeurs par défaut
        if (this.emailVerified == null) {
            this.emailVerified = false;
        }
        if (this.enabled == null) {
            this.enabled = true;
        }
    }
}