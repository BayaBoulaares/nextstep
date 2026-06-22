// package com.nextstep.entity;

package com.nextstep.entity;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "database_resources")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class DatabaseResource {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @OneToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "deployment_id", nullable = false, unique = true)
    private Deployment deployment;

    /** Nom du Cluster CNPG créé sur OpenShift (ex: db-cluster-abc123) */
    @Column(nullable = false)
    private String clusterName;

    /** Namespace OpenShift du tenant */
    @Column(nullable = false)
    private String namespace;

    /** Nombre d'instances (1 = standalone, 3 = HA) */
    @Column(nullable = false)
    private Integer instances;

    /** Taille du PVC en Go */
    @Column(nullable = false)
    private Integer storageGb;

    /** StorageClass utilisée */
    @Column(nullable = false)
    private String storageClassName;

    /** Hôte RW du service CNPG (ex: db-cluster-abc123-rw.namespace.svc) */
    @Column(length = 500)

    private String hostRw;

    /** Hôte RO du service CNPG */
    @Column(length = 500)

    private String hostRo;

    /** Port PostgreSQL */
    @Column(nullable = false)
    @Builder.Default
    private Integer port = 5432;

    /** Nom de la base applicative */
    @Column(nullable = false)
    @Builder.Default
    private String dbName = "app";

    /** Nom de l'utilisateur applicatif */
    @Column(nullable = false)
    @Builder.Default
    private String dbUser = "app";

    /** Nom du secret Kubernetes contenant les credentials */
    private String credentialsSecret;

    /** Mot de passe (stocké pour exposition via API — à chiffrer en prod) */
    @Column(columnDefinition = "TEXT")

    private String dbPassword;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    @Builder.Default
    private DatabaseStatus status = DatabaseStatus.PROVISIONING;

    private LocalDateTime readyAt;
    @Column(columnDefinition = "TEXT")

    private String errorMessage;
    @Column
    private Integer externalPort; // NodePort alloué par OpenShift (30000-32767)
    @Column(length = 100)
    private String externalHost; // ← ajouter cette lignev

}