package com.nextstep.repository;




import com.nextstep.entity.EmailVerificationToken;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.Optional;

public interface EmailVerificationTokenRepository
        extends JpaRepository<EmailVerificationToken, String> {

    Optional<EmailVerificationToken> findByEmail(String email);

    @Modifying
    @Transactional
    void deleteByEmail(String email);

    Optional<EmailVerificationToken> findByEmailAndTokenHash(String email, String tokenHash);

    @Modifying
    @Transactional                          // ← manquait ici !
    void deleteByEmailAndType(String email, String type);

    Optional<EmailVerificationToken> findByEmailAndTokenHashAndType(
            String email, String tokenHash, String type);
    @Modifying
    @Query("DELETE FROM EmailVerificationToken t WHERE t.expiresAt < :now")
    void deleteExpired(@Param("now") LocalDateTime now);

}