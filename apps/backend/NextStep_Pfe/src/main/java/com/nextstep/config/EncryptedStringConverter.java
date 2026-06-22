package com.nextstep.config;

import jakarta.persistence.AttributeConverter;
import jakarta.persistence.Converter;
import org.springframework.beans.factory.annotation.Value;

import java.nio.charset.StandardCharsets;
import java.util.Base64;

// Nouveau fichier EncryptedStringConverter.java
@Converter
public class EncryptedStringConverter implements AttributeConverter<String, String> {
    @Value("${app.encryption.key}")
    private String encryptionKey;

    @Override
    public String convertToDatabaseColumn(String attribute) {
        if (attribute == null) return null;
        // AES-GCM recommandé — ici exemple simplifié
        return Base64.getEncoder().encodeToString(
                attribute.getBytes(StandardCharsets.UTF_8)); // remplacer par vrai chiffrement
    }

    @Override
    public String convertToEntityAttribute(String dbData) {
        if (dbData == null) return null;
        return new String(Base64.getDecoder().decode(dbData), StandardCharsets.UTF_8);
    }
}