package com.nextstep.dto;

// VmDTO.java

import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class VmDTO {
    private String name;
    private String namespace;
    private String status;
    private String ip;
    private String node;
    private int    cpuCores;
    private String ramGb;    // ex: "2Gi"
    private String osImage;
    private String createdAt;
    private String availabilitySet;
    private String dataVolumePhase;  // "ImportInProgress" | "Succeeded" | null

}