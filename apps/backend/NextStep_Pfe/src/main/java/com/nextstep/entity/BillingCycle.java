package com.nextstep.entity;

public enum BillingCycle {
    HORAIRE,    // À l’heure — Public Cloud, instances temporaires
    MENSUEL,    // Par mois — VPS, Hosting (le plus courant)
    ANNUEL      // Par an — réduction ~20% par rapport au mensuel
}