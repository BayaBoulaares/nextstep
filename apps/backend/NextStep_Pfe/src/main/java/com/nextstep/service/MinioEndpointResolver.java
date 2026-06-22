package com.nextstep.service;

import com.nextstep.entity.StorageResource;
import io.fabric8.kubernetes.client.KubernetesClient;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
@Slf4j
public class MinioEndpointResolver {

    private final KubernetesClient k8sClient;

    @Value("${openshift.node.ip:10.9.21.22}")
    private String nodeIp;

    public String resolve(StorageResource sr) {
        try {
            for (String suffix : new String[]{"-nodeport", "-np"}) {
                String svcName = sr.getResourceName() + suffix;
                var svc = k8sClient.services()
                        .inNamespace(sr.getNamespace())
                        .withName(svcName)
                        .get();
                if (svc != null && svc.getSpec() != null) {
                    Integer port = svc.getSpec().getPorts().stream()
                            .filter(p -> p.getNodePort() != null)
                            .findFirst()
                            .map(p -> p.getNodePort())
                            .orElse(null);
                    if (port != null) {
                        String url = "http://" + nodeIp + ":" + port;
                        log.info("[MINIO] Endpoint résolu: {} (service={})", url, svcName);
                        return url;
                    }
                }
            }
        } catch (Exception e) {
            log.warn("[MINIO] NodePort non trouvé: {}", e.getMessage());
        }
        log.warn("[MINIO] Fallback endpoint: {}", sr.getS3Endpoint());
        return sr.getS3Endpoint();
    }
    public String resolveConsole(StorageResource sr) {
        try {
            var svc = k8sClient.services()
                    .inNamespace(sr.getNamespace())
                    .withName(sr.getResourceName() + "-console")
                    .get();
            if (svc != null) {
                Integer port = svc.getSpec().getPorts().stream()
                        .filter(p -> p.getNodePort() != null)
                        .findFirst()
                        .map(p -> p.getNodePort())
                        .orElse(null);
                if (port != null) return "http://" + nodeIp + ":" + port;
            }
        } catch (Exception e) {
            log.warn("[MINIO] Console NodePort non trouvé: {}", e.getMessage());
        }
        return null;
    }
}