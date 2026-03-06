package com.nextstep.service;




import com.nextstep.dto.AuditLogDTO;
import com.nextstep.dto.AuditLogRequest;
import com.nextstep.entity.AuditLog;
import com.nextstep.exceptions.ResourceNotFoundException;
import com.nextstep.filter.AuditLogFilter;
import com.nextstep.mapper.AuditLogMapper;
import com.nextstep.repository.AuditLogRepository;
import com.nextstep.spec.AuditLogSpec;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.io.PrintWriter;
import java.nio.charset.StandardCharsets;
import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
public class AuditLogService {

    private final AuditLogRepository auditLogRepository;
    private final AuditLogMapper     auditLogMapper;

    // ─────────────────────────────────────────────────────────────────────────
    // Enregistrement SYNCHRONE
    // REQUIRES_NEW → transaction isolée du contexte appelant
    // Le log est TOUJOURS sauvegardé, même si la transaction métier rollback
    // ─────────────────────────────────────────────────────────────────────────
    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public AuditLogDTO log(AuditLogRequest req) {
        try {
            AuditLog entity = auditLogMapper.toEntity(req);
            AuditLog saved  = auditLogRepository.save(entity);

            log.info("[AUDIT] ✓ Saved: action={} module={} by={} resource={}/{} outcome={} status={}",
                    req.getAction(),
                    req.getModule(),
                    req.getUserEmail(),
                    req.getResourceType(),
                    req.getResourceId(),
                    req.getOutcome(),
                    req.getHttpStatus());

            return auditLogMapper.toDTO(saved);

        } catch (Exception e) {
            // Ne JAMAIS faire échouer la requête métier à cause d'un log raté
            log.error("[AUDIT] ✗ Save FAILED: action={} by={} error={}",
                    req.getAction(), req.getUserEmail(), e.getMessage(), e);
            return null;
        }
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Enregistrement ASYNCHRONE
    // Appelé depuis l'intercepteur HTTP pour ne pas impacter la latence
    // ─────────────────────────────────────────────────────────────────────────
    @Async("auditExecutor")
    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void logAsync(AuditLogRequest req) {
        log(req);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Lecture paginée avec filtres
    // ─────────────────────────────────────────────────────────────────────────
    @Transactional(readOnly = true)
    public Page<AuditLogDTO> findAll(AuditLogFilter filter, Pageable pageable) {
        // Force le tri sur createdAt pour éviter "No property 'string' found"
        Pageable safePage = PageRequest.of(
                pageable.getPageNumber(),
                pageable.getPageSize(),
                Sort.by(Sort.Direction.DESC, "createdAt")
        );

        return auditLogRepository
                .findAll(AuditLogSpec.withFilters(filter), safePage)
                .map(auditLogMapper::toDTO);
    }

    @Transactional(readOnly = true)
    public AuditLogDTO findById(UUID id) {
        return auditLogRepository.findById(id)
                .map(auditLogMapper::toDTO)
                .orElseThrow(() -> new ResourceNotFoundException("AuditLog not found: " + id));
    }

    @Transactional(readOnly = true)
    public List<AuditLogDTO> findByResource(String resourceType, String resourceId) {
        return auditLogRepository
                .findByResourceTypeAndResourceIdOrderByCreatedAtDesc(resourceType, resourceId)
                .stream()
                .map(auditLogMapper::toDTO)
                .toList();
    }

    @Transactional(readOnly = true)
    public Page<AuditLogDTO> findByUser(String userId, Pageable pageable) {
        Pageable safePage = PageRequest.of(
                pageable.getPageNumber(),
                pageable.getPageSize(),
                Sort.by(Sort.Direction.DESC, "createdAt")
        );
        return auditLogRepository
                .findByUserIdOrderByCreatedAtDesc(userId, safePage)
                .map(auditLogMapper::toDTO);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Statistiques
    // ─────────────────────────────────────────────────────────────────────────
    @Transactional(readOnly = true)
    public Map<String, Object> getStats(LocalDateTime from, LocalDateTime to) {
        Map<String, Object> stats = new HashMap<>();

        stats.put("total", auditLogRepository.countByCreatedAtBetween(from, to));

        Map<String, Long> outcomeMap = new HashMap<>();
        auditLogRepository.countByOutcomeBetween(from, to)
                .forEach(row -> outcomeMap.put(String.valueOf(row[0]), (Long) row[1]));
        stats.put("byOutcome",    outcomeMap);
        stats.put("failures",     outcomeMap.getOrDefault("FAILURE",       0L));
        stats.put("accessDenied", outcomeMap.getOrDefault("ACCESS_DENIED", 0L));

        Map<String, Long> actionMap = new HashMap<>();
        auditLogRepository.countByActionBetween(from, to)
                .forEach(row -> actionMap.put(String.valueOf(row[0]), (Long) row[1]));
        stats.put("byAction", actionMap);

        Map<String, Long> moduleMap = new HashMap<>();
        auditLogRepository.countByModuleBetween(from, to)
                .forEach(row -> moduleMap.put(String.valueOf(row[0]), (Long) row[1]));
        stats.put("byModule", moduleMap);

        return stats;
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Export CSV
    // ─────────────────────────────────────────────────────────────────────────
    @Transactional(readOnly = true)
    public byte[] exportCsv(AuditLogFilter filter) {
        List<AuditLog> logs = auditLogRepository.findAll(
                AuditLogSpec.withFilters(filter),
                Sort.by(Sort.Direction.DESC, "createdAt")
        );

        try (ByteArrayOutputStream bos = new ByteArrayOutputStream();
             PrintWriter writer = new PrintWriter(bos, true, StandardCharsets.UTF_8)) {

            bos.write(new byte[]{(byte) 0xEF, (byte) 0xBB, (byte) 0xBF}); // BOM UTF-8

            writer.println(
                    "ID,Date,User Email,User Name,User ID," +
                            "Action,Module,Description," +
                            "Resource Type,Resource ID," +
                            "HTTP Method,Endpoint,HTTP Status," +
                            "IP Address,Outcome,Error Message,Duration (ms)"
            );

            for (AuditLog l : logs) {
                writer.printf("%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s%n",
                        l.getId(), l.getCreatedAt(),
                        csv(l.getUserEmail()), csv(l.getUserName()), csv(l.getUserId()),
                        csv(l.getAction()), csv(l.getModule()), csv(l.getDescription()),
                        csv(l.getResourceType()), csv(l.getResourceId()),
                        csv(l.getHttpMethod()), csv(l.getEndpoint()),
                        l.getHttpStatus() != null ? l.getHttpStatus() : "",
                        csv(l.getIpAddress()), csv(l.getOutcome()), csv(l.getErrorMessage()),
                        l.getDurationMs() != null ? l.getDurationMs() : ""
                );
            }
            writer.flush();
            return bos.toByteArray();

        } catch (IOException e) {
            log.error("CSV export failed", e);
            throw new RuntimeException("Failed to generate CSV export", e);
        }
    }

    private String csv(String value) {
        if (value == null || value.isBlank()) return "";
        if (value.contains(",") || value.contains("\"") || value.contains("\n"))
            return "\"" + value.replace("\"", "\"\"") + "\"";
        return value;
    }
}