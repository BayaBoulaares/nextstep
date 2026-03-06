package com.nextstep.service;

import com.nextstep.dto.CloudServiceDTO;
import com.nextstep.dto.CloudServiceRequest;
import com.nextstep.dto.PlanDTO;
import com.nextstep.entity.*;
import com.nextstep.repository.CloudServiceRepository;
import jakarta.persistence.EntityNotFoundException;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
@Transactional
public class CloudServiceService {

    private final CloudServiceRepository repository;

    // ── Lister tous les services ──────────────────────────
    @Transactional(readOnly = true)
    public List<CloudServiceDTO> getAll() {
        return repository.findAll()
                .stream()
                .map(this::toDTO)
                .toList();
    }

    // ── Obtenir un service par ID ──────────────────────────
    @Transactional(readOnly = true)
    public CloudServiceDTO getById(Long id) {
        return toDTO(findOrThrow(id));
    }

    // ── Filtrer par categorie ──────────────────────────────
    @Transactional(readOnly = true)
    public List<CloudServiceDTO> getByCategory(ServiceCategory category) {
        return repository.findByCategory(category)
                .stream().map(this::toDTO).toList();
    }

    // ── Creer un service ───────────────────────────────────
    public CloudServiceDTO create(CloudServiceRequest request) {
        if (repository.existsByNameIgnoreCase(request.getName())) {
            throw new IllegalArgumentException(
                "Un service avec ce nom existe deja : " + request.getName()
            );
        }
        CloudService service = new CloudService();
        service.setName(request.getName());
        service.setDescription(request.getDescription());
        service.setCategory(request.getCategory());
        service.setStatus(request.getStatus() != null ? request.getStatus() : ServiceStatus.ACTIF);
        // NOUVEAU
        service.setCloudType(request.getCloudType());
        service.setIcon(request.getIcon());

        return toDTO(repository.save(service));
    }

    // ── Modifier un service ────────────────────────────────
    public CloudServiceDTO update(Long id, CloudServiceRequest request) {
        CloudService service = findOrThrow(id);
        service.setName(request.getName());
        service.setDescription(request.getDescription());
        service.setCategory(request.getCategory());
        if (request.getStatus() != null) {
            service.setStatus(request.getStatus());
        }
        // NOUVEAU
        if (request.getCloudType() != null) service.setCloudType(request.getCloudType());
        service.setIcon(request.getIcon());

        return toDTO(repository.save(service));
    }

    // ── Supprimer un service ───────────────────────────────
    public void delete(Long id) {
        repository.delete(findOrThrow(id));
    }

    // ── Methode privee : chercher ou lancer erreur 404 ─────
    private CloudService findOrThrow(Long id) {
        return repository.findById(id)
                .orElseThrow(() -> new EntityNotFoundException(
                    "Service introuvable avec l'id : " + id
                ));
    }

    // ── Convertir entite en DTO ────────────────────────────
    private CloudServiceDTO toDTO(CloudService s) {
        CloudServiceDTO dto = new CloudServiceDTO();
        dto.setId(s.getId());
        dto.setName(s.getName());
        dto.setDescription(s.getDescription());
        dto.setCategory(s.getCategory());
        dto.setStatus(s.getStatus());
        // NOUVEAU
        dto.setCloudType(s.getCloudType());
        dto.setIcon(s.getIcon());
        if (s.getPlans() != null) {
            dto.setPlans(s.getPlans().stream().map(this::planToDTO).toList());
        }
        return dto;
    }

    private PlanDTO planToDTO(Plan p) {
        PlanDTO dto = new PlanDTO();
        dto.setId(p.getId());
        dto.setName(p.getName());
        dto.setDescription(p.getDescription());
        dto.setTier(p.getTier());
        dto.setPrice(p.getPrice());
        dto.setBillingCycle(p.getBillingCycle());
        dto.setVcores(p.getVcores());
        dto.setRamGb(p.getRamGb());
        dto.setStorageGb(p.getStorageGb());
        dto.setIsActive(p.getIsActive());
        // NOUVEAU
        dto.setBadge(p.getBadge());
        dto.setIsPopular(p.getIsPopular());
        dto.setServiceId(p.getService().getId());
        dto.setServiceName(p.getService().getName());
        return dto;
    }
    // ── Filtrer par type de cloud ─────────────────────────────
    @Transactional(readOnly = true)
    public List<CloudServiceDTO> getByCloudType(CloudType cloudType) {
        return repository.findByCloudType(cloudType)
                .stream()
                .map(this::toDTO)
                .toList();
    }
}