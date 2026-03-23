package com.nextstep.scheduler;

import com.nextstep.entity.AbonnementStatus;
import com.nextstep.repository.AbonnementRepository;
import com.nextstep.service.UsageService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.time.YearMonth;

/**
 * Le 1er de chaque mois à 01:00 :
 * génère les factures PAYG pour le mois précédent.
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class InvoiceScheduler {

    private final UsageService         usageService;
    private final AbonnementRepository abonnementRepository;

    @Scheduled(cron = "0 0 1 1 * *")
    public void genererFacturesMensuelles() {
        YearMonth moisPrecedent = YearMonth.now().minusMonths(1);
        log.info("[INVOICE-SCHEDULER] Génération factures pour {}", moisPrecedent);

        abonnementRepository
                .findByStatusAndPlan_IsPayAsYouGoTrue(AbonnementStatus.ACTIF)
                .forEach(abo -> {
                    try {
                        usageService.genererFactureMois(abo.getId(), moisPrecedent);
                    } catch (Exception e) {
                        log.error("[INVOICE-SCHEDULER] Erreur abo={} : {}",
                                abo.getId(), e.getMessage());
                    }
                });
    }
}