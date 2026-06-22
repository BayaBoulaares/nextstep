package com.nextstep.dto;

import lombok.Data;

@Data
public class VmConfigUpdateDTO {
    private String  description;
    private String  cpuCores;
    private String  ram;
    private String  hostname;
    private Boolean headlessMode;
    private Boolean guestLogAccess;
    private Boolean deleteProtection;
}