// lib/services/billing.api.ts
import { apiFetch } from "@/lib/apiClient"
import type { InvoiceResponse, InvoiceLineDTO, CreditNoteResponse } from "@/lib/types"

// ── Types ─────────────────────────────────────────────────────────────────────
// Voir section suivante — à ajouter dans lib/types.ts

// ── CLIENT — lire ses factures ────────────────────────────────────────────────

export const getMyInvoices = (userId: string) =>
  apiFetch<InvoiceResponse[]>(`/api/billing/invoices/client/${userId}`)

export const getInvoiceLines = (invoiceId: number) =>
  apiFetch<InvoiceLineDTO[]>(`/api/billing/invoices/${invoiceId}/lines`)

// ── ADMIN — toutes les factures ───────────────────────────────────────────────

export const getAllInvoices = (page = 0, size = 50) =>
  apiFetch<{ content: InvoiceResponse[]; totalElements: number }>(
    `/api/billing/invoices/all?page=${page}&size=${size}`
  )
export const getInvoiceStats = (yearMonth: string) =>
  apiFetch<{
    mois: string
    nbFactures: number
    totalEmis: number
    nbImpayees: number
    nbEnRetard: number
  }>(`/api/billing/invoices/stats?mois=${yearMonth}`)

export const markInvoicePaid = (invoiceId: number) =>
  apiFetch<InvoiceResponse>(`/api/billing/invoices/${invoiceId}/paid`, {
    method: "PATCH",
  })

export const emitCreditNote = (
  invoiceId: number,
  data: { montant: number; raison: string }
) =>
  apiFetch<CreditNoteResponse>(`/api/billing/invoices/${invoiceId}/avoir`, {
    method: "POST",
    body: JSON.stringify(data),
  })

// ── ADMIN — générer manuellement (hors scheduler) ────────────────────────────

export const generateMonthlyInvoices = (yearMonth: string) =>
  apiFetch<{ count: number }>(`/api/billing/invoices/generate`, {
    method: "POST",
    body: JSON.stringify({ yearMonth }),
  })

