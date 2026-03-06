package com.nextstep.controller;

import com.nextstep.dto.CloudServiceDTO;
import com.nextstep.dto.CloudServiceRequest;
import com.nextstep.entity.CloudType;
import com.nextstep.entity.ServiceCategory;
import com.nextstep.service.CloudServiceService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/services")
@RequiredArgsConstructor
@Tag(name = "Services Cloud", description = "Gestion des services Cloud (VPS, Hosting, DB...)")
@SecurityRequirement(name = "bearerAuth")
public class CloudServiceController {

    private final CloudServiceService service;

    @GetMapping
    @Operation(summary = "Lister tous les services")
    public List<CloudServiceDTO> getAll() {
        return service.getAll();
    }

    @GetMapping("/{id}")
    @Operation(summary = "Obtenir un service avec ses plans")
    public CloudServiceDTO getById(@PathVariable Long id) {
        return service.getById(id);
    }

    @GetMapping("/category/{category}")
    @Operation(summary = "Filtrer par categorie (COMPUTE, HOSTING, DATABASE...)")
    public List<CloudServiceDTO> getByCategory(@PathVariable ServiceCategory category) {
        return service.getByCategory(category);
    }

    @PostMapping
    @Operation(summary = "[ADMIN] Creer un service")
    public ResponseEntity<CloudServiceDTO> create(@Valid @RequestBody CloudServiceRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(service.create(request));
    }

    @PutMapping("/{id}")
    @Operation(summary = "[ADMIN] Modifier un service")
    public CloudServiceDTO update(@PathVariable Long id,
                                  @Valid @RequestBody CloudServiceRequest request) {
        return service.update(id, request);
    }

    @DeleteMapping("/{id}")
    @Operation(summary = "[ADMIN] Supprimer un service")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        service.delete(id);
        return ResponseEntity.noContent().build();
    }
    /**
     * NOUVEAU — Filtrer par type de cloud.
     * Utilisé par les pages marketplace : GET /api/services/cloud/PRIVATE
     * Correspond aux 3 pages vue2_cloud_prive, vue4_cloud_public, et page hybride.
     */
    @GetMapping("/cloud/{cloudType}")
    @Operation(summary = "Filtrer par type de cloud (PRIVATE, PUBLIC, HYBRID)")
    public List<CloudServiceDTO> getByCloudType(@PathVariable CloudType cloudType) {
        return service.getByCloudType(cloudType);
    }
}