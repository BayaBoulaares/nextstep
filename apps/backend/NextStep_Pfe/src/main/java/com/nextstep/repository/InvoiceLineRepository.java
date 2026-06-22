package com.nextstep.repository;

import com.nextstep.entity.InvoiceLine;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface InvoiceLineRepository extends JpaRepository<InvoiceLine,Long> {
    List<InvoiceLine> findByInvoiceId(Long invoiceId);

}
