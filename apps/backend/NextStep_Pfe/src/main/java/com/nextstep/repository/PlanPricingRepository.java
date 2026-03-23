package com.nextstep.repository;

import com.nextstep.entity.PlanPricing;
import com.nextstep.entity.UsageMetricType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface PlanPricingRepository extends JpaRepository<PlanPricing, Long> {

    List<PlanPricing> findByPlanId(Long planId);

    Optional<PlanPricing> findByPlanIdAndMetricType(Long planId, UsageMetricType metricType);
}