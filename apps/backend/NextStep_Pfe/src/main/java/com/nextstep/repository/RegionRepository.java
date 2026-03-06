package com.nextstep.repository;

import com.nextstep.entity.Region;
import com.nextstep.entity.ServiceStatus;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface RegionRepository extends JpaRepository<Region, Long> {
    Optional<Region> findByCode(String code);
    List<Region> findByStatus(ServiceStatus status);
}
