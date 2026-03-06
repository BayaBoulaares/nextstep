package com.nextstep.dto;


import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import lombok.Getter;
import lombok.Setter;

/**
 * DTO reçu par PATCH /api/users/me
 * Tous les champs sont optionnels — seuls les champs non-null sont mis à jour.
 */
@Getter
@Setter
public class UpdateProfileRequest {

    @Size(min = 1, max = 50, message = "Le prénom doit contenir entre 1 et 50 caractères")
    private String firstName;

    @Size(min = 1, max = 50, message = "Le nom doit contenir entre 1 et 50 caractères")
    private String lastName;

    @Pattern(regexp = "^[+]?[0-9\\s\\-().]{7,20}$", message = "Numéro de téléphone invalide")
    private String telephone;

    @Size(max = 255, message = "L'adresse ne peut pas dépasser 255 caractères")
    private String adresse;

    // URL de l'avatar (après upload sur S3/Cloudinary/etc.)
    // Laisser null pour ne pas changer, envoyer "" pour supprimer
    private String avatarUrl;
}