package com.nextstep.scheduler;

import com.nextstep.entity.AbonnementStatus;
import com.nextstep.entity.UsageMetricType;
import com.nextstep.repository.AbonnementRepository;
import com.nextstep.service.UsageService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.math.BigDecimal;
import java.time.LocalDateTime;

/**
 * Collecte la consommation PAYG toutes les heures pour tous les abonnements
 * actifs liés à un plan Pay-As-You-Go.
 *
 * Dans un vrai projet, la mesure viendrait d'une API infra (Prometheus, Zabbix…).
 * Ici on simule avec les specs du plan (vcores, ramGb).
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class UsageCollectorScheduler {

    private final UsageService         usageService;
    private final AbonnementRepository abonnementRepository;

    /** Toutes les heures — pile à H:00:00 */
    @Scheduled(cron = "0 0 * * * *")
    public void collecterUsageHoraire() {
        LocalDateTime fin   = LocalDateTime.now();
        LocalDateTime debut = fin.minusHours(1);

        var abonnements = abonnementRepository
                .findByStatusAndPlan_IsPayAsYouGoTrue(AbonnementStatus.ACTIF);

        log.info("[SCHEDULER] Collecte PAYG — {} abonnements actifs", abonnements.size());

        for (var abo : abonnements) {
            if (abo.getDeployment() == null) continue;

            var plan = abo.getPlan();
            Long aboId = abo.getId();
            Long depId = abo.getDeployment().getId();

            try {
                // vCPU — quantité = nombre de vcores du plan × 1 heure
                if (plan.getVcores() != null) {
                    usageService.enregistrerConsommation(
                            aboId, depId,
                            UsageMetricType.VCPU_HEURE,
                            BigDecimal.valueOf(plan.getVcores()),
                            debut, fin);
                }

                // RAM — quantité = ramGb × 1 heure
                if (plan.getRamGb() != null) {
                    usageService.enregistrerConsommation(
                            aboId, depId,
                            UsageMetricType.RAM_GB_HEURE,
                            BigDecimal.valueOf(plan.getRamGb()),
                            debut, fin);
                }

            } catch (Exception e) {
                log.error("[SCHEDULER] Erreur collecte abo={} dep={} : {}",
                        aboId, depId, e.getMessage());
            }
        }
    }
}
