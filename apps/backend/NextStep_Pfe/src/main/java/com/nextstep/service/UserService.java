package com.nextstep.service;

import com.nextstep.dto.RegisterRequest;
import com.nextstep.dto.UpdateProfileRequest;
import com.nextstep.entity.Admin;
import com.nextstep.entity.Client;
import com.nextstep.entity.User;
import com.nextstep.repository.UserRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class UserService {

    private final UserRepository userRepository;
    private final KeycloakAdminService keycloakAdminService;

    public UserService(UserRepository userRepository,
                       KeycloakAdminService keycloakAdminService) {
        this.userRepository       = userRepository;
        this.keycloakAdminService = keycloakAdminService;
    }

    // ── Création client (inscription email/password) ──────────────────────────

    public Client createClient(RegisterRequest request, String keycloakId) {
        if (userRepository.existsByEmail(request.getEmail())) {
            throw new RuntimeException("Cet email est déjà utilisé");
        }

        Client client = new Client();
        client.setEmail(request.getEmail());
        client.setFirstName(request.getFirstName());
        client.setLastName(request.getLastName());
        client.setKeycloakId(keycloakId);
        client.setTelephone(request.getTelephone());
        client.setAdresse(request.getAdresse());
        client.setProvider("credentials");
        client.setEmailVerified(false);   // vérifié via le lien email
        client.setEnabled(false);         // activé après vérification email

        return userRepository.save(client);
    }

    // ── findOrProvision ───────────────────────────────────────────────────────
    // Appelé par UserController.getMe() à chaque requête authentifiée.
    // Gère 3 cas :
    //   1. User connu → retourne directement
    //   2. Email connu mais keycloakId manquant (ex: migration) → lie le compte
    //   3. Inconnu (ex: Google SSO première connexion) → crée en DB

    @Transactional
    public User findOrProvision(String keycloakId, String email,
                                String firstName,  String lastName,
                                boolean isAdmin) {   // ← nouveau paramètre

        return userRepository.findByKeycloakId(keycloakId)
                .orElseGet(() ->
                        userRepository.findByEmail(email)
                                .map(existing -> {
                                    existing.setKeycloakId(keycloakId);
                                    if (existing.getProvider() == null)
                                        existing.setProvider("credentials");
                                    return userRepository.save(existing);
                                })
                                .orElseGet(() -> {
                                    // ✅ AJOUT — log pour vérifier
                                    System.out.println("[UserService] Création user → isAdmin=" + isAdmin
                                            + " email=" + email);

                                    // ✅ Créer Admin ou Client selon le rôle Keycloak
                                    User newUser;
                                    if (isAdmin) {
                                        Admin admin = new Admin();
                                        newUser = admin;
                                    } else {
                                        Client client = new Client();
                                        newUser = client;
                                    }

                                    newUser.setKeycloakId(keycloakId);
                                    newUser.setEmail(email        != null ? email     : "");
                                    newUser.setFirstName(firstName != null ? firstName : "");
                                    newUser.setLastName(lastName   != null ? lastName  : "");
                                    newUser.setProvider("keycloak");
                                    newUser.setProviderId(keycloakId);
                                    newUser.setEmailVerified(true);
                                    newUser.setEnabled(true);

                                    return userRepository.save(newUser);
                                })
                );
    }

    // ── Mise à jour du profil ─────────────────────────────────────────────────

    @Transactional
    public User updateProfile(String keycloakId, UpdateProfileRequest req) {
        User user = findByKeycloakId(keycloakId);

        boolean keycloakNeedsUpdate = false;

        if (req.getFirstName() != null && !req.getFirstName().isBlank()) {
            user.setFirstName(req.getFirstName());
            keycloakNeedsUpdate = true;
        }
        if (req.getLastName() != null && !req.getLastName().isBlank()) {
            user.setLastName(req.getLastName());
            keycloakNeedsUpdate = true;
        }
        if (req.getAvatarUrl() != null) {
            user.setAvatarUrl(req.getAvatarUrl().isBlank() ? null : req.getAvatarUrl());
        }
        if (user instanceof Client client) {
            if (req.getTelephone() != null) {
                client.setTelephone(req.getTelephone().isBlank() ? null : req.getTelephone());
            }
            if (req.getAdresse() != null) {
                client.setAdresse(req.getAdresse().isBlank() ? null : req.getAdresse());
            }
        }

        if (keycloakNeedsUpdate) {
            keycloakAdminService.updateUserNames(
                    keycloakId,
                    user.getFirstName(),
                    user.getLastName()
            );
        }

        return userRepository.save(user);
    }

    // ── Lecture ───────────────────────────────────────────────────────────────

    public User findByKeycloakId(String keycloakId) {
        return userRepository.findByKeycloakId(keycloakId)
                .orElseThrow(() -> new RuntimeException("Utilisateur non trouvé"));
    }
    @Transactional
    public void deleteByKeycloakId(String keycloakId) {
        User user = userRepository.findByKeycloakId(keycloakId)
                .orElseThrow(() -> new RuntimeException("Utilisateur introuvable"));
        userRepository.delete(user);
    }

}