package com.nextstep.scheduler;

import com.nextstep.entity.AbonnementStatus;
import com.nextstep.repository.AbonnementRepository;
import com.nextstep.service.UsageService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.time.YearMonth;

@Slf4j
@Component
@RequiredArgsConstructor
public class UsageCollectorScheduler {

    private final UsageService         usageService;
    private final AbonnementRepository abonnementRepository;

    @Scheduled(cron = "0 5 0 1 * *")
    public void genererFacturesMensuelles() {
        YearMonth moisPrecedent = YearMonth.now().minusMonths(1);

        var abonnements = abonnementRepository.findByStatus(AbonnementStatus.ACTIF);

        log.info("[SCHEDULER] Génération factures {} — {} abonnements actifs",
                moisPrecedent, abonnements.size());

        for (var abo : abonnements) {
            try {
                usageService.genererFactureMois(abo.getId(), moisPrecedent);
            } catch (Exception e) {
                log.error("[SCHEDULER] Erreur facturation abo={} : {}",
                        abo.getId(), e.getMessage());
            }
        }
    }
}