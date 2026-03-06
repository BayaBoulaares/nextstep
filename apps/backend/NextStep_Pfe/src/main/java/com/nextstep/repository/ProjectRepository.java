package com.nextstep.repository;

import com.nextstep.entity.Project;
import com.nextstep.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface ProjectRepository extends JpaRepository<Project, Long> {
    List<Project> findByOwnerId(UUID ownerId);
    Optional<Project> findByOwnerAndName(User owner, String name);

}
