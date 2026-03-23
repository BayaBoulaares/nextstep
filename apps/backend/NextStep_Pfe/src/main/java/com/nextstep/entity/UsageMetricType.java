package com.nextstep.entity;


public enum UsageMetricType {

    VCPU_HEURE        ("vCPU",        "heure"),
    RAM_GB_HEURE      ("RAM Go",      "heure"),
    STOCKAGE_GB_MOIS  ("Stockage Go", "mois"),
    REQUETES_1000     ("Requêtes",    "1 000 req."),
    BANDE_PASSANTE_GB ("Bande pass.", "Go sortant");

    private final String label;
    private final String unit;

    UsageMetricType(String label, String unit) {
        this.label = label;
        this.unit  = unit;
    }

    public String getLabel() { return label; }
    public String getUnit()  { return unit;  }
}