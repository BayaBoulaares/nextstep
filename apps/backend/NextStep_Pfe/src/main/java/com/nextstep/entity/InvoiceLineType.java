package com.nextstep.entity;

public enum InvoiceLineType {
    SUBSCRIPTION,  // abonnement de base (plan mensuel)
    ADDON,         // stockage supplémentaire, backup, monitoring
    CREDIT,        // remise manuelle admin
    TAX            // TVA (si applicable)
}