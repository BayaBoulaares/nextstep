package com.nextstep.mapper;


import com.nextstep.dto.AuditLogDTO;
import com.nextstep.dto.AuditLogRequest;
import com.nextstep.entity.AuditLog;
import org.springframework.stereotype.Component;

@Component
public class AuditLogMapper {

    /** AuditLogRequest → AuditLog (entity à persister) */
    public AuditLog toEntity(AuditLogRequest req) {
        return AuditLog.builder()
                .userId(req.getUserId())
                .userEmail(req.getUserEmail())
                .userName(req.getUserName())
                .userRoles(req.getUserRoles())
                .action(req.getAction())
                .module(req.getModule())
                .description(req.getDescription())
                .resourceType(req.getResourceType())
                .resourceId(req.getResourceId())
                .resourceLabel(req.getResourceLabel())
                .httpMethod(req.getHttpMethod())
                .endpoint(req.getEndpoint())
                .httpStatus(req.getHttpStatus())
                .ipAddress(req.getIpAddress())
                .userAgent(req.getUserAgent())
                .realm(req.getRealm())
                .keycloakClientId(req.getKeycloakClientId())
                .durationMs(req.getDurationMs())
                .requestPayload(req.getRequestPayload())
                .beforeState(req.getBeforeState())
                .afterState(req.getAfterState())
                .outcome(req.getOutcome() != null ? req.getOutcome() : "SUCCESS")
                .errorMessage(req.getErrorMessage())
                .build();
    }

    /** AuditLog (entity) → AuditLogDTO (réponse API) */
    public AuditLogDTO toDTO(AuditLog e) {
        return AuditLogDTO.builder()
                .id(e.getId())
                .userId(e.getUserId())
                .userEmail(e.getUserEmail())
                .userName(e.getUserName())
                .userRoles(e.getUserRoles())
                .action(e.getAction())
                .module(e.getModule())
                .description(e.getDescription())
                .resourceType(e.getResourceType())
                .resourceId(e.getResourceId())
                .resourceLabel(e.getResourceLabel())
                .httpMethod(e.getHttpMethod())
                .endpoint(e.getEndpoint())
                .httpStatus(e.getHttpStatus())
                .ipAddress(e.getIpAddress())
                .userAgent(e.getUserAgent())
                .realm(e.getRealm())
                .keycloakClientId(e.getKeycloakClientId())
                .durationMs(e.getDurationMs())
                .requestPayload(e.getRequestPayload())
                .beforeState(e.getBeforeState())
                .afterState(e.getAfterState())
                .outcome(e.getOutcome())
                .errorMessage(e.getErrorMessage())
                .createdAt(e.getCreatedAt())
                .build();
    }
}