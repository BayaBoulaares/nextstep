package com.nextstep.repository;


import com.nextstep.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;
import java.util.UUID;

@Repository
public interface UserRepository extends JpaRepository<User, UUID> {

    Optional<User> findByEmail(String email);
    Optional<User> findByKeycloakId(String keycloakId);
    boolean existsByEmail(String email);
    // 🔴 NOUVELLE MÉTHODE
    Optional<User> findByProviderAndProviderId(String provider, String providerId);

}