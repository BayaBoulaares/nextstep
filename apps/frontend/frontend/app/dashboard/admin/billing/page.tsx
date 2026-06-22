// app/dashboard/admin/billing/page.tsx
"use client"

import * as React from "react"
import { SidebarInset, SidebarTrigger } from "@/components/ui/sidebar"
import { Separator } from "@/components/ui/separator"
import { IconFileInvoice, IconLoader2, IconAlertCircle,
         IconCircleCheck, IconClock, IconBan } from "@tabler/icons-react"
import { cn } from "@/lib/utils"
import { getAllInvoices, markInvoicePaid, getInvoiceStats } from "@/lib/services/billing.api"
import type { InvoiceResponse, InvoiceStatus } from "@/lib/types"

const STATUS_CONFIG: Record<InvoiceStatus, { label: string; badge: string }> = {
  BROUILLON: { label: "Brouillon", badge: "bg-zinc-100 text-zinc-600 ring-1 ring-zinc-200" },
  EMISE:     { label: "En attente", badge: "bg-amber-50 text-amber-700 ring-1 ring-amber-200" },
  PAYEE:     { label: "Payée", badge: "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200" },
  EN_RETARD: { label: "En retard", badge: "bg-red-50 text-red-700 ring-1 ring-red-200" },
}

function formatAmount(n: number) { return n.toFixed(3) + " TND" }
function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("fr-FR",
    { day: "2-digit", month: "short", year: "numeric" })
}

export default function AdminBillingPage() {
  const [invoices, setInvoices] = React.useState<InvoiceResponse[]>([])
  const [loading,  setLoading]  = React.useState(true)
  const [error,    setError]    = React.useState<string | null>(null)
  const [marking,  setMarking]  = React.useState<number | null>(null)
  const [stats,    setStats]    = React.useState<any>(null)

  const currentMonth = new Date().toISOString().slice(0, 7) // "2026-06"

  const load = React.useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [data, s] = await Promise.all([
        getAllInvoices(0, 50),
        getInvoiceStats(currentMonth).catch(() => null)
      ])
      setInvoices(data.content ?? [])
      setStats(s)
    } catch (e: any) {
      setError(e.message ?? "Erreur chargement factures")
    } finally {
      setLoading(false)
    }
  }, [])

  React.useEffect(() => { load() }, [load])

  async function handleMarkPaid(id: number) {
    setMarking(id)
    try {
      const updated = await markInvoicePaid(id)
      setInvoices(prev => prev.map(i => i.id === id ? updated : i))
    } catch (e: any) {
      setError(e.message)
    } finally {
      setMarking(null)
    }
  }

  return (
    <SidebarInset>
      <header className="flex h-14 items-center gap-3 border-b border-border/60 px-5
                         bg-background/95 backdrop-blur sticky top-0 z-10">
        <SidebarTrigger className="-ml-1 size-8 text-muted-foreground hover:bg-muted rounded-md" />
        <Separator orientation="vertical" className="h-4 opacity-40" />
        <nav className="flex items-center gap-1.5 text-[13px]">
          <span className="text-muted-foreground">Admin</span>
          <span className="text-muted-foreground/30">/</span>
          <span className="font-medium">Facturation</span>
        </nav>
      </header>

      <div className="flex flex-1 flex-col gap-6 py-6 px-4 lg:px-6">

        <div className="flex items-center gap-2">
          <IconFileInvoice className="size-5 text-[#0a7fcf]" />
          <h1 className="text-xl font-semibold">Gestion des factures</h1>
        </div>

        {/* Stats du mois */}
        {stats && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { label: "Factures émises", value: String(stats.nbFactures) },
              { label: "Total HT",        value: formatAmount(stats.totalEmis ?? 0) },
              { label: "En attente",      value: String(stats.nbImpayees) },
              { label: "En retard",       value: String(stats.nbEnRetard) },
            ].map(({ label, value }) => (
              <div key={label}
                className="rounded-xl border border-border/60 bg-card px-4 py-3">
                <p className="text-[11px] text-muted-foreground mb-1">{label}</p>
                <p className="text-lg font-semibold">{value}</p>
              </div>
            ))}
          </div>
        )}

        {error && (
          <div className="flex items-center gap-2 rounded-xl border border-destructive/30
                          bg-destructive/5 px-3 py-2.5 text-sm text-destructive">
            <IconAlertCircle className="size-4 flex-shrink-0" />{error}
          </div>
        )}

        {loading ? (
          <div className="flex justify-center py-20">
            <IconLoader2 className="size-5 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="rounded-xl border border-border/60 overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-muted/30 border-b border-border/60">
                <tr>
                  {["#", "Client", "Service — Plan", "Période",
                    "Montant HT", "Statut", "Action"].map(h => (
                    <th key={h}
                      className="px-4 py-2.5 text-left text-[11px] font-semibold
                                 uppercase tracking-wide text-muted-foreground/70">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {invoices.length === 0 ? (
                  <tr>
                    <td colSpan={7}
                      className="px-4 py-12 text-center text-sm text-muted-foreground">
                      Aucune facture
                    </td>
                  </tr>
                ) : invoices.map(inv => {
                  const cfg = STATUS_CONFIG[inv.status] ?? STATUS_CONFIG.EMISE
                  return (
                    <tr key={inv.id}
                      className="border-b border-border/40 last:border-0
                                 hover:bg-muted/10 transition-colors">
                      <td className="px-4 py-3 text-muted-foreground font-mono text-xs">
                        #{inv.id}
                      </td>
                      <td className="px-4 py-3 text-xs text-muted-foreground">
                        {inv.clientId?.slice(0, 8)}...
                      </td>
                      <td className="px-4 py-3 font-medium">
                        {inv.serviceName} — {inv.planName}
                      </td>
                      <td className="px-4 py-3 text-xs text-muted-foreground">
                        {new Date(inv.periodStart).toLocaleDateString("fr-FR",
                          { month: "long", year: "numeric" })}
                      </td>
                      <td className="px-4 py-3 font-mono font-semibold">
                        {formatAmount(inv.totalHt)}
                      </td>
                      <td className="px-4 py-3">
                        <span className={cn(
                          "inline-flex items-center px-2 py-0.5 rounded-full",
                          "text-[10px] font-medium", cfg.badge
                        )}>
                          {cfg.label}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        {(inv.status === "EMISE" || inv.status === "EN_RETARD") && (
                          <button
                            onClick={() => handleMarkPaid(inv.id)}
                            disabled={marking === inv.id}
                            className="flex items-center gap-1 px-2.5 py-1 text-xs
                                       rounded-lg bg-emerald-50 text-emerald-700
                                       border border-emerald-200 hover:bg-emerald-100
                                       disabled:opacity-50 transition-colors"
                          >
                            {marking === inv.id
                              ? <IconLoader2 className="size-3 animate-spin" />
                              : <IconCircleCheck className="size-3" />
                            }
                            Marquer payée
                          </button>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </SidebarInset>
  )
}