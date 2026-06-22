package com.nextstep.repository;

import com.nextstep.entity.ImageRegistry;
import com.nextstep.entity.RegistryStatus;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface ImageRegistryRepository extends JpaRepository<ImageRegistry, Long> {

    List<ImageRegistry> findByOwnerKeycloakId(String ownerKeycloakId);

    boolean existsByNameAndOwnerKeycloakId(String name, String ownerKeycloakId);

    List<ImageRegistry> findByOpenshiftNamespaceAndStatus(
            String openshiftNamespace, RegistryStatus status);
}