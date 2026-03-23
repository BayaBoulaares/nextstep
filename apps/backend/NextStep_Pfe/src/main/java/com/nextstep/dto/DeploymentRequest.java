package com.nextstep.dto;


import com.nextstep.entity.AvailabilityZone;
import com.nextstep.entity.OperatingSystem;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

/**
 * Corps de la requête POST /api/deployments
 * Correspond aux champs saisis dans la maquette s1_configuration.
 */
@Data
public class DeploymentRequest {

    /** Nom de la ressource (ex: "prod-backend-01") */
    @NotBlank(message = "Le nom de la ressource est obligatoire")
    private String resourceName;

    private String description;

    /** ID du plan sélectionné (ex: plan vCore M) */
    @NotNull(message = "L'ID du plan est obligatoire")
    private Long planId;

    /** ID du projet (sélecteur "Production — E-Commerce") */
    //@NotNull(message = "L'ID du projet est obligatoire")
    private Long projectId;

    /** ID de la région (ex: Paris DC1) */
    //@NotNull(message = "La région est obligatoire")
    private Long regionId;

    /** Zone de disponibilité — enum fixe (ZONE_A, ZONE_B, MULTI_ZONE) */
    private AvailabilityZone availabilityZone;

    /** Système d'exploitation (ex: "Ubuntu 24.04 LTS") */
    private OperatingSystem operatingSystem;

    /** Stockage additionnel en Go (slider maquette, 0 par défaut) */
    private Integer additionalStorageGb = 0;

    /** Tags sous forme de liste JSON sérialisée */
    private String tagsJson;

    // Options
    private Boolean backupEnabled      = false;
    private Boolean monitoringEnabled  = false;
    private Boolean antiDdosEnabled    = false;
    private Boolean sshKeyManagement   = true;

    // Réseau
    private String vpcId;
    private String subnetId;
    private String securityGroup;
}