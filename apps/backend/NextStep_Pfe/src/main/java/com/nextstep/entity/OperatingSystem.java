package com.nextstep.entity;


/**
 * Systèmes d'exploitation disponibles lors du déploiement d'une ressource.
 * Remplace le champ String operatingSystem dans Deployment.
 *
 * Affiché dans le tunnel step-1 (s1_configuration) sous forme de liste radio.
 */
public enum OperatingSystem {

    // ── Linux ─────────────────────────────────────────────────────────────────
    UBUNTU_24_04_LTS("Ubuntu 24.04 LTS"),
    UBUNTU_22_04_LTS("Ubuntu 22.04 LTS"),
    DEBIAN_12       ("Debian 12 (Bookworm)"),
    DEBIAN_11       ("Debian 11 (Bullseye)"),
    ROCKY_LINUX_9   ("Rocky Linux 9"),
    ALMA_LINUX_9    ("AlmaLinux 9"),
    CENTOS_STREAM_9 ("CentOS Stream 9"),

    // ── Windows ───────────────────────────────────────────────────────────────
    WINDOWS_SERVER_2022("Windows Server 2022"),
    WINDOWS_SERVER_2019("Windows Server 2019"),

    // ── Spéciaux ──────────────────────────────────────────────────────────────
    NONE("Sans OS (bare metal / custom)");

    private final String label;

    OperatingSystem(String label) { this.label = label; }

    public String getLabel() { return label; }
}