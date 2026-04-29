package com.nextstep.repository;

import com.nextstep.entity.Deployment;
import com.nextstep.entity.DeploymentStatus;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface DeploymentRepository extends JpaRepository<Deployment, Long> {
    List<Deployment> findByUserId(UUID userId);
    List<Deployment> findByProjectId(Long projectId);
    List<Deployment> findByUserIdAndStatus(UUID userId, DeploymentStatus status);
    long countByUserIdAndStatus(UUID userId, DeploymentStatus status);
    // ✅ Charge le deployment avec le user en une seule requête JOIN FETCH
    @Query("SELECT d FROM Deployment d JOIN FETCH d.user JOIN FETCH d.plan WHERE d.id = :id")
    Optional<Deployment> findByIdWithUser(@Param("id") Long id);
}