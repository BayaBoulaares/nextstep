"use client"

import * as React from "react"
import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import { SidebarInset, SidebarTrigger } from "@/components/ui/sidebar"
import { Separator } from "@/components/ui/separator"
import { Button } from "@/components/ui/button"
import {
  Search, Bell, Plus, Database, Server, Bot,
  HardDrive, Loader2, AlertTriangle, TrendingUp,
} from "lucide-react"
import { cn } from "@/lib/utils"

// ── API imports ───────────────────────────────────────────────────────────────
import { getAllDeployments }    from "@/lib/services/deployments.api"
import { apiFetch }            from "@/lib/apiClient"
import type {
  DeploymentDTO,
  AbonnementResponse,
  AbonnementStatus,
} from "@/lib/types"

// ── Types locaux ──────────────────────────────────────────────────────────────

interface ActivityItem {
  dot:  string
  text: string
  time: string
  key:  string
}

// ── Helpers ───────────────────────────────────────────────────────────────────

const ABO_STATUS_CLASS: Record<AbonnementStatus, string> = {
  ACTIF:      "bg-emerald-50 text-emerald-700",
  EN_ATTENTE: "bg-yellow-50  text-yellow-700",
  SUSPENDU:   "bg-orange-50  text-orange-700",
  RESILIE:    "bg-red-50     text-red-700",
  EXPIRE:     "bg-gray-50    text-gray-500",
}
const ABO_STATUS_LABEL: Record<AbonnementStatus, string> = {
  ACTIF:      "Actif",
  EN_ATTENTE: "En attente",
  SUSPENDU:   "Suspendu",
  RESILIE:    "Résilié",
  EXPIRE:     "Expiré",
}

function serviceIcon(categoryName: string | null) {
  switch (categoryName) {
    case "CALCUL":
    case "HEBERGEMENT":   return <Server   className="w-4 h-4 text-[#0a7fcf]"  />
    case "STOCKAGE":
    case "OBJECT_STORAGE":
    case "BLOCK_STORAGE":
    case "FILE_STORAGE":  return <HardDrive className="w-4 h-4 text-emerald-700" />
    case "IA":            return <Bot       className="w-4 h-4 text-amber-700"   />
    default:              return <Database  className="w-4 h-4 text-purple-600"  />
  }
}

function serviceIconBg(categoryName: string | null): string {
  switch (categoryName) {
    case "CALCUL":
    case "HEBERGEMENT":   return "#e0f0fc"
    case "STOCKAGE":
    case "OBJECT_STORAGE":
    case "BLOCK_STORAGE":
    case "FILE_STORAGE":  return "#d1fae5"
    case "IA":            return "#fef9c3"
    default:              return "#f3e8ff"
  }
}

function relativeTime(isoDate: string): string {
  const diff = Date.now() - new Date(isoDate).getTime()
  const mins  = Math.floor(diff / 60_000)
  const hours = Math.floor(diff / 3_600_000)
  const days  = Math.floor(diff / 86_400_000)
  if (mins  < 60)  return `Il y a ${mins} min`
  if (hours < 24)  return `Il y a ${hours}h`
  return `Il y a ${days}j`
}

function deploymentToActivity(d: DeploymentDTO): ActivityItem {
  const statusDot: Record<string, string> = {
    ACTIF:           "#0a7fcf",
    EN_LIGNE:        "#10b981",
    ECHEC:           "#ef4444",
    PROVISIONNEMENT: "#f59e0b",
    ARRETE:          "#6b7280",
    SUPPRIME:        "#6b7280",
    EN_ATTENTE:      "#f59e0b",
  }
  return {
    key:  String(d.id),
    dot:  statusDot[d.status] ?? "#6b7280",
    text: `${d.serviceName ?? "Service"} — ${d.resourceName} (${d.status.toLowerCase().replace("_", " ")})`,
    time: d.createdAt ? relativeTime(d.createdAt) : "—",
  }
}

// ── KPI Card ──────────────────────────────────────────────────────────────────

function KpiCard({
  label, value, sub, extra, loading,
}: {
  label: string; value: string; sub: string
  extra?: React.ReactNode; loading?: boolean
}) {
  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <p className="text-[11px] text-muted-foreground">{label}</p>
      {loading
        ? <div className="h-7 w-16 bg-muted animate-pulse rounded mt-1" />
        : <p className="text-[20px] font-semibold text-foreground mt-1">{value}</p>
      }
      <p className="text-[11px] text-muted-foreground mt-0.5">{sub}</p>
      {extra}
    </div>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function ClientDashboardPage() {
  const { data: session } = useSession()
  const router = useRouter()

  const [deployments,   setDeployments]   = React.useState<DeploymentDTO[]>([])
  const [abonnements,   setAbonnements]   = React.useState<AbonnementResponse[]>([])
  const [loading,       setLoading]       = React.useState(true)
  const [error,         setError]         = React.useState<string | null>(null)
  const [search,        setSearch]        = React.useState("")

  const userName = session?.user?.name ?? "Utilisateur"
  const initials = userName.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase()

  // ── Chargement ──────────────────────────────────────────────────────────────
  React.useEffect(() => {
    Promise.all([
      getAllDeployments(),
      apiFetch<AbonnementResponse[]>("/api/abonnements/mes-abonnements"),
    ])
      .then(([deps, abos]) => {
        setDeployments(Array.isArray(deps) ? deps : [])
        setAbonnements(Array.isArray(abos) ? abos : [])
      })
      .catch(e => setError(e?.message ?? "Erreur de chargement"))
      .finally(() => setLoading(false))
  }, [])

  // ── Calculs KPIs ────────────────────────────────────────────────────────────
  const actifs        = abonnements.filter(a => a.status === "ACTIF")
  const expirentBientot = abonnements.filter(a => {
    if (!a.dateFin) return false
    const j = Math.ceil((new Date(a.dateFin).getTime() - Date.now()) / 86_400_000)
    return j > 0 && j <= 15
  })
  const depenseMois   = actifs.reduce((sum, a) => sum + (a.prixSnapshot ?? 0), 0)
  const activeDeployments = deployments.filter(d =>
    d.status === "ACTIF" || d.status === "EN_LIGNE"
  )
  const usagePct = deployments.length
    ? Math.round((activeDeployments.length / deployments.length) * 100)
    : 0

  // ── Filtre recherche ────────────────────────────────────────────────────────
  const q = search.toLowerCase()
  const filteredAbos = abonnements.filter(a =>
    !q ||
    a.planName?.toLowerCase().includes(q) ||
    a.serviceName?.toLowerCase().includes(q) ||
    a.status?.toLowerCase().includes(q)
  )
  const filteredActivity: ActivityItem[] = deployments
    .filter(d =>
      !q ||
      d.resourceName?.toLowerCase().includes(q) ||
      d.serviceName?.toLowerCase().includes(q) ||
      d.status?.toLowerCase().includes(q)
    )
    .slice(0, 5)
    .map(deploymentToActivity)

  return (
    <SidebarInset>
      {/* Topbar */}
      <header className="flex h-14 items-center gap-3 border-b border-border/60 pl-2 pr-5 bg-background/95 backdrop-blur sticky top-0 z-10">
        <SidebarTrigger className="-ml-1 size-8 text-muted-foreground hover:text-foreground hover:bg-muted rounded-md transition-colors" />
        <Separator orientation="vertical" className="h-4 opacity-40" />
        <h1 className="text-[14px] font-semibold">Mon espace</h1>
        <div className="ml-auto flex items-center gap-3">
          {/* Barre de recherche fonctionnelle */}
          <div className="flex items-center gap-2 bg-muted border border-border rounded-full px-3 py-1.5 w-52 transition-all focus-within:ring-2 focus-within:ring-[#0a7fcf]/30">
            <Search className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Rechercher..."
              className="bg-transparent text-[12px] text-foreground placeholder:text-muted-foreground outline-none w-full"
            />
            {search && (
              <button
                onClick={() => setSearch("")}
                className="text-muted-foreground hover:text-foreground text-[10px] leading-none"
              >
                ✕
              </button>
            )}
          </div>
          <div className="relative">
            <Bell className="w-5 h-5 text-muted-foreground" />
            {expirentBientot.length > 0 && (
              <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-[#0a7fcf] rounded-full border-2 border-background" />
            )}
          </div>
          <div className="w-7 h-7 rounded-full bg-[#0a7fcf] flex items-center justify-center text-white text-[11px] font-semibold">
            {initials}
          </div>
        </div>
      </header>

      <div className="p-5 space-y-5 max-w-5xl mx-auto w-full">

        {/* Erreur */}
        {error && (
          <div className="flex items-center gap-2 text-[13px] text-red-600 bg-red-50 border border-red-200 rounded-xl px-4 py-3">
            <AlertTriangle className="w-4 h-4 shrink-0" /> {error}
          </div>
        )}

        {/* Welcome banner */}
        <div className="rounded-xl bg-[#0a7fcf] p-4 flex items-center justify-between">
          <div>
            <p className="text-[14px] font-semibold text-white">
              Bonjour, {userName.split(" ")[0]} 👋
            </p>
            <p className="text-[12px] text-white/75 mt-0.5">
              {loading
                ? "Chargement de vos services..."
                : `${actifs.length} abonnement${actifs.length !== 1 ? "s" : ""} actif${actifs.length !== 1 ? "s" : ""} — ${activeDeployments.length} service${activeDeployments.length !== 1 ? "s" : ""} en cours`
              }
            </p>
          </div>
          <Button
            className="bg-white/20 hover:bg-white/30 text-white border-0 text-[12px] h-8 shrink-0"
            onClick={() => router.push("/dashboard/services")}
          >
            <Plus className="w-3.5 h-3.5 mr-1" /> Nouveau service
          </Button>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-3 gap-3">
          <KpiCard
            loading={loading}
            label="Abonnements actifs"
            value={String(actifs.length)}
            sub={expirentBientot.length > 0
              ? `${expirentBientot.length} expire${expirentBientot.length > 1 ? "nt" : ""} bientôt`
              : "Tous à jour"
            }
          />
          <KpiCard
            loading={loading}
            label="Dépenses ce mois"
            value={`${depenseMois.toFixed(2)} DT`}
            sub={`${actifs.length} abonnement${actifs.length !== 1 ? "s" : ""} en cours`}
          />
          <KpiCard
            loading={loading}
            label="Services actifs"
            value={`${activeDeployments.length} / ${deployments.length}`}
            sub={`${usagePct}% de vos ressources`}
            extra={
              <div className="h-1.5 rounded-full bg-muted mt-2">
                <div
                  className="h-1.5 rounded-full bg-[#0a7fcf] transition-all"
                  style={{ width: `${usagePct}%` }}
                />
              </div>
            }
          />
        </div>

        {/* Abonnements + Activité */}
        <div className="grid grid-cols-2 gap-4">
          {/* Abonnements */}
          <div className="rounded-xl border border-border bg-card p-4 flex flex-col">
            <div className="flex items-center justify-between mb-3">
              <p className="text-[13px] font-semibold text-foreground">
                Mes abonnements
                {search && filteredAbos.length !== abonnements.length && (
                  <span className="ml-1.5 text-[11px] text-muted-foreground font-normal">
                    ({filteredAbos.length} résultat{filteredAbos.length !== 1 ? "s" : ""})
                  </span>
                )}
              </p>
              <span
                className="text-[11px] text-[#0a7fcf] cursor-pointer hover:underline"
                onClick={() => router.push("/dashboard/abonnements")}
              >
                Gérer →
              </span>
            </div>

            {loading ? (
              <div className="space-y-2">
                {[1,2,3].map(i => (
                  <div key={i} className="h-10 bg-muted animate-pulse rounded-lg" />
                ))}
              </div>
            ) : filteredAbos.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center py-6 text-center">
                <p className="text-[13px] font-medium text-foreground">
                  {search ? "Aucun résultat" : "Aucun abonnement"}
                </p>
                <p className="text-[11px] text-muted-foreground mt-1">
                  {search ? `Aucun abonnement ne correspond à "${search}"` : "Souscrivez à un plan depuis le Marketplace."}
                </p>
              </div>
            ) : (
              <div className="space-y-0.5 flex-1 overflow-y-auto max-h-64">
                {filteredAbos.map((a) => (
                  <div key={a.id} className="flex items-center gap-2.5 py-2.5 border-b border-border/50 last:border-0">
                    <div
                      className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                      style={{ background: serviceIconBg(a.serviceName) }}
                    >
                      {serviceIcon(a.serviceName)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[12px] font-medium text-foreground truncate">{a.planName}</p>
                      <p className="text-[11px] text-muted-foreground">{a.serviceName ?? "—"}</p>
                    </div>
                    <span className={cn(
                      "text-[10px] font-medium px-2 py-0.5 rounded-full flex-shrink-0",
                      ABO_STATUS_CLASS[a.status]
                    )}>
                      {ABO_STATUS_LABEL[a.status]}
                    </span>
                  </div>
                ))}
              </div>
            )}

            <Button
              className="mt-3 w-full h-8 text-[12px] bg-[#0a7fcf] hover:bg-[#0869b0] text-white border-0"
              onClick={() => router.push("/dashboard/services")}
            >
              Explorer le catalogue →
            </Button>
          </div>

          {/* Activité récente */}
          <div className="rounded-xl border border-border bg-card p-4">
            <div className="flex items-center justify-between mb-3">
              <p className="text-[13px] font-semibold text-foreground">
                Activité récente
                {search && (
                  <span className="ml-1.5 text-[11px] text-muted-foreground font-normal">
                    ({filteredActivity.length} résultat{filteredActivity.length !== 1 ? "s" : ""})
                  </span>
                )}
              </p>
              <span className="text-[11px] text-muted-foreground">
                {deployments.length} déploiement{deployments.length !== 1 ? "s" : ""}
              </span>
            </div>

            {loading ? (
              <div className="space-y-2">
                {[1,2,3,4].map(i => (
                  <div key={i} className="h-8 bg-muted animate-pulse rounded-lg" />
                ))}
              </div>
            ) : filteredActivity.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-6 text-center">
                <p className="text-[13px] font-medium text-foreground">
                  {search ? "Aucun résultat" : "Aucune activité"}
                </p>
                <p className="text-[11px] text-muted-foreground mt-1">
                  {search ? `Aucun déploiement ne correspond à "${search}"` : "Déployez votre premier service."}
                </p>
              </div>
            ) : (
              <div className="space-y-0.5 overflow-y-auto max-h-64">
                {filteredActivity.map((a) => (
                  <div key={a.key} className="flex items-start gap-2.5 py-2 border-b border-border/50 last:border-0">
                    <span
                      className="w-2 h-2 rounded-full mt-1.5 flex-shrink-0"
                      style={{ background: a.dot }}
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-[12px] text-foreground truncate">{a.text}</p>
                      <p className="text-[11px] text-muted-foreground">{a.time}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

      </div>
    </SidebarInset>
  )
}