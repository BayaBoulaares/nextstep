package com.nextstep.service;


import com.nextstep.dto.AbonnementRequest;
import com.nextstep.dto.AbonnementResponse;
import com.nextstep.entity.*;
import com.nextstep.exceptions.ConflictException;
import com.nextstep.factory.DeploymentFactory;
import com.nextstep.repository.*;
import jakarta.persistence.EntityNotFoundException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.hibernate.Hibernate;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Transactional
@Slf4j
public class AbonnementService {

    private final AbonnementRepository  abonnementRepository;
    private final PlanRepository        planRepository;
    private final UserRepository        userRepository;
    private final DeploymentRepository  deploymentRepository;
    @Autowired  // ajouter dans le constructeur @RequiredArgsConstructor
    private final DeploymentFactory deploymentFactory;
    private final NginxProvisioningService nginxProvisioningService;

    public AbonnementResponse souscrire(UUID clientId, AbonnementRequest req) {

        User user = userRepository.findById(clientId)
                .orElseThrow(() -> new EntityNotFoundException("Utilisateur introuvable : " + clientId));
        if (!(user instanceof Client client)) {
            throw new IllegalArgumentException("L'utilisateur n'est pas un client");
        }

        Plan plan = planRepository.findById(req.getPlanId())
                .orElseThrow(() -> new EntityNotFoundException("Plan introuvable : " + req.getPlanId()));

        if (req.getDeploymentId() != null &&
                abonnementRepository.existsByDeploymentId(req.getDeploymentId())) {
            throw new ConflictException("Un abonnement existe déjà pour ce déploiement");
        }

        BigDecimal snapshot = plan.getPrice() != null ? plan.getPrice() : BigDecimal.ZERO;
        BillingCycle cycle  = plan.getBillingCycle() != null ? plan.getBillingCycle() : BillingCycle.MENSUEL;

        Abonnement abo = new Abonnement();
        abo.setClient(client);
        abo.setPlan(plan);
        abo.setPrixSnapshot(snapshot);
        abo.setBillingCycle(cycle);
        abo.setDateDebut(LocalDateTime.now());
        abo.setDateFin(calculerDateFin(cycle));
        abo.setStatus(AbonnementStatus.ACTIF);
        abo.setAutoRenouvellement(Boolean.TRUE.equals(req.getAutoRenouvellement()));

        if (req.getDeploymentId() != null) {
            Deployment dep = deploymentRepository.findById(req.getDeploymentId())
                    .orElseThrow(() -> new EntityNotFoundException(
                            "Déploiement introuvable : " + req.getDeploymentId()));
            abo.setDeployment(dep);
        }

        // ✅ FIX 2 : sauvegarder d'abord, puis déclencher le provisioning
        AbonnementResponse response = toResponse(abonnementRepository.save(abo));

        // ✅ FIX 3 : provisioning nginx APRÈS le return, plus de code mort
        if (plan.getService() != null &&
                "nginx".equalsIgnoreCase(plan.getService().getName())) {
            try {
                log.info("[NGINX] Déclenchement provisioning pour client={} plan={}",
                        client.getEmail(), plan.getTier());
                nginxProvisioningService.provisionNginx(client.getEmail(), plan);
            } catch (Exception e) {
                // On ne fail pas la souscription si le provisioning échoue
                // Le client peut relancer depuis son tableau de bord
                log.error("[NGINX] Échec provisioning pour client={} : {}",
                        client.getEmail(), e.getMessage());
            }
        }

        return response;
    }

    @Transactional(readOnly = true)
    public List<AbonnementResponse> listerParClient(UUID clientId) {
        return abonnementRepository.findByClientId(clientId)
                .stream().map(this::toResponse).toList();
    }

    @Transactional(readOnly = true)
    public AbonnementResponse getById(Long id) {
        return toResponse(findOrThrow(id));
    }

    public AbonnementResponse resilier(Long abonnementId, UUID clientId) {
        Abonnement abo = findOrThrow(abonnementId);

        if (!abo.getClient().getId().equals(clientId)) {
            throw new org.springframework.security.access.AccessDeniedException(
                    "Action non autorisée sur cet abonnement");
        }
        if (abo.getStatus() != AbonnementStatus.ACTIF) {
            throw new IllegalStateException(
                    "Seul un abonnement ACTIF peut être résilié. Statut actuel : " + abo.getStatus());
        }

        abo.setStatus(AbonnementStatus.RESILIE);
        abo.setDateResiliation(LocalDateTime.now());
        return toResponse(abonnementRepository.save(abo));
    }

    public AbonnementResponse lierDeployment(Long abonnementId, Long deploymentId) {
        Abonnement abo = findOrThrow(abonnementId);
        Deployment dep = deploymentRepository.findById(deploymentId)
                .orElseThrow(() -> new EntityNotFoundException(
                        "Déploiement introuvable : " + deploymentId));
        abo.setDeployment(dep);
        return toResponse(abonnementRepository.save(abo));
    }

    private LocalDateTime calculerDateFin(BillingCycle cycle) {
        if (cycle == null) return LocalDateTime.now().plusMonths(1);
        return switch (cycle) {
            case HORAIRE -> LocalDateTime.now().plusHours(1);
            case MENSUEL -> LocalDateTime.now().plusMonths(1);
            case ANNUEL  -> LocalDateTime.now().plusYears(1);
        };
    }

    private Abonnement findOrThrow(Long id) {
        return abonnementRepository.findById(id)
                .orElseThrow(() -> new EntityNotFoundException("Abonnement introuvable : " + id));
    }

    private AbonnementResponse toResponse(Abonnement a) {
        AbonnementResponse r = new AbonnementResponse();
        r.setId(a.getId());
        r.setStatus(a.getStatus());
        r.setPrixSnapshot(a.getPrixSnapshot());
        r.setBillingCycle(a.getBillingCycle());
        r.setDateDebut(a.getDateDebut());
        r.setDateFin(a.getDateFin());
        r.setDateResiliation(a.getDateResiliation());
        r.setAutoRenouvellement(a.getAutoRenouvellement());
        r.setCreatedAt(a.getCreatedAt());

        Plan p = a.getPlan();
        if (p != null) {
            r.setPlanId(p.getId());
            r.setPlanName(p.getName());
            if (p.getService() != null) r.setServiceName(p.getService().getName());
        }
        if (a.getDeployment() != null) {
            r.setDeploymentId(a.getDeployment().getId());
            r.setResourceName(a.getDeployment().getResourceName());
        }
        return r;
    }
}