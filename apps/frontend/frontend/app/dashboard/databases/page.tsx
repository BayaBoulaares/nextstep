"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { SidebarInset, SidebarTrigger } from "@/components/ui/sidebar"
import { Separator } from "@/components/ui/separator"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Loader2, Database, Copy, Eye, EyeOff,
  Trash2, RefreshCw, Plus, AlertTriangle, Search, X,
  ChevronDown, ChevronUp, CheckCircle2,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { getAllDeployments } from "@/lib/services/deployments.api"
import {
  getDatabaseResource, getDatabaseCredentials, deleteDatabaseResource,
} from "@/lib/services/database.api"
import type {
  DeploymentDTO, DatabaseResourceResponse,
  DatabaseCredentials, DatabaseStatus,
} from "@/lib/types"
import { DATABASE_STATUS_META } from "@/lib/types"

// ─── helpers ──────────────────────────────────────────────────────────────────

function formatDate(iso: string | undefined) {
  if (!iso) return null
  return new Intl.DateTimeFormat("fr-FR", {
    day: "2-digit", month: "short", year: "numeric",
  }).format(new Date(iso))
}

// ─── StatusBadge ──────────────────────────────────────────────────────────────

function StatusBadge({ status, loading }: { status: DatabaseStatus; loading?: boolean }) {
  if (loading) {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium border border-border bg-muted text-muted-foreground">
        <Loader2 className="w-2.5 h-2.5 animate-spin" /> Chargement…
      </span>
    )
  }
  const meta = DATABASE_STATUS_META[status]
  return (
    <span className={cn(
      "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium border",
      meta.color
    )}>
      {meta.icon} {meta.label}
    </span>
  )
}

// ─── CopyButton ───────────────────────────────────────────────────────────────

function CopyButton({ value, className }: { value: string; className?: string }) {
  const [copied, setCopied] = React.useState(false)
  const copy = () => {
    navigator.clipboard.writeText(value).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }
  return (
    <button
      onClick={copy}
      className={cn(
        "p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors",
        className
      )}
      title="Copier"
    >
      {copied
        ? <CheckCircle2 className="w-3 h-3 text-emerald-500" />
        : <Copy className="w-3 h-3" />}
    </button>
  )
}

// ─── CredentialRow ────────────────────────────────────────────────────────────

function CredentialRow({
  label, value, secret, mono,
}: {
  label: string; value: string; secret?: boolean; mono?: boolean
}) {
  const [show, setShow] = React.useState(false)

  return (
    <div className="flex items-center gap-2 py-1.5 border-b border-border/40 last:border-0">
      <span className="text-[11px] text-muted-foreground w-24 shrink-0">{label}</span>
      <span className={cn("text-[11px] flex-1 truncate", mono && "font-mono")}>
        {secret && !show ? "••••••••••••••••" : value}
      </span>
      <div className="flex items-center gap-0.5 shrink-0">
        {secret && (
          <button
            onClick={() => setShow(v => !v)}
            className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground"
          >
            {show ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
          </button>
        )}
        <CopyButton value={value} />
      </div>
    </div>
  )
}

// ─── PsqlBlock ────────────────────────────────────────────────────────────────

function PsqlBlock({ label, command }: { label: string; command: string }) {
  return (
    <div className="mt-3 rounded-xl bg-muted border border-border px-3 py-2">
      <div className="flex items-center justify-between mb-1">
        <p className="text-[10px] text-muted-foreground">{label}</p>
        <CopyButton value={command} />
      </div>
      <code className="text-[11px] font-mono break-all">{command}</code>
    </div>
  )
}

// ─── SkeletonCard ─────────────────────────────────────────────────────────────

function SkeletonCard() {
  return (
    <div className="border border-border rounded-2xl overflow-hidden bg-card animate-pulse">
      <div className="flex items-center gap-4 px-5 py-4">
        <div className="w-10 h-10 rounded-xl bg-muted shrink-0" />
        <div className="flex-1 space-y-2">
          <div className="h-3 bg-muted rounded w-40" />
          <div className="h-2.5 bg-muted rounded w-56" />
        </div>
      </div>
    </div>
  )
}

// ─── DatabaseCard ─────────────────────────────────────────────────────────────

function DatabaseCard({
  deployment,
  dbResource,
  resourceLoading,
  onDelete,
}: {
  deployment: DeploymentDTO
  dbResource: DatabaseResourceResponse | null
  resourceLoading: boolean
  onDelete: (id: number) => void
}) {
  const [creds, setCreds] = React.useState<DatabaseCredentials | null>(null)
  const [expanded, setExpanded] = React.useState(false)       // credentials
  const [detailsOpen, setDetailsOpen] = React.useState(false) // infos techniques
  const [loadingCreds, setLoadingCreds] = React.useState(false)
  const [deleting, setDeleting] = React.useState(false)
  const [confirmDel, setConfirmDel] = React.useState(false)

  const loadCreds = async () => {
    if (creds) { setExpanded(v => !v); return }
    setLoadingCreds(true)
    try {
      const c = await getDatabaseCredentials(deployment.id)
      setCreds(c)
      setExpanded(true)
    } catch { }
    finally { setLoadingCreds(false) }
  }

  const handleDelete = async () => {
    if (!confirmDel) { setConfirmDel(true); return }
    setDeleting(true)
    try {
      await deleteDatabaseResource(deployment.id)
      onDelete(deployment.id)
    } catch { }
    finally { setDeleting(false); setConfirmDel(false) }
  }

  const status = (dbResource?.status ?? "PROVISIONING") as DatabaseStatus
  const createdAt = formatDate(deployment.createdAt)

  return (
    <div className={cn(
      "border rounded-2xl overflow-hidden bg-card transition-colors",
      confirmDel ? "border-destructive/50" : "border-border"
    )}>

      {/* ── Header ── */}
      <div className="flex items-center gap-4 px-5 py-4 border-b border-border/60 bg-muted/10">
        <div className="w-10 h-10 rounded-xl bg-[#0a7fcf]/10 border border-[#0a7fcf]/20 flex items-center justify-center shrink-0">
          <Database className="w-5 h-5 text-[#0a7fcf]" />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="text-[14px] font-semibold text-foreground truncate">
              {deployment.resourceName}
            </p>
            <StatusBadge status={status} loading={resourceLoading} />
            {deployment.planName && (
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-[#0a7fcf]/8 text-[#0a7fcf] border border-[#0a7fcf]/20">
                {deployment.planName}
              </span>
            )}
          </div>
          <div className="flex items-center gap-3 mt-0.5 flex-wrap">
            <span className="text-[11px] text-muted-foreground">
              {deployment.serviceName ?? "Base de données"}
            </span>
            {dbResource && (
              <span className="text-[11px] text-muted-foreground">
                {dbResource.instances === 1
                  ? "1 instance (Primary)"
                  : `${dbResource.instances} instances (1 Primary · ${dbResource.instances - 1} Standby)`}
              </span>
            )}
            {createdAt && (
              <span className="text-[11px] text-muted-foreground">
                Créé le {createdAt}
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {/* Toggle infos techniques */}
          {dbResource && (
            <Button
              variant="ghost"
              size="sm"
              className="h-7 w-7 p-0 text-muted-foreground"
              onClick={() => setDetailsOpen(v => !v)}
              title={detailsOpen ? "Masquer les détails" : "Voir les détails"}
            >
              {detailsOpen
                ? <ChevronUp className="w-3.5 h-3.5" />
                : <ChevronDown className="w-3.5 h-3.5" />}
            </Button>
          )}

          {/* Connexion */}
          {status === "READY" && (
            <Button
              variant="outline"
              size="sm"
              className="h-7 text-[11px] px-3"
              onClick={loadCreds}
              disabled={loadingCreds}
            >
              {loadingCreds
                ? <Loader2 className="w-3 h-3 animate-spin" />
                : expanded ? "Masquer" : "Connexion"}
            </Button>
          )}

          {/* Supprimer */}
          <Button
            variant={confirmDel ? "destructive" : "outline"}
            size="sm"
            className="h-7 text-[11px] px-3"
            onClick={handleDelete}
            disabled={deleting}
          >
            {deleting
              ? <Loader2 className="w-3 h-3 animate-spin" />
              : confirmDel ? "Confirmer ?" : <Trash2 className="w-3 h-3" />}
          </Button>
          {confirmDel && !deleting && (
            <Button
              variant="outline"
              size="sm"
              className="h-7 text-[11px] px-3"
              onClick={() => setConfirmDel(false)}
            >
              Annuler
            </Button>
          )}
        </div>
      </div>

      {/* ── Infos techniques (accordéon) ── */}
      {dbResource && detailsOpen && (
        <div className="px-5 py-3 grid grid-cols-2 gap-x-6 gap-y-1 border-b border-border/40 bg-muted/5">
          {[
            { label: "Cluster", value: dbResource.clusterName },
            { label: "Namespace", value: dbResource.namespace },
            { label: "Stockage", value: `${dbResource.storageGb} Go · ${dbResource.storageClassName}` },
            { label: "Port", value: String(dbResource.port) },
            { label: "Base", value: dbResource.dbName },
            ...(dbResource.postgresVersion
              ? [{ label: "PostgreSQL", value: `v${dbResource.postgresVersion}` }]
              : []),
          ].map(row => (
            <div key={row.label} className="flex items-center gap-2 py-1">
              <span className="text-[11px] text-muted-foreground w-20 shrink-0">{row.label}</span>
              <span className="text-[11px] font-mono text-foreground truncate">{row.value}</span>
            </div>
          ))}
        </div>
      )}

      {/* ── Credentials ── */}
      {expanded && creds && (
        <div className="px-5 py-3 bg-muted/20 border-t border-border/40">
          <p className="text-[11px] font-semibold text-foreground mb-2">Informations de connexion</p>
          <CredentialRow label="Hôte (RW)" value={creds.host} mono />
          <CredentialRow label="Hôte (RO)" value={creds.hostRo} mono />
          <CredentialRow label="Base" value={creds.dbName} mono />
          <CredentialRow label="Utilisateur" value={creds.username} mono />
          <CredentialRow label="Mot de passe" value={creds.password} secret mono />
          <CredentialRow label="JDBC URL" value={creds.jdbcUrl} mono />

          <PsqlBlock
            label="Connexion psql (interne)"
            command={`psql "host=${creds.host} port=${creds.port} dbname=${creds.dbName} user=${creds.username} sslmode=require"`}
          />

          {dbResource?.externalPort && (
            <>
              <p className="text-[11px] font-semibold text-foreground mt-4 mb-2">
                Accès externe (hors cluster)
              </p>
              <CredentialRow label="Port externe" value={String(dbResource.externalPort)} mono />
              <CredentialRow
                label="JDBC externe"
                value={`jdbc:postgresql://${dbResource.externalHost}:${dbResource.externalPort}/app`}
                mono
              />
              <PsqlBlock
                label="Connexion psql (externe)"
                command={`psql "host=${dbResource.externalHost} port=${dbResource.externalPort} dbname=${creds.dbName ?? "app"} user=${creds.username ?? "app"} sslmode=require"`}
              />
            </>
          )}
        </div>
      )}

      {/* ── Bandeaux statut ── */}
      {status === "PROVISIONING" && (
        <div className="flex items-center gap-2 px-5 py-3 bg-amber-50 border-t border-amber-100">
          <Loader2 className="w-3.5 h-3.5 animate-spin text-amber-600 shrink-0" />
          <p className="text-[11px] text-amber-700">
            Provisionnement en cours — le cluster PostgreSQL démarre…
          </p>
          <span className="ml-auto text-[10px] text-amber-500">Actualisation auto toutes les 10 s</span>
        </div>
      )}
      {status === "FAILED" && (
        <div className="flex items-center gap-2 px-5 py-3 bg-red-50 border-t border-red-100">
          <AlertTriangle className="w-3.5 h-3.5 text-red-600 shrink-0" />
          <p className="text-[11px] text-red-700">
            {dbResource?.errorMessage ?? "Erreur lors du provisionnement. Contactez le support."}
          </p>
        </div>
      )}
    </div>
  )
}

// ─── Filtres ──────────────────────────────────────────────────────────────────

const STATUS_FILTERS: { value: DatabaseStatus | "ALL"; label: string }[] = [
  { value: "ALL", label: "Tous" },
  { value: "READY", label: "Actif" },
  { value: "PROVISIONING", label: "En cours" },
  { value: "FAILED", label: "Erreur" },
]

// ─── Page principale ──────────────────────────────────────────────────────────

export default function DatabasesPage() {
  const router = useRouter()

  const [deployments, setDeployments] = React.useState<DeploymentDTO[]>([])
  const [dbResources, setDbResources] = React.useState<Record<number, DatabaseResourceResponse>>({})
  // Quels ids sont encore en train de charger leur dbResource
  const [resourceLoadingIds, setResourceLoadingIds] = React.useState<Set<number>>(new Set())
  const [loading, setLoading] = React.useState(true)
  const [refreshing, setRefreshing] = React.useState(false)
  const [search, setSearch] = React.useState("")
  const [statusFilter, setStatusFilter] = React.useState<DatabaseStatus | "ALL">("ALL")

  // Charge tous les dbResource et met à jour la map au fur et à mesure
  const loadResources = React.useCallback(async (deps: DeploymentDTO[]) => {
    if (deps.length === 0) return
    setResourceLoadingIds(new Set(deps.map(d => d.id)))
    await Promise.allSettled(
      deps.map(async d => {
        try {
          const r = await getDatabaseResource(d.id)
          setDbResources(prev => ({ ...prev, [d.id]: r }))
        } catch { }
        finally {
          setResourceLoadingIds(prev => {
            const next = new Set(prev)
            next.delete(d.id)
            return next
          })
        }
      })
    )
  }, [])

  const load = React.useCallback(async (silent = false) => {
    if (!silent) setLoading(true)
    else setRefreshing(true)
    try {
      const all = await getAllDeployments()
      const dbDeps = all.filter(d =>
        d.categoryName === "BASE_DONNEES" &&
        d.status !== "SUPPRIME" &&
        d.status !== "ARRETE"
      )
      setDeployments(dbDeps)
      await loadResources(dbDeps)
    } catch { }
    finally { setLoading(false); setRefreshing(false) }
  }, [loadResources])

  React.useEffect(() => { load() }, [load])

  // Polling : refresh les bases encore en PROVISIONING toutes les 10 s
  React.useEffect(() => {
    const interval = setInterval(async () => {
      const provisioningIds = Object.entries(dbResources)
        .filter(([, r]) => r.status === "PROVISIONING")
        .map(([id]) => Number(id))
      if (provisioningIds.length === 0) return
      const toRefresh = deployments.filter(d => provisioningIds.includes(d.id))
      await loadResources(toRefresh)
    }, 10_000)
    return () => clearInterval(interval)
  }, [dbResources, deployments, loadResources])

  const handleDelete = (id: number) => {
    setDeployments(prev => prev.filter(d => d.id !== id))
    setDbResources(prev => {
      const next = { ...prev }
      delete next[id]
      return next
    })
  }

  const filtered = deployments.filter(d => {
    const realStatus: string = dbResources[d.id]?.status ?? "PROVISIONING"
    const matchSearch =
      search.trim() === "" ||
      d.resourceName.toLowerCase().includes(search.toLowerCase()) ||
      (d.planName ?? "").toLowerCase().includes(search.toLowerCase())
    const matchStatus = statusFilter === "ALL" || realStatus === statusFilter
    return matchSearch && matchStatus
  })

  return (
    <SidebarInset>
      {/* ── Header ── */}
      <header className="flex h-14 items-center gap-3 border-b border-border/60 px-5 bg-background/95 backdrop-blur sticky top-0 z-10">
        <SidebarTrigger className="-ml-1 size-8 text-muted-foreground hover:text-foreground hover:bg-muted rounded-md transition-colors" />
        <Separator orientation="vertical" className="h-4 opacity-40" />
        <div className="flex items-center gap-2 flex-1">
          <Database className="w-4 h-4 text-muted-foreground" />
          <h1 className="text-[14px] font-semibold text-foreground">Bases de données</h1>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            className="h-7 w-7 p-0"
            onClick={() => load(true)}
            disabled={refreshing}
            title="Rafraîchir"
          >
            <RefreshCw className={cn("w-3.5 h-3.5", refreshing && "animate-spin")} />
          </Button>
          <Button
            size="sm"
            className="h-7 text-[12px] px-3 bg-[#0a7fcf] hover:bg-[#0869b0] text-white"
            onClick={() => router.push("/dashboard/services?category=BASE_DONNEES")}
          >
            <Plus className="w-3 h-3 mr-1" />
            Nouvelle base
          </Button>
        </div>
      </header>

      <div className="p-6 w-full">

        {loading ? (
          <div className="space-y-4">
            {[1, 2].map(i => <SkeletonCard key={i} />)}
          </div>

        ) : deployments.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 gap-5">
            <div className="w-16 h-16 rounded-2xl bg-muted/50 border border-border flex items-center justify-center">
              <Database className="w-7 h-7 text-muted-foreground" />
            </div>
            <div className="text-center space-y-1">
              <p className="text-[14px] font-semibold text-foreground">Aucune base de données</p>
              <p className="text-[12px] text-muted-foreground max-w-xs">
                Déployez votre premier cluster PostgreSQL managé sur OpenShift en quelques clics.
              </p>
            </div>
            <div className="flex flex-col items-center gap-2">
              <Button
                className="h-9 text-[13px] px-6 bg-[#0a7fcf] hover:bg-[#0869b0] text-white"
                onClick={() => router.push("/dashboard/services?category=BASE_DONNEES")}
              >
                <Plus className="w-3.5 h-3.5 mr-2" />
                Déployer une base de données
              </Button>
              <p className="text-[11px] text-muted-foreground">
                Propulsé par CloudNativePG · PostgreSQL 18 · Haute disponibilité
              </p>
            </div>
          </div>

        ) : (
          <div className="space-y-4">

            {/* ── Barre recherche + filtres ── */}
            <div className="flex items-center gap-3 flex-wrap">
              <div className="relative flex-1 min-w-[200px] max-w-sm">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
                <Input
                  placeholder="Rechercher une base…"
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  className="h-8 pl-8 pr-8 text-[12px] bg-background"
                />
                {search && (
                  <button
                    onClick={() => setSearch("")}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    <X className="w-3 h-3" />
                  </button>
                )}
              </div>

              <div className="flex items-center gap-1">
                {STATUS_FILTERS.map(f => (
                  <button
                    key={f.value}
                    onClick={() => setStatusFilter(f.value)}
                    className={cn(
                      "h-8 px-3 rounded-lg text-[11px] font-medium border transition-colors",
                      statusFilter === f.value
                        ? "bg-[#0a7fcf] text-white border-[#0a7fcf]"
                        : "bg-background text-muted-foreground border-border hover:border-[#0a7fcf]/50 hover:text-foreground"
                    )}
                  >
                    {f.label}
                  </button>
                ))}
              </div>

              <p className="text-[12px] text-muted-foreground ml-auto">
                {filtered.length} / {deployments.length} base{deployments.length > 1 ? "s" : ""}
              </p>
            </div>

            {/* ── Liste ── */}
            {filtered.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 gap-3 text-center">
                <Search className="w-6 h-6 text-muted-foreground/40" />
                <p className="text-[13px] font-medium text-foreground">Aucun résultat</p>
                <p className="text-[12px] text-muted-foreground">
                  Aucune base ne correspond à vos critères.
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-7 text-[11px] mt-1"
                  onClick={() => { setSearch(""); setStatusFilter("ALL") }}
                >
                  Réinitialiser les filtres
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                {filtered.map(dep => (
                  <DatabaseCard
                    key={dep.id}
                    deployment={dep}
                    dbResource={dbResources[dep.id] ?? null}
                    resourceLoading={resourceLoadingIds.has(dep.id)}
                    onDelete={handleDelete}
                  />
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </SidebarInset>
  )
}