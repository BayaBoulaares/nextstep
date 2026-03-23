package com.nextstep.dto;


import com.nextstep.entity.UsageMetricType;
import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Data
public class UsageRecordResponse {
    private Long id;
    private Long abonnementId;
    private Long deploymentId;
    private String resourceName;
    private UsageMetricType metricType;
    private String metricLabel;
    private BigDecimal quantity;
    private BigDecimal cost;
    private LocalDateTime periodStart;
    private LocalDateTime periodEnd;
    private LocalDateTime recordedAt;
}