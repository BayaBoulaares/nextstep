package com.nextstep.repository;

import com.nextstep.entity.Plan;
import com.nextstep.entity.PlanTier;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;

@Repository
public interface PlanRepository extends JpaRepository<Plan, Long> {

    // Tous les plans d'un service
    List<Plan> findByServiceId(Long serviceId);

    // Plans actifs d'un service
    List<Plan> findByServiceIdAndIsActiveTrue(Long serviceId);

    // Verifier si tier existe deja pour ce service
    boolean existsByServiceIdAndTier(Long serviceId, PlanTier tier);
}