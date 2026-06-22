package com.nextstep.factory;

import com.nextstep.dto.DeploymentRequest;
import com.nextstep.dto.NginxDeploymentResult;
import com.nextstep.entity.*;
import com.nextstep.service.DeploymentService;
import com.nextstep.service.NginxProvisioningService;
import com.nextstep.service.VmFabric8Service;
import com.nextstep.service.VmProvisioningService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

/**
 * Dispatch la création du déploiement technique
 * selon la catégorie du service souscrit.
 *
 * Fusion de :
 *  - entity/DeploymentFactory  (ancienne — VM + DeploymentService)
 *  - factory/DeploymentFactory (nouvelle — stockage ODF)
 *
 * ✅ Un seul bean Spring → plus de ConflictingBeanDefinitionException
 * ✅ Supprimer com/nextstep/entity/DeploymentFactory.java après remplacement
 */
@Component
@RequiredArgsConstructor
@Slf4j
public class DeploymentFactory {

    // ── Services existants (ancienne factory) ─────────────────────────────
    private final DeploymentService      deploymentService;
    private final VmProvisioningService  vmProvisioningService;
    private final NginxProvisioningService nginxProvisioningService;

    // ── Services nouveaux (stockage ODF) ─────────────────────────────────
    private final VmFabric8Service         vmFabric8Service;


    // ─────────────────────────────────────────────────────────────────────
    // MÉTHODE PRINCIPALE — appelée par AbonnementService.souscrire()
    // ─────────────────────────────────────────────────────────────────────

    public Deployment creerDepuisAbonnement(Abonnement abonnement) {

        Plan            plan     = abonnement.getPlan();
        CloudService    service  = plan.getService();
        ServiceCategory category = service.getCategory();
        Client          client   = abonnement.getClient();

        log.info("DeploymentFactory — category={} abonnementId={}", category, abonnement.getId());

        // 1. Créer le Deployment en base (statut EN_ATTENTE)
        DeploymentRequest req = buildBaseRequest(abonnement);
        var dto = deploymentService.create(client.getId(), req);
        Deployment deployment = deploymentService.findEntityById(dto.getId());

        // 2. Dispatch selon catégorie
        switch (category) {

            // ── VM OpenShift Virtualization ──────────────────────────────
            case CALCUL -> {
                VirtualMachine vm = vmProvisioningService.provisionner(deployment, plan, client);
                deployment.setVirtualMachine(vm);
            }
            case HEBERGEMENT -> {
                String username = client.getEmail(); // ou getEmail() selon ton entité
                NginxDeploymentResult result = nginxProvisioningService.provisionNginx(username, plan);
                deployment.setStatus(DeploymentStatus.ACTIF);
                deployment.setDeployedAt(java.time.LocalDateTime.now());
                // optionnel : stocker l'URL publique
                //deploymentRepository.save(deployment);
            }
            case IA -> {
                // aiProvisioningService.provisionner(...)   — sprint suivant
            }

            // ── Stockage ODF ─────────────────────────────────────────────

            // ── Services managés sans provisioning automatique ───────────
            case BASE_DONNEES, STOCKAGE, RESEAU, EMAIL, SECURITE, IAM ->
                    log.info("Catégorie managée {} — pas de provisioning automatique", category);

            default ->
                    log.warn("ServiceCategory non géré dans DeploymentFactory : {}", category);
        }

        return deployment;
    }

    // ─────────────────────────────────────────────────────────────────────
    // MÉTHODE DISPATCH SIMPLE — appelée depuis StorageService (async)
    // Utilisée quand l'Abonnement et la StockageConfig sont déjà créés
    // ─────────────────────────────────────────────────────────────────────

    /*public void dispatch(Abonnement abonnement, String namespace) {
        ServiceCategory category = resolveCategory(abonnement);

        log.info("DeploymentFactory.dispatch — category={} namespace={}", category, namespace);

        switch (category) {
            case CALCUL, HEBERGEMENT, IA -> {
                String vmName = resolveVmName(abonnement);
                vmFabric8Service.startVm(vmName, namespace);
            }

            case STOCKAGE, BASE_DONNEES, RESEAU, EMAIL, SECURITE, IAM ->
                    log.info("Catégorie managée {} — rien à dispatcher", category);

            default -> throw new IllegalArgumentException(
                    "ServiceCategory non géré : " + category);
        }
    }*/

    // ─────────────────────────────────────────────────────────────────────
    // HELPERS
    // ─────────────────────────────────────────────────────────────────────

    private DeploymentRequest buildBaseRequest(Abonnement abonnement) {
        Plan   plan   = abonnement.getPlan();
        Client client = abonnement.getClient();

        DeploymentRequest req = new DeploymentRequest();
        req.setPlanId(plan.getId());
        req.setResourceName(
                plan.getService().getName().toLowerCase().replace(" ", "-")
                        + "-" + client.getId().toString().substring(0, 8));
        req.setDescription("Déployé via abonnement #" + abonnement.getId());
        return req;
    }



    private String resolveVmName(Abonnement abonnement) {
        if (abonnement.getDeployment() != null
                && abonnement.getDeployment().getResourceName() != null) {
            return abonnement.getDeployment().getResourceName();
        }
        return "vm-" + abonnement.getId();
    }


}