package com.nextstep.entity;

/**
 * Zones de disponibilité proposées dans chacun des 3 datacenters.
 * Correspond aux 3 boutons radio de la maquette s1_configuration :
 *
 *   ZONE_A      → "Zone A · Capacité élevée"     (sélectionnée par défaut)
 *   ZONE_B      → "Zone B · Capacité normale"
 *   MULTI_ZONE  → "Multi-zone · HA automatique"
 */
public enum AvailabilityZone {
    EO,     // Capacité élevée — placement prioritaire
    DATAXION,     // Capacité normale
    TT  // Haute disponibilité automatique (répartition sur A + B)
}
