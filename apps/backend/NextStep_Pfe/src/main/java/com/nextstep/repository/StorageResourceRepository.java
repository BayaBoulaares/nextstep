package com.nextstep.repository;

import com.nextstep.entity.StorageResource;
import com.nextstep.entity.StorageResourceStatus;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface StorageResourceRepository extends JpaRepository<StorageResource, Long> {
    Optional<StorageResource> findByDeploymentId(Long deploymentId);
    Optional<StorageResource> findByDeploymentIdAndStatus(Long deploymentId, StorageResourceStatus status);
    void deleteByDeploymentId(Long deploymentId);
}