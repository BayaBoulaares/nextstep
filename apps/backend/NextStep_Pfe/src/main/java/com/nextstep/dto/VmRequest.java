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
    private int ramGb;      // ex: 4
    private int diskGb;     // ex: 20
    private String osImage; // ex: "kubevirt/fedora-cloud-container-disk-demo:latest"
    private String vmPassword;
}



