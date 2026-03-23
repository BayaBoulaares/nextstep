package com.nextstep.dto;


import com.nextstep.entity.InvoiceStatus;
import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Data
public class InvoiceResponse {
    private Long id;
    private Long abonnementId;
    private String planName;
    private InvoiceStatus status;
    private LocalDateTime periodStart;
    private LocalDateTime periodEnd;
    private BigDecimal totalHt;
    private LocalDateTime issuedAt;
    private LocalDateTime paidAt;
    private LocalDateTime createdAt;
}