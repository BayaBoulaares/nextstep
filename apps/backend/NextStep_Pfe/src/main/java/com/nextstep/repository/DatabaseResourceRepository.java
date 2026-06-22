package com.nextstep.repository;

import com.nextstep.entity.DatabaseResource;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface DatabaseResourceRepository extends JpaRepository<DatabaseResource, Long> {

    Optional<DatabaseResource> findByDeploymentId(Long deploymentId);

    Optional<DatabaseResource> findByClusterName(String clusterName);
}