package com.nextstep.dto;


import com.fasterxml.jackson.annotation.JsonFormat;
import com.fasterxml.jackson.annotation.JsonInclude;
import lombok.*;

import java.time.LocalDateTime;
import java.util.UUID;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@JsonInclude(JsonInclude.Include.NON_NULL)
public class AuditLogDTO {

    private UUID   id;

    // Qui
    private String userId;
    private String userEmail;
    private String userName;
    private String userRoles;

    // Quoi
    private String action;
    private String module;
    private String description;

    // Sur quoi
    private String resourceType;
    private String resourceId;
    private String resourceLabel;

    // Technique
    private String  httpMethod;
    private String  endpoint;
    private Integer httpStatus;
    private String  ipAddress;
    private String  userAgent;
    private String  realm;
    private String  keycloakClientId;
    private Long    durationMs;

    // Données
    private String requestPayload;
    private String beforeState;
    private String afterState;

    // Résultat
    private String outcome;
    private String errorMessage;

    @JsonFormat(pattern = "MM/dd/yyyy hh:mm:ss a")
    private LocalDateTime createdAt;
}