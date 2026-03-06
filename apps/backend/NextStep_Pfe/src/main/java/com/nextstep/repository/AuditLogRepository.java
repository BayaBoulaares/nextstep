package com.nextstep.repository;



import com.nextstep.entity.AuditLog;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

@Repository
public interface AuditLogRepository
        extends JpaRepository<AuditLog, UUID>,
        JpaSpecificationExecutor<AuditLog> {

    // ── Utilise ORDER BY dans la méthode → pas de risque lié au Sort externe ──

    Page<AuditLog> findByUserIdOrderByCreatedAtDesc(
            String userId, Pageable pageable);

    Page<AuditLog> findByUserEmailContainingIgnoreCaseOrderByCreatedAtDesc(
            String email, Pageable pageable);

    Page<AuditLog> findByActionOrderByCreatedAtDesc(
            String action, Pageable pageable);

    Page<AuditLog> findByModuleOrderByCreatedAtDesc(
            String module, Pageable pageable);

    Page<AuditLog> findByOutcomeOrderByCreatedAtDesc(
            String outcome, Pageable pageable);

    /**
     * Historique complet d'une ressource — pas de Pageable, pas de risque de sort invalide.
     */
    List<AuditLog> findByResourceTypeAndResourceIdOrderByCreatedAtDesc(
            String resourceType, String resourceId);

    /**
     * findAll avec Sort explicite (utilisé pour l'export CSV).
     * Signature héritée de JpaRepository : findAll(Sort sort).
     */
    List<AuditLog> findAll(
            org.springframework.data.jpa.domain.Specification<AuditLog> spec,
            Sort sort);

    // ─────────────────────────────────────────────────────────────────────────
    // Statistiques (JPQL — champs Java, pas colonnes SQL)
    // ─────────────────────────────────────────────────────────────────────────

    @Query("""
        SELECT a.action, COUNT(a)
        FROM AuditLog a
        WHERE a.createdAt BETWEEN :from AND :to
        GROUP BY a.action
        ORDER BY COUNT(a) DESC
    """)
    List<Object[]> countByActionBetween(
            @Param("from") LocalDateTime from,
            @Param("to")   LocalDateTime to);

    @Query("""
        SELECT a.module, COUNT(a)
        FROM AuditLog a
        WHERE a.createdAt BETWEEN :from AND :to
          AND a.module IS NOT NULL
        GROUP BY a.module
        ORDER BY COUNT(a) DESC
    """)
    List<Object[]> countByModuleBetween(
            @Param("from") LocalDateTime from,
            @Param("to")   LocalDateTime to);

    @Query("""
        SELECT a.outcome, COUNT(a)
        FROM AuditLog a
        WHERE a.createdAt BETWEEN :from AND :to
        GROUP BY a.outcome
    """)
    List<Object[]> countByOutcomeBetween(
            @Param("from") LocalDateTime from,
            @Param("to")   LocalDateTime to);

    @Query("""
        SELECT a.userEmail, a.userName, COUNT(a)
        FROM AuditLog a
        WHERE a.createdAt BETWEEN :from AND :to
          AND a.userEmail IS NOT NULL
        GROUP BY a.userEmail, a.userName
        ORDER BY COUNT(a) DESC
    """)
    List<Object[]> topActiveUsers(
            @Param("from") LocalDateTime from,
            @Param("to")   LocalDateTime to,
            Pageable pageable);

    long countByOutcomeAndCreatedAtBetween(
            String outcome,
            LocalDateTime from,
            LocalDateTime to);

    long countByCreatedAtBetween(LocalDateTime from, LocalDateTime to);
}