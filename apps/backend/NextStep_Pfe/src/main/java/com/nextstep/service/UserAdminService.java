package com.nextstep.service;

import com.nextstep.dto.UserAdminDTO;
import com.nextstep.entity.Admin;
import com.nextstep.entity.User;
import com.nextstep.exceptions.ResourceNotFoundException;
import com.nextstep.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;

@Service
@RequiredArgsConstructor
@Slf4j
public class UserAdminService {

    private final UserRepository           userRepository;
    private final KeycloakAdminService     keycloakAdminService;
    private final EmailVerificationService emailService;

    // ── Helper : nom complet ───────────────────────────────────
    private String fullName(User user) {
        return user.getFirstName() + " " + user.getLastName();
    }

    // ── Liste paginée des clients ──────────────────────────────
    public Page<UserAdminDTO> getAllClients(int page, int size) {
        Pageable pageable = PageRequest.of(page, size, Sort.by("firstName"));

        return userRepository.findAllClients(pageable)
                .map(user -> {
                    boolean online = keycloakAdminService.isUserOnline(user.getKeycloakId());
                    return toDTO(user, online);
                });
    }

    // ── Suspendre ──────────────────────────────────────────────
    @Transactional
    public void suspendUser(String targetKeycloakId,
                            String reason,
                            String adminKeycloakId) {

        User target = userRepository.findByKeycloakId(targetKeycloakId)
                .orElseThrow(() -> new ResourceNotFoundException("Utilisateur introuvable"));

        User admin = userRepository.findByKeycloakId(adminKeycloakId)
                .orElseThrow(() -> new ResourceNotFoundException("Admin introuvable"));

        // 1. Keycloak : désactiver + invalider sessions
        keycloakAdminService.disableUser(targetKeycloakId);

        // 2. Base de données
        target.setEnabled(Boolean.FALSE);
        target.setSuspensionReason(reason);
        target.setSuspendedBy(fullName(admin));   // ← corrigé
        target.setSuspendedAt(LocalDateTime.now());
        userRepository.save(target);

        // 3. Mail de notification
        emailService.sendSuspensionEmail(
                target.getEmail(),
                fullName(target),                 // ← corrigé
                reason,
                fullName(admin)                   // ← corrigé
        );

        log.info("Compte {} suspendu par {} — motif : {}",
                fullName(target), fullName(admin), reason);
    }

    // ── Réactiver ──────────────────────────────────────────────
    @Transactional
    public void reactivateUser(String targetKeycloakId) {
        User target = userRepository.findByKeycloakId(targetKeycloakId)
                .orElseThrow(() -> new ResourceNotFoundException("Utilisateur introuvable"));

        // 1. Keycloak
        keycloakAdminService.enableUser(targetKeycloakId);

        // 2. Base
        target.setEnabled(Boolean.TRUE);
        target.setSuspensionReason(null);
        target.setSuspendedBy(null);
        target.setSuspendedAt(null);
        userRepository.save(target);

        log.info("Compte {} réactivé", fullName(target));   // ← corrigé
    }

    // ── Mapper ─────────────────────────────────────────────────
    private UserAdminDTO toDTO(User user, boolean isOnline) {
        String role    = (user instanceof Admin) ? "ADMIN" : "CLIENT";
        boolean enabled = Boolean.TRUE.equals(user.getEnabled());

        return new UserAdminDTO(
                user.getKeycloakId(),
                fullName(user),                   // ← corrigé
                user.getEmail(),
                role,
                enabled,
                isOnline,
                user.getSuspensionReason(),
                user.getSuspendedBy(),
                user.getSuspendedAt()
        );
    }
}