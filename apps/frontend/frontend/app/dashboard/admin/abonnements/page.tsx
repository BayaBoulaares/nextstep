// app/dashboard/admin/abonnements/page.tsx
"use client"

import * as React from "react"
import { SidebarInset, SidebarTrigger } from "@/components/ui/sidebar"
import { Separator } from "@/components/ui/separator"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Loader2, AlertTriangle, Search, MoreHorizontal,
  Receipt, Ban, TrendingUp, CheckCircle2, PauseCircle,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { abonnementApi } from "@/app/features/abonnements/services/abonnementApi"
import type { AbonnementResponse, BillingCycle, AbonnementStatus } from "@/lib/types"

// ── Types ─────────────────────────────────────────────────────────────────────

interface AdminAbonnementResponse extends AbonnementResponse {
  clientName?:       string
  clientEmail?:      string
  deploymentStatus?: string   // EN_LIGNE | ARRETE | ERREUR
  invoiceStatus?:    "PAYEE" | "EN_ATTENTE" | "RETARD"
  vcpu?:    number
  ram?:     number
  storage?: number
}

// ── Helpers ───────────────────────────────────────────────────────────────────

const STATUS_LABEL: Record<AbonnementStatus, string> = {
  EN_ATTENTE: "En attente",
  ACTIF:      "Actif",
  SUSPENDU:   "Suspendu",
  RESILIE:    "Résilié",
  EXPIRE:     "Expiré",
}

const STATUS_DOT: Record<AbonnementStatus, string> = {
  EN_ATTENTE: "bg-yellow-400",
  ACTIF:      "bg-emerald-500",
  SUSPENDU:   "bg-orange-400",
  RESILIE:    "bg-red-500",
  EXPIRE:     "bg-gray-400",
}

const STATUS_CLASS: Record<AbonnementStatus, string> = {
  EN_ATTENTE: "bg-yellow-50  text-yellow-700  border-yellow-200",
  ACTIF:      "bg-emerald-50 text-emerald-700 border-emerald-200",
  SUSPENDU:   "bg-orange-50  text-orange-700  border-orange-200",
  RESILIE:    "bg-red-50     text-red-700     border-red-200",
  EXPIRE:     "bg-gray-50    text-gray-500    border-gray-200",
}

const DEPLOY_DOT: Record<string, string> = {
  EN_LIGNE: "bg-emerald-500",
  ARRETE:   "bg-orange-400",
  ERREUR:   "bg-red-500",
}

const DEPLOY_LABEL: Record<string, string> = {
  EN_LIGNE: "En ligne",
  ARRETE:   "Arrêté",
  ERREUR:   "Erreur",
}

const INVOICE_BADGE: Record<string, string> = {
  PAYEE:      "bg-emerald-50 text-emerald-700 border-emerald-200",
  EN_ATTENTE: "bg-yellow-50  text-yellow-700  border-yellow-200",
  RETARD:     "bg-red-50     text-red-700     border-red-200",
}

const INVOICE_LABEL: Record<string, string> = {
  PAYEE:      "Payée",
  EN_ATTENTE: "En attente",
  RETARD:     "En retard",
}

const CYCLE_LABEL: Record<BillingCycle, string> = {
  HORAIRE: "/ h",
  MENSUEL: "/ mois",
  ANNUEL:  "/ an",
}

function initials(name?: string): string {
  if (!name) return "?"
  return name.split(" ").map(w => w[0]).join("").toUpperCase().slice(0, 2)
}

// ── StatCard ──────────────────────────────────────────────────────────────────

function StatCard({
  label, value, sub, icon: Icon, valueClass,
}: {
  label: string; value: string | number; sub: string
  icon: React.ElementType; valueClass?: string
}) {
  return (
    <div className="rounded-xl border border-border bg-card px-5 py-4 flex items-start gap-4">
      <div className="p-2 rounded-lg bg-muted/60 shrink-0">
        <Icon className="w-4 h-4 text-muted-foreground" />
      </div>
      <div>
        <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground mb-1">{label}</p>
        <p className={cn("text-2xl font-bold leading-none", valueClass ?? "text-foreground")}>{value}</p>
        <p className="text-[11px] text-muted-foreground mt-1">{sub}</p>
      </div>
    </div>
  )
}

// ── ResourceBar ───────────────────────────────────────────────────────────────

function ResourceBar({ label, value, unit }: { label: string; value?: number; unit: string }) {
  if (!value) return null
  return (
    <div className="flex items-center justify-between gap-2 text-[11px]">
      <span className="text-muted-foreground w-10">{label}</span>
      <div className="flex-1 h-1 rounded-full bg-muted overflow-hidden">
        <div className="h-full bg-primary/40 rounded-full" style={{ width: `${Math.min((value / 32) * 100, 100)}%` }} />
      </div>
      <span className="font-medium text-foreground w-14 text-right">{value} {unit}</span>
    </div>
  )
}

// ── AdminTableRow ─────────────────────────────────────────────────────────────

function AdminTableRow({
  abo,
  onSuspendre,
  onReactiver,
  onResilier,
}: {
  abo: AdminAbonnementResponse
  onSuspendre: (id: number) => Promise<void>
  onReactiver: (id: number) => Promise<void>
  onResilier:  (id: number) => Promise<void>
}) {
  const [menuOpen,   setMenuOpen]   = React.useState(false)
  const [confirming, setConfirming] = React.useState<"resilier" | null>(null)
  const [loading,    setLoading]    = React.useState(false)
  const menuRef = React.useRef<HTMLDivElement>(null)

  React.useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node))
        setMenuOpen(false)
    }
    document.addEventListener("mousedown", handler)
    return () => document.removeEventListener("mousedown", handler)
  }, [])

  const act = async (fn: () => Promise<void>) => {
    setLoading(true); setMenuOpen(false)
    try { await fn() } finally { setLoading(false); setConfirming(null) }
  }

  return (
    <tr className="border-b border-border/60 hover:bg-muted/30 transition-colors text-[12px]">

      {/* ID */}
      <td className="px-4 py-3 font-mono text-primary font-medium whitespace-nowrap">
        ABN-{String(abo.id).padStart(3, "0")}
      </td>

      {/* Client */}
      <td className="px-4 py-3">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-primary/10 text-primary text-[10px] font-bold flex items-center justify-center shrink-0">
            {initials(abo.clientName)}
          </div>
          <div>
            <p className="font-medium text-foreground leading-tight">{abo.clientName ?? "—"}</p>
            <p className="text-muted-foreground text-[11px]">{abo.clientEmail ?? ""}</p>
          </div>
        </div>
      </td>

      {/* Service · Plan */}
      <td className="px-4 py-3">
        <p className="font-medium text-foreground">{abo.serviceName ?? "—"}</p>
        <span className="inline-block mt-0.5 text-[10px] font-medium px-1.5 py-0.5 rounded-md bg-muted text-muted-foreground border border-border">
          {abo.planName}
        </span>
      </td>

      {/* Ressources */}
      <td className="px-4 py-3 w-44">
        <div className="space-y-1">
          <ResourceBar label="vCPU" value={abo.vcpu}    unit="cores" />
          <ResourceBar label="RAM"  value={abo.ram}     unit="GB" />
          <ResourceBar label="SSD"  value={abo.storage} unit="GB" />
        </div>
      </td>

      {/* Prix */}
      <td className="px-4 py-3 text-right whitespace-nowrap">
        {abo.prix != null && (
          <span className="font-bold text-[14px] text-foreground">
            {abo.prix.toFixed(2)}{" "}
            <span className="text-[11px] font-normal text-muted-foreground">DT</span>
          </span>
        )}
        {abo.billingCycle && (
          <p className="text-[10px] text-muted-foreground">{CYCLE_LABEL[abo.billingCycle]}</p>
        )}
      </td>

      {/* Déploiement */}
      <td className="px-4 py-3">
        {abo.deploymentStatus ? (
          <div>
            <div className="flex items-center gap-1.5">
              <span className={cn("w-1.5 h-1.5 rounded-full shrink-0",
                DEPLOY_DOT[abo.deploymentStatus] ?? "bg-gray-400")} />
              <span className="text-foreground">
                {DEPLOY_LABEL[abo.deploymentStatus] ?? abo.deploymentStatus}
              </span>
            </div>
            {abo.resourceName && (
              <p className="font-mono text-[10px] text-muted-foreground mt-0.5">{abo.resourceName}</p>
            )}
          </div>
        ) : (
          <span className="text-muted-foreground">—</span>
        )}
      </td>

      {/* Statut */}
      <td className="px-4 py-3">
        <span className={cn(
          "inline-flex items-center gap-1.5 text-[11px] font-medium px-2 py-0.5 rounded-full border",
          STATUS_CLASS[abo.status],
        )}>
          <span className={cn("w-1.5 h-1.5 rounded-full", STATUS_DOT[abo.status])} />
          {STATUS_LABEL[abo.status]}
        </span>
      </td>

      {/* Facture */}
      <td className="px-4 py-3">
        {abo.invoiceStatus ? (
          <span className={cn(
            "text-[11px] font-medium px-2 py-0.5 rounded-full border",
            INVOICE_BADGE[abo.invoiceStatus],
          )}>
            {INVOICE_LABEL[abo.invoiceStatus]}
          </span>
        ) : (
          <span className="text-muted-foreground">—</span>
        )}
      </td>

      {/* Actions */}
      <td className="px-4 py-3">
        {confirming === "resilier" ? (
          <div className="flex gap-1">
            <Button size="sm" variant="outline" className="h-6 text-[11px] px-2"
              onClick={() => setConfirming(null)} disabled={loading}>
              Annuler
            </Button>
            <Button size="sm"
              className="h-6 text-[11px] px-2 bg-red-600 hover:bg-red-700 text-white"
              onClick={() => act(() => onResilier(abo.id))} disabled={loading}>
              {loading ? <Loader2 className="w-3 h-3 animate-spin" /> : "Confirmer"}
            </Button>
          </div>
        ) : (
          <div className="flex items-center gap-1">
            {abo.status === "ACTIF" && (
              <Button size="sm" variant="outline"
                className="h-6 text-[11px] px-2 text-orange-600 border-orange-200 hover:bg-orange-50"
                onClick={() => act(() => onSuspendre(abo.id))} disabled={loading}>
                Suspendre
              </Button>
            )}
            {abo.status === "SUSPENDU" && (
              <Button size="sm" variant="outline"
                className="h-6 text-[11px] px-2 text-emerald-600 border-emerald-200 hover:bg-emerald-50"
                onClick={() => act(() => onReactiver(abo.id))} disabled={loading}>
                Réactiver
              </Button>
            )}
            <div ref={menuRef} className="relative">
              <Button size="sm" variant="ghost" className="h-6 w-6 p-0"
                onClick={() => setMenuOpen(v => !v)}>
                <MoreHorizontal className="w-3.5 h-3.5" />
              </Button>
              {menuOpen && (
                <div className="absolute right-0 top-7 z-50 w-36 rounded-lg border border-border bg-card shadow-md py-1">
                  <button className="flex items-center gap-2 w-full px-3 py-1.5 text-[12px] hover:bg-muted transition-colors">
                    <Receipt className="w-3.5 h-3.5 text-muted-foreground" /> Voir facture
                  </button>
                  {abo.status === "ACTIF" && (
                    <button
                      className="flex items-center gap-2 w-full px-3 py-1.5 text-[12px] text-red-600 hover:bg-red-50 transition-colors"
                      onClick={() => { setMenuOpen(false); setConfirming("resilier") }}>
                      <Ban className="w-3.5 h-3.5" /> Résilier
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        )}
      </td>
    </tr>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function AdminAbonnementsPage() {
  const [abonnements, setAbonnements] = React.useState<AdminAbonnementResponse[]>([])
  const [loading,     setLoading]     = React.useState(true)
  const [error,       setError]       = React.useState<string | null>(null)
  const [actionError, setActionError] = React.useState<string | null>(null)
  const [filter,      setFilter]      = React.useState<AbonnementStatus | "TOUS">("TOUS")
  const [search,      setSearch]      = React.useState("")

  React.useEffect(() => {
    // ✅ Remplacer par abonnementApi.tousLesAbonnements() quand l'endpoint admin existe
    abonnementApi.mesAbonnements()
      .then(data  => setAbonnements(Array.isArray(data) ? data : []))
      .catch(err  => setError(err?.message ?? "Erreur de chargement"))
      .finally(() => setLoading(false))
  }, [])

  const handleSuspendre = async (id: number) => {
    try {
      setActionError(null)
      // const updated = await abonnementApi.suspendre(id)
      // setAbonnements(prev => prev.map(a => a.id === id ? { ...a, ...updated } : a))
    } catch (e: any) { setActionError(e.message ?? "Erreur") }
  }

  const handleReactiver = async (id: number) => {
    try {
      setActionError(null)
      // const updated = await abonnementApi.reactiver(id)
      // setAbonnements(prev => prev.map(a => a.id === id ? { ...a, ...updated } : a))
    } catch (e: any) { setActionError(e.message ?? "Erreur") }
  }

  const handleResilier = async (id: number) => {
    try {
      setActionError(null)
      const updated = await abonnementApi.resilier(id)
      setAbonnements(prev => prev.map(a => a.id === id ? { ...a, ...updated } : a))
    } catch (e: any) { setActionError(e.message ?? "Erreur lors de la résiliation") }
  }

  const totaux = {
    total:     abonnements.length,
    actifs:    abonnements.filter(a => a.status === "ACTIF").length,
    suspendus: abonnements.filter(a => a.status === "SUSPENDU").length,
    mrr:       abonnements
      .filter(a => a.status === "ACTIF" && a.billingCycle === "MENSUEL")
      .reduce((s, a) => s + (a.prix ?? 0), 0),
  }

  const filtered = abonnements.filter(a => {
    const matchFilter = filter === "TOUS" || a.status === filter
    const q = search.toLowerCase()
    const matchSearch = !q
      || a.clientName?.toLowerCase().includes(q)
      || String(a.id).includes(q)
      || a.planName?.toLowerCase().includes(q)
      || a.clientEmail?.toLowerCase().includes(q)
    return matchFilter && matchSearch
  })

  const FILTERS: { key: AbonnementStatus | "TOUS"; label: string }[] = [
    { key: "TOUS",     label: "Tous" },
    { key: "ACTIF",    label: "Actif" },
    { key: "SUSPENDU", label: "Suspendu" },
    { key: "RESILIE",  label: "Résilié" },
  ]

  return (
    <SidebarInset>
      <header className="flex h-14 items-center gap-3 border-b border-border/60 px-5 bg-background/95 backdrop-blur sticky top-0 z-10">
        <SidebarTrigger className="-ml-1 size-8 text-muted-foreground hover:text-foreground hover:bg-muted rounded-md transition-colors" />
        <Separator orientation="vertical" className="h-4 opacity-40" />
        <nav className="flex items-center gap-1.5 text-[13px]">
          <span className="text-muted-foreground">Dashboard</span>
          <span className="text-muted-foreground/30">/</span>
          <span className="font-medium text-foreground">Gestion des Abonnements</span>
        </nav>
      </header>

      <div className="flex flex-1 flex-col gap-6 py-6">
        <div className="px-4 lg:px-6">
          <h1 className="text-xl font-semibold tracking-tight">Gestion des Abonnements</h1>
          <p className="text-[13px] text-muted-foreground mt-1">
            Vue complète de tous les abonnements clients et leur état de déploiement.
          </p>
        </div>

        <div className="px-4 lg:px-6 space-y-6">

          {/* KPIs */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard label="Total abonnements" value={totaux.total}     sub="tous statuts confondus"   icon={Receipt} />
            <StatCard label="Actifs"            value={totaux.actifs}    sub="services en production"   icon={CheckCircle2} valueClass="text-emerald-600" />
            <StatCard label="Suspendus"         value={totaux.suspendus} sub="en attente de règlement"  icon={PauseCircle}  valueClass="text-orange-500" />
            <StatCard label="MRR"               value={`${totaux.mrr.toFixed(0)} DT`} sub="revenus mensuels récurrents" icon={TrendingUp} valueClass="text-primary" />
          </div>

          {/* Filtres + Recherche */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
            <div className="flex gap-1 bg-muted/50 p-1 rounded-lg border border-border">
              {FILTERS.map(f => (
                <button
                  key={f.key}
                  onClick={() => setFilter(f.key)}
                  className={cn(
                    "text-[12px] font-medium px-3 py-1.5 rounded-md transition-colors",
                    filter === f.key
                      ? "bg-background text-foreground shadow-sm border border-border"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  {f.label}
                </button>
              ))}
            </div>
            <div className="relative flex-1 max-w-xs">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
              <Input
                placeholder="Rechercher par client ou ID..."
                className="pl-8 h-8 text-[12px] bg-background"
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
            </div>
          </div>

          {/* Errors */}
          {(error || actionError) && (
            <div className="flex items-center gap-2 text-[13px] text-red-600 bg-red-50 border border-red-200 rounded-xl px-4 py-3">
              <AlertTriangle className="w-4 h-4 shrink-0" />{error ?? actionError}
            </div>
          )}

          {/* Table */}
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="size-5 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <div className="rounded-xl border border-border overflow-hidden bg-card">
              <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="border-b border-border bg-muted/30">
                      {["ID", "Client", "Service · Plan", "Ressources", "Prix / Mois", "Déploiement", "Statut", "Facture", "Actions"].map(h => (
                        <th key={h} className="px-4 py-3 text-left text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground whitespace-nowrap">
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.length === 0 ? (
                      <tr>
                        <td colSpan={9} className="px-4 py-12 text-center text-[13px] text-muted-foreground">
                          Aucun abonnement trouvé
                        </td>
                      </tr>
                    ) : filtered.map(a => (
                      <AdminTableRow
                        key={a.id} abo={a}
                        onSuspendre={handleSuspendre}
                        onReactiver={handleReactiver}
                        onResilier={handleResilier}
                      />
                    ))}
                  </tbody>
                </table>
              </div>
              {filtered.length > 0 && (
                <div className="px-4 py-2.5 border-t border-border bg-muted/20 text-[11px] text-muted-foreground">
                  {filtered.length} résultat{filtered.length !== 1 ? "s" : ""}
                  {filter !== "TOUS" || search ? ` · filtrés sur ${abonnements.length} total` : ""}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </SidebarInset>
  )
}