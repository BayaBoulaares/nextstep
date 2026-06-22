package com.nextstep.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDateTime;

@Entity
@Table(name = "knative_services")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class KnativeService {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String name;

    // SERVING | FUNCTION
    @Enumerated(EnumType.STRING)
    @Column(name = "knative_type", nullable = false)
    private KnativeType knativeType;

    // DEPLOYING | ACTIVE | SCALED_TO_ZERO | ERROR | DELETING
    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private KnativeStatus status;

    // Image container (depuis Quay ou Internal Registry du tenant)
    @Column(name = "container_image", nullable = false)
    private String containerImage;

    // URL publique auto-générée par Knative
    @Column(name = "service_url")
    private String serviceUrl;

    // Namespace du tenant (baya-tenant-{username})
    @Column(name = "openshift_namespace", nullable = false)
    private String openshiftNamespace;

    // Knative Serving : scaling
    @Column(name = "min_scale")
    private Integer minScale;   // 0 = scale to zero

    @Column(name = "max_scale")
    private Integer maxScale;

    // Limits CPU / mémoire (ex: "500m", "256Mi")
    @Column(name = "cpu_limit")
    private String cpuLimit;

    @Column(name = "memory_limit")
    private String memoryLimit;

    // Knative Functions : source d'événement
    // API_SERVER | PING | KAFKA | SINK_BINDING
    @Enumerated(EnumType.STRING)
    @Column(name = "event_source")
    private EventSourceType eventSource;

    // Pour KafkaSource : topic
    @Column(name = "kafka_topic")
    private String kafkaTopic;

    // Pour PingSource : schedule cron
    @Column(name = "cron_schedule")
    private String cronSchedule;

    // Keycloak UUID du tenant propriétaire
    @Column(name = "owner_keycloak_id", nullable = false)
    private String ownerKeycloakId;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;
}