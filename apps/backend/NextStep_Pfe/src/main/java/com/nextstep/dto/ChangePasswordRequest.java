package com.nextstep.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public class ChangePasswordRequest {

    @NotBlank(message = "Le mot de passe est requis")
    @Size(min = 8, message = "Le mot de passe doit contenir au moins 8 caractères")
    private String newPassword;

    public String getNewPassword()                   { return newPassword; }
    public void   setNewPassword(String newPassword) { this.newPassword = newPassword; }
}