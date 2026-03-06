package com.nextstep.service;

import com.nextstep.dto.PlanDTO;
import com.nextstep.dto.PlanRequest;
import com.nextstep.entity.BillingCycle;
import com.nextstep.entity.CloudService;
import com.nextstep.entity.Plan;
import com.nextstep.repository.CloudServiceRepository;
import com.nextstep.repository.PlanRepository;
import jakarta.persistence.EntityNotFoundException;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
@Transactional
public class PlanService {

    private final PlanRepository planRepository;
    private final CloudServiceRepository serviceRepository;

    // ── Lister tous les plans ──────────────────────────────
    @Transactional(readOnly = true)
    public List<PlanDTO> getAll() {
        return planRepository.findAll().stream().map(this::toDTO).toList();
    }

    // ── Plans d'un service ─────────────────────────────────
    @Transactional(readOnly = true)
    public List<PlanDTO> getByService(Long serviceId) {
        return planRepository.findByServiceId(serviceId)
                .stream().map(this::toDTO).toList();
    }

    // ── Detail d'un plan ───────────────────────────────────
    @Transactional(readOnly = true)
    public PlanDTO getById(Long id) {
        return toDTO(findOrThrow(id));
    }

    // ── Creer un plan ──────────────────────────────────────
    public PlanDTO create(PlanRequest request) {
        CloudService service = serviceRepository.findById(request.getServiceId())
                .orElseThrow(() -> new EntityNotFoundException(
                    "Service introuvable avec l'id : " + request.getServiceId()
                ));

        if (planRepository.existsByServiceIdAndTier(request.getServiceId(), request.getTier())) {
            throw new IllegalArgumentException(
                "Ce service a deja un plan de type : " + request.getTier()
            );
        }

        Plan plan = new Plan();
        plan.setName(request.getName());
        plan.setDescription(request.getDescription());
        plan.setTier(request.getTier());
        plan.setPrice(request.getPrice());
        plan.setBillingCycle(request.getBillingCycle() != null ? request.getBillingCycle() : BillingCycle.MENSUEL);
        plan.setVcores(request.getVcores());
        plan.setRamGb(request.getRamGb());
        plan.setStorageGb(request.getStorageGb());
        // NOUVEAU
        plan.setBadge(request.getBadge());
        plan.setIsPopular(Boolean.TRUE.equals(request.getIsPopular()));

        plan.setService(service);

        return toDTO(planRepository.save(plan));
    }

    // ── Modifier un plan ───────────────────────────────────
    public PlanDTO update(Long id, PlanRequest request) {
        Plan plan = findOrThrow(id);
        plan.setName(request.getName());
        plan.setDescription(request.getDescription());
        plan.setTier(request.getTier());
        plan.setPrice(request.getPrice());
        if (request.getBillingCycle() != null) plan.setBillingCycle(request.getBillingCycle());
        plan.setVcores(request.getVcores());
        plan.setRamGb(request.getRamGb());
        plan.setStorageGb(request.getStorageGb());
        plan.setBadge(request.getBadge());
        if (request.getIsPopular() != null) plan.setIsPopular(request.getIsPopular());
        return toDTO(planRepository.save(plan));
    }

    // ── Activer / Desactiver ───────────────────────────────
    public PlanDTO toggleActive(Long id) {
        Plan plan = findOrThrow(id);
        plan.setIsActive(!plan.getIsActive());
        return toDTO(planRepository.save(plan));
    }

    // ── Supprimer un plan ──────────────────────────────────
    public void delete(Long id) {
        planRepository.delete(findOrThrow(id));
    }

    private Plan findOrThrow(Long id) {
        return planRepository.findById(id)
                .orElseThrow(() -> new EntityNotFoundException(
                    "Plan introuvable avec l'id : " + id
                ));
    }

    private PlanDTO toDTO(Plan p) {
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
        dto.setBadge(p.getBadge());
        dto.setIsPopular(p.getIsPopular());
        dto.setServiceId(p.getService().getId());
        dto.setServiceName(p.getService().getName());
        return dto;
    }
}