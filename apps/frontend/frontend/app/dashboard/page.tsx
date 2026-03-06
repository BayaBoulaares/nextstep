///dashboard/page.tsx
"use client"

import * as React from "react"
import Link from "next/link"
import { MoreHorizontal, Plus, Loader2, AlertTriangle, Trash2, Settings } from "lucide-react"
import { SidebarInset, SidebarTrigger } from "@/components/ui/sidebar"
import { Separator }  from "@/components/ui/separator"
import { Button }     from "@/components/ui/button"
import {
  DropdownMenu, DropdownMenuContent,
  DropdownMenuItem, DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Select, SelectContent, SelectItem,
  SelectTrigger, SelectValue,
} from "@/components/ui/select"
import { useUserDeployments }      from "@/lib/hooks/useApi"
import { useRole }                 from "@/lib/hooks/useRole"
import { adminChangeDeploymentStatus, adminDeleteDeployment } from "@/lib/services/admin.api"
import { ConfirmDialog }           from "@/components/admin/ConfirmDialog"
import type { DeploymentDTO, DeploymentStatus } from "@/lib/types"
import { cn } from "@/lib/utils"

// ── Statut ────────────────────────────────────────────────────────────────────

const STATUS_DOT: Record<string, string> = {
  EN_LIGNE:        "bg-emerald-500",
  MAINTENANCE:     "bg-amber-400",
  ECHEC:           "bg-red-500",
  PROVISIONNEMENT: "bg-blue-400 animate-pulse",
  ARRETÉ:          "bg-slate-400",
  EN_ATTENTE:      "bg-slate-300 animate-pulse",
  SUPPRIMÉ:        "bg-slate-200",
}
const STATUS_TEXT: Record<string, string> = {
  EN_LIGNE:        "text-emerald-600",
  MAINTENANCE:     "text-amber-600",
  ECHEC:           "text-red-600",
  PROVISIONNEMENT: "text-blue-600",
  ARRETÉ:          "text-muted-foreground",
  EN_ATTENTE:      "text-muted-foreground",
  SUPPRIMÉ:        "text-muted-foreground",
}
const STATUS_LABEL: Record<string, string> = {
  EN_LIGNE:        "En ligne",
  MAINTENANCE:     "Maintenance",
  ECHEC:           "Échec",
  PROVISIONNEMENT: "Provisionnement",
  ARRETÉ:          "Arrêté",
  EN_ATTENTE:      "En attente",
  SUPPRIMÉ:        "Supprimé",
}
const ALL_STATUSES: DeploymentStatus[] = [
  "EN_LIGNE", "MAINTENANCE", "ARRETÉ", "SUPPRIMÉ", "ECHEC",
]

function cloudLabel(t: string) {
  return t === "PRIVÉ" ? "Cloud Privé" : t === "PUBLIC" ? "Cloud Public" : "Cloud Hybride"
}

// ── Ligne déploiement ─────────────────────────────────────────────────────────

function ServiceRow({
  svc, isAdmin, onDelete, onStatusChange,
}: {
  svc:            DeploymentDTO
  isAdmin:        boolean
  onDelete:       (svc: DeploymentDTO) => void
  onStatusChange: (svc: DeploymentDTO, status: DeploymentStatus) => void
}) {
  return (
    <div className="flex items-center gap-4 px-5 py-4 border-b border-border/60 last:border-0 hover:bg-muted/20 transition-colors group">
      <div className="w-9 h-9 rounded-lg bg-muted flex items-center justify-center text-base shrink-0">🖥️</div>
      <div className="min-w-0 flex-1">
        <p className="text-[13px] font-semibold text-foreground tracking-tight truncate">{svc.name}</p>
        <p className="text-[11px] text-muted-foreground mt-0.5 truncate">
          {cloudLabel(svc.cloudType)} · {svc.planName} · {svc.region}
        </p>
      </div>
      <div className="hidden md:flex items-center gap-6">
        {svc.metrics.map(m => (
          <div key={m.label} className="text-right">
            <p className={cn("text-[13px] font-semibold tabular-nums", m.warn ? "text-amber-600" : "text-foreground")}>
              {m.value}
              {m.warn && <AlertTriangle className="inline w-3 h-3 ml-1 text-amber-500" />}
            </p>
            <p className="text-[10px] text-muted-foreground uppercase tracking-wide">{m.label}</p>
          </div>
        ))}
      </div>
      <div className="text-right shrink-0 hidden sm:block">
        <p className="text-[13px] font-semibold tabular-nums">{svc.pricePerMonth} €</p>
        <p className="text-[10px] text-muted-foreground">/mois</p>
      </div>
      <div className="shrink-0 w-36">
        {isAdmin ? (
          <Select value={svc.status} onValueChange={v => onStatusChange(svc, v as DeploymentStatus)}>
            <SelectTrigger className="h-7 text-[11px] border-0 bg-muted/50 px-2 gap-1 w-full">
              <div className="flex items-center gap-1.5">
                <span className={cn("w-1.5 h-1.5 rounded-full shrink-0", STATUS_DOT[svc.status])} />
                <SelectValue />
              </div>
            </SelectTrigger>
            <SelectContent>
              {ALL_STATUSES.map(s => (
                <SelectItem key={s} value={s} className="text-[12px]">{STATUS_LABEL[s]}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        ) : (
          <span className="flex items-center gap-1.5 text-[12px] font-medium justify-end">
            <span className={cn("w-1.5 h-1.5 rounded-full shrink-0", STATUS_DOT[svc.status])} />
            <span className={STATUS_TEXT[svc.status]}>{STATUS_LABEL[svc.status]}</span>
          </span>
        )}
      </div>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button className="shrink-0 w-7 h-7 flex items-center justify-center rounded-md opacity-0 group-hover:opacity-100 hover:bg-muted transition-all">
            <MoreHorizontal className="w-4 h-4 text-muted-foreground" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="text-[13px] w-44">
          <DropdownMenuItem asChild>
            <Link href={`/dashboard/deployments/${svc.id}`} className="flex items-center gap-2">
              <Settings className="w-3.5 h-3.5" /> Détails
            </Link>
          </DropdownMenuItem>
          {isAdmin && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="text-red-600 focus:text-red-600 flex items-center gap-2"
                onClick={() => onDelete(svc)}
              >
                <Trash2 className="w-3.5 h-3.5" /> Supprimer
              </DropdownMenuItem>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )
}

// ── Stat card ─────────────────────────────────────────────────────────────────

function StatCard({ label, value, sub, subColor }: {
  label: string; value: string; sub?: string; subColor?: string
}) {
  return (
    <div className="border border-border rounded-xl p-5 bg-card">
      <p className="text-[11px] text-muted-foreground uppercase tracking-widest mb-2">{label}</p>
      <p className="text-2xl font-semibold tracking-tight text-foreground">{value}</p>
      {sub && <p className={cn("text-[12px] mt-1", subColor ?? "text-muted-foreground")}>{sub}</p>}
    </div>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function DashboardPage() {
  const { isAdmin, userName, sessionStatus } = useRole()
  const { data: deployments, loading, error, reload } = useUserDeployments()

  const [toDelete,      setToDelete]      = React.useState<DeploymentDTO | null>(null)
  const [deleteLoading, setDeleteLoading] = React.useState(false)

  // Attendre que la session soit prête
  if (sessionStatus === "loading") {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="size-4 animate-spin text-muted-foreground" />
      </div>
    )
  }

  const firstName  = userName.split(" ")[0] || "vous"
  const active     = deployments?.filter(d => d.status === "EN_LIGNE").length ?? 0
  const totalMonth = deployments?.reduce((s, d) => s + d.pricePerMonth, 0)   ?? 0
  const alerts     = deployments?.filter(d => d.metrics.some(m => m.warn)).length ?? 0
  const uptime     = deployments?.length
    ? `${((active / deployments.length) * 100).toFixed(2)}%` : "—"

  const handleStatusChange = async (svc: DeploymentDTO, status: DeploymentStatus) => {
    try {
      await adminChangeDeploymentStatus(svc.id, status)
      reload()
    } catch (e: any) {
      console.error(e.message)
    }
  }

  const handleDelete = async () => {
    if (!toDelete) return
    setDeleteLoading(true)
    try {
      await adminDeleteDeployment(toDelete.id)
      setToDelete(null)
      reload()
    } finally {
      setDeleteLoading(false)
    }
  }

  /*
   * ─── Destinations des boutons ──────────────────────────────────────────────
   *
   *  Admin  → /dashboard/admin/services
   *           Ouvre la page ServicesTable avec le bouton "Nouveau service"
   *           qui déclenche ServiceDialog (mode "create") → ServiceForm interne
   *           avec name + cloudType + category + STATUS ✅
   *
   *  Client → /dashboard/services
   *           Catalogue des services disponibles pour déploiement
   *           (pas de création, donc pas de champ status)
   */
  const newServiceHref = isAdmin
    ? "/dashboard/admin/services"
    : "/dashboard/services"

  return (
    <SidebarInset>

      {/* Header */}
      <header className="flex h-14 items-center gap-3 border-b border-border/60 px-5 bg-background/95 backdrop-blur sticky top-0 z-10">
        <SidebarTrigger className="-ml-1 size-8 text-muted-foreground hover:text-foreground hover:bg-muted rounded-md transition-colors" />
        <Separator orientation="vertical" className="h-4 opacity-40" />
        <span className="text-[13px] font-medium">Dashboard</span>
        <div className="hidden md:flex items-center gap-1.5 mx-auto text-[12px] text-muted-foreground">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
          Tous les services opérationnels
        </div>
        <Link href={newServiceHref} className="ml-auto">
          <Button size="sm" className="h-8 text-[12px] gap-1.5 font-medium">
            <Plus className="w-3.5 h-3.5" />
            {isAdmin ? "Gérer les services" : "Nouveau service"}
          </Button>
        </Link>
      </header>

      {/* Contenu */}
      <div className="flex flex-1 flex-col gap-8 p-6 max-w-6xl mx-auto w-full">

        {/* Salutation */}
        <div className="flex items-start justify-between pt-1">
          <div>
            <h1 className="text-xl font-semibold tracking-tight">
              Bonjour, {firstName} {isAdmin ? "👨‍💼" : "👋"}
            </h1>
            <p className="text-[13px] text-muted-foreground mt-0.5">
              {isAdmin
                ? "Vue administrateur — gestion de tous les déploiements"
                : "Votre infrastructure · Projet Production E-Commerce"}
            </p>
          </div>
          <Link href={newServiceHref}>
            <Button size="sm" variant="outline" className="h-8 text-[12px] gap-1.5 hidden md:flex">
              <Plus className="w-3.5 h-3.5" />
              {isAdmin ? "Gérer les services" : "Déployer un service"}
            </Button>
          </Link>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <StatCard label="Services actifs"   value={String(active)}     sub={`${deployments?.length ?? 0} au total`} />
          <StatCard label="Dépense mensuelle" value={`${totalMonth} €`}  sub="HT / mois" />
          <StatCard label="Disponibilité"     value={uptime}             sub="Services EN_LIGNE" />
          <StatCard
            label="Alertes actives" value={String(alerts)}
            sub={alerts > 0 ? "Métriques en alerte" : "Aucune alerte"}
            subColor={alerts > 0 ? "text-amber-600" : undefined}
          />
        </div>

        {/* Liste des déploiements */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
              {isAdmin ? "Tous les déploiements" : "Mes services"} ({deployments?.length ?? 0})
            </p>
          </div>

          {loading && (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="size-4 animate-spin text-muted-foreground" />
            </div>
          )}

          {error && (
            <div className="flex items-center gap-3 border border-border rounded-2xl px-5 py-4 text-[13px] text-muted-foreground">
              <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0" />
              {error}
              <button onClick={reload} className="ml-auto underline text-foreground text-[12px]">Réessayer</button>
            </div>
          )}

          {!loading && !error && deployments?.length === 0 && (
            <div className="border border-border rounded-2xl px-5 py-12 text-center text-[13px] text-muted-foreground">
              Aucun service déployé.{" "}
              <Link href="/dashboard/services" className="underline text-foreground">
                Parcourir le catalogue
              </Link>
            </div>
          )}

          {!loading && !error && deployments && deployments.length > 0 && (
            <div className="border border-border rounded-2xl overflow-hidden bg-card">
              {deployments.map(svc => (
                <ServiceRow
                  key={svc.id}
                  svc={svc}
                  isAdmin={isAdmin}
                  onDelete={setToDelete}
                  onStatusChange={handleStatusChange}
                />
              ))}
            </div>
          )}
        </div>

      </div>

      {toDelete && (
        <ConfirmDialog
          title="Supprimer le déploiement"
          message={`Supprimer "${toDelete.name}" définitivement ? Le service sera arrêté et les données supprimées.`}
          loading={deleteLoading}
          onConfirm={handleDelete}
          onCancel={() => setToDelete(null)}
        />
      )}

    </SidebarInset>
  )
}