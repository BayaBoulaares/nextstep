package com.nextstep.dto;

import lombok.AllArgsConstructor;
import lombok.Data;

// TerraformResult.java
@Data
@AllArgsConstructor
public class TerraformResult {
    private String status;   // SUCCESS / ERROR
    private String vmName;
    private String output;
    private String password;
}