package com.nextstep.entity;


import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(
        name = "email_verification_tokens",
        uniqueConstraints = @UniqueConstraint(columnNames = {"email", "type"})  // ← remplace l'ancien
)
public class EmailVerificationToken {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private String id;

    @Column(nullable = false)           // ← supprimer unique = true ici !
    private String email;

    @Column(nullable = false)
    private String tokenHash;

    private LocalDateTime expiresAt;

    private boolean used;

    @Column(nullable = false)
    private String type = "EMAIL_VERIFICATION";

    @PrePersist
    void prePersist() {
        // ← Remplacer l'ancien @PrePersist par celui-ci
        if ("RESET_PASSWORD".equals(this.type)) {
            this.expiresAt = LocalDateTime.now().plusHours(1);
        } else {
            this.expiresAt = LocalDateTime.now().plusHours(24);
        }
        this.used = false;
    }

    public String getId()                          { return id; }
    public String getEmail()                       { return email; }
    public void   setEmail(String email)           { this.email = email; }
    public String getTokenHash()                   { return tokenHash; }
    public void   setTokenHash(String tokenHash)   { this.tokenHash = tokenHash; }
    public LocalDateTime getExpiresAt()            { return expiresAt; }
    public void   setExpiresAt(LocalDateTime e)    { this.expiresAt = e; }
    public boolean isUsed()                        { return used; }
    public void   setUsed(boolean used)            { this.used = used; }
    public String getType()                        { return type; }
    public void   setType(String type)             { this.type = type; }

}