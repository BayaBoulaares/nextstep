package com.nextstep.dto;

import com.nextstep.entity.EventSourceType;
import com.nextstep.entity.KnativeType;
import lombok.Data;

@Data
public class KnativeServiceRequest {

    private String name;

    // SERVING | FUNCTION
    private KnativeType knativeType;

    // Image depuis le registry du tenant (Quay ou Internal)
    private String containerImage;

    // Scaling (optionnel — défauts: min=0, max=10)
    private Integer minScale;
    private Integer maxScale;

    // Ressources (optionnel — défauts: 500m CPU, 256Mi RAM)
    private String cpuLimit;
    private String memoryLimit;

    // Knative Functions uniquement
    private EventSourceType eventSource;
    private String kafkaTopic;     // si eventSource = KAFKA
    private String cronSchedule;   // si eventSource = PING (ex: "*/5 * * * *")
}