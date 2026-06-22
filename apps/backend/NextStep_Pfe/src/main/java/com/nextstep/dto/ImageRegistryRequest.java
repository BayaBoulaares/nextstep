package com.nextstep.dto;

import lombok.Data;

/**
 * Payload de création d'un Image Registry.
 * Le type est toujours INTERNAL (Internal Registry OpenShift).
 * Pas de champ registryType exposé : fixé côté service.
 */
@Data
public class ImageRegistryRequest {

    private String name;

    // Description optionnelle affichée dans le portail
    private String description;
}