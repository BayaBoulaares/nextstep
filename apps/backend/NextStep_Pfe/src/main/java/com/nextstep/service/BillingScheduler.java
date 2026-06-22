package com.nextstep.service;

import com.nextstep.entity.Invoice;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.time.YearMonth;
import java.util.List;

@Component
@RequiredArgsConstructor
@Slf4j
public class BillingScheduler {

    private final InvoiceService invoiceService;

    @Scheduled(cron = "0 0 2 1 * *")
    public void genererFacturesMensuelles() {
        YearMonth moisPrecedent = YearMonth.now().minusMonths(1);
        log.info("[SCHEDULER] Génération factures pour {}", moisPrecedent);
        try {
            List<Invoice> generees = invoiceService
                    .genererFacturesMensuelles(moisPrecedent);
            log.info("[SCHEDULER] {} facture(s) générées", generees.size());
        } catch (Exception e) {
            // ✅ Le scheduler ne doit jamais crasher
            log.error("[SCHEDULER] Erreur génération : {}", e.getMessage(), e);
        }
    }

    @Scheduled(cron = "0 0 3 * * *")
    public void verifierFacturesEnRetard() {
        log.info("[SCHEDULER] Vérification retards");
        try {
            int count = invoiceService.marquerEnRetard();
            if (count > 0)
                log.warn("[SCHEDULER] {} facture(s) → EN_RETARD + relance envoyée",
                        count);
        } catch (Exception e) {
            log.error("[SCHEDULER] Erreur retards : {}", e.getMessage(), e);
        }
    }
}