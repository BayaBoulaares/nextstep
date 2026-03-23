package com.nextstep.repository;


import com.nextstep.entity.Abonnement;
import com.nextstep.entity.AbonnementStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface AbonnementRepository extends JpaRepository<Abonnement, Long> {

    /** Tous les abonnements d'un client (tous statuts). */
    List<Abonnement> findByClientId(UUID clientId);

    /** Abonnements d'un client filtrés par statut. */
    List<Abonnement> findByClientIdAndStatus(UUID clientId, AbonnementStatus status);

    /** Abonnements ACTIFS liés à un plan PAYG — utilisé par le scheduler. */
    List<Abonnement> findByStatusAndPlan_IsPayAsYouGoTrue(AbonnementStatus status);

    /** Vérifier l'unicité : un seul abonnement ACTIF par (client, plan). */
    boolean existsByClientIdAndPlanIdAndStatus(UUID clientId, Long planId, AbonnementStatus status);

    /** Trouver l'abonnement lié à un déploiement. */
    Optional<Abonnement> findByDeploymentId(Long deploymentId);
}