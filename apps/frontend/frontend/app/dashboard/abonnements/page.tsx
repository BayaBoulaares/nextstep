"use client"

import * as React from "react"
import { SidebarInset, SidebarTrigger } from "@/components/ui/sidebar"
import { Separator } from "@/components/ui/separator"
import { Button } from "@/components/ui/button"
import {
  Loader2, AlertTriangle, Calendar, Server,
  X, Check, Search, Receipt,
  ChevronLeft, ChevronRight,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { abonnementApi } from "@/app/features/abonnements/services/abonnementApi"
import type { AbonnementResponse, AbonnementStatus } from "@/lib/types"

// ── Constants ─────────────────────────────────────────────────────────────────

const PAGE_SIZE = 8

// ── Helpers ───────────────────────────────────────────────────────────────────

type TabFilter = "tous" | "actif" | "inactif"

const STATUS_LABEL: Record<AbonnementStatus, string> = {
  EN_ATTENTE: "En attente",
  ACTIF:      "Actif",
  SUSPENDU:   "Suspendu",
  RESILIE:    "Résilié",
  EXPIRE:     "Expiré",
}

const STATUS_CLASS: Record<AbonnementStatus, string> = {
  EN_ATTENTE: "bg-amber-50  text-amber-700  border-amber-200",
  ACTIF:      "bg-emerald-50 text-emerald-700 border-emerald-200",
  SUSPENDU:   "bg-orange-50  text-orange-700  border-orange-200",
  RESILIE:    "bg-red-50     text-red-700     border-red-200",
  EXPIRE:     "bg-gray-50    text-gray-500    border-gray-200",
}

const STATUS_DOT: Record<AbonnementStatus, string> = {
  EN_ATTENTE: "bg-amber-400",
  ACTIF:      "bg-emerald-500",
  SUSPENDU:   "bg-orange-400",
  RESILIE:    "bg-red-400",
  EXPIRE:     "bg-gray-300",
}

// Accent color on the left border of each active row
const ROW_ACCENT: Partial<Record<AbonnementStatus, string>> = {
  ACTIF:     "border-l-2 border-l-[#0a7fcf]",
  SUSPENDU:  "border-l-2 border-l-orange-400",
  RESILIE:   "border-l-2 border-l-red-400",
  EN_ATTENTE:"border-l-2 border-l-amber-400",
}

function fmt(iso: string | null): string {
  if (!iso) return "—"
  return new Date(iso).toLocaleDateString("fr-FR", {
    day: "2-digit", month: "short", year: "numeric",
  })
}

// ── StatusBadge ───────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: AbonnementStatus }) {
  return (
    <span className={cn(
      "inline-flex items-center gap-1.5 text-[11px] font-medium px-2 py-0.5 rounded-full border whitespace-nowrap",
      STATUS_CLASS[status],
    )}>
      <span className={cn("w-1.5 h-1.5 rounded-full shrink-0", STATUS_DOT[status])} />
      {STATUS_LABEL[status]}
    </span>
  )
}

// ── Metric ────────────────────────────────────────────────────────────────────

type MetricVariant = "blue" | "neutral" | "orange"

const METRIC_STYLES: Record<MetricVariant, {
  card: string
  topBorder: string
  value: string
  pill?: string
  icon: string
}> = {
  blue: {
    card:      "bg-card border-border/50",
    topBorder: "bg-[#0a7fcf]",
    value:     "text-[#0a7fcf]",
    pill:      "bg-emerald-50 text-emerald-700 border border-emerald-200",
    icon:      "text-[#0a7fcf]/20",
  },
  neutral: {
    card:      "bg-card border-border/50",
    topBorder: "bg-border",
    value:     "text-foreground",
    icon:      "text-muted-foreground/15",
  },
  orange: {
    card:      "bg-card border-border/50",
    topBorder: "bg-orange-400",
    value:     "text-orange-600",
    pill:      "bg-orange-50 text-orange-700 border border-orange-200",
    icon:      "text-orange-400/20",
  },
}

function Metric({ label, value, sub, variant = "neutral", pill, icon }: {
  label: string
  value: string | number
  sub: string
  variant?: MetricVariant
  pill?: string
  icon?: React.ReactNode
}) {
  const s = METRIC_STYLES[variant]
  return (
    <div className={cn("rounded-xl border overflow-hidden transition-colors relative", s.card)}>
      {/* Top accent bar */}
      <div className={cn("h-[3px] w-full", s.topBorder)} />
      <div className="p-4">
        {/* Background icon */}
        {icon && (
          <div className={cn("absolute right-3 top-5 text-[40px] pointer-events-none select-none", s.icon)}
            aria-hidden="true">
            {icon}
          </div>
        )}
        <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-[0.06em] mb-2">{label}</p>
        <p className={cn("text-[26px] font-semibold leading-none mb-1", s.value)}>{value}</p>
        <p className="text-[11px] text-muted-foreground">{sub}</p>
        {pill && s.pill && (
          <span className={cn(
            "inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full mt-2.5",
            s.pill,
          )}>
            {pill}
          </span>
        )}
      </div>
    </div>
  )
}

// ── Pagination ────────────────────────────────────────────────────────────────

function Pagination({
  page,
  total,
  pageSize,
  onPageChange,
}: {
  page: number
  total: number
  pageSize: number
  onPageChange: (p: number) => void
}) {
  const totalPages = Math.ceil(total / pageSize)
  if (totalPages <= 1) return null

  const from = (page - 1) * pageSize + 1
  const to   = Math.min(page * pageSize, total)

  // Build page numbers: always show first, last, current ± 1, with ellipsis
  const pages: (number | "…")[] = []
  const add = (n: number) => { if (!pages.includes(n)) pages.push(n) }
  add(1)
  if (page > 3)          pages.push("…")
  if (page > 2)          add(page - 1)
                          add(page)
  if (page < totalPages - 1) add(page + 1)
  if (page < totalPages - 2) pages.push("…")
  add(totalPages)

  return (
    <div className="flex items-center justify-between px-4 py-3 border-t border-border">
      <p className="text-[12px] text-muted-foreground">
        {from}–{to} sur <span className="font-medium text-foreground">{total}</span>
      </p>

      <div className="flex items-center gap-1">
        <button
          onClick={() => onPageChange(page - 1)}
          disabled={page === 1}
          className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors disabled:opacity-30 disabled:pointer-events-none"
          aria-label="Page précédente"
        >
          <ChevronLeft className="w-3.5 h-3.5" />
        </button>

        {pages.map((p, i) =>
          p === "…" ? (
            <span key={`ellipsis-${i}`} className="px-2 text-[12px] text-muted-foreground select-none">
              …
            </span>
          ) : (
            <button
              key={p}
              onClick={() => onPageChange(p as number)}
              className={cn(
                "min-w-[28px] h-7 px-1.5 rounded-md text-[12px] font-medium transition-colors",
                page === p
                  ? "bg-[#0a7fcf] text-white"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted",
              )}
            >
              {p}
            </button>
          )
        )}

        <button
          onClick={() => onPageChange(page + 1)}
          disabled={page === totalPages}
          className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors disabled:opacity-30 disabled:pointer-events-none"
          aria-label="Page suivante"
        >
          <ChevronRight className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  )
}

// ── Detail panel ──────────────────────────────────────────────────────────────

function DetailPanel({
  abo,
  onClose,
  onResilier,
}: {
  abo: AbonnementResponse
  onClose: () => void
  onResilier: (id: number) => Promise<void>
}) {
  const [confirming, setConfirming] = React.useState(false)
  const [loading,    setLoading]    = React.useState(false)

  const handleResilier = async () => {
    setLoading(true)
    try { await onResilier(abo.id) }
    finally { setLoading(false); setConfirming(false) }
  }

  return (
    <div className="w-64 shrink-0 border-l border-border bg-card overflow-y-auto">

      {/* Header — accent strip */}
      <div className="h-1 bg-gradient-to-r from-[#0a7fcf] to-[#38b2f8]" />

      <div className="flex items-start justify-between p-4 border-b border-border">
        <div className="min-w-0">
          <p className="text-[14px] font-semibold text-foreground truncate">{abo.serviceName}</p>
          <p className="text-[11px] text-muted-foreground mt-0.5">
            Plan&nbsp;<span className="text-[#0a7fcf] font-medium">{abo.planName}</span>
          </p>
        </div>
        <button
          onClick={onClose}
          className="p-1 ml-2 shrink-0 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
          aria-label="Fermer"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="p-4 space-y-5">

        {/* Statut */}
        <section className="space-y-2">
          <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-[0.07em]">Statut</p>
          <StatusBadge status={abo.status} />
        </section>

        {/* Dates */}
        <section className="space-y-2">
          <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-[0.07em] pb-1.5 border-b border-border">
            Période
          </p>
          <div className="space-y-2.5">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-1.5 text-[12px] text-muted-foreground shrink-0">
                <Calendar className="w-3.5 h-3.5" />Depuis
              </div>
              <span className="text-[12px] font-medium text-foreground">{fmt(abo.dateDebut)}</span>
            </div>

            {abo.dateFin ? (
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-1.5 text-[12px] text-muted-foreground shrink-0">
                  <Calendar className="w-3.5 h-3.5" />Fin prévue
                </div>
                <span className="text-[12px] font-medium text-foreground">{fmt(abo.dateFin)}</span>
              </div>
            ) : (
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-1.5 text-[12px] text-muted-foreground shrink-0">
                  <Calendar className="w-3.5 h-3.5" />Renouvellement
                </div>
                <span className="text-[12px] font-medium text-emerald-600">Automatique</span>
              </div>
            )}

            {abo.dateResiliation && (
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-1.5 text-[12px] text-muted-foreground shrink-0">
                  <Calendar className="w-3.5 h-3.5" />Résilié le
                </div>
                <span className="text-[12px] font-medium text-red-600">{fmt(abo.dateResiliation)}</span>
              </div>
            )}
          </div>
        </section>

        {/* Ressource */}
        {abo.resourceName ? (
          <section className="space-y-2">
            <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-[0.07em] pb-1.5 border-b border-border">
              Ressource
            </p>
            <div className="flex items-center gap-1.5">
              <Server className="w-3.5 h-3.5 text-[#0a7fcf] shrink-0" />
              <code className="text-[11px] bg-[#0a7fcf]/8 text-[#0a7fcf] px-1.5 py-0.5 rounded font-mono break-all">
                {abo.resourceName}
              </code>
            </div>
          </section>
        ) : abo.status === "ACTIF" ? (
          <section className="space-y-2">
            <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-[0.07em] pb-1.5 border-b border-border">
              Ressource
            </p>
            <div className="flex items-center gap-1.5 text-[12px] text-muted-foreground/60 italic">
              <Server className="w-3.5 h-3.5 opacity-40 shrink-0" />
              Non déployé
            </div>
          </section>
        ) : null}

        {/* Actions */}
        <section className="space-y-2 pt-1 border-t border-border">
          <Button
            variant="outline"
            size="sm"
            className="w-full h-8 text-[12px] gap-1.5 border-[#0a7fcf]/30 text-[#0a7fcf] hover:bg-[#0a7fcf]/5"
          >
            <Receipt className="w-3.5 h-3.5" />Voir la facture
          </Button>

          {abo.status === "ACTIF" && !confirming && (
            <Button
              variant="outline"
              size="sm"
              className="w-full h-8 text-[12px] text-red-600 border-red-200 hover:bg-red-50 gap-1.5"
              onClick={() => setConfirming(true)}
            >
              <X className="w-3.5 h-3.5" />Résilier l'abonnement
            </Button>
          )}

          {abo.status === "ACTIF" && confirming && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-3 space-y-2">
              <p className="text-[12px] text-red-700 text-center">Confirmer la résiliation ?</p>
              <div className="flex gap-2">
                <Button
                  variant="outline" size="sm"
                  className="flex-1 h-8 text-[12px]"
                  onClick={() => setConfirming(false)}
                  disabled={loading}
                >
                  Annuler
                </Button>
                <Button
                  size="sm"
                  className="flex-1 h-8 text-[12px] bg-red-600 hover:bg-red-700 text-white"
                  onClick={handleResilier}
                  disabled={loading}
                >
                  {loading
                    ? <Loader2 className="w-3 h-3 animate-spin" />
                    : <><Check className="w-3 h-3 mr-1" />Confirmer</>
                  }
                </Button>
              </div>
            </div>
          )}
        </section>

      </div>
    </div>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function MesAbonnementsPage() {
  const [abonnements, setAbonnements] = React.useState<AbonnementResponse[]>([])
  const [loading,     setLoading]     = React.useState(true)
  const [error,       setError]       = React.useState<string | null>(null)
  const [actionError, setActionError] = React.useState<string | null>(null)

  const [tab,        setTab]        = React.useState<TabFilter>("tous")
  const [search,     setSearch]     = React.useState("")
  const [selectedId, setSelectedId] = React.useState<number | null>(null)
  const [page,       setPage]       = React.useState(1)

  React.useEffect(() => {
    abonnementApi.mesAbonnements()
      .then(data => setAbonnements(Array.isArray(data) ? data : []))
      .catch(err  => setError(err?.message ?? "Erreur de chargement"))
      .finally(() => setLoading(false))
  }, [])

  const handleResilier = async (id: number) => {
    setActionError(null)
    try {
      const updated = await abonnementApi.resilier(id)
      setAbonnements(prev => prev.map(a => a.id === id ? updated : a))
    } catch (e: any) {
      setActionError(e.message ?? "Erreur lors de la résiliation")
    }
  }

  const actifs   = abonnements.filter(a => a.status === "ACTIF")
  const inactifs = abonnements.filter(a => a.status !== "ACTIF")

  // Reset to page 1 when filters change
  React.useEffect(() => { setPage(1) }, [tab, search])

  const filtered = abonnements.filter(a => {
    const matchTab =
      tab === "tous"    ? true :
      tab === "actif"   ? a.status === "ACTIF" :
      a.status !== "ACTIF"
    const q = search.toLowerCase()
    const matchSearch = !q ||
      (a.serviceName?.toLowerCase().includes(q)) ||
      (a.planName?.toLowerCase().includes(q)) ||
      String(a.id).includes(q)
    return matchTab && matchSearch
  })

  // Paginated slice
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  const selectedAbo = abonnements.find(a => a.id === selectedId) ?? null

  const TAB_COUNTS: Record<TabFilter, number> = {
    tous:    abonnements.length,
    actif:   actifs.length,
    inactif: inactifs.length,
  }

  return (
    <SidebarInset>

      {/* Topbar */}
      <header className="flex h-14 items-center gap-3 border-b border-border/60 pl-2 pr-5 bg-background/95 backdrop-blur sticky top-0 z-10">
        <SidebarTrigger className="-ml-1 size-8 text-muted-foreground hover:text-foreground hover:bg-muted rounded-md transition-colors" />
        <Separator orientation="vertical" className="h-4 opacity-40" />
        <h1 className="text-[14px] font-semibold">Mes Abonnements</h1>
        {!loading && abonnements.length > 0 && (
          <span className="ml-auto flex items-center gap-1.5 text-[12px] text-muted-foreground">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block" />
            {actifs.length} actif{actifs.length !== 1 ? "s" : ""}
          </span>
        )}
      </header>

      {/* Loading */}
      {loading && (
        <div className="flex items-center justify-center py-24">
          <Loader2 className="size-5 animate-spin text-[#0a7fcf]" />
        </div>
      )}

      {/* Erreur */}
      {(error || actionError) && !loading && (
        <div className="mx-5 mt-4 flex items-center gap-2 text-[13px] text-red-600 bg-red-50 border border-red-200 rounded-xl px-4 py-3">
          <AlertTriangle className="w-4 h-4 shrink-0" />{error ?? actionError}
        </div>
      )}

      {/* Vide */}
      {!loading && !error && abonnements.length === 0 && (
        <div className="text-center py-24 px-6">
          <p className="text-[15px] font-medium text-foreground">Aucun abonnement</p>
          <p className="text-[13px] text-muted-foreground mt-1">
            Souscrivez à un plan depuis le Marketplace.
          </p>
          <Button
            className="mt-5 bg-[#0a7fcf] hover:bg-[#0869b0] text-white border-0"
            onClick={() => window.location.href = "/dashboard/services"}
          >
            Explorer les services →
          </Button>
        </div>
      )}

      {/* Contenu */}
      {!loading && !error && abonnements.length > 0 && (
        <div className="p-5 space-y-4">

          {/* Métriques */}
          <div className="grid grid-cols-3 gap-3">
            <Metric
              label="Actifs"
              value={actifs.length}
              sub="services en ligne"
              variant="blue"
              pill={`${abonnements.length > 0 ? Math.round((actifs.length / abonnements.length) * 100) : 0} % du total`}
              icon={<span>✓</span>}
            />
            <Metric
              label="Total"
              value={abonnements.length}
              sub="tous statuts"
              variant="neutral"
              icon={<span>≡</span>}
            />
            <Metric
              label="Suspendus / Résiliés"
              value={inactifs.length}
              sub="hors ligne"
              variant="orange"
              pill={inactifs.length > 0 ? "Nécessite attention" : "Aucun problème"}
              icon={<span>!</span>}
            />
          </div>

          {/* Toolbar : onglets + recherche */}
          <div className="flex items-center gap-3">
            <div className="flex gap-0.5 bg-muted/50 rounded-lg p-0.5 text-[12px]">
              {(["tous", "actif", "inactif"] as TabFilter[]).map(t => (
                <button
                  key={t}
                  onClick={() => { setTab(t); setSelectedId(null) }}
                  className={cn(
                    "px-3 py-1.5 rounded-md font-medium transition-colors",
                    tab === t
                      ? "bg-background text-[#0a7fcf] border border-[#0a7fcf]/20 shadow-sm"
                      : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  {t === "tous" ? "Tous" : t === "actif" ? "Actifs" : "Historique"}
                  <span className={cn(
                    "ml-1.5 text-[10px]",
                    tab === t ? "text-[#0a7fcf]/70" : "opacity-50",
                  )}>
                    ({TAB_COUNTS[t]})
                  </span>
                </button>
              ))}
            </div>

            <div className="relative flex-1 max-w-xs">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Rechercher un service, un plan…"
                className="w-full h-8 pl-8 pr-3 text-[12px] border border-border rounded-lg bg-background text-foreground placeholder:text-muted-foreground outline-none focus:border-[#0a7fcf] focus:ring-1 focus:ring-[#0a7fcf]/20 transition-all"
              />
            </div>
          </div>

          {/* Table + panneau détail */}
          <div className="flex border border-border rounded-2xl overflow-hidden bg-card">

            {/* Table */}
            <div className="flex-1 overflow-auto min-w-0 flex flex-col">
              <table className="w-full border-collapse text-[12px]" style={{ tableLayout: "fixed" }}>
                <colgroup>
                  <col style={{ width: "90px" }} />
                  <col />
                  <col style={{ width: "115px" }} />
                  <col style={{ width: "105px" }} />
                  <col style={{ width: "140px" }} />
                </colgroup>
                <thead>
                  <tr className="border-b border-border bg-muted/30">
                    {["ID", "Service · Plan", "Statut", "Depuis", "Ressource"].map(h => (
                      <th
                        key={h}
                        className="px-4 py-2.5 text-left text-[11px] font-medium text-muted-foreground tracking-[0.04em] whitespace-nowrap"
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {paginated.length === 0 && (
                    <tr>
                      <td colSpan={5} className="text-center py-12 text-[13px] text-muted-foreground">
                        Aucun résultat.
                      </td>
                    </tr>
                  )}
                  {paginated.map(abo => {
                    const isSelected = selectedId === abo.id
                    const isInactive = abo.status !== "ACTIF"

                    return (
                      <tr
                        key={abo.id}
                        onClick={() => setSelectedId(isSelected ? null : abo.id)}
                        className={cn(
                          "border-b border-border cursor-pointer transition-colors",
                          ROW_ACCENT[abo.status],
                          isSelected
                            ? "bg-[#0a7fcf]/5"
                            : "hover:bg-muted/30",
                          isInactive && !isSelected && "opacity-60",
                        )}
                      >
                        {/* ID */}
                        <td className="px-4 py-3">
                          <code className="text-[11px] bg-muted px-1.5 py-0.5 rounded font-mono text-muted-foreground">
                            #{abo.id}
                          </code>
                        </td>

                        {/* Service · Plan */}
                        <td className="px-4 py-3 min-w-0">
                          <p className="font-medium text-foreground truncate">
                            {abo.serviceName ?? "—"}
                          </p>
                          <p className="text-[11px] text-muted-foreground">
                            Plan&nbsp;<span className="text-[#0a7fcf]">{abo.planName}</span>
                          </p>
                        </td>

                        {/* Statut */}
                        <td className="px-4 py-3">
                          <StatusBadge status={abo.status} />
                        </td>

                        {/* Depuis */}
                        <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">
                          {fmt(abo.dateDebut)}
                        </td>

                        {/* Ressource */}
                        <td className="px-4 py-3">
                          {abo.resourceName
                            ? <code className="text-[11px] bg-[#0a7fcf]/8 text-[#0a7fcf] px-1.5 py-0.5 rounded font-mono">
                                {abo.resourceName}
                              </code>
                            : <span className="text-muted-foreground/50 italic text-[11px]">
                                {abo.status === "ACTIF" ? "Non déployé" : "—"}
                              </span>
                          }
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>

              {/* Pagination */}
              <Pagination
                page={page}
                total={filtered.length}
                pageSize={PAGE_SIZE}
                onPageChange={p => { setPage(p); setSelectedId(null) }}
              />
            </div>

            {/* Panneau détail */}
            {selectedAbo && (
              <DetailPanel
                abo={selectedAbo}
                onClose={() => setSelectedId(null)}
                onResilier={handleResilier}
              />
            )}
          </div>

        </div>
      )}
    </SidebarInset>
  )
}