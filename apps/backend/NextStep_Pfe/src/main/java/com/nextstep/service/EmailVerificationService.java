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

import java.math.BigDecimal;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
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
    // Dans EmailVerificationService.java — ajouter cette méthode
    public void sendSuspensionEmail(String toEmail, String clientName,
                                    String reason, String adminName) {
        String subject = "⚠️ Votre compte NextStep IT a été suspendu";
        String body = """
        Bonjour %s,

        Votre compte sur la plateforme NextStep IT a été suspendu.

        ━━━━━━━━━━━━━━━━━━━━━━━━━━━
        Motif    : %s
        Par      : %s (Administrateur)
        Date     : %s
        ━━━━━━━━━━━━━━━━━━━━━━━━━━━

        Pour contester cette décision : support@nextstep.tn

        Cordialement,
        L'équipe NextStep IT
        """.formatted(
                clientName, reason, adminName,
                LocalDateTime.now().format(DateTimeFormatter.ofPattern("dd/MM/yyyy à HH:mm"))
        );
        sendEmail(toEmail, subject, body);  // ta méthode d'envoi existante
    }
    // Ajouter dans EmailVerificationService.java

    public void sendInvoiceEmail(String toEmail, String clientName,
                                 String planName, String serviceName,
                                 String period, BigDecimal totalHt,
                                 Long invoiceId) {
        try {
            MimeMessage message = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(message, true, "UTF-8");
            helper.setFrom(fromEmail);
            helper.setTo(toEmail);
            helper.setSubject("Votre facture NextStep IT — " + period);
            helper.setText(buildInvoiceHtml(clientName, planName, serviceName,
                    period, totalHt, invoiceId), true);
            mailSender.send(message);
            System.out.println("✅ Email facture envoyé à : " + toEmail);
        } catch (MessagingException e) {
            // Non bloquant — la facture est créée même si l'email échoue
            System.err.println("❌ Email facture échoué : " + e.getMessage());
        }
    }

    public void sendOverdueReminderEmail(String toEmail, String clientName,
                                         String period, BigDecimal totalHt) {
        try {
            MimeMessage message = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(message, true, "UTF-8");
            helper.setFrom(fromEmail);
            helper.setTo(toEmail);
            helper.setSubject("⚠️ Facture en retard — NextStep IT");
            helper.setText(buildOverdueHtml(clientName, period, totalHt), true);
            mailSender.send(message);
        } catch (MessagingException e) {
            System.err.println("❌ Email relance échoué : " + e.getMessage());
        }
    }

    private String buildInvoiceHtml(String clientName, String planName,
                                    String serviceName, String period,
                                    BigDecimal totalHt, Long invoiceId) {
        String dashboardUrl = frontendUrl + "/dashboard/billing";
        return """
        <!DOCTYPE html>
        <html>
        <body style="font-family: sans-serif; max-width: 520px;
                     margin: 40px auto; color: #111; padding: 0 16px;">
          <div style="background: #0a7fcf; color: white; padding: 20px 24px;
                      border-radius: 10px 10px 0 0;">
            <h2 style="margin: 0; font-size: 18px;">NextStep IT</h2>
            <p style="margin: 4px 0 0; opacity: .8; font-size: 13px;">
              Facture mensuelle
            </p>
          </div>
          <div style="border: 1px solid #e5e7eb; border-top: none;
                      border-radius: 0 0 10px 10px; padding: 24px;">
            <p style="color: #444; line-height: 1.6;">
              Bonjour <strong>%s</strong>,<br>
              Votre facture pour <strong>%s</strong> est disponible.
            </p>
            <table style="width: 100%%; border-collapse: collapse; margin: 20px 0;">
              <tr style="background: #f9fafb;">
                <td style="padding: 10px 14px; font-size: 13px; color: #666;">Service</td>
                <td style="padding: 10px 14px; font-size: 13px; font-weight: 600;">%s</td>
              </tr>
              <tr>
                <td style="padding: 10px 14px; font-size: 13px; color: #666;">Plan</td>
                <td style="padding: 10px 14px; font-size: 13px; font-weight: 600;">%s</td>
              </tr>
              <tr style="background: #f9fafb;">
                <td style="padding: 10px 14px; font-size: 13px; color: #666;">Période</td>
                <td style="padding: 10px 14px; font-size: 13px;">%s</td>
              </tr>
              <tr style="border-top: 2px solid #e5e7eb;">
                <td style="padding: 12px 14px; font-size: 15px; font-weight: 700;">Total HT</td>
                <td style="padding: 12px 14px; font-size: 15px; font-weight: 700;
                            color: #0a7fcf;">%s TND</td>
              </tr>
            </table>
            <a href="%s" style="display: inline-block; padding: 12px 28px;
               background: #0a7fcf; color: #fff; border-radius: 8px;
               text-decoration: none; font-weight: 600; font-size: 14px;">
              Voir ma facture →
            </a>
            <p style="color: #888; font-size: 12px; margin-top: 24px;">
              Cette facture est disponible dans votre espace client.<br>
              Pour toute question : support@nextstep.tn
            </p>
          </div>
        </body>
        </html>
        """.formatted(clientName, period, serviceName, planName,
                period, totalHt.toPlainString(), dashboardUrl);
    }

    private String buildOverdueHtml(String clientName, String period,
                                    BigDecimal totalHt) {
        String dashboardUrl = frontendUrl + "/dashboard/billing";
        return """
        <!DOCTYPE html>
        <html>
        <body style="font-family: sans-serif; max-width: 520px;
                     margin: 40px auto; color: #111; padding: 0 16px;">
          <div style="background: #dc2626; color: white; padding: 20px 24px;
                      border-radius: 10px 10px 0 0;">
            <h2 style="margin: 0; font-size: 18px;">Facture en retard</h2>
            <p style="margin: 4px 0 0; opacity: .8; font-size: 13px;">NextStep IT</p>
          </div>
          <div style="border: 1px solid #fecaca; border-top: none;
                      border-radius: 0 0 10px 10px; padding: 24px;">
            <p>Bonjour <strong>%s</strong>,</p>
            <p style="color: #444; line-height: 1.6;">
              Votre facture de <strong>%s TND</strong> pour la période
              <strong>%s</strong> est en retard de paiement.
            </p>
            <p style="color: #444;">
              Veuillez régulariser votre situation pour maintenir
              l'accès à vos services.
            </p>
            <a href="%s" style="display: inline-block; padding: 12px 28px;
               background: #dc2626; color: #fff; border-radius: 8px;
               text-decoration: none; font-weight: 600; font-size: 14px;">
              Consulter ma facture →
            </a>
            <p style="color: #888; font-size: 12px; margin-top: 24px;">
              Contact : support@nextstep.tn
            </p>
          </div>
        </body>
        </html>
        """.formatted(clientName, totalHt.toPlainString(), period, dashboardUrl);
    }
}