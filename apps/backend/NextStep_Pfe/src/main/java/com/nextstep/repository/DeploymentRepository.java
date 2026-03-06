package com.nextstep.repository;

import com.nextstep.entity.Deployment;
import com.nextstep.entity.DeploymentStatus;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface DeploymentRepository extends JpaRepository<Deployment, Long> {
    List<Deployment> findByUserId(UUID userId);
    List<Deployment> findByProjectId(Long projectId);
    List<Deployment> findByUserIdAndStatus(UUID userId, DeploymentStatus status);
    long countByUserIdAndStatus(UUID userId, DeploymentStatus status);
}