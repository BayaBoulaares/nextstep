package com.nextstep.dto;


import lombok.Builder;
import lombok.Data;
import java.util.List;

@Data
@Builder
public class VmConfigDTO {

    private Details       details;
    private List<Disk>    disks;
    private List<Network> networks;
    private Scheduling    scheduling;

    @Data @Builder
    public static class Details {
        private String description;
        private String cpuCores;
        private String ram;
        private String machineType;
        private String hostname;
        private boolean headlessMode;
        private boolean guestLogAccess;
        private boolean deleteProtection;
    }

    @Data @Builder
    public static class Disk {
        private String  name;
        private String  source;      // "DataVolume" | "Other"
        private String  sourceRef;   // nom du DataVolume si applicable
        private String  size;        // ex: "21.2 GiB" ou "Dynamic"
        private String  reader;      // ex: "Disk" | "CDRom"
        private String  iface;       // ex: "virtio" | "sata"
        private String  storageClass;// ex: "nfs-csi" | "-"
        private boolean bootable;
    }

    @Data @Builder
    public static class Network {
        private String name;
        private String model;        // ex: "virtio"
        private String networkName;  // ex: "Pod Networking"
        private String macAddress;
    }

    @Data @Builder
    public static class Scheduling {
        private String  nodeSelector;       // ex: "Aucun sélecteur"
        private String  tolerations;        // ex: "0 Règles de tolérance"
        private String  affinityRules;      // ex: "1 Règles d'affinité"
        private String  evictionStrategy;   // ex: "LiveMigrate"
        private boolean deschedulerEnabled;
        private String  dedicatedResources; // ex: "Aucune ressource dédiée"
    }
}
