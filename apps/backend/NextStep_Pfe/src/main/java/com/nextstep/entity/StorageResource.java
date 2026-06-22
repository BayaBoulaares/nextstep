package com.nextstep.entity;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "storage_resources")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class StorageResource {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @OneToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "deployment_id", nullable = false, unique = true)
    private Deployment deployment;

    /** Nom de la ressource OpenShift créée (OBC ou PVC) */
    @Column(nullable = false)
    private String resourceName;

    /** Namespace client où la ressource est provisionnée */
    @Column(nullable = false)
    private String namespace;

    /** OBJECT_STORAGE | BLOCK_STORAGE | FILE_STORAGE */
    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private ServiceCategory storageType;

    /** Capacité allouée (ex: "100Gi") */
    private String capacity;

    /** StorageClass OpenShift utilisée */
    private String storageClassName;

    /**
     * Pour l'Object Storage : endpoint S3 interne
     * ex: http://s3.openshift-storage.svc.cluster.local
     */
    private String s3Endpoint;

    /** Nom du bucket OBC créé */
    private String bucketName;

    /** Access Key ID (Secret K8s → champ AWS_ACCESS_KEY_ID) */
    private String accessKeyId;

    /** Secret Access Key (Secret K8s → champ AWS_SECRET_ACCESS_KEY) */
    @Column(length = 512)
    private String secretAccessKey;

    @Enumerated(EnumType.STRING)
    @Builder.Default
    private StorageResourceStatus status = StorageResourceStatus.PENDING;

    @Builder.Default
    private LocalDateTime createdAt = LocalDateTime.now();

    private LocalDateTime readyAt;
    // ── NOUVEAUX — pour Block et File ──────────
    @Column(name = "pvc_name")
    private String pvcName;          // ex: "monapp-block" ou "monapp-file"
    @Column(name = "access_mode")
    private String accessMode;       // "ReadWriteOnce" ou "ReadWriteMany"
    @Column(name = "attached_vm_name")
    private String attachedVmName;
}