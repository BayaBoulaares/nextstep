package com.nextstep.service;

import com.nextstep.dto.InvoiceResponse;
import com.nextstep.dto.UsageRecordResponse;
import com.nextstep.entity.*;
import com.nextstep.repository.*;
import jakarta.persistence.EntityNotFoundException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.time.YearMonth;
import java.util.List;
import java.util.UUID;

@Slf4j
@Service
@RequiredArgsConstructor
@Transactional
public class UsageService {

    private final AbonnementRepository  abonnementRepository;
    private final DeploymentRepository  deploymentRepository;
    private final InvoiceRepository     invoiceRepository;

    // ── Générer la facture du mois ────────────────────────────────────────────

    /**
     * Pour les plans à prix fixe, la facture mensuelle = price du plan
     * + éventuels suppléments (backup, monitoring, antiDdos, stockage additionnel).
     * Idempotent : si la facture existe déjà pour ce mois, elle est retournée.
     */
    public Invoice genererFactureMois(Long abonnementId, YearMonth mois) {

        Abonnement abo = abonnementRepository.findById(abonnementId)
                .orElseThrow(() -> new EntityNotFoundException(
                        "Abonnement introuvable : " + abonnementId));

        LocalDateTime debut = mois.atDay(1).atStartOfDay();
        LocalDateTime fin   = mois.atEndOfMonth().atTime(23, 59, 59);

        // Idempotence
        if (invoiceRepository.existsByAbonnementIdAndPeriodStart(abonnementId, debut)) {
            log.warn("[INVOICE] Facture déjà générée pour abo={} mois={}", abonnementId, mois);
            return invoiceRepository.findByAbonnementIdAndPeriodStart(abonnementId, debut)
                    .orElse(null);
        }

        // Prix fixe du plan
        BigDecimal total = abo.getPlan().getPrice() != null
                ? abo.getPlan().getPrice()
                : BigDecimal.ZERO;

        Invoice invoice = Invoice.builder()
                .abonnement(abo)
                .periodStart(debut)
                .periodEnd(fin)
                .totalHt(total)
                .status(InvoiceStatus.EMISE)
                .issuedAt(LocalDateTime.now())
                .build();

        Invoice saved = invoiceRepository.save(invoice);
        log.info("[INVOICE] Facture créée id={} abo={} total={}", saved.getId(), abonnementId, total);
        return saved;
    }

    // ── Lire les factures d'un client ─────────────────────────────────────────

    @Transactional(readOnly = true)
    public List<InvoiceResponse> getFacturesParClient(UUID clientId) {
        return invoiceRepository.findByClientId(clientId)
                .stream().map(this::toInvoiceResponse).toList();
    }

    // ── Mapper ────────────────────────────────────────────────────────────────

    private InvoiceResponse toInvoiceResponse(Invoice i) {
        InvoiceResponse r = new InvoiceResponse();
        r.setId(i.getId());
        r.setAbonnementId(i.getAbonnement().getId());
        r.setPlanName(i.getAbonnement().getPlan().getName());
        r.setStatus(i.getStatus());
        r.setPeriodStart(i.getPeriodStart());
        r.setPeriodEnd(i.getPeriodEnd());
        r.setTotalHt(i.getTotalHt());
        r.setIssuedAt(i.getIssuedAt());
        r.setPaidAt(i.getPaidAt());
        r.setCreatedAt(i.getCreatedAt());
        return r;
    }
}