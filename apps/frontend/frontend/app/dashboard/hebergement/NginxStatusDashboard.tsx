// app/dashboard/hebergement/page.tsx  OU  composant à intégrer dans le dashboard
"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { SidebarInset, SidebarTrigger } from "@/components/ui/sidebar"
import { Separator } from "@/components/ui/separator"
import { Button } from "@/components/ui/button"
import { getNginxStatus, deprovisionNginx } from "@/lib/services/nginx.api"
import type { NginxDeploymentResult } from "@/lib/types"
import {
  Globe, Server, RefreshCw, Trash2, ExternalLink,
  Loader2, Copy, AlertTriangle, CheckCircle2, Clock
} from "lucide-react"
import { cn } from "@/lib/utils"
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog"

// ── Badges statut ─────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: string }) {
  const config = {
    RUNNING:   { label: "En ligne",       color: "bg-emerald-100 text-emerald-700 border-emerald-200" },
    STARTING:  { label: "Démarrage…",     color: "bg-amber-100 text-amber-700 border-amber-200"       },
    NOT_FOUND: { label: "Non déployé",    color: "bg-muted text-muted-foreground border-border"        },
    ERROR:     { label: "Erreur",         color: "bg-red-100 text-red-700 border-red-200"              },
  }[status] ?? { label: status, color: "bg-muted text-muted-foreground border-border" }

  const Icon = status === "RUNNING"
    ? CheckCircle2
    : status === "STARTING"
      ? Loader2
      : status === "ERROR"
        ? AlertTriangle
        : Clock

  return (
    <span className={cn(
      "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-[11px] font-medium",
      config.color
    )}>
      <Icon className={cn("w-3 h-3", status === "STARTING" && "animate-spin")} />
      {config.label}
    </span>
  )
}

// ── Page principale ───────────────────────────────────────────────────────────

export default function HebergementPage() {
  const router = useRouter()

  const [result,      setResult]      = React.useState<NginxDeploymentResult | null>(null)
  const [loading,     setLoading]     = React.useState(true)
  const [refreshing,  setRefreshing]  = React.useState(false)
  const [deleting,    setDeleting]    = React.useState(false)
  const [showConfirm, setShowConfirm] = React.useState(false)
  const [copied,      setCopied]      = React.useState(false)
  const [error,       setError]       = React.useState<string | null>(null)

  const load = React.useCallback(async (silent = false) => {
    if (!silent) setLoading(true)
    else setRefreshing(true)
    try {
      const data = await getNginxStatus()
      setResult(data)
      setError(null)
    } catch (e: any) {
      setError(e?.message ?? "Impossible de charger le statut")
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [])

  React.useEffect(() => { load() }, [load])

  // Auto-refresh si STARTING
  React.useEffect(() => {
    if (result?.status !== "STARTING") return
    const t = setInterval(() => load(true), 5000)
    return () => clearInterval(t)
  }, [result?.status, load])

  const handleDelete = async () => {
    setDeleting(true)
    try {
      await deprovisionNginx()
      setResult(null)
      setShowConfirm(false)
    } catch (e: any) {
      setError(e?.message ?? "Erreur lors de la suppression")
    } finally {
      setDeleting(false)
    }
  }

  const copyUrl = () => {
    if (!result?.publicUrl) return
    navigator.clipboard.writeText(result.publicUrl).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  // ── Rendu ─────────────────────────────────────────────────────────────────

  return (
    <SidebarInset>
      <header className="flex h-14 items-center gap-3 border-b border-border/60 px-5 bg-background/95 backdrop-blur sticky top-0 z-10">
        <SidebarTrigger className="-ml-1 size-8 text-muted-foreground hover:text-foreground hover:bg-muted rounded-md transition-colors" />
        <Separator orientation="vertical" className="h-4 opacity-40" />
        <nav className="flex items-center gap-1.5 text-[12px] text-muted-foreground">
          <span>Dashboard</span>
          <span className="opacity-30">/</span>
          <span className="font-medium text-foreground">Hébergement Web</span>
        </nav>
        <div className="ml-auto flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            className="h-8 text-[12px] gap-1.5"
            onClick={() => load(true)}
            disabled={refreshing}
          >
            <RefreshCw className={cn("w-3.5 h-3.5", refreshing && "animate-spin")} />
            Actualiser
          </Button>
        </div>
      </header>

      <div className="p-6 max-w-3xl mx-auto w-full space-y-6">

        {/* Titre */}
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Hébergement Web nginx</h1>
          <p className="text-[13px] text-muted-foreground mt-1">
            Gérez votre service nginx dédié sur le cluster OpenShift.
          </p>
        </div>

        {/* États de chargement */}
        {loading && (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
          </div>
        )}

        {/* Erreur */}
        {error && !loading && (
          <div className="flex items-center gap-2 border border-red-200 bg-red-50 rounded-xl px-4 py-3 text-[13px] text-red-600">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            {error}
          </div>
        )}

        {/* Pas de déploiement */}
        {!loading && !error && result?.status === "NOT_FOUND" && (
          <div className="border border-dashed border-border rounded-2xl flex flex-col items-center py-16 gap-4">
            <div className="w-14 h-14 rounded-full bg-muted flex items-center justify-center">
              <Server className="w-6 h-6 text-muted-foreground" />
            </div>
            <div className="text-center">
              <p className="text-[14px] font-medium">Aucun hébergement nginx actif</p>
              <p className="text-[12px] text-muted-foreground mt-1">
                Commandez un service Hébergement Web depuis le catalogue
              </p>
            </div>
            <Button
              className="h-9 text-[13px] bg-[#0a7fcf] hover:bg-[#0869b0] text-white"
              onClick={() => router.push("/dashboard/services")}
            >
              Voir le catalogue →
            </Button>
          </div>
        )}

        {/* Déploiement actif */}
        {!loading && result && result.status !== "NOT_FOUND" && (
          <div className="space-y-4">

            {/* Carte statut principal */}
            <div className="border border-border rounded-2xl overflow-hidden">
              <div className="flex items-center justify-between px-6 py-4 bg-muted/20 border-b border-border">
                <div className="flex items-center gap-3">
                  <div className={cn(
                    "w-10 h-10 rounded-xl flex items-center justify-center",
                    result.status === "RUNNING"
                      ? "bg-emerald-100"
                      : result.status === "STARTING"
                        ? "bg-amber-100"
                        : "bg-red-100"
                  )}>
                    <Globe className={cn(
                      "w-5 h-5",
                      result.status === "RUNNING"  ? "text-emerald-600"
                      : result.status === "STARTING" ? "text-amber-600"
                      : "text-red-600"
                    )} />
                  </div>
                  <div>
                    <p className="text-[14px] font-semibold">{result.appName}</p>
                    <p className="text-[11px] text-muted-foreground">{result.namespace}</p>
                  </div>
                </div>
                <StatusBadge status={result.status} />
              </div>

              {/* URL publique */}
              {result.publicUrl && (
                <div className="px-6 py-4 bg-card border-b border-border">
                  <p className="text-[11px] text-muted-foreground mb-2 font-medium uppercase tracking-wide">
                    URL publique
                  </p>
                  <div className="flex items-center gap-2">
                    <code className="flex-1 text-[12px] font-mono bg-muted px-3 py-2 rounded-lg truncate border border-border">
                      {result.publicUrl}
                    </code>
                    <button
                      onClick={copyUrl}
                      className="p-2 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors shrink-0"
                    >
                      <Copy className={cn("w-4 h-4", copied && "text-emerald-500")} />
                    </button>
                    <a
                      href={result.publicUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-2 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors shrink-0"
                    >
                      <ExternalLink className="w-4 h-4" />
                    </a>
                  </div>
                </div>
              )}

              {/* Infos plan */}
              <div className="grid grid-cols-3 divide-x divide-border bg-card">
                {[
                  { label: "Plan",      value: result.plan   },
                  { label: "Statut",    value: result.status },
                  { label: "Namespace", value: result.namespace.split("-").pop() ?? "—" },
                ].map((item, i) => (
                  <div key={i} className="flex flex-col px-5 py-3 gap-0.5">
                    <span className="text-[10px] text-muted-foreground uppercase tracking-wide">
                      {item.label}
                    </span>
                    <span className="text-[13px] font-medium truncate">{item.value}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-3">
              <Button
                variant="outline"
                className="h-9 text-[13px] flex-1"
                onClick={() => router.push("/dashboard/services")}
              >
                Modifier le plan
              </Button>
              <Button
                variant="outline"
                className="h-9 text-[13px] text-destructive hover:bg-destructive/10 hover:border-destructive"
                onClick={() => setShowConfirm(true)}
              >
                <Trash2 className="w-4 h-4 mr-1.5" />
                Supprimer
              </Button>
            </div>

            {/* Démarrage en cours */}
            {result.status === "STARTING" && (
              <div className="flex items-center gap-2.5 border border-amber-200 bg-amber-50 rounded-xl px-4 py-3">
                <Loader2 className="w-4 h-4 animate-spin text-amber-600 shrink-0" />
                <p className="text-[12px] text-amber-700">
                  Votre nginx démarre… Rafraîchissement automatique toutes les 5 secondes.
                </p>
              </div>
            )}

          </div>
        )}
      </div>

      {/* Dialog confirmation suppression */}
      <AlertDialog open={showConfirm} onOpenChange={setShowConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer l'hébergement nginx ?</AlertDialogTitle>
            <AlertDialogDescription>
              Le pod nginx, le Service et la Route seront supprimés définitivement.
              Votre site ne sera plus accessible. Cette action est irréversible.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Annuler</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive hover:bg-destructive/90 text-destructive-foreground"
              onClick={handleDelete}
              disabled={deleting}
            >
              {deleting && <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />}
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

    </SidebarInset>
  )
}
