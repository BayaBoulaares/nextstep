package com.nextstep.service;


import com.nextstep.dto.DeploymentDTO;
import com.nextstep.dto.DeploymentRequest;
import com.nextstep.entity.*;
import com.nextstep.repository.*;
import jakarta.persistence.EntityNotFoundException;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Transactional
public class DeploymentService {

    private final DeploymentRepository deploymentRepository;
    private final PlanRepository       planRepository;
    private final ProjectRepository    projectRepository;
    private final RegionRepository     regionRepository;
    private final UserRepository       userRepository;

    // ── Lister les déploiements d'un utilisateur ──────────────────────────────
    @Transactional(readOnly = true)
    public List<DeploymentDTO> getByUser(UUID userId) {
        return deploymentRepository.findByUserId(userId)
                .stream().map(this::toDTO).toList();
    }

    // ── Détail d'un déploiement ───────────────────────────────────────────────
    @Transactional(readOnly = true)
    public DeploymentDTO getById(Long id) {
        return toDTO(findOrThrow(id));
    }

    // ── Créer un déploiement (tunnel étape 1-2) ───────────────────────────────
    /*public DeploymentDTO create(UUID userId, DeploymentRequest request) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new EntityNotFoundException("Utilisateur introuvable : " + userId));

        Plan plan = planRepository.findById(request.getPlanId())
                .orElseThrow(() -> new EntityNotFoundException("Plan introuvable : " + request.getPlanId()));

        Project project = projectRepository.findById(request.getProjectId())
                .orElseThrow(() -> new EntityNotFoundException("Projet introuvable : " + request.getProjectId()));

        Region region = regionRepository.findById(request.getRegionId())
                .orElseThrow(() -> new EntityNotFoundException("Région introuvable : " + request.getRegionId()));

        // Calcul du prix mensuel HT
        BigDecimal price = calculateMonthlyPrice(plan, request);

        Deployment deployment = Deployment.builder()
                .resourceName(request.getResourceName())
                .description(request.getDescription())
                .user(user)
                .project(project)
                .plan(plan)
                .region(region)
                .availabilityZone(request.getAvailabilityZone())
                .operatingSystem(request.getOperatingSystem())
                .additionalStorageGb(request.getAdditionalStorageGb())
                .tagsJson(request.getTagsJson())
                .backupEnabled(Boolean.TRUE.equals(request.getBackupEnabled()))
                .monitoringEnabled(Boolean.TRUE.equals(request.getMonitoringEnabled()))
                .antiDdosEnabled(Boolean.TRUE.equals(request.getAntiDdosEnabled()))
                .sshKeyManagement(Boolean.TRUE.equals(request.getSshKeyManagement()))
                .vpcId(request.getVpcId())
                .subnetId(request.getSubnetId())
                .securityGroup(request.getSecurityGroup())
                .monthlyPriceHt(price)
                .status(DeploymentStatus.EN_ATTENTE)
                .build();

        return toDTO(deploymentRepository.save(deployment));
    }

*/
    public DeploymentDTO create(UUID userId, DeploymentRequest request) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new EntityNotFoundException("Utilisateur introuvable : " + userId));

        Plan plan = planRepository.findById(request.getPlanId())
                .orElseThrow(() -> new EntityNotFoundException("Plan introuvable : " + request.getPlanId()));

        // ✅ Projet : utiliser celui fourni, ou créer "Défaut" automatiquement
        Project project;
        if (request.getProjectId() != null) {
            project = projectRepository.findById(request.getProjectId())
                    .orElseThrow(() -> new EntityNotFoundException("Projet introuvable : " + request.getProjectId()));
        } else {
            project = projectRepository
                    .findByOwnerAndName(user, "Défaut")
                    .orElseGet(() -> {
                        Project p = new Project();
                        p.setName("Défaut");
                        p.setOwner(user);
                        return projectRepository.save(p);
                    });
        }

        // ✅ Région : optionnelle pour l'instant
        Region region = null;
        if (request.getRegionId() != null) {
            region = regionRepository.findById(request.getRegionId())
                    .orElseThrow(() -> new EntityNotFoundException("Région introuvable : " + request.getRegionId()));
        }

        BigDecimal price = calculateMonthlyPrice(plan, request);

        Deployment deployment = Deployment.builder()
                .resourceName(request.getResourceName())
                .description(request.getDescription())
                .user(user)
                .project(project)
                .plan(plan)
                .region(region)
                .availabilityZone(request.getAvailabilityZone())
                .operatingSystem(request.getOperatingSystem())
                .additionalStorageGb(request.getAdditionalStorageGb())
                .tagsJson(request.getTagsJson())
                .backupEnabled(Boolean.TRUE.equals(request.getBackupEnabled()))
                .monitoringEnabled(Boolean.TRUE.equals(request.getMonitoringEnabled()))
                .antiDdosEnabled(Boolean.TRUE.equals(request.getAntiDdosEnabled()))
                .sshKeyManagement(Boolean.TRUE.equals(request.getSshKeyManagement()))
                .vpcId(request.getVpcId())
                .subnetId(request.getSubnetId())
                .securityGroup(request.getSecurityGroup())
                .monthlyPriceHt(price)
                .status(DeploymentStatus.EN_ATTENTE)
                .build();

        return toDTO(deploymentRepository.save(deployment));
    }
    // ── Passer au statut PROVISIONING (étape 3 maquette) ─────────────────────
    public DeploymentDTO startProvisioning(Long id) {
        Deployment d = findOrThrow(id);
        if (d.getStatus() != DeploymentStatus.EN_ATTENTE) {
            throw new IllegalStateException("Le déploiement n'est pas en état PENDING");
        }
        d.setStatus(DeploymentStatus.PROVISIONNEMENT);
        return toDTO(deploymentRepository.save(d));
    }

    // ── Marquer comme RUNNING (fin de provisionnement) ───────────────────────
    public DeploymentDTO markRunning(Long id) {
        Deployment d = findOrThrow(id);
        d.setStatus(DeploymentStatus.EN_LIGNE);
        d.setDeployedAt(LocalDateTime.now());
        return toDTO(deploymentRepository.save(d));
    }

    // ── Changer de statut (MAINTENANCE, STOPPED…) ────────────────────────────
    public DeploymentDTO changeStatus(Long id, DeploymentStatus newStatus) {
        Deployment d = findOrThrow(id);
        d.setStatus(newStatus);
        if (newStatus == DeploymentStatus.ARRETÉ) {
            d.setTerminatedAt(LocalDateTime.now());
        }
        return toDTO(deploymentRepository.save(d));
    }

    // ── Supprimer ─────────────────────────────────────────────────────────────
    public void delete(Long id) {
        deploymentRepository.delete(findOrThrow(id));
    }

    // ── Calcul du prix mensuel HT ─────────────────────────────────────────────
    private BigDecimal calculateMonthlyPrice(Plan plan, DeploymentRequest req) {
        BigDecimal total = plan.getPrice() != null ? plan.getPrice() : BigDecimal.ZERO;

        // Stockage additionnel : 19 €/mois par 500 Go (maquette récapitulatif)
        if (req.getAdditionalStorageGb() != null && req.getAdditionalStorageGb() > 0) {
            BigDecimal storageExtra = BigDecimal.valueOf(req.getAdditionalStorageGb())
                    .divide(BigDecimal.valueOf(500))
                    .multiply(BigDecimal.valueOf(19));
            total = total.add(storageExtra);
        }
        // Backup +19 €/mois
        if (Boolean.TRUE.equals(req.getBackupEnabled())) {
            total = total.add(BigDecimal.valueOf(19));
        }
        // Monitoring +9 €/mois
        if (Boolean.TRUE.equals(req.getMonitoringEnabled())) {
            total = total.add(BigDecimal.valueOf(9));
        }
        // Anti-DDoS +29 €/mois
        if (Boolean.TRUE.equals(req.getAntiDdosEnabled())) {
            total = total.add(BigDecimal.valueOf(29));
        }
        return total;
    }

    private Deployment findOrThrow(Long id) {
        return deploymentRepository.findById(id)
                .orElseThrow(() -> new EntityNotFoundException("Déploiement introuvable : " + id));
    }

    private DeploymentDTO toDTO(Deployment d) {
        DeploymentDTO dto = new DeploymentDTO();
        dto.setId(d.getId());
        dto.setResourceName(d.getResourceName());
        dto.setDescription(d.getDescription());
        dto.setStatus(d.getStatus());

        Plan plan = d.getPlan();
        if (plan != null) {
            dto.setPlanId(plan.getId());
            dto.setPlanName(plan.getName());
            CloudService svc = plan.getService();
            if (svc != null) {
                dto.setServiceId(svc.getId());
                dto.setServiceName(svc.getName());
                dto.setServiceIcon(svc.getIcon());
                dto.setCloudTypeName(formatCloudType(svc.getCloudType()));
            }
        }
        if (d.getRegion() != null) {
            dto.setRegionName(d.getRegion().getDisplayName());
            dto.setDatacenterLabel(d.getRegion().getAddress());
        }
        dto.setAvailabilityZone(d.getAvailabilityZone());
        dto.setOperatingSystem(d.getOperatingSystem());
        if (plan != null) {
            dto.setVcores(plan.getVcores());
            dto.setRamGb(plan.getRamGb());
            int baseStorage = plan.getStorageGb() != null ? plan.getStorageGb() : 0;
            int addStorage  = d.getAdditionalStorageGb() != null ? d.getAdditionalStorageGb() : 0;
            dto.setStorageGb(baseStorage + addStorage);
        }
        dto.setBackupEnabled(d.getBackupEnabled());
        dto.setMonitoringEnabled(d.getMonitoringEnabled());
        dto.setAntiDdosEnabled(d.getAntiDdosEnabled());
        dto.setVpcId(d.getVpcId());
        dto.setSubnetId(d.getSubnetId());
        dto.setMonthlyPriceHt(d.getMonthlyPriceHt());
        if (d.getProject() != null) {
            dto.setProjectId(d.getProject().getId());
            dto.setProjectName(d.getProject().getName());
        }
        dto.setCreatedAt(d.getCreatedAt());
        dto.setDeployedAt(d.getDeployedAt());
        return dto;
    }

    private String formatCloudType(CloudType type) {
        if (type == null) return null;
        return switch (type) {
            case PRIVÉ -> "Cloud Privé";
            case PUBLIC  -> "Cloud Public";
            case HYBRIDE -> "Cloud Hybride";
        };
    }
}