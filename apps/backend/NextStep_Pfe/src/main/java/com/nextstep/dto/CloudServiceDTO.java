package com.nextstep.dto;

import com.nextstep.entity.CloudType;
import com.nextstep.entity.ServiceCategory;
import com.nextstep.entity.ServiceStatus;
import lombok.Data;
import java.util.List;

@Data
public class CloudServiceDTO {
    private Long id;
    private String name;
    private String description;
    private ServiceCategory category;
    /** NOUVEAU */
    private CloudType cloudType;
    /** NOUVEAU */
    private String icon;
    private ServiceStatus status;
    private List<PlanDTO> plans;
}