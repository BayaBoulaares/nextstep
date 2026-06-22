package com.nextstep.dto;

import com.nextstep.entity.DatabaseResource;
import com.nextstep.entity.DatabaseStatus;
import lombok.Data;
import java.time.LocalDateTime;

@Data
public class DatabaseResourceResponse {

    private Long id;
    private Long deploymentId;
    private String clusterName;
    private String namespace;
    private Integer instances;
    private Integer storageGb;
    private String storageClassName;
    private String hostRw;
    private String hostRo;
    private Integer port;
    private String dbName;
    private String dbUser;
    private DatabaseStatus status;
    private LocalDateTime readyAt;
    private String errorMessage;
    private Integer externalPort; // ← champ clé

    public static DatabaseResourceResponse from(DatabaseResource r) {
        DatabaseResourceResponse dto = new DatabaseResourceResponse();
        dto.setId(r.getId());
        dto.setDeploymentId(r.getDeployment().getId());
        dto.setClusterName(r.getClusterName());
        dto.setNamespace(r.getNamespace());
        dto.setInstances(r.getInstances());
        dto.setStorageGb(r.getStorageGb());
        dto.setStorageClassName(r.getStorageClassName());
        dto.setHostRw(r.getHostRw());
        dto.setHostRo(r.getHostRo());
        dto.setPort(r.getPort());
        dto.setDbName(r.getDbName());
        dto.setDbUser(r.getDbUser());
        dto.setStatus(r.getStatus());
        dto.setReadyAt(r.getReadyAt());
        dto.setErrorMessage(r.getErrorMessage());
        dto.setExternalPort(r.getExternalPort()); // ← mappé ici
        return dto;
    }
}