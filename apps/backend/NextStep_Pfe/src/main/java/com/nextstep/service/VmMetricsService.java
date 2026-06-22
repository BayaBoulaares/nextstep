/*package com.nextstep.service;

import com.nextstep.dto.VmEventDTO;
import com.nextstep.dto.VmMetricsDTO;
import io.fabric8.kubernetes.api.model.Event;
import io.fabric8.kubernetes.api.model.EventList;
import io.fabric8.kubernetes.client.KubernetesClient;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.*;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.util.UriComponentsBuilder;

import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.util.*;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class VmMetricsService {

    private final KubernetesClient kubernetesClient;
    private final RestTemplate restTemplate;
    private final NamespaceService namespaceService;
    private final TokenService tokenService;

    @Value("${openshift.metrics.url}")
    private String metricsUrl;

    private String getNamespace() {
        var auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null) return null;
        if (auth.getPrincipal() instanceof Jwt jwt) {
            String email = jwt.getClaimAsString("email");
            if (email != null)
                return namespaceService.getNamespaceForUser(email.split("@")[0].replace(".", "-"));
            String uname = jwt.getClaimAsString("preferred_username");
            return uname != null ? namespaceService.getNamespaceForUser(uname) : null;
        }
        return namespaceService.getNamespaceForUser(auth.getName());
    }

    public VmMetricsDTO getMetrics(String vmName) {
        String namespace = getNamespace();
        if (namespace == null) {
            log.warn("[METRICS] Namespace null pour {}", vmName);
            return VmMetricsDTO.empty();
        }

        String token = tokenService.resolveToken();
        if (token == null) {
            log.warn("[METRICS] Token null pour vm={}", vmName);
            return VmMetricsDTO.empty();
        }

        log.info("[METRICS] Récupération métriques pour vm={}, namespace={}", vmName, namespace);

        // CPU
        double cpuPercent = queryThanos(token, String.format(
                "sum(rate(kubevirt_vmi_vcpu_seconds_total{namespace=\"%s\",name=\"%s\"}[5m]))*100",
                namespace, vmName));

        // Mémoire
        double memUsed = queryThanos(token, String.format(
                "kubevirt_vmi_memory_used_bytes{namespace=\"%s\",name=\"%s\"}",
                namespace, vmName));

        double memTotal = queryThanos(token, String.format(
                "kubevirt_vmi_memory_available_bytes{namespace=\"%s\",name=\"%s\"}",
                namespace, vmName));

        if (memTotal == 0) {
            memTotal = 2L * 1024 * 1024 * 1024; // 2GB fallback
        }

        // Réseau
        double netRx = queryThanos(token, String.format(
                "rate(kubevirt_vmi_network_receive_bytes_total{namespace=\"%s\",name=\"%s\"}[5m])",
                namespace, vmName));
        double netTx = queryThanos(token, String.format(
                "rate(kubevirt_vmi_network_transmit_bytes_total{namespace=\"%s\",name=\"%s\"}[5m])",
                namespace, vmName));

        long memUsedMiB = (long) (memUsed / (1024 * 1024));
        long memTotalMiB = (long) (memTotal / (1024 * 1024));
        double memPercent = memTotal > 0 ? (memUsed / memTotal) * 100.0 : 0.0;

        log.info("[METRICS] vm={}: cpu={:.1f}%, mem={}/{} MiB ({:.1f}%), net={} Bps",
                vmName, cpuPercent, memUsedMiB, memTotalMiB, memPercent, (long)(netRx + netTx));

        return VmMetricsDTO.builder()
                .cpuPercent(Math.min(cpuPercent, 100.0))
                .memPercent(Math.min(memPercent, 100.0))
                .memUsedMiB(memUsedMiB)
                .memTotalMiB(memTotalMiB > 0 ? memTotalMiB : 2048)
                .diskPercent(0.0)
                .diskUsed("N/A")
                .netBps((long) (netRx + netTx))
                .build();
    }

    private double queryThanos(String token, String promql) {
        try {
            // Construction de l'URL avec encodage
            String url = UriComponentsBuilder.fromHttpUrl(metricsUrl)
                    .path("/api/v1/query")
                    .queryParam("query", promql)
                    .build()
                    .encode()
                    .toUriString();

            HttpHeaders headers = new HttpHeaders();
            headers.setBearerAuth(token);
            headers.setAccept(List.of(MediaType.APPLICATION_JSON));

            log.debug("[THANOS] Requête: {}", url);

            ResponseEntity<Map> resp = restTemplate.exchange(
                    url, HttpMethod.GET, new HttpEntity<>(headers), Map.class);

            if (resp.getBody() == null) return 0.0;

            @SuppressWarnings("unchecked")
            Map<String, Object> data = (Map<String, Object>) resp.getBody().get("data");
            if (data == null || data.get("result") == null) return 0.0;

            @SuppressWarnings("unchecked")
            List<Map<String, Object>> results = (List<Map<String, Object>>) data.get("result");
            if (results == null || results.isEmpty()) {
                log.debug("[THANOS] Aucun résultat pour: {}", promql);
                return 0.0;
            }

            @SuppressWarnings("unchecked")
            List<Object> value = (List<Object>) results.get(0).get("value");
            if (value == null || value.size() < 2) return 0.0;

            return Double.parseDouble(value.get(1).toString());

        } catch (Exception e) {
            log.warn("[THANOS] Erreur requête '{}': {}", promql, e.getMessage());
            return 0.0;
        }
    }

    public List<VmEventDTO> getEvents(String vmName) {
        String namespace = getNamespace();
        if (namespace == null) return List.of();

        try {
            EventList vmEvents = kubernetesClient.v1().events()
                    .inNamespace(namespace)
                    .withField("involvedObject.name", vmName)
                    .withField("involvedObject.kind", "VirtualMachine")
                    .list();

            EventList vmiEvents = kubernetesClient.v1().events()
                    .inNamespace(namespace)
                    .withField("involvedObject.name", vmName)
                    .withField("involvedObject.kind", "VirtualMachineInstance")
                    .list();

            Set<String> seen = new HashSet<>();
            List<Event> allEvents = new ArrayList<>();

            for (Event e : vmEvents.getItems()) {
                if (seen.add(e.getReason() + e.getMessage())) {
                    allEvents.add(e);
                }
            }
            for (Event e : vmiEvents.getItems()) {
                if (seen.add(e.getReason() + e.getMessage())) {
                    allEvents.add(e);
                }
            }

            DateTimeFormatter fmt = DateTimeFormatter.ofPattern("dd/MM HH:mm")
                    .withZone(ZoneId.systemDefault());

            return allEvents.stream()
                    .sorted((a, b) -> {
                        String tA = a.getLastTimestamp() != null ? a.getLastTimestamp() : "";
                        String tB = b.getLastTimestamp() != null ? b.getLastTimestamp() : "";
                        return tB.compareTo(tA);
                    })
                    .limit(20)
                    .map(ev -> VmEventDTO.builder()
                            .type(ev.getType() != null ? ev.getType() : "Normal")
                            .reason(ev.getReason() != null ? ev.getReason() : "")
                            .message(ev.getMessage() != null ? ev.getMessage() : "")
                            .lastTime(formatTime(ev, fmt))
                            .count(ev.getCount() != null ? ev.getCount() : 1)
                            .build())
                    .collect(Collectors.toList());

        } catch (Exception e) {
            log.error("[EVENTS] Erreur: {}", e.getMessage());
            return List.of();
        }
    }

    private String formatTime(Event ev, DateTimeFormatter fmt) {
        try {
            if (ev.getLastTimestamp() != null && !ev.getLastTimestamp().isBlank())
                return fmt.format(Instant.parse(ev.getLastTimestamp()));
        } catch (Exception ignored) {}
        return "—";
    }
}*/
package com.nextstep.service;

import com.nextstep.dto.VmEventDTO;
import com.nextstep.dto.VmMetricsDTO;
import io.fabric8.kubernetes.api.model.Event;
import io.fabric8.kubernetes.api.model.EventList;
import io.fabric8.kubernetes.client.KubernetesClient;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.*;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.util.UriComponentsBuilder;

import java.time.Instant;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.util.*;
import java.util.stream.Collectors;
@Slf4j
@Service
// ✅ PAS de @RequiredArgsConstructor — on gère le constructeur manuellement
//    pour pouvoir utiliser @Qualifier sur le RestTemplate
public class VmMetricsService {

    private final KubernetesClient kubernetesClient;
    private final RestTemplate     thanosRestTemplate; // ✅ un seul champ, renommé
    private final NamespaceService namespaceService;

    @Value("${openshift.metrics.url}")
    private String metricsUrl;

    @Value("${thanos.sa.token}")
    private String thanosToken; // ✅ token SA dédié, plus besoin de TokenService
    @Autowired
    // ✅ Constructeur explicite : @Qualifier fonctionne ici, contrairement aux champs Lombok
    public VmMetricsService(
            KubernetesClient kubernetesClient,
            @Qualifier("thanosRestTemplate") RestTemplate thanosRestTemplate,
            NamespaceService namespaceService) {
        this.kubernetesClient   = kubernetesClient;
        this.thanosRestTemplate = thanosRestTemplate;
        this.namespaceService   = namespaceService;
        System.out.println(">>> VmMetricsService BEAN CRÉÉ <<<");

    }

    // ─────────────────────────────────────────────────────────────────────────
    // Namespace du tenant courant (extrait du JWT Keycloak)
    // ─────────────────────────────────────────────────────────────────────────
    private String getNamespace() {
        var auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null) return null;
        if (auth.getPrincipal() instanceof Jwt jwt) {
            String email = jwt.getClaimAsString("email");
            if (email != null)
                return namespaceService.getNamespaceForUser(
                        email.split("@")[0].replace(".", "-"));
            String uname = jwt.getClaimAsString("preferred_username");
            return uname != null ? namespaceService.getNamespaceForUser(uname) : null;
        }
        return namespaceService.getNamespaceForUser(auth.getName());
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Métriques VM via Thanos
    // ─────────────────────────────────────────────────────────────────────────
    public VmMetricsDTO getMetrics(String vmName) {
        log.info("[METRICS-DEBUG] getMetrics appelé pour vm={}", vmName);
        log.info("[METRICS-DEBUG] metricsUrl={}", metricsUrl);
        log.info("[METRICS-DEBUG] thanosToken={}", thanosToken != null ? thanosToken.substring(0, 20) + "..." : "NULL");
        String namespace = getNamespace();
        if (namespace == null) {
            log.warn("[METRICS] Namespace null pour {}", vmName);
            return VmMetricsDTO.empty();
        }

        log.info("[METRICS] Récupération métriques pour vm={}, namespace={}", vmName, namespace);

        // CPU — utilisation en % (rate sur 5 minutes)
        double cpuPercent = queryThanos(String.format(
                "sum(rate(kubevirt_vmi_vcpu_seconds_total{namespace=\"%s\",name=\"%s\"}[5m]))*100",
                namespace, vmName));

        // Mémoire utilisée
        double memUsed = queryThanos(String.format(
                "kubevirt_vmi_memory_used_bytes{namespace=\"%s\",name=\"%s\"}",
                namespace, vmName));

        // Mémoire totale disponible (fallback 2 GiB si la métrique est absente)
        double memTotal = queryThanos(String.format(
                "kubevirt_vmi_memory_available_bytes{namespace=\"%s\",name=\"%s\"}",
                namespace, vmName));
        if (memTotal == 0) {
            memTotal = 2L * 1024 * 1024 * 1024;
        }

        // Réseau (bytes/s)
        double netRx = queryThanos(String.format(
                "rate(kubevirt_vmi_network_receive_bytes_total{namespace=\"%s\",name=\"%s\"}[5m])",
                namespace, vmName));
        double netTx = queryThanos(String.format(
                "rate(kubevirt_vmi_network_transmit_bytes_total{namespace=\"%s\",name=\"%s\"}[5m])",
                namespace, vmName));
        double diskReadBps = queryThanos(String.format(
                "sum(rate(kubevirt_vmi_storage_read_traffic_bytes_total{namespace=\"%s\",name=\"%s\"}[5m]))",
                namespace, vmName));
        double diskWriteBps = queryThanos(String.format(
                "sum(rate(kubevirt_vmi_storage_write_traffic_bytes_total{namespace=\"%s\",name=\"%s\"}[5m]))",
                namespace, vmName));
        long diskIoBps = (long)(diskReadBps + diskWriteBps);
        long   memUsedMiB  = (long) (memUsed  / (1024 * 1024));
        long   memTotalMiB = (long) (memTotal / (1024 * 1024));
        double memPercent  = memTotal > 0 ? (memUsed / memTotal) * 100.0 : 0.0;

        log.info("[METRICS] vm={} cpu={}% mem={}/{} MiB ({}%) net={} Bps",
                vmName,
                String.format("%.1f", cpuPercent),
                memUsedMiB, memTotalMiB,
                String.format("%.1f", memPercent),
                (long)(netRx + netTx));

        return VmMetricsDTO.builder()
                .cpuPercent(Math.min(cpuPercent, 100.0))
                .memPercent(Math.min(memPercent, 100.0))
                .memUsedMiB(memUsedMiB)
                .memTotalMiB(memTotalMiB > 0 ? memTotalMiB : 2048)
                .diskPercent(0.0)
                .diskUsed(diskIoBps + " Bps I/O")  // ✅ affiche le débit I/O
                .netBps((long) (netRx + netTx))
                .build();
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Requête Thanos — retourne la valeur scalaire ou 0.0 en cas d'échec
    // ─────────────────────────────────────────────────────────────────────────
    private double queryThanos(String promql) {
        try {
            // ✅ URI.create() sur une URL déjà encodée → RestTemplate ne touche plus à l'encodage
            String encodedQuery = java.net.URLEncoder.encode(promql, java.nio.charset.StandardCharsets.UTF_8);
            java.net.URI uri = java.net.URI.create(
                    metricsUrl + "/api/v1/query?query=" + encodedQuery);

            HttpHeaders headers = new HttpHeaders();
            headers.setBearerAuth(thanosToken);
            headers.setAccept(List.of(MediaType.APPLICATION_JSON));

            log.info("[THANOS] URI={}", uri);

            ResponseEntity<Map> resp = thanosRestTemplate.exchange(
                    uri,                          // ← URI, pas String
                    HttpMethod.GET,
                    new HttpEntity<>(headers),
                    Map.class);

            log.info("[THANOS] Status={}", resp.getStatusCode());

            if (resp.getBody() == null) return 0.0;

            @SuppressWarnings("unchecked")
            Map<String, Object> data = (Map<String, Object>) resp.getBody().get("data");
            if (data == null) return 0.0;

            @SuppressWarnings("unchecked")
            List<Map<String, Object>> results = (List<Map<String, Object>>) data.get("result");
            if (results == null || results.isEmpty()) {
                log.debug("[THANOS] Aucun résultat pour: {}", promql);
                return 0.0;
            }

            @SuppressWarnings("unchecked")
            List<Object> value = (List<Object>) results.get(0).get("value");
            if (value == null || value.size() < 2) return 0.0;

            double result = Double.parseDouble(value.get(1).toString());
            log.info("[THANOS] Résultat={} pour promql={}", result, promql);
            return result;

        } catch (Exception e) {
            log.warn("[THANOS] Erreur requête '{}': {}", promql, e.getMessage());
            return 0.0;
        }
    }    // ─────────────────────────────────────────────────────────────────────────
    // Événements Kubernetes liés à la VM
    // ─────────────────────────────────────────────────────────────────────────
    public List<VmEventDTO> getEvents(String vmName) {
        String namespace = getNamespace();
        if (namespace == null) return List.of();

        try {
            EventList vmEvents = kubernetesClient.v1().events()
                    .inNamespace(namespace)
                    .withField("involvedObject.name", vmName)
                    .withField("involvedObject.kind", "VirtualMachine")
                    .list();

            EventList vmiEvents = kubernetesClient.v1().events()
                    .inNamespace(namespace)
                    .withField("involvedObject.name", vmName)
                    .withField("involvedObject.kind", "VirtualMachineInstance")
                    .list();

            Set<String>  seen      = new HashSet<>();
            List<Event>  allEvents = new ArrayList<>();

            for (Event e : vmEvents.getItems())
                if (seen.add(e.getReason() + e.getMessage())) allEvents.add(e);
            for (Event e : vmiEvents.getItems())
                if (seen.add(e.getReason() + e.getMessage())) allEvents.add(e);

            DateTimeFormatter fmt = DateTimeFormatter.ofPattern("dd/MM HH:mm")
                    .withZone(ZoneId.systemDefault());

            return allEvents.stream()
                    .sorted((a, b) -> {
                        String tA = a.getLastTimestamp() != null ? a.getLastTimestamp() : "";
                        String tB = b.getLastTimestamp() != null ? b.getLastTimestamp() : "";
                        return tB.compareTo(tA);
                    })
                    .limit(20)
                    .map(ev -> VmEventDTO.builder()
                            .type(ev.getType()    != null ? ev.getType()    : "Normal")
                            .reason(ev.getReason()  != null ? ev.getReason()  : "")
                            .message(ev.getMessage() != null ? ev.getMessage() : "")
                            .lastTime(formatTime(ev, fmt))
                            .count(ev.getCount()   != null ? ev.getCount()   : 1)
                            .build())
                    .collect(Collectors.toList());

        } catch (Exception e) {
            log.error("[EVENTS] Erreur: {}", e.getMessage());
            return List.of();
        }
    }

    private String formatTime(Event ev, DateTimeFormatter fmt) {
        try {
            if (ev.getLastTimestamp() != null && !ev.getLastTimestamp().isBlank())
                return fmt.format(Instant.parse(ev.getLastTimestamp()));
        } catch (Exception ignored) {}
        return "—";
    }
}