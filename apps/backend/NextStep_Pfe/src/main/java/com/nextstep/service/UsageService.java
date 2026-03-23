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

    private final UsageRecordRepository  usageRecordRepository;
    private final PlanPricingRepository  planPricingRepository;
    private final AbonnementRepository   abonnementRepository;
    private final DeploymentRepository   deploymentRepository;
    private final InvoiceRepository      invoiceRepository;
    private final UserRepository         userRepository;

    // ── Enregistrer une consommation (appelé par le scheduler) ───────────────

    /**
     * Calcule et enregistre une mesure de consommation pour un abonnement PAYG.
     * Déduit le coût du soldePayAsYouGo du client.
     *
     * @param abonnementId  ID de l'abonnement PAYG
     * @param deploymentId  ID du déploiement source
     * @param metricType    Type de ressource mesurée
     * @param quantity      Quantité consommée sur la période
     * @param periodStart   Début de la fenêtre de mesure
     * @param periodEnd     Fin de la fenêtre de mesure
     */
    public UsageRecord enregistrerConsommation(
            Long abonnementId,
            Long deploymentId,
            UsageMetricType metricType,
            BigDecimal quantity,
            LocalDateTime periodStart,
            LocalDateTime periodEnd) {

        Abonnement abo = abonnementRepository.findById(abonnementId)
                .orElseThrow(() -> new EntityNotFoundException(
                        "Abonnement introuvable : " + abonnementId));

        Deployment dep = deploymentRepository.findById(deploymentId)
                .orElseThrow(() -> new EntityNotFoundException(
                        "Déploiement introuvable : " + deploymentId));

        // Récupérer le tarif unitaire depuis la grille PlanPricing
        PlanPricing pricing = planPricingRepository
                .findByPlanIdAndMetricType(abo.getPlan().getId(), metricType)
                .orElseThrow(() -> new EntityNotFoundException(
                        "Tarif introuvable pour plan=" + abo.getPlan().getId()
                                + " metricType=" + metricType));

        // Appliquer le quota gratuit
        BigDecimal facturable = quantity
                .subtract(pricing.getFreeQuota())
                .max(BigDecimal.ZERO);

        BigDecimal cost = facturable.multiply(pricing.getPricePerUnit());

        // Débiter le solde PAYG du client
        Client client = abo.getClient();
        client.setSoldePayAsYouGo(
                client.getSoldePayAsYouGo().subtract(cost)
        );
        // (Client est managé via cascade — pas besoin de save explicite ici
        //  si le contexte transactionnel est actif, mais on le force par sécurité)
        userRepository.save(client);

        UsageRecord record = UsageRecord.builder()
                .abonnement(abo)
                .deployment(dep)
                .metricType(metricType)
                .quantity(quantity)
                .cost(cost)
                .periodStart(periodStart)
                .periodEnd(periodEnd)
                .build();

        log.info("[PAYG] abo={} dep={} metric={} qty={} cost={}",
                abonnementId, deploymentId, metricType, quantity, cost);

        return usageRecordRepository.save(record);
    }

    // ── Générer la facture du mois ────────────────────────────────────────────

    /**
     * Consolide tous les UsageRecord d'un abonnement sur un mois
     * et crée une Invoice en statut EMISE.
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
            return null;
        }

        BigDecimal total = usageRecordRepository
                .sumCostByAbonnementAndPeriod(abonnementId, debut, fin);

        Invoice invoice = Invoice.builder()
                .client(abo.getClient())
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

    // ── Lire les records d'un abonnement ─────────────────────────────────────

    @Transactional(readOnly = true)
    public List<UsageRecordResponse> getUsageParAbonnement(Long abonnementId,
                                                           LocalDateTime debut,
                                                           LocalDateTime fin) {
        return usageRecordRepository
                .findByAbonnementIdAndPeriodStartBetween(abonnementId, debut, fin)
                .stream().map(this::toUsageResponse).toList();
    }

    // ── Lire les factures d'un client ─────────────────────────────────────────

    @Transactional(readOnly = true)
    public List<InvoiceResponse> getFacturesParClient(UUID clientId) {
        return invoiceRepository.findByClientId(clientId)
                .stream().map(this::toInvoiceResponse).toList();
    }

    // ── Mappers ───────────────────────────────────────────────────────────────

    private UsageRecordResponse toUsageResponse(UsageRecord u) {
        UsageRecordResponse r = new UsageRecordResponse();
        r.setId(u.getId());
        r.setAbonnementId(u.getAbonnement().getId());
        r.setDeploymentId(u.getDeployment().getId());
        r.setResourceName(u.getDeployment().getResourceName());
        r.setMetricType(u.getMetricType());
        r.setMetricLabel(u.getMetricType().getLabel());
        r.setQuantity(u.getQuantity());
        r.setCost(u.getCost());
        r.setPeriodStart(u.getPeriodStart());
        r.setPeriodEnd(u.getPeriodEnd());
        r.setRecordedAt(u.getRecordedAt());
        return r;
    }

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