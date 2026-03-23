package com.nextstep.dto;


import com.nextstep.entity.UsageMetricType;
import lombok.Data;

import java.math.BigDecimal;

@Data
public class PlanPricingDTO {
    private Long id;
    private UsageMetricType metricType;
    private String metricLabel;
    private BigDecimal pricePerUnit;
    private String unit;
    private BigDecimal freeQuota;
}