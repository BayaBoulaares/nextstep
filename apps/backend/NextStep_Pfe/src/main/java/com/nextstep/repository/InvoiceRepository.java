package com.nextstep.repository;


import com.nextstep.entity.Invoice;
import com.nextstep.entity.InvoiceStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface InvoiceRepository extends JpaRepository<Invoice, Long> {

    List<Invoice> findByClientId(UUID clientId);

    List<Invoice> findByClientIdAndStatus(UUID clientId, InvoiceStatus status);

    /** Vérifier qu'une facture n'existe pas déjà pour cet abonnement + période. */
    boolean existsByAbonnementIdAndPeriodStart(Long abonnementId, java.time.LocalDateTime periodStart);
}