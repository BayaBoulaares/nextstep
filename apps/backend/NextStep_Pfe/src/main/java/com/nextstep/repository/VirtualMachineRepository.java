package com.nextstep.repository;


import com.nextstep.entity.VirtualMachine;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface VirtualMachineRepository
        extends JpaRepository<VirtualMachine, UUID> {

    // Toutes les VMs d'un client
    List<VirtualMachine> findByUsername(String username);

    // Supprimer une VM par nom et username
    void deleteByNameAndUsername(String name, String username);

    // Toutes les VMs d'un namespace
    List<VirtualMachine> findByNamespace(String namespace);
    Optional<VirtualMachine> findByNameAndUsername(String name, String username);
    Optional<VirtualMachine> findByNameAndKeycloakUserId(String name, String keycloakUserId); // ✅
}