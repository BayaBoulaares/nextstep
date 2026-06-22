package com.nextstep.dto;

import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class NginxDeploymentResult {
    private String namespace;
    private String appName;
    private String publicUrl;
    private String plan;
    private String status;
}
