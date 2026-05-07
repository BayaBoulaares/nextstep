package com.nextstep.entity;

public enum DeploymentStatus {
    EN_ATTENTE,        // En attente de traitement
    PROVISIONNEMENT,   // Provisionnement en cours
    EN_LIGNE,          // Service actif
    ACTIF,
    MAINTENANCE,       // En maintenance
    ARRETE,            // Arrêté par l’utilisateur
    ECHEC,             // Échec du déploiement
    SUPPRIME       // Supprimé définitivement
}
