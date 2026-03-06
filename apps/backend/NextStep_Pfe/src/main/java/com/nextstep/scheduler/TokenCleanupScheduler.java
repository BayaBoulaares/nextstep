package com.nextstep.scheduler;

import com.nextstep.repository.EmailVerificationTokenRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.scheduling.annotation.EnableScheduling;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;

// ✅ À implémenter
@Component
@EnableScheduling
public class TokenCleanupScheduler {
    @Autowired
    EmailVerificationTokenRepository tokenRepo;

    @Scheduled(cron = "0 0 3 * * *") // tous les jours à 3h
    @Transactional
    public void cleanExpiredTokens() {
        tokenRepo.deleteExpired(LocalDateTime.now());
    }
}