package com.nextstep.entity;

import com.fasterxml.jackson.annotation.JsonCreator;
import com.fasterxml.jackson.annotation.JsonValue;

public enum OperatingSystem {

    // ── Linux ─────────────────────────────────────────────────────────────────
    UBUNTU_24_04_LTS ("Ubuntu 24.04 LTS",       "quay.io/containerdisks/ubuntu:24.04"),
    UBUNTU_22_04_LTS ("Ubuntu 22.04 LTS",       "quay.io/containerdisks/ubuntu:22.04"),
    DEBIAN_12        ("Debian 12 (Bookworm)",    "quay.io/containerdisks/debian:12"),
    DEBIAN_11        ("Debian 11 (Bullseye)",    "quay.io/containerdisks/debian:11"),
    ROCKY_LINUX_9    ("Rocky Linux 9",           "quay.io/containerdisks/rockylinux:9"),
    ALMA_LINUX_9     ("AlmaLinux 9",             "quay.io/containerdisks/almalinux:9"),
    CENTOS_STREAM_9  ("CentOS Stream 9",         "quay.io/containerdisks/centos-stream:9"),

    // ── Windows ───────────────────────────────────────────────────────────────
    WINDOWS_SERVER_2022("Windows Server 2022",   "quay.io/containerdisks/windows:2022"),
    WINDOWS_SERVER_2019("Windows Server 2019",   "quay.io/containerdisks/windows:2019"),

    // ── Spéciaux ──────────────────────────────────────────────────────────────
    NONE             ("Sans OS (bare metal / custom)", "none");

    private final String label;
    private final String terraformImage;

    OperatingSystem(String label, String terraformImage) {
        this.label          = label;
        this.terraformImage = terraformImage;
    }

    public String getLabel()          { return label; }
    public String getTerraformImage() { return terraformImage; }

    @JsonValue
    public String getValue() { return this.name(); }  // évite la récursion infinie de name()

    @JsonCreator
    public static OperatingSystem fromValue(String value) {
        for (OperatingSystem os : values()) {
            if (os.name().equalsIgnoreCase(value)) return os;
        }
        throw new IllegalArgumentException("OS inconnu : " + value);
    }
}
/*public enum OperatingSystem {
    UBUNTU_24_04_LTS(
            "Ubuntu 24.04 LTS",
            "https://cloud-images.ubuntu.com/noble/current/noble-server-cloudimg-amd64.img"
    ),
    UBUNTU_22_04_LTS(
            "Ubuntu 22.04 LTS",
            "https://cloud-images.ubuntu.com/jammy/current/jammy-server-cloudimg-amd64.img"
    ),
    DEBIAN_12(
            "Debian 12",
            "https://cloud.debian.org/images/cloud/bookworm/latest/debian-12-genericcloud-amd64.qcow2"
    ),
    ROCKY_LINUX_9(
            "Rocky Linux 9",
            "https://dl.rockylinux.org/pub/rocky/9/images/x86_64/Rocky-9-GenericCloud.latest.x86_64.qcow2"
    );

    public final String label;
    public final String terraformImage;  // ← URL HTTP directe

    OperatingSystem(String label, String terraformImage) {
        this.label = label;
        this.terraformImage = terraformImage;
    }

    public String getLabel() { return label; }
    public String getTerraformImage() { return terraformImage; }
}*/