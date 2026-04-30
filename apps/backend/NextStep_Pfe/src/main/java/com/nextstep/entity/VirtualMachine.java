package com.nextstep.entity;

import jakarta.persistence.*;
import lombok.Data;

import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "virtual_machines")
@Data
public class VirtualMachine {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    private String name;
    private String namespace;
    private String keycloakUserId;
    private String username;

    private int cpuCores;
    private int ramGb;
    private int diskGb;
    private String osImage;
    @Column(name = "vm_password")
    private String vmPassword;

    @Enumerated(EnumType.STRING)
    private VmStatus status; // PENDING, RUNNING, STOPPED, ERROR

    private LocalDateTime createdAt;

    @PrePersist
    public void prePersist() {
        this.createdAt = LocalDateTime.now();
        this.status = VmStatus.PENDING;
    }
}