package com.nextstep.repository;


import com.nextstep.entity.UsageRecord;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

@Repository
public interface UsageRecordRepository extends JpaRepository<UsageRecord, Long> {

    List<UsageRecord> findByAbonnementIdAndPeriodStartBetween(
            Long abonnementId, LocalDateTime debut, LocalDateTime fin);

    @Query("""
        SELECT COALESCE(SUM(u.cost), 0)
        FROM UsageRecord u
        WHERE u.abonnement.id = :abonnementId
          AND u.periodStart >= :debut
          AND u.periodEnd   <= :fin
    """)
    BigDecimal sumCostByAbonnementAndPeriod(
            @Param("abonnementId") Long abonnementId,
            @Param("debut")        LocalDateTime debut,
            @Param("fin")          LocalDateTime fin);
}