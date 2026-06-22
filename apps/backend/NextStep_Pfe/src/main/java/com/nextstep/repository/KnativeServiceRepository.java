package com.nextstep.repository;

import com.nextstep.entity.KnativeService;
import com.nextstep.entity.KnativeStatus;
import com.nextstep.entity.KnativeType;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface KnativeServiceRepository extends JpaRepository<KnativeService, Long> {

    List<KnativeService> findByOwnerKeycloakId(String ownerKeycloakId);

    List<KnativeService> findByOwnerKeycloakIdAndKnativeType(
            String ownerKeycloakId, KnativeType type);

    boolean existsByNameAndOwnerKeycloakId(String name, String ownerKeycloakId);

    List<KnativeService> findByStatus(KnativeStatus status);
}