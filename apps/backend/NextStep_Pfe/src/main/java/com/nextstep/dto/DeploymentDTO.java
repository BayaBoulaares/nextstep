package com.nextstep.dto;


import com.nextstep.entity.AvailabilityZone;
import com.nextstep.entity.DeploymentStatus;
import lombok.Data;
import java.math.BigDecimal;
import java.time.LocalDateTime;

/**
 * DTO retourné par GET /api/deployments et GET /api/deployments/{id}.
 * Correspond à une ligne du tableau "Mes Services" du dashboard s4.
 */
@Data
public class DeploymentDTO {
    private Long id;
    private String resourceName;
    private String description;
    private DeploymentStatus status;

    // Plan & service
    private Long planId;
    private String planName;
    private Long serviceId;
    private String serviceName;
    private String serviceIcon;
    private String cloudTypeName;   // "Cloud Privé", "Cloud Public", "Cloud Hybride"

    // Localisation
    private String regionName;      // "Paris"
    private String datacenterLabel; // "DC1"
    private AvailabilityZone availabilityZone; // ZONE_A, ZONE_B, MULTI_ZONE

    // Config
    private String operatingSystem;
    private Integer vcores;
    private Integer ramGb;
    private Integer storageGb;      // base + additionalStorageGb

    // Options actives
    private Boolean backupEnabled;
    private Boolean monitoringEnabled;
    private Boolean antiDdosEnabled;

    // Réseau
    private String vpcId;
    private String subnetId;

    // Tarif
    private BigDecimal monthlyPriceHt;

    // Projet
    private Long projectId;
    private String projectName;

    // Dates
    private LocalDateTime createdAt;
    private LocalDateTime deployedAt;
}