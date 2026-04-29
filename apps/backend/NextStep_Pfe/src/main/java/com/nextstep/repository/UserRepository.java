package com.nextstep.repository;


import com.nextstep.entity.User;
import org.springframework.data.domain.Page;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;
import java.util.UUID;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.Query;

@Repository
public interface UserRepository extends JpaRepository<User, UUID> {

    Optional<User> findByEmail(String email);
    Optional<User> findByKeycloakId(String keycloakId);
    boolean existsByEmail(String email);
    // 🔴 NOUVELLE MÉTHODE
    Optional<User> findByProviderAndProviderId(String provider, String providerId);
    @Query("SELECT u FROM User u WHERE TYPE(u) = Client")
    Page<User> findAllClients(Pageable pageable);
}