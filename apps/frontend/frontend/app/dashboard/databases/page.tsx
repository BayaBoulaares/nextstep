"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { SidebarInset, SidebarTrigger } from "@/components/ui/sidebar"
import { Separator } from "@/components/ui/separator"
import { Button } from "@/components/ui/button"
import { useDatabaseDeployments } from "@/lib/hooks/useDatabaseDeployments"
import {
  Loader2, Database, Copy, Eye, EyeOff,
  Trash2, RefreshCw, Plus, AlertTriangle,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { getAllDeployments } from "@/lib/services/deployments.api"
import { getDatabaseResource, getDatabaseCredentials, deleteDatabaseResource } from "@/lib/services/database.api"
import type {
  DeploymentDTO, DatabaseResourceResponse,
  DatabaseCredentials, DatabaseStatus,
} from "@/lib/types"
import { DATABASE_STATUS_META } from "@/lib/types"

// ─── DatabaseCard ─────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: DatabaseStatus }) {
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

function CredentialRow({
  label, value, secret, mono,
}: {
  label: string; value: string; secret?: boolean; mono?: boolean
}) {
  const [show,   setShow]   = React.useState(false)
  const [copied, setCopied] = React.useState(false)

  const copy = () => {
    navigator.clipboard.writeText(value).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  return (
    <div className="flex items-center gap-2 py-1.5 border-b border-border/40 last:border-0">
      <span className="text-[11px] text-muted-foreground w-24 shrink-0">{label}</span>
      <span className={cn(
        "text-[11px] flex-1 truncate",
        mono && "font-mono"
      )}>
        {secret && !show ? "••••••••••••••••" : value}
      </span>
      <div className="flex items-center gap-0.5 shrink-0">
        {secret && (
          <button
            onClick={() => setShow(v => !v)}
            className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground"
          >
            {show
              ? <EyeOff className="w-3 h-3" />
              : <Eye    className="w-3 h-3" />}
          </button>
        )}
        <button
          onClick={copy}
          className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground"
        >
          <Copy className={cn("w-3 h-3", copied && "text-emerald-500")} />
        </button>
      </div>
    </div>
  )
}

function DatabaseCard({
  deployment,
  onDelete,
}: {
  deployment: DeploymentDTO
  onDelete: (id: number) => void
}) {
  const [dbResource, setDbResource]   = React.useState<DatabaseResourceResponse | null>(null)
  const [creds,      setCreds]        = React.useState<DatabaseCredentials | null>(null)
  const [expanded,   setExpanded]     = React.useState(false)
  const [loadingCreds, setLoadingCreds] = React.useState(false)
  const [deleting,   setDeleting]     = React.useState(false)
  const [confirmDel, setConfirmDel]   = React.useState(false)

  React.useEffect(() => {
    getDatabaseResource(deployment.id)
      .then(setDbResource)
      .catch(() => {})
  }, [deployment.id])

  const loadCreds = async () => {
    if (creds) { setExpanded(v => !v); return }
    setLoadingCreds(true)
    try {
      const c = await getDatabaseCredentials(deployment.id)
      setCreds(c)
      setExpanded(true)
    } catch {}
    finally { setLoadingCreds(false) }
  }

  const handleDelete = async () => {
    if (!confirmDel) { setConfirmDel(true); return }
    setDeleting(true)
    try {
      await deleteDatabaseResource(deployment.id)
      onDelete(deployment.id)
    } catch {}
    finally { setDeleting(false); setConfirmDel(false) }
  }

  const status = (dbResource?.status ?? "PROVISIONING") as DatabaseStatus

  return (
    <div className="border border-border rounded-2xl overflow-hidden bg-card">

      {/* Header */}
      <div className="flex items-center gap-4 px-5 py-4 border-b border-border/60 bg-muted/10">
        <div className="w-10 h-10 rounded-xl bg-[#0a7fcf]/10 border border-[#0a7fcf]/20 flex items-center justify-center shrink-0">
          <Database className="w-5 h-5 text-[#0a7fcf]" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className="text-[14px] font-semibold text-foreground truncate">
              {deployment.resourceName}
            </p>
            <StatusBadge status={status} />
          </div>
          <p className="text-[11px] text-muted-foreground mt-0.5">
            {deployment.serviceName ?? "Base de données"} · {deployment.planName ?? "—"}
            {dbResource && ` · ${dbResource.instances} instance${dbResource.instances > 1 ? "s" : ""}`}
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {/* Bouton credentials */}
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
                : expanded ? "Masquer" : "Connexion"
              }
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
              : confirmDel
                ? "Confirmer ?"
                : <Trash2 className="w-3 h-3" />
            }
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

      {/* Infos techniques */}
      {dbResource && (
        <div className="px-5 py-3 grid grid-cols-2 gap-x-6 gap-y-1 border-b border-border/40">
          {[
            { label: "Cluster",    value: dbResource.clusterName },
            { label: "Namespace",  value: dbResource.namespace },
            { label: "Instances",  value: `${dbResource.instances} (Primary + ${dbResource.instances - 1} Standby)` },
            { label: "Stockage",   value: `${dbResource.storageGb} Go · ${dbResource.storageClassName}` },
            { label: "Port",       value: String(dbResource.port) },
            { label: "Base",       value: dbResource.dbName },
          ].map(row => (
            <div key={row.label} className="flex items-center gap-2 py-1">
              <span className="text-[11px] text-muted-foreground w-20 shrink-0">{row.label}</span>
              <span className="text-[11px] font-mono text-foreground truncate">{row.value}</span>
            </div>
          ))}
        </div>
      )}

      {/* Credentials dépliables */}
      {expanded && creds && (
        <div className="px-5 py-3 bg-muted/20">
          <p className="text-[11px] font-semibold text-foreground mb-2">
            Informations de connexion
          </p>
          <CredentialRow label="Hôte (RW)"   value={creds.host}     mono />
          <CredentialRow label="Hôte (RO)"   value={creds.hostRo}   mono />
          <CredentialRow label="Base"         value={creds.dbName}   mono />
          <CredentialRow label="Utilisateur"  value={creds.username} mono />
          <CredentialRow label="Mot de passe" value={creds.password} secret mono />
          <CredentialRow label="JDBC URL"     value={creds.jdbcUrl}  mono />

          {/* Commande psql */}
          <div className="mt-3 rounded-xl bg-muted border border-border px-3 py-2">
            <p className="text-[10px] text-muted-foreground mb-1">Connexion psql</p>
            <code className="text-[11px] font-mono break-all">
              {`psql "host=${creds.host} port=${creds.port} dbname=${creds.dbName} user=${creds.username} sslmode=require"`}
            </code>
          </div>
        </div>
      )}

      {/* Statut provisionnement */}
      {status === "PROVISIONING" && (
        <div className="flex items-center gap-2 px-5 py-3 bg-amber-50 border-t border-amber-100">
          <Loader2 className="w-3.5 h-3.5 animate-spin text-amber-600" />
          <p className="text-[11px] text-amber-700">
            Provisionnement en cours — le cluster PostgreSQL démarre…
          </p>
        </div>
      )}

      {status === "FAILED" && (
        <div className="flex items-center gap-2 px-5 py-3 bg-red-50 border-t border-red-100">
          <AlertTriangle className="w-3.5 h-3.5 text-red-600" />
          <p className="text-[11px] text-red-700">
            {dbResource?.errorMessage ?? "Erreur lors du provisionnement. Contactez le support."}
          </p>
        </div>
      )}
    </div>
  )
}

// ─── Page principale ──────────────────────────────────────────────────────────

export default function DatabasesPage() {
  const router = useRouter()

  const [deployments, setDeployments] = React.useState<DeploymentDTO[]>([])
  const [loading,     setLoading]     = React.useState(true)
  const [refreshing,  setRefreshing]  = React.useState(false)

  const load = React.useCallback(async (silent = false) => {
    if (!silent) setLoading(true)
    else setRefreshing(true)
    try {
      const all = await getAllDeployments()
      setDeployments(
        all.filter(d => d.categoryName === "BASE_DONNEES")
      )
    } catch {}
    finally { setLoading(false); setRefreshing(false) }
  }, [])

  React.useEffect(() => { load() }, [load])

  const handleDelete = (id: number) => {
    setDeployments(prev => prev.filter(d => d.id !== id))
  }

  return (
    <SidebarInset>
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

      <div className="p-6 max-w-4xl mx-auto w-full">

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
          </div>

        ) : deployments.length === 0 ? (
          /* État vide */
          <div className="flex flex-col items-center justify-center py-20 gap-5">
            <div className="w-16 h-16 rounded-2xl bg-muted/50 border border-border flex items-center justify-center">
              <Database className="w-7 h-7 text-muted-foreground" />
            </div>
            <div className="text-center space-y-1">
              <p className="text-[14px] font-semibold text-foreground">
                Aucune base de données
              </p>
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
          /* Liste des BDD */
          <div className="space-y-4">
            <div className="flex items-center justify-between mb-2">
              <p className="text-[12px] text-muted-foreground">
                {deployments.length} base{deployments.length > 1 ? "s" : ""} de données
              </p>
            </div>
            {deployments.map(dep => (
              <DatabaseCard
                key={dep.id}
                deployment={dep}
                onDelete={handleDelete}
              />
            ))}
          </div>
        )}
      </div>
    </SidebarInset>
  )
}