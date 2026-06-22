package com.nextstep.entity;

public enum KnativeType {
    SERVING,    // auto-scaling to zero — workloads HTTP
    FUNCTION    // FaaS event-driven
}