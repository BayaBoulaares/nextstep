package com.nextstep.dto;

import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class VmMetricsDTO {
    private double cpuPercent;    // 0–100
    private double memPercent;    // 0–100
    private long   memUsedMiB;
    private long   memTotalMiB;
    private double diskPercent;
    private String diskUsed;      // ex: "2.3 GB"
    private long   netBps;        // octets/s

    public static VmMetricsDTO empty() {
        return VmMetricsDTO.builder()
                .cpuPercent(0).memPercent(0)
                .memUsedMiB(0).memTotalMiB(1024)
                .diskPercent(0).diskUsed("N/A")
                .netBps(0)
                .build();
    }
}