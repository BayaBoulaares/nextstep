package com.nextstep.service;



import com.nextstep.entity.EmailVerificationToken;
import com.nextstep.exceptions.InvalidTokenException;
import com.nextstep.repository.EmailVerificationTokenRepository;
import jakarta.mail.MessagingException;
import jakarta.mail.internet.MimeMessage;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.time.LocalDateTime;
import java.util.HexFormat;
import java.util.UUID;

@Service
public class EmailVerificationService {

    private final EmailVerificationTokenRepository tokenRepo;
    private final JavaMailSender mailSender;

    @Value("${app.frontend.url}")
    private String frontendUrl;

    @Value("${spring.mail.username:noreply@example.com}")
    private String fromEmail;

    public EmailVerificationService(EmailVerificationTokenRepository tokenRepo,
                                    JavaMailSender mailSender) {
        this.tokenRepo  = tokenRepo;
        this.mailSender = mailSender;
    }

    // ── Générer et envoyer le lien ─────────────────────────────────────────

    public void sendVerificationLink(String email, String userName) {
        // 1. UUID brut → envoyé dans l'email, JAMAIS stocké
        //String rawToken = UUID.randomUUID().toString();
        byte[] bytes = new byte[32];
        new java.security.SecureRandom().nextBytes(bytes);
        String rawToken = HexFormat.of().formatHex(bytes);  // 256 bits, URL-safe
        // 2. Hash SHA-256 → stocké en DB
        String tokenHash = hashToken(rawToken);

        // 3. DELETE dans sa propre transaction (commit immédiat)
        //    puis INSERT dans une nouvelle transaction
        deleteExistingToken(email);
        saveNewToken(email, tokenHash);

        // 4. Construire le lien avec le token BRUT
        String link = frontendUrl + "/verify-email?token="
                + URLEncoder.encode(rawToken, StandardCharsets.UTF_8)
                + "&email="
                + URLEncoder.encode(email, StandardCharsets.UTF_8);

        // 5. Envoyer l'email (hors transaction)
        sendEmail(email, userName, link);
    }

    @Transactional(propagation = org.springframework.transaction.annotation.Propagation.REQUIRES_NEW)
    public void deleteExistingToken(String email) {
        tokenRepo.deleteByEmail(email);
    }

    @Transactional(propagation = org.springframework.transaction.annotation.Propagation.REQUIRES_NEW)
    public void saveNewToken(String email, String tokenHash) {
        EmailVerificationToken token = new EmailVerificationToken();
        token.setEmail(email);
        token.setTokenHash(tokenHash);
        tokenRepo.save(token);
    }

    // ── Vérifier le token depuis le lien ──────────────────────────────────

    @Transactional
    public void verifyToken(String rawToken, String email) {
        String tokenHash = hashToken(rawToken);

        EmailVerificationToken token = tokenRepo
                .findByEmailAndTokenHash(email, tokenHash)
                .orElseThrow(() -> new InvalidTokenException("Lien invalide ou déjà utilisé"));

        if (token.isUsed()) {
            throw new InvalidTokenException("Ce lien a déjà été utilisé");
        }

        if (token.getExpiresAt().isBefore(LocalDateTime.now())) {
            tokenRepo.delete(token);
            throw new InvalidTokenException("Lien expiré — demandez un nouveau lien");
        }

        // Invalider après usage unique
        //token.setUsed(true);
        tokenRepo.delete(token);  // nettoyage immédiat
        //tokenRepo.save(token);
    }

    // ── Hash SHA-256 ───────────────────────────────────────────────────────

    private String hashToken(String rawToken) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            byte[] hash = digest.digest(rawToken.getBytes(StandardCharsets.UTF_8));
            return HexFormat.of().formatHex(hash);
        } catch (NoSuchAlgorithmException e) {
            throw new RuntimeException("SHA-256 non disponible", e);
        }
    }

    // ── Envoi email HTML ───────────────────────────────────────────────────

    private void sendEmail(String to, String userName, String link) {
        try {
            MimeMessage message = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(message, true, "UTF-8");

            helper.setFrom(fromEmail);
            helper.setTo(to);
            helper.setSubject("Vérifiez votre adresse email");
            helper.setText(buildHtml(userName, link), true);

            System.out.println("📧 Tentative envoi email à : " + to);
            System.out.println("📧 From : " + fromEmail);
            mailSender.send(message);
            System.out.println("✅ Email envoyé avec succès à : " + to);

        } catch (MessagingException e) {
            System.err.println("❌ MessagingException : " + e.getMessage());
            e.printStackTrace();
            throw new RuntimeException("Erreur envoi email : " + e.getMessage(), e);
        } catch (Exception e) {
            System.err.println("❌ Exception inattendue : " + e.getClass().getName() + " : " + e.getMessage());
            e.printStackTrace();
            throw new RuntimeException("Erreur envoi email : " + e.getMessage(), e);
        }
    }

    private String buildHtml(String userName, String link) {
        return """
            <!DOCTYPE html>
            <html>
            <body style="font-family: sans-serif; max-width: 480px;
                         margin: 40px auto; color: #111; padding: 0 16px;">
              <h2 style="font-size: 20px; margin-bottom: 8px;">
                Bonjour %s,
              </h2>
              <p style="color: #444; line-height: 1.6;">
                Merci pour votre inscription. Cliquez sur le bouton
                ci-dessous pour activer votre compte :
              </p>
              <a href="%s"
                 style="display: inline-block; margin: 24px 0; padding: 12px 28px;
                        background: #111; color: #fff; border-radius: 8px;
                        text-decoration: none; font-weight: 600; font-size: 15px;">
                Vérifier mon email
              </a>
              <p style="color: #888; font-size: 13px; line-height: 1.5;">
                Ce lien expire dans <strong>24 heures</strong>.<br>
                Si vous n'avez pas créé de compte, ignorez cet email.
              </p>
              <hr style="border: none; border-top: 1px solid #eee; margin: 24px 0;">
              <p style="color: #bbb; font-size: 11px; word-break: break-all;">
                Lien alternatif : <a href="%s" style="color: #bbb;">%s</a>
              </p>
            </body>
            </html>
            """.formatted(userName, link, link, link);
    }
    // ── Envoyer le lien de reset password ─────────────────────────────────────
    public void sendResetPasswordLink(String email, String userName) {
        String rawToken   = generateSecureToken();
        String tokenHash  = hashToken(rawToken);

        // Supprimer l'ancien token RESET_PASSWORD s'il existe
        deleteExistingTokenByType(email, "RESET_PASSWORD");
        saveNewTokenWithType(email, tokenHash, "RESET_PASSWORD");

        String link = frontendUrl + "/reset-password?token="
                + URLEncoder.encode(rawToken, StandardCharsets.UTF_8)
                + "&email="
                + URLEncoder.encode(email, StandardCharsets.UTF_8);

        sendResetEmail(email, userName, link);
    }

    // ── verifyToken avec type ─────────────────────────────────────────────────
    @Transactional
    public void verifyToken(String rawToken, String email, String type) {
        String tokenHash = hashToken(rawToken);

        EmailVerificationToken token = tokenRepo
                .findByEmailAndTokenHashAndType(email, tokenHash, type)
                .orElseThrow(() -> new InvalidTokenException("Lien invalide ou déjà utilisé"));

        if (token.getExpiresAt().isBefore(LocalDateTime.now())) {
            tokenRepo.delete(token);
            throw new InvalidTokenException("Lien expiré — demandez un nouveau lien");
        }

        // ✅ Supprimer après usage unique
        tokenRepo.delete(token);
    }

    // ── Helpers ───────────────────────────────────────────────────────────────
    private String generateSecureToken() {
        byte[] bytes = new byte[32];
        new java.security.SecureRandom().nextBytes(bytes);
        return HexFormat.of().formatHex(bytes);
    }

    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void deleteExistingTokenByType(String email, String type) {
        tokenRepo.deleteByEmailAndType(email, type);
    }

    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void saveNewTokenWithType(String email, String tokenHash, String type) {
        EmailVerificationToken token = new EmailVerificationToken();
        token.setEmail(email);
        token.setTokenHash(tokenHash);
        token.setType(type);
        tokenRepo.save(token);
    }

    private void sendResetEmail(String to, String userName, String link) {
        try {
            MimeMessage message = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(message, true, "UTF-8");
            helper.setFrom(fromEmail);
            helper.setTo(to);
            helper.setSubject("Réinitialisation de votre mot de passe");
            helper.setText(buildResetHtml(userName, link), true);
            mailSender.send(message);
        } catch (MessagingException e) {
            throw new RuntimeException("Erreur envoi email reset : " + e.getMessage(), e);
        }
    }

    private String buildResetHtml(String userName, String link) {
        return """
        <!DOCTYPE html>
        <html>
        <body style="font-family: sans-serif; max-width: 480px;
                     margin: 40px auto; color: #111; padding: 0 16px;">
          <h2>Bonjour %s,</h2>
          <p style="color: #444; line-height: 1.6;">
            Vous avez demandé la réinitialisation de votre mot de passe.
          </p>
          <a href="%s"
             style="display: inline-block; margin: 24px 0; padding: 12px 28px;
                    background: #111; color: #fff; border-radius: 8px;
                    text-decoration: none; font-weight: 600; font-size: 15px;">
            Réinitialiser mon mot de passe
          </a>
          <p style="color: #888; font-size: 13px;">
            Ce lien expire dans <strong>1 heure</strong>.<br>
            Si vous n'avez pas fait cette demande, ignorez cet email.
          </p>
        </body>
        </html>
        """.formatted(userName, link);
    }
}