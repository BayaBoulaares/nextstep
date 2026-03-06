package com.nextstep.controller;


import com.nextstep.dto.ForgotPasswordRequest;
import com.nextstep.dto.RegisterRequest;
import com.nextstep.dto.ResetPasswordRequest;
import com.nextstep.exceptions.InvalidTokenException;
import com.nextstep.repository.UserRepository;
import com.nextstep.service.EmailVerificationService;
import com.nextstep.service.KeycloakAdminService;
import com.nextstep.service.UserService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

    private final KeycloakAdminService keycloakAdminService;
    private final UserService userService;
    private final EmailVerificationService emailVerificationService;
    private final UserRepository userRepository;   // ← final + dans constructeur

    public AuthController(KeycloakAdminService keycloakAdminService,
                          UserService userService,
                          EmailVerificationService emailVerificationService,
                          UserRepository userRepository) {        // ← injecté ici
        this.keycloakAdminService     = keycloakAdminService;
        this.userService              = userService;
        this.emailVerificationService = emailVerificationService;
        this.userRepository           = userRepository;
    }

    // ── Inscription ────────────────────────────────────────────────────────

    @PostMapping("/register")
    public ResponseEntity<?> register(@Valid @RequestBody RegisterRequest request) {
        try {
            // 1. Vérifier si email déjà utilisé en DB
            if (userRepository.existsByEmail(request.getEmail())) {
                return ResponseEntity.status(HttpStatus.CONFLICT)
                        .body(Map.of("message", "Cet email est déjà utilisé"));
            }

            // 2. Créer dans Keycloak (enabled=false, emailVerified=false)
            String keycloakId = keycloakAdminService.createUser(request);

            // 3. Envoyer le lien — si échec, rollback Keycloak
            try {
                emailVerificationService.sendVerificationLink(
                        request.getEmail(),
                        request.getFirstName()
                );
            } catch (Exception emailEx) {
                // Rollback Keycloak — supprimer le user créé
                keycloakAdminService.deleteUser(request.getEmail());
                System.err.println("❌ Erreur email : " + emailEx.getMessage());
                emailEx.printStackTrace();
                return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                        .body(Map.of("message", "Impossible d'envoyer l'email. Réessayez."));
            }

            // 4. Email OK → sauvegarder en DB
            userService.createClient(request, keycloakId);

            return ResponseEntity.status(HttpStatus.CREATED).body(Map.of(
                    "message", "Compte créé. Vérifiez votre email.",
                    "email",   request.getEmail()
            ));

        } catch (RuntimeException e) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body(Map.of("message", e.getMessage()));
        }
    }

    // ── Vérification via lien email ────────────────────────────────────────

    @GetMapping("/verify-email")
    public ResponseEntity<?> verifyEmail(
            @RequestParam String token,
            @RequestParam String email
    ) {
        try {
            emailVerificationService.verifyToken(token, email);
            keycloakAdminService.setEmailVerified(email, true);
            return ResponseEntity.ok(Map.of("message", "Email vérifié avec succès"));

        } catch (InvalidTokenException e) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body(Map.of("message", e.getMessage()));
        } catch (RuntimeException e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("message", "Erreur serveur : " + e.getMessage()));
        }
    }

    // ── Renvoi du lien ─────────────────────────────────────────────────────

    @PostMapping("/resend-verification")
    public ResponseEntity<?> resendVerification(@RequestBody Map<String, String> body) {
        String email     = body.get("email");
        String firstName = body.getOrDefault("firstName", "");

        if (email == null || email.isBlank()) {
            return ResponseEntity.badRequest().body(Map.of("message", "Email requis"));
        }

        try {
            if (keycloakAdminService.isEmailVerified(email)) {
                return ResponseEntity.badRequest()
                        .body(Map.of("message", "Cet email est déjà vérifié"));
            }
            emailVerificationService.sendVerificationLink(email, firstName);
            return ResponseEntity.ok(Map.of("message", "Nouveau lien envoyé"));

        } catch (RuntimeException e) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body(Map.of("message", e.getMessage()));
        }

    }
    // ── Mot de passe oublié ────────────────────────────────────────────────────
    @PostMapping("/forgot-password")
    public ResponseEntity<?> forgotPassword(@RequestBody ForgotPasswordRequest request) {
        String email = request.getEmail();
        if (email == null || email.isBlank())
            return ResponseEntity.badRequest().body(Map.of("message", "Email requis"));

        try {
            if (userRepository.existsByEmail(email)) {
                String firstName = userRepository.findByEmail(email)
                        .map(u -> u.getFirstName()).orElse("");

                System.out.println("✅ Email trouvé en DB : " + email);
                System.out.println("👤 Prénom : " + firstName);

                emailVerificationService.sendResetPasswordLink(email, firstName);

                System.out.println("✅ sendResetPasswordLink() terminé");
            } else {
                // ✅ TEMPORAIRE — voir si l'email est trouvé
                System.out.println("❌ Email NON trouvé en DB : " + email);
            }
            return ResponseEntity.ok(Map.of("message", "Si un compte existe..."));

        } catch (RuntimeException e) {
            // ✅ TEMPORAIRE — voir l'erreur exacte
            System.err.println("❌ Erreur forgot-password : " + e.getMessage());
            e.printStackTrace();
            return ResponseEntity.ok(Map.of("message", "Si un compte existe..."));
        }
    }

    // ── Reset password ─────────────────────────────────────────────────────────
    @PostMapping("/reset-password")
    public ResponseEntity<?> resetPassword(@Valid @RequestBody ResetPasswordRequest request) {
        try {
            emailVerificationService.verifyToken(
                    request.getToken(), request.getEmail(), "RESET_PASSWORD");
            keycloakAdminService.resetPassword(request.getEmail(), request.getPassword());
            return ResponseEntity.ok(Map.of("message", "Mot de passe modifié avec succès"));
        } catch (InvalidTokenException e) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body(Map.of("message", e.getMessage()));
        } catch (RuntimeException e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("message", "Erreur serveur : " + e.getMessage()));
        }
    }
}