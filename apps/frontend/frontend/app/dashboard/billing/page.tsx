"use client"

import * as React from "react"
import { SidebarInset, SidebarTrigger } from "@/components/ui/sidebar"
import { Separator } from "@/components/ui/separator"
import {
  IconFileInvoice, IconChevronDown, IconChevronUp,
  IconLoader2, IconAlertCircle, IconCircleCheck,
  IconClock, IconBan, IconReceipt,
} from "@tabler/icons-react"
import { cn } from "@/lib/utils"
import { useMyInvoices, useInvoiceLines } from "@/lib/hooks/useApi"
import type { InvoiceResponse, InvoiceLineDTO, InvoiceStatus } from "@/lib/types"

// ── Config statuts ────────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<InvoiceStatus, {
  label: string
  icon: React.ReactNode
  badge: string
}> = {
  BROUILLON: {
    label: "Brouillon",
    icon: <IconClock className="size-3" />,
    badge: "bg-zinc-100 text-zinc-600 ring-1 ring-zinc-200 dark:bg-zinc-800 dark:text-zinc-400",
  },
  EMISE: {
    label: "En attente",
    icon: <IconClock className="size-3" />,
    badge: "bg-amber-50 text-amber-700 ring-1 ring-amber-200 dark:bg-amber-950/40 dark:text-amber-400",
  },
  PAYEE: {
    label: "Payée",
    icon: <IconCircleCheck className="size-3" />,
    badge: "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400",
  },
  EN_RETARD: {
    label: "En retard",
    icon: <IconBan className="size-3" />,
    badge: "bg-red-50 text-red-700 ring-1 ring-red-200 dark:bg-red-950/40 dark:text-red-400",
  },
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("fr-FR", {
    day: "2-digit", month: "short", year: "numeric",
  })
}

function formatPeriod(start: string, end: string) {
  const s = new Date(start)
  return s.toLocaleDateString("fr-FR", { month: "long", year: "numeric" })
}

function formatAmount(n: number) {
  return n.toFixed(3) + " TND"
}

// ── Composant ligne détail ────────────────────────────────────────────────────

function InvoiceLines({ invoiceId }: { invoiceId: number }) {
  const { data: lines, loading } = useInvoiceLines(invoiceId)

  const LINE_TYPE_LABEL: Record<string, string> = {
    SUBSCRIPTION: "Abonnement",
    ADDON:        "Option",
    CREDIT:       "Avoir",
    TAX:          "TVA",
  }

  if (loading) return (
    <div className="px-4 pb-4">
      <div className="space-y-1.5">
        {[1, 2].map(i => (
          <div key={i} className="h-8 rounded bg-muted/50 animate-pulse" />
        ))}
      </div>
    </div>
  )

  if (!lines?.length) return (
    <p className="px-4 pb-4 text-xs text-muted-foreground">Aucun détail disponible.</p>
  )

  return (
    <div className="px-4 pb-4">
      <table className="w-full text-xs">
        <thead>
          <tr className="border-b border-border/40">
            <th className="text-left py-1.5 text-muted-foreground font-medium">Description</th>
            <th className="text-right py-1.5 text-muted-foreground font-medium">Qté</th>
            <th className="text-right py-1.5 text-muted-foreground font-medium">P.U.</th>
            <th className="text-right py-1.5 text-muted-foreground font-medium">Montant</th>
          </tr>
        </thead>
        <tbody>
          {lines.map(line => (
            <tr key={line.id} className="border-b border-border/20 last:border-0">
              <td className="py-1.5 pr-4">
                <span>{line.description}</span>
                {line.resourceName && (
                  <span className="ml-2 text-muted-foreground/60 font-mono">
                    {line.resourceName}
                  </span>
                )}
              </td>
              <td className="py-1.5 text-right tabular-nums text-muted-foreground">
                {line.quantity}
              </td>
              <td className="py-1.5 text-right tabular-nums text-muted-foreground">
                {formatAmount(line.unitPrice)}
              </td>
              <td className={cn(
                "py-1.5 text-right tabular-nums font-medium",
                line.lineType === "CREDIT" && "text-emerald-600"
              )}>
                {line.lineType === "CREDIT" && "- "}
                {formatAmount(Math.abs(line.amount))}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

// ── Carte facture ─────────────────────────────────────────────────────────────

function InvoiceCard({ invoice }: { invoice: InvoiceResponse }) {
  const [expanded, setExpanded] = React.useState(false)
  const cfg = STATUS_CONFIG[invoice.status] ?? STATUS_CONFIG.EMISE

  return (
    <div className={cn(
      "rounded-xl border border-border/60 bg-card overflow-hidden transition-shadow",
      expanded && "shadow-sm"
    )}>
      {/* En-tête cliquable */}
      <button
        className="w-full flex items-center gap-4 px-4 py-3.5 text-left hover:bg-muted/20 transition-colors"
        onClick={() => setExpanded(v => !v)}
      >
        {/* Icône */}
        <div className="size-9 rounded-lg bg-muted/60 border border-border/40 flex items-center justify-center flex-shrink-0">
          <IconReceipt className="size-4 text-muted-foreground" />
        </div>

        {/* Infos principales */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-medium">
              {invoice.serviceName} — {invoice.planName}
            </span>
            <span className={cn(
              "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium",
              cfg.badge
            )}>
              {cfg.icon}
              {cfg.label}
            </span>
          </div>
          <p className="text-[11px] text-muted-foreground mt-0.5">
            Période : {formatPeriod(invoice.periodStart, invoice.periodEnd)}
            {" · "}
            Émise le {formatDate(invoice.issuedAt)}
            {invoice.paidAt && ` · Payée le ${formatDate(invoice.paidAt)}`}
          </p>
        </div>

        {/* Montant + chevron */}
        <div className="flex items-center gap-3 flex-shrink-0">
          <span className="text-sm font-semibold tabular-nums font-mono">
            {formatAmount(invoice.totalHt)}
          </span>
          {expanded
            ? <IconChevronUp className="size-4 text-muted-foreground" />
            : <IconChevronDown className="size-4 text-muted-foreground" />
          }
        </div>
      </button>

      {/* Détail lignes */}
      {expanded && (
        <div className="border-t border-border/40 bg-muted/10">
          <InvoiceLines invoiceId={invoice.id} />
        </div>
      )}
    </div>
  )
}

// ── Résumé stats ──────────────────────────────────────────────────────────────

function BillingSummary({ invoices }: { invoices: InvoiceResponse[] }) {
  const total    = invoices.reduce((s, i) => s + i.totalHt, 0)
  const paid     = invoices.filter(i => i.status === "PAYEE").reduce((s, i) => s + i.totalHt, 0)
  const pending  = invoices.filter(i => i.status === "EMISE").reduce((s, i) => s + i.totalHt, 0)
  const overdue  = invoices.filter(i => i.status === "EN_RETARD").length

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
      {[
        { label: "Total facturé",  value: formatAmount(total),   color: "text-foreground" },
        { label: "Payé",           value: formatAmount(paid),    color: "text-emerald-600" },
        { label: "En attente",     value: formatAmount(pending), color: "text-amber-600" },
        { label: "En retard",      value: String(overdue),       color: overdue > 0 ? "text-red-600" : "text-muted-foreground" },
      ].map(({ label, value, color }) => (
        <div key={label}
          className="rounded-xl border border-border/60 bg-card px-4 py-3">
          <p className="text-[11px] text-muted-foreground mb-1">{label}</p>
          <p className={cn("text-lg font-semibold tabular-nums", color)}>{value}</p>
        </div>
      ))}
    </div>
  )
}

// ── Page principale ───────────────────────────────────────────────────────────

export default function BillingPage() {
  const { data: invoices, loading, error, reload } = useMyInvoices()

  // Filtrer par année sélectionnée
  const [year, setYear] = React.useState(new Date().getFullYear())

  const filtered = React.useMemo(() => {
    if (!invoices) return []
    return invoices
      .filter(i => new Date(i.periodStart).getFullYear() === year)
      .sort((a, b) => new Date(b.issuedAt).getTime() - new Date(a.issuedAt).getTime())
  }, [invoices, year])

  const availableYears = React.useMemo(() => {
    if (!invoices?.length) return [new Date().getFullYear()]
    const years = [...new Set(invoices.map(i => new Date(i.periodStart).getFullYear()))]
    return years.sort((a, b) => b - a)
  }, [invoices])

  return (
    <SidebarInset>

      {/* Header */}
      <header className="flex h-14 items-center gap-3 border-b border-border/60 px-5 bg-background/95 backdrop-blur sticky top-0 z-10">
        <SidebarTrigger className="-ml-1 size-8 text-muted-foreground hover:text-foreground hover:bg-muted rounded-md transition-colors" />
        <Separator orientation="vertical" className="h-4 opacity-40" />
        <nav className="flex items-center gap-1.5 text-[13px]">
          <span className="text-muted-foreground">Dashboard</span>
          <span className="text-muted-foreground/30">/</span>
          <span className="font-medium text-foreground">Facturation</span>
        </nav>
      </header>

      <div className="flex flex-1 flex-col gap-6 py-6 px-4 lg:px-6 max-w-3xl mx-auto w-full">

        {/* Titre */}
        <div>
          <div className="flex items-center gap-2 mb-1">
            <IconFileInvoice className="size-5 text-[#0a7fcf]" />
            <h1 className="text-xl font-semibold">Mes factures</h1>
          </div>
          <p className="text-[13px] text-muted-foreground">
            Historique de vos factures et détail des lignes de facturation.
          </p>
        </div>

        {/* Erreur */}
        {error && (
          <div className="flex items-center gap-2 rounded-xl border border-destructive/30 bg-destructive/5 px-3 py-2.5 text-sm text-destructive">
            <IconAlertCircle className="size-4 flex-shrink-0" />
            {error}
          </div>
        )}

        {/* Chargement */}
        {loading && (
          <div className="flex items-center justify-center py-20">
            <IconLoader2 className="size-5 animate-spin text-muted-foreground" />
          </div>
        )}

        {!loading && invoices && (
          <>
            {/* Résumé stats */}
            {invoices.length > 0 && <BillingSummary invoices={invoices} />}

            {/* Filtre année */}
            {availableYears.length > 1 && (
              <div className="flex items-center gap-1.5">
                {availableYears.map(y => (
                  <button
                    key={y}
                    onClick={() => setYear(y)}
                    className={cn(
                      "px-3 py-1 text-xs rounded-full border transition-all font-medium",
                      year === y
                        ? "bg-[#0a7fcf] text-white border-[#0a7fcf]"
                        : "bg-transparent text-muted-foreground border-border/60 hover:border-[#0a7fcf] hover:text-[#0a7fcf]"
                    )}
                  >
                    {y}
                  </button>
                ))}
              </div>
            )}

            {/* Liste factures */}
            {filtered.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-center">
                <div className="size-14 rounded-2xl bg-muted flex items-center justify-center text-2xl mb-4">
                  🧾
                </div>
                <p className="font-medium text-sm text-muted-foreground">
                  Aucune facture pour {year}
                </p>
                <p className="text-xs text-muted-foreground/70 mt-1">
                  Les factures sont générées automatiquement le 1er de chaque mois.
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {filtered.map(invoice => (
                  <InvoiceCard key={invoice.id} invoice={invoice} />
                ))}
              </div>
            )}
          </>
        )}

      </div>
    </SidebarInset>
  )
}