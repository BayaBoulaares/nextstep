package com.nextstep.dto;



import com.nextstep.entity.Client;
import com.nextstep.entity.User;
import lombok.Getter;

import java.time.LocalDateTime;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;

@Getter
public class UserResponse {

    private UUID id;
    private String email;
    private String firstName;
    private String lastName;
    private String avatarUrl;
    private String type;
    private LocalDateTime createdAt;

    // Champs spécifiques client
    private String telephone;
    private String adresse;
    private java.math.BigDecimal soldePayAsYouGo;

    private Long planGlobalId;
    private Set<Long> packsAbonnesIds;
    private Set<Long> servicesAchetesIds;

    public UserResponse(User user) {
        this.id = user.getId();
        this.email = user.getEmail();
        this.firstName = user.getFirstName();
        this.lastName = user.getLastName();
        this.avatarUrl = user.getAvatarUrl();
        this.type = user.getClass().getSimpleName(); // CLIENT ou ADMIN
        this.createdAt = user.getCreatedAt();

        if (user instanceof Client client) {
            this.telephone = client.getTelephone();
            this.adresse = client.getAdresse();
            this.soldePayAsYouGo = client.getSoldePayAsYouGo();
            //this.planGlobalId = client.getPlanGlobal() != null ? client.getPlanGlobal().getId() : null;
            //this.packsAbonnesIds = client.getPacksAbonnes().stream().map(p -> p.getId()).collect(Collectors.toSet());
            //this.servicesAchetesIds = client.getServicesAchetes().stream().map(s -> s.getId()).collect(Collectors.toSet());
        }
    }
}