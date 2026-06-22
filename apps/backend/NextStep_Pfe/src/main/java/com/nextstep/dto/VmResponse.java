package com.nextstep.dto;

import lombok.Builder;
import lombok.Data;

import java.time.LocalDateTime;
import java.util.UUID;

// VmResponse.java
@Data
@Builder
public class VmResponse {
    private UUID id;
    private String name;
    private String namespace;
    private String status;
    private String ip;            // IP privée si disponible
    private int cpuCores;
    private int ramGb;
    private LocalDateTime createdAt;
}