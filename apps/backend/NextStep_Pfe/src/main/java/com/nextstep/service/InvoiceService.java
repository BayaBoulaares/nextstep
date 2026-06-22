package com.nextstep.service;

import com.nextstep.dto.InvoiceResponse;
import com.nextstep.entity.*;
import com.nextstep.repository.*;
import jakarta.persistence.EntityNotFoundException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDateTime;
import java.time.YearMonth;
import java.time.format.TextStyle;
import java.util.*;

@Service
@RequiredArgsConstructor
@Transactional
@Slf4j
public class InvoiceService {

    private final InvoiceRepository invoiceRepository;
    private final InvoiceLineRepository invoiceLineRepository;
    private final AbonnementRepository abonnementRepository;
    private final BillingSettingsRepository billingSettingsRepository;
    private final CreditNoteRepository creditNoteRepository;
    private final EmailVerificationService   emailService; // réutiliser pour envoi email
    private final UserRepository userRepository;  // ← ajouter

    // ── Générer les factures d'un mois pour TOUS les abonnements actifs ──────
    // Appelée par BillingScheduler le 1er de chaque mois
    /*@Transactional
    public List<Invoice> genererFacturesMensuelles(YearMonth mois) {
        log.info("[BILLING] Génération factures mois={}", mois);

        List<Abonnement> abos = abonnementRepository
                .findByStatusAndBillingCycle(AbonnementStatus.ACTIF, BillingCycle.MENSUEL);

        return abos.stream()
                .map(abo -> genererFacture(abo, mois))
                .filter(Objects::nonNull)
                .toList();
    }

    // ── Générer une facture pour un abonnement et un mois donnés ─────────────
    @Transactional
    public Invoice genererFacture(Abonnement abo, YearMonth mois) {
        LocalDateTime debut = mois.atDay(1).atStartOfDay();
        LocalDateTime fin   = mois.atEndOfMonth().atTime(23, 59, 59);

        // Idempotence : ne pas régénérer si existe déjà
        if (invoiceRepository.existsByAbonnementIdAndPeriodStart(abo.getId(), debut)) {
            log.debug("[BILLING] Facture déjà existante abo={} mois={}", abo.getId(), mois);
            return invoiceRepository
                    .findByAbonnementIdAndPeriodStart(abo.getId(), debut)
                    .orElse(null);
        }

        // Prix de base du plan
        BigDecimal prixBase = abo.getPrixSnapshot() != null
                && abo.getPrixSnapshot().compareTo(BigDecimal.ZERO) > 0
                ? abo.getPrixSnapshot()
                : BigDecimal.ZERO;

        // TVA selon BillingSettings du client
        BillingSettings settings = billingSettingsRepository
                .findByClientId(abo.getClient().getId())
                .orElse(null);
        BigDecimal vatRate = settings != null && settings.getVatRate() != null
                ? settings.getVatRate() : BigDecimal.ZERO;

        BigDecimal totalHt  = prixBase;
        BigDecimal totalTtc = totalHt.multiply(BigDecimal.ONE.add(vatRate))
                .setScale(2, RoundingMode.HALF_UP);

        // Déduire les avoirs PENDING du client
        BigDecimal creditApplique = appliquerAvoirs(abo.getClient(), totalTtc);
        BigDecimal totalFinal = totalTtc.subtract(creditApplique)
                .max(BigDecimal.ZERO); // jamais négatif

        Invoice invoice = Invoice.builder()
                .abonnement(abo)
                .client(abo.getClient())
                .periodStart(debut)
                .periodEnd(fin)
                .totalHt(totalHt)
                .status(InvoiceStatus.EMISE)
                .issuedAt(LocalDateTime.now())
                .build();

        invoice = invoiceRepository.save(invoice);

        // Créer les lignes de détail
        creerLignesFacture(invoice, abo, prixBase, vatRate, creditApplique, mois);

        log.info("[BILLING] Facture id={} créée — client={} total={}",
                invoice.getId(), abo.getClient().getEmail(), totalFinal);
        return invoice;
    }*/

    // ── Créer les lignes de détail ────────────────────────────────────────────
    private void creerLignesFacture(Invoice invoice,
                                    Abonnement abo,
                                    BigDecimal prixBase,
                                    BigDecimal vatRate,
                                    BigDecimal creditApplique,
                                    YearMonth mois) {
        // Ligne 1 : abonnement de base
        InvoiceLine ligne1 = InvoiceLine.builder()
                .invoice(invoice)
                .description(abo.getPlan().getService().getName()
                        + " — " + abo.getPlan().getName()
                        + " — " + mois.getMonth().getDisplayName(
                        TextStyle.FULL, Locale.FRENCH)
                        + " " + mois.getYear())
                .quantity(BigDecimal.ONE)
                .unitPrice(prixBase)
                .amount(prixBase)
                .lineType(InvoiceLineType.SUBSCRIPTION)
                .resourceName(abo.getDeployment() != null
                        ? abo.getDeployment().getResourceName() : null)
                .build();
        invoiceLineRepository.save(ligne1);

        // Ligne 2 : TVA si applicable
        if (vatRate.compareTo(BigDecimal.ZERO) > 0) {
            BigDecimal montantTva = prixBase.multiply(vatRate)
                    .setScale(2, RoundingMode.HALF_UP);
            InvoiceLine ligneTva = InvoiceLine.builder()
                    .invoice(invoice)
                    .description("TVA " + vatRate.multiply(BigDecimal.valueOf(100))
                            .stripTrailingZeros() + "%")
                    .quantity(BigDecimal.ONE)
                    .unitPrice(montantTva)
                    .amount(montantTva)
                    .lineType(InvoiceLineType.TAX)
                    .build();
            invoiceLineRepository.save(ligneTva);
        }

        // Ligne 3 : avoir appliqué (si > 0)
        if (creditApplique.compareTo(BigDecimal.ZERO) > 0) {
            InvoiceLine ligneAvoir = InvoiceLine.builder()
                    .invoice(invoice)
                    .description("Avoir appliqué")
                    .quantity(BigDecimal.ONE)
                    .unitPrice(creditApplique.negate())
                    .amount(creditApplique.negate())
                    .lineType(InvoiceLineType.CREDIT)
                    .build();
            invoiceLineRepository.save(ligneAvoir);
        }
    }

    // ── Appliquer les avoirs disponibles du client ────────────────────────────
    // Retourne le montant total d'avoirs déduits
    private BigDecimal appliquerAvoirs(Client client, BigDecimal montantFacture) {
        List<CreditNote> avoirs = creditNoteRepository
                .findByClientIdAndStatus(client.getId(), CreditNoteStatus.PENDING);

        BigDecimal totalApplique = BigDecimal.ZERO;
        BigDecimal restant       = montantFacture;

        for (CreditNote avoir : avoirs) {
            if (restant.compareTo(BigDecimal.ZERO) <= 0) break;
            BigDecimal applique = avoir.getAmount().min(restant);
            totalApplique = totalApplique.add(applique);
            restant       = restant.subtract(applique);

            avoir.setStatus(CreditNoteStatus.APPLIED);
            avoir.setAppliedAt(LocalDateTime.now());
            creditNoteRepository.save(avoir);
        }
        return totalApplique;
    }

    // ── Clôturer une facture (admin) ──────────────────────────────────────────
    @Transactional
    public Invoice marquerPayee(Long invoiceId) {
        Invoice invoice = invoiceRepository.findById(invoiceId)
                .orElseThrow(() -> new EntityNotFoundException(
                        "Facture introuvable : " + invoiceId));

        if (invoice.getStatus() != InvoiceStatus.EMISE
                && invoice.getStatus() != InvoiceStatus.EN_RETARD) {
            throw new IllegalStateException(
                    "Impossible de marquer PAYEE une facture en statut : "
                            + invoice.getStatus());
        }

        invoice.setStatus(InvoiceStatus.PAYEE);
        invoice.setPaidAt(LocalDateTime.now());
        return invoiceRepository.save(invoice);
    }

    // ── Émettre un avoir (admin) ──────────────────────────────────────────────
    @Transactional
    public CreditNote emettrAvoir(Long invoiceId, BigDecimal montant, String raison) {
        Invoice invoice = invoiceRepository.findById(invoiceId)
                .orElseThrow(() -> new EntityNotFoundException(
                        "Facture introuvable : " + invoiceId));

        if (montant.compareTo(invoice.getTotalHt()) > 0) {
            throw new IllegalArgumentException(
                    "L'avoir ne peut pas dépasser le montant de la facture");
        }

        CreditNote avoir = CreditNote.builder()
                .invoice(invoice)
                .client(invoice.getClient())
                .amount(montant)
                .reason(raison)
                .status(CreditNoteStatus.PENDING)
                .build();

        log.info("[BILLING] Avoir émis : client={} montant={} raison={}",
                invoice.getClient().getEmail(), montant, raison);
        return creditNoteRepository.save(avoir);
    }

    // ── Passer les factures impayées en EN_RETARD ─────────────────────────────
    // Appelée quotidiennement par BillingScheduler
    /*@Transactional
    public int marquerEnRetard() {
        LocalDateTime seuil = LocalDateTime.now().minusDays(30);
        List<Invoice> enRetard = invoiceRepository
                .findByStatusAndIssuedAtBefore(InvoiceStatus.EMISE, seuil);

        enRetard.forEach(inv -> inv.setStatus(InvoiceStatus.EN_RETARD));
        invoiceRepository.saveAll(enRetard);

        if (!enRetard.isEmpty()) {
            log.warn("[BILLING] {} facture(s) passées EN_RETARD", enRetard.size());
        }
        return enRetard.size();
    }*/

    // ── Lecture ───────────────────────────────────────────────────────────────
    @Transactional(readOnly = true)
    public List<InvoiceResponse> getByClient(UUID clientId) {
        return invoiceRepository.findByClientId(clientId)
                .stream().map(this::toResponse).toList();
    }

    @Transactional(readOnly = true)
    public List<InvoiceLine> getLignes(Long invoiceId) {
        return invoiceLineRepository.findByInvoiceId(invoiceId);
    }

    // ── Dashboard admin : stats globales ─────────────────────────────────────
    @Transactional(readOnly = true)
    public Map<String, Object> getStatsAdmin(YearMonth mois) {
        LocalDateTime debut = mois.atDay(1).atStartOfDay();
        LocalDateTime fin   = mois.atEndOfMonth().atTime(23, 59, 59);

        long   nbFactures    = invoiceRepository.countByPeriodStart(debut);
        BigDecimal totalEmis = invoiceRepository.sumTotalHtByPeriod(debut, fin);
        long   nbImpayees    = invoiceRepository
                .countByStatusAndPeriodStart(InvoiceStatus.EMISE, debut);
        long   nbEnRetard    = invoiceRepository
                .countByStatusAndPeriodStart(InvoiceStatus.EN_RETARD, debut);

        return Map.of(
                "mois",         mois.toString(),
                "nbFactures",   nbFactures,
                "totalEmis",    totalEmis != null ? totalEmis : BigDecimal.ZERO,
                "nbImpayees",   nbImpayees,
                "nbEnRetard",   nbEnRetard
        );
    }

    private InvoiceResponse toResponse(Invoice i) {
        InvoiceResponse r = new InvoiceResponse();
        r.setId(i.getId());
        r.setClientId(i.getClient().getId());
        r.setAbonnementId(i.getAbonnement().getId());
        r.setPlanName(i.getAbonnement().getPlan().getName());
        r.setServiceName(i.getAbonnement().getPlan().getService().getName());
        r.setStatus(i.getStatus());
        r.setPeriodStart(i.getPeriodStart());
        r.setPeriodEnd(i.getPeriodEnd());
        r.setTotalHt(i.getTotalHt());
        r.setIssuedAt(i.getIssuedAt());
        r.setPaidAt(i.getPaidAt());
        r.setCreatedAt(i.getCreatedAt());
        return r;
    }
    @Transactional
    public List<Invoice> genererFacturesMensuelles(YearMonth mois) {
        log.info("[BILLING] Génération factures mois={}", mois);

        List<Abonnement> abos = abonnementRepository
                .findByStatusAndBillingCycle(AbonnementStatus.ACTIF, BillingCycle.MENSUEL);

        List<Invoice> results = new ArrayList<>();
        for (Abonnement abo : abos) {
            // ✅ try/catch par abonnement — un échec ne stoppe pas les autres
            try {
                Invoice inv = genererFacture(abo, mois);
                if (inv != null) results.add(inv);
            } catch (Exception e) {
                log.error("[BILLING] Échec facture abo={} : {}", abo.getId(), e.getMessage());
                // continue — les autres abonnements sont traités
            }
        }

        log.info("[BILLING] {} facture(s) générées sur {} abonnements",
                results.size(), abos.size());
        return results;
    }

    @Transactional
    public Invoice genererFacture(Abonnement abo, YearMonth mois) {
        LocalDateTime debut = mois.atDay(1).atStartOfDay();
        LocalDateTime fin   = mois.atEndOfMonth().atTime(23, 59, 59);

        // Idempotence
        if (invoiceRepository.existsByAbonnementIdAndPeriodStart(abo.getId(), debut)) {
            log.debug("[BILLING] Facture déjà existante abo={} mois={}", abo.getId(), mois);
            return invoiceRepository
                    .findByAbonnementIdAndPeriodStart(abo.getId(), debut)
                    .orElse(null);
        }

        // ✅ CORRECTION BUG : utiliser prixSnapshot, pas le prix courant du plan
        BigDecimal prixBase = abo.getPrixSnapshot() != null
                && abo.getPrixSnapshot().compareTo(BigDecimal.ZERO) > 0
                ? abo.getPrixSnapshot()
                : BigDecimal.ZERO;

        // TVA selon BillingSettings
        BillingSettings settings = billingSettingsRepository
                .findByClientId(abo.getClient().getId())
                .orElse(null);
        BigDecimal vatRate = settings != null && settings.getVatRate() != null
                ? settings.getVatRate() : BigDecimal.ZERO;

        BigDecimal totalHt  = prixBase;
        BigDecimal totalTtc = totalHt.multiply(BigDecimal.ONE.add(vatRate))
                .setScale(2, RoundingMode.HALF_UP);

        // Appliquer les avoirs PENDING
        BigDecimal creditApplique = appliquerAvoirs(abo.getClient(), totalTtc);

        Invoice invoice = Invoice.builder()
                .abonnement(abo)
                .client(abo.getClient())          // ✅ renseigner client
                .periodStart(debut)
                .periodEnd(fin)
                .totalHt(totalHt)
                .status(InvoiceStatus.EMISE)
                .issuedAt(LocalDateTime.now())
                .build();

        invoice = invoiceRepository.save(invoice);
        creerLignesFacture(invoice, abo, prixBase, vatRate, creditApplique, mois);

        // ✅ Envoyer l'email facture (non bloquant)
        try {
            String period = mois.getMonth()
                    .getDisplayName(TextStyle.FULL, Locale.FRENCH)
                    + " " + mois.getYear();
            emailService.sendInvoiceEmail(
                    abo.getClient().getEmail(),
                    abo.getClient().getFirstName() + " " + abo.getClient().getLastName(),
                    abo.getPlan().getName(),
                    abo.getPlan().getService().getName(),
                    period,
                    totalHt,
                    invoice.getId()
            );
        } catch (Exception e) {
            log.warn("[BILLING] Email facture non envoyé abo={} : {}", abo.getId(), e.getMessage());
        }

        log.info("[BILLING] Facture id={} créée — client={} total={}",
                invoice.getId(), abo.getClient().getEmail(), totalHt);
        return invoice;
    }

    // ✅ marquerEnRetard + email de relance
    @Transactional
    public int marquerEnRetard() {
        LocalDateTime seuil = LocalDateTime.now().minusDays(30);
        List<Invoice> enRetard = invoiceRepository
                .findByStatusAndIssuedAtBefore(InvoiceStatus.EMISE, seuil);

        for (Invoice inv : enRetard) {
            inv.setStatus(InvoiceStatus.EN_RETARD);
            invoiceRepository.save(inv);

            // ✅ Email de relance par facture
            try {
                String period = new java.text.SimpleDateFormat("MMMM yyyy",
                        Locale.FRENCH).format(java.util.Date.from(
                        inv.getPeriodStart().atZone(java.time.ZoneId.systemDefault())
                                .toInstant()));
                emailService.sendOverdueReminderEmail(
                        inv.getClient().getEmail(),
                        inv.getClient().getFirstName() + " "
                                + inv.getClient().getLastName(),
                        period,
                        inv.getTotalHt()
                );
            } catch (Exception e) {
                log.warn("[BILLING] Email relance échoué invoice={} : {}",
                        inv.getId(), e.getMessage());
            }
        }

        if (!enRetard.isEmpty())
            log.warn("[BILLING] {} facture(s) → EN_RETARD", enRetard.size());
        return enRetard.size();
    }
    // Ajouter dans InvoiceService.java

    @Transactional(readOnly = true)
    public Page<InvoiceResponse> getAll(Pageable pageable) {
        return invoiceRepository.findAll(pageable)
                .map(this::toResponse);
    }

    // toResponsePublic est identique à toResponse — juste exposer la méthode publiquement
    public InvoiceResponse toResponsePublic(Invoice invoice) {
        return toResponse(invoice);
    }
    public List<InvoiceResponse> getByKeycloakId(String keycloakId) {
        User user = userRepository.findByKeycloakId(keycloakId)
                .orElseThrow(() -> new EntityNotFoundException(
                        "Utilisateur introuvable : " + keycloakId));
        return invoiceRepository.findByClientId(user.getId())
                .stream().map(this::toResponse).toList();
    }
}