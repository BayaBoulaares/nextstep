package com.nextstep.service;


import com.nextstep.entity.EmailVerificationToken;
import com.nextstep.repository.EmailVerificationTokenRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

@Service
public class TokenService {

    private final EmailVerificationTokenRepository tokenRepo;

    public TokenService(EmailVerificationTokenRepository tokenRepo) {
        this.tokenRepo = tokenRepo;
    }

    // ── DELETE dans sa propre transaction — commit immédiat ───────────────
    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void deleteAndSave(String email, String type, String tokenHash) {
        tokenRepo.deleteByEmailAndType(email, type);
        tokenRepo.flush();

        EmailVerificationToken token = new EmailVerificationToken();
        token.setEmail(email);
        token.setTokenHash(tokenHash);
        token.setType(type);
        tokenRepo.save(token);
        tokenRepo.flush();
    }

    // ── Même chose pour EMAIL_VERIFICATION ────────────────────────────────
    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void deleteAndSaveVerification(String email, String tokenHash) {
        tokenRepo.deleteByEmail(email);
        tokenRepo.flush();

        EmailVerificationToken token = new EmailVerificationToken();
        token.setEmail(email);
        token.setTokenHash(tokenHash);
        token.setType("EMAIL_VERIFICATION");
        tokenRepo.save(token);
        tokenRepo.flush();
    }
}