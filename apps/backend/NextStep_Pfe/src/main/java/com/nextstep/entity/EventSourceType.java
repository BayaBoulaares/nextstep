package com.nextstep.entity;

public enum EventSourceType {
    API_SERVER,   // Réagit aux events Kubernetes
    PING,         // Cron job serverless
    KAFKA,        // Traitement messages async
    SINK_BINDING  // Connecte un pod existant
}