package com.nextstep.repository;

import com.nextstep.entity.CloudService;
import com.nextstep.entity.CloudType;
import com.nextstep.entity.ServiceCategory;
import com.nextstep.entity.ServiceStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;
import java.util.Optional;

@Repository
public interface CloudServiceRepository extends JpaRepository<CloudService, Long> {

    // Chercher par categorie
    List<CloudService> findByCategory(ServiceCategory category);

    // Chercher par statut
    List<CloudService> findByStatus(ServiceStatus status);

    // Verifier si le nom existe deja
    boolean existsByNameIgnoreCase(String name);

    // Trouver par nom
    Optional<CloudService> findByNameIgnoreCase(String name);
    List<CloudService> findByCloudType(CloudType cloudType);

}