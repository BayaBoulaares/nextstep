package com.nextstep.dto;

import com.nextstep.entity.ServiceCategory;
import com.nextstep.entity.StorageResource;
import com.nextstep.entity.StorageResourceStatus;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;
import lombok.Builder;

import java.time.LocalDateTime;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class StorageResourceDTO {

    private Long id;

    // ── Identification ────────────────────────────────────────────────────────
    private String resourceName;
    private String namespace;

    // ── Type et capacité ─────────────────────────────────────────────────────
    private ServiceCategory storageType;
    private String capacity;
    private String storageClassName;

    // ── Object Storage spécifique ─────────────────────────────────────────────
    private String s3Endpoint;
    private String bucketName;
    private String accessKeyId;
    private String secretAccessKey;  // exposé ici, à sécuriser côté frontend

    // ── Statut et dates ───────────────────────────────────────────────────────
    private StorageResourceStatus status;
    private LocalDateTime readyAt;
    private LocalDateTime createdAt;

    // ── Relation (ID uniquement, pas d'entité imbriquée) ──────────────────────
    private Long deploymentId;
    public static StorageResourceDTO from(StorageResource sr) {
        return StorageResourceDTO.builder()
                .id(sr.getId())
                .resourceName(sr.getResourceName())
                .namespace(sr.getNamespace())
                .storageType(sr.getStorageType())
                .capacity(sr.getCapacity())
                .storageClassName(sr.getStorageClassName())
                .s3Endpoint(sr.getS3Endpoint())
                .bucketName(sr.getBucketName())
                .accessKeyId(sr.getAccessKeyId())
                .secretAccessKey(sr.getSecretAccessKey())
                .status(sr.getStatus())
                .readyAt(sr.getReadyAt())
                .createdAt(sr.getCreatedAt())
                .deploymentId(sr.getDeployment() != null ? sr.getDeployment().getId() : null)
                .build();
    }
    // ── Block / File uniquement ──
    private String pvcName;
    private String accessMode;      // "ReadWriteOnce" ou "ReadWriteMany"

    private String mountExample;    // ← pratique pour afficher dans le portal

}