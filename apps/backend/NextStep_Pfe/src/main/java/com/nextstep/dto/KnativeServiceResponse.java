package com.nextstep.dto;

import com.nextstep.entity.EventSourceType;
import com.nextstep.entity.KnativeStatus;
import com.nextstep.entity.KnativeType;
import lombok.Data;

import java.time.LocalDateTime;

@Data
public class KnativeServiceResponse {

    private Long id;
    private String name;
    private KnativeType knativeType;
    private KnativeStatus status;
    private String containerImage;
    private String serviceUrl;
    private String openshiftNamespace;
    private Integer minScale;
    private Integer maxScale;
    private String cpuLimit;
    private String memoryLimit;
    private EventSourceType eventSource;
    private String kafkaTopic;
    private String cronSchedule;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}