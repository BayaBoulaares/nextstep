package com.nextstep.entity;

public enum DeploymentStatus {
    EN_ATTENTE,        // En attente de traitement
    PROVISIONNEMENT,   // Provisionnement en cours
    EN_LIGNE,          // Service actif
    MAINTENANCE,       // En maintenance
    ARRETÉ,            // Arrêté par l’utilisateur
    ECHEC,             // Échec du déploiement
    SUPPRIMÉ          // Supprimé définitivement
}
