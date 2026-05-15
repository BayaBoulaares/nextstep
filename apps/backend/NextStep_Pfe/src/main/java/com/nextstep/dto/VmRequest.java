package com.nextstep.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;

import java.time.LocalDateTime;
import java.util.UUID;

// VmRequest.java
@Data
@Builder
public class VmRequest {
    @NotBlank
    private String vmName;
    private int cpuCores;   // ex: 2
    private String instanceType;   // ex: "u1.small"
    private int ramGb;      // ex: 4
    private Integer  diskGb;     // ex: 20
    private String osImage; // ex: "kubevirt/fedora-cloud-container-disk-demo:latest"
    private String vmPassword;
    /**
     * Nom logique du groupe d'Availability Set.
     * Ex: "as-prod-web" → toutes les VMs de ce groupe
     * seront schedulées sur des nodes différents.
     * Null ou vide = pas d'anti-affinité.
     */
    private String availabilitySet;
    @Builder.Default
    private Boolean useDataVolume = false;
}



