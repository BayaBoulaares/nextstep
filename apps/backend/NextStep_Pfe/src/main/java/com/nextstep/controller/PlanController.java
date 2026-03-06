package com.nextstep.controller;

import com.nextstep.dto.PlanDTO;
import com.nextstep.dto.PlanRequest;
import com.nextstep.service.PlanService;
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
@RequestMapping("/api/plans")
@RequiredArgsConstructor
@Tag(name = "Plans", description = "Gestion des offres/plans (Starter, Essential, Business...)")
@SecurityRequirement(name = "bearerAuth")
public class PlanController {

    private final PlanService planService;

    @GetMapping
    @Operation(summary = "Lister tous les plans")
    public List<PlanDTO> getAll() {
        return planService.getAll();
    }

    @GetMapping("/{id}")
    @Operation(summary = "Detail d'un plan")
    public PlanDTO getById(@PathVariable Long id) {
        return planService.getById(id);
    }

    @GetMapping("/service/{serviceId}")
    @Operation(summary = "Plans d'un service donne")
    public List<PlanDTO> getByService(@PathVariable Long serviceId) {
        return planService.getByService(serviceId);
    }

    @PostMapping
    @Operation(summary = "[ADMIN] Creer un plan")
    public ResponseEntity<PlanDTO> create(@Valid @RequestBody PlanRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(planService.create(request));
    }

    @PutMapping("/{id}")
    @Operation(summary = "[ADMIN] Modifier un plan")
    public PlanDTO update(@PathVariable Long id, @Valid @RequestBody PlanRequest request) {
        return planService.update(id, request);
    }

    @PatchMapping("/{id}/toggle")
    @Operation(summary = "[ADMIN] Activer ou desactiver un plan")
    public PlanDTO toggleActive(@PathVariable Long id) {
        return planService.toggleActive(id);
    }

    @DeleteMapping("/{id}")
    @Operation(summary = "[ADMIN] Supprimer un plan")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        planService.delete(id);
        return ResponseEntity.noContent().build();
    }
}