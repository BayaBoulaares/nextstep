package com.nextstep.entity;


import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDateTime;

@Entity
@Table(name = "image_registries")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class ImageRegistry {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String name;

    @Column
    private String description;

    // Toujours INTERNAL — gardé pour évolutivité future
    @Enumerated(EnumType.STRING)
    @Column(name = "registry_type", nullable = false)
    private RegistryType registryType;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private RegistryStatus status;

    // ex: baya-tenant-johndoe
    @Column(name = "openshift_namespace", nullable = false)
    private String openshiftNamespace;

    // URL interne cluster : image-registry.svc:5000/{namespace}
    @Column(name = "registry_url")
    private String registryUrl;

    // URL externe via Route OpenShift (image-registry.apps.cluster/namespace)
    @Column(name = "external_registry_url")
    private String externalRegistryUrl;

    // ServiceAccount dédié créé dans le namespace du tenant
    @Column(name = "service_account_name")
    private String serviceAccountName;

    // Secret dockerconfigjson injecté dans le namespace
    @Column(name = "pull_secret_name")
    private String pullSecretName;

    // Keycloak UUID du tenant propriétaire
    @Column(name = "owner_keycloak_id", nullable = false)
    private String ownerKeycloakId;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;
}