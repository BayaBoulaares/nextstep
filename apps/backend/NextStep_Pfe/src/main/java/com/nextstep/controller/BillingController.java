package com.nextstep.controller;

import com.nextstep.dto.InvoiceResponse;
import com.nextstep.entity.CreditNote;
import com.nextstep.entity.InvoiceLine;
import com.nextstep.service.InvoiceService;
import com.nextstep.service.UsageService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.time.YearMonth;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/billing/invoices")
@RequiredArgsConstructor
public class BillingController {

    private final InvoiceService invoiceService;
    private final UsageService usageService;


    @GetMapping("/{id}/lines")
    @PreAuthorize("hasAnyRole('client','admin')")
    public List<InvoiceLine> getLines(@PathVariable Long id) {
        return invoiceService.getLignes(id);
    }

    // ── ADMIN ─────────────────────────────────────────────────────────────────

    /*@GetMapping
    @PreAuthorize("hasRole('admin')")
    public Page<InvoiceResponse> getAll(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        return invoiceService.getAll(PageRequest.of(page, size,
                Sort.by(Sort.Direction.DESC, "issuedAt")));
    }*/

    @GetMapping("/stats")
    @PreAuthorize("hasRole('admin')")
    public Map<String, Object> getStats(@RequestParam String mois) {
        return invoiceService.getStatsAdmin(YearMonth.parse(mois));
    }

    @PatchMapping("/{id}/paid")
    @PreAuthorize("hasRole('admin')")
    public InvoiceResponse markPaid(@PathVariable Long id) {
        return invoiceService.toResponsePublic(invoiceService.marquerPayee(id));
    }

    @PostMapping("/{id}/avoir")
    @PreAuthorize("hasRole('admin')")
    public CreditNote emitAvoir(
            @PathVariable Long id,
            @RequestBody Map<String, Object> body) {
        BigDecimal montant = new BigDecimal(body.get("montant").toString());
        String raison = body.get("raison").toString();
        return invoiceService.emettrAvoir(id, montant, raison);
    }

    @PostMapping("/generate")
    @PreAuthorize("hasRole('admin')")
    public Map<String, Integer> generate(@RequestBody Map<String, String> body) {
        YearMonth mois = YearMonth.parse(body.get("yearMonth"));
        List<?> generated = invoiceService.genererFacturesMensuelles(mois);
        return Map.of("count", generated.size());
    }
    @GetMapping("/client/{keycloakId}")
    @PreAuthorize("hasAnyRole('client', 'admin')")
    public List<InvoiceResponse> getByClient(@PathVariable String keycloakId) {
        return invoiceService.getByKeycloakId(keycloakId);
    }
    // Renommer pour éviter le conflit de routing
    @GetMapping("/all")   // ← était "/", changer en "/all"
    @PreAuthorize("hasRole('admin')")
    public Page<InvoiceResponse> getAll(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        return invoiceService.getAll(
                PageRequest.of(page, size,
                        Sort.by(Sort.Direction.DESC, "issuedAt")));
    }
}