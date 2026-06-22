package com.nextstep.dto;

import com.nextstep.entity.RegistryStatus;
import lombok.Data;

import java.time.LocalDateTime;

/**
 * DTO retourné au frontend.
 * registryType retiré (toujours INTERNAL) — pas besoin de l'exposer.
 * pushCommand / pullCommand : générées côté service pour affichage direct.
 */
@Data
public class ImageRegistryResponse {

    private Long   id;
    private String name;
    private String description;

    private RegistryStatus status;

    // Namespace OpenShift isolé du tenant
    private String openshiftNamespace;

    // URL interne : image-registry.openshift-image-registry.svc:5000/{namespace}
    private String registryUrl;

    // URL externe accessible depuis l'extérieur du cluster (route OpenShift)
    private String externalRegistryUrl;

    // Nom du ServiceAccount créé pour ce registry
    private String serviceAccountName;

    // Nom du Secret docker injecté dans le namespace
    private String pullSecretName;

    // Commandes prêtes à l'emploi pour le tenant
    private String loginCommand;
    private String pushCommand;
    private String pullCommand;

    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}