package com.nextstep.repository;

import com.nextstep.entity.Abonnement;
import com.nextstep.entity.AbonnementStatus;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.time.LocalDateTime;

public interface AbonnementRepository extends JpaRepository<Abonnement, Long> {

    List<Abonnement> findByClientId(java.util.UUID clientId);

    List<Abonnement> findByStatus(AbonnementStatus status);

    boolean existsByClientIdAndPlanIdAndStatus(
            java.util.UUID clientId, Long planId, AbonnementStatus status);

    Optional<Abonnement> findByIdAndClientId(Long id, java.util.UUID clientId);
    boolean existsByDeploymentId(Long deploymentId);
}