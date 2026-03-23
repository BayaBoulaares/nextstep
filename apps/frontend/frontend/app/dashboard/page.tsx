// app/dashboard/abonnements/page.tsx
"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { SidebarInset, SidebarTrigger } from "@/components/ui/sidebar"
import { Separator }  from "@/components/ui/separator"
import { Button }     from "@/components/ui/button"
import { Loader2, AlertTriangle, Zap, Calendar, Server } from "lucide-react"
import { cn } from "@/lib/utils"
import { abonnementApi } from "@/app/features/abonnements/services/abonnementApi"
import type { AbonnementResponse, AbonnementStatus, BillingCycle } from "@/lib/types"

// ── Helpers ───────────────────────────────────────────────────────────────────

const STATUS_LABEL: Record<AbonnementStatus, string> = {
  EN_ATTENTE: "En attente",
  ACTIF:      "Actif",
  SUSPENDU:   "Suspendu",
  RESILIE:    "Résilié",
  EXPIRE:     "Expiré",
}

const STATUS_CLASS: Record<AbonnementStatus, string> = {
  EN_ATTENTE: "bg-yellow-100 text-yellow-800 border-yellow-200",
  ACTIF:      "bg-emerald-100 text-emerald-800 border-emerald-200",
  SUSPENDU:   "bg-orange-100 text-orange-800 border-orange-200",
  RESILIE:    "bg-red-100    text-red-800    border-red-200",
  EXPIRE:     "bg-gray-100   text-gray-600   border-gray-200",
}

const CYCLE_LABEL: Record<BillingCycle, string> = {
  HORAIRE: "/ h",
  MENSUEL: "/ mois",
  ANNUEL:  "/ an",
  USAGE:   "(à l'usage)",
}

function fmt(iso: string | null): string {
  if (!iso) return "—"
  return new Date(iso).toLocaleDateString("fr-FR", {
    day: "2-digit", month: "short", year: "numeric",
  })
}

// ── Carte abonnement ──────────────────────────────────────────────────────────

function AbonnementCard({
  abo,
  onResilier,
}: {
  abo: AbonnementResponse
  onResilier: (id: number) => Promise<void>
}) {
  const router = useRouter()
  const [confirming, setConfirming] = React.useState(false)
  const [loading,    setLoading]    = React.useState(false)

  const handleResilier = async () => {
    setLoading(true)
    try { await onResilier(abo.id) }
    finally { setLoading(false); setConfirming(false) }
  }

  // Un abonnement PAYG sans déploiement peut être "déployé"
  const canDeploy = abo.isPayAsYouGo && abo.status === "ACTIF" && !abo.deploymentId

  return (
    <div className="border border-border rounded-2xl overflow-hidden bg-card">

      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-border bg-muted/20">
        <div className="flex items-center gap-2.5">
          {abo.isPayAsYouGo && (
            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-700 bg-amber-50 border border-amber-200 rounded-full px-2 py-0.5 uppercase tracking-wide">
              <Zap className="w-2.5 h-2.5" />PAYG
            </span>
          )}
          <div>
            <p className="text-[14px] font-semibold text-foreground leading-tight">{abo.planName}</p>
            {abo.serviceName && (
              <p className="text-[12px] text-muted-foreground">{abo.serviceName}</p>
            )}
          </div>
        </div>
        <span className={cn(
          "text-[11px] font-medium px-2.5 py-0.5 rounded-full border",
          STATUS_CLASS[abo.status],
        )}>
          {STATUS_LABEL[abo.status]}
        </span>
      </div>

      {/* Body */}
      <div className="px-5 py-4 space-y-2">
        {[
          {
            icon: <Zap className="w-3.5 h-3.5 text-muted-foreground" />,
            label: "Prix",
            value: abo.isPayAsYouGo
              ? <span className="text-amber-600 font-medium">À l'usage</span>
              : `${abo.prixSnapshot.toFixed(2)} € ${CYCLE_LABEL[abo.billingCycle]}`,
          },
          {
            icon: <Calendar className="w-3.5 h-3.5 text-muted-foreground" />,
            label: "Début",
            value: fmt(abo.dateDebut),
          },
          {
            icon: <Calendar className="w-3.5 h-3.5 text-muted-foreground" />,
            label: "Fin prévue",
            value: abo.dateFin ? fmt(abo.dateFin) : "Reconductible",
          },
          ...(abo.resourceName ? [{
            icon: <Server className="w-3.5 h-3.5 text-muted-foreground" />,
            label: "Ressource",
            value: <span className="font-mono text-[12px]">{abo.resourceName}</span>,
          }] : []),
          ...(abo.dateResiliation ? [{
            icon: <Calendar className="w-3.5 h-3.5 text-muted-foreground" />,
            label: "Résilié le",
            value: fmt(abo.dateResiliation),
          }] : []),
        ].map((row, i) => (
          <div key={i} className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-1.5">
              {row.icon}
              <span className="text-[12px] text-muted-foreground">{row.label}</span>
            </div>
            <span className="text-[12px] font-medium text-foreground text-right">{row.value}</span>
          </div>
        ))}
      </div>

      {/* Footer actions — uniquement si actif */}
      {abo.status === "ACTIF" && (
        <div className="px-5 pb-4 flex flex-col gap-2">

          {/* Bouton Déployer — uniquement PAYG sans déploiement lié */}
          {canDeploy && (
            <Button
              size="sm"
              className="w-full h-8 text-[12px]"
              onClick={() => {
                // Pré-rempli le draft avec planId pour repartir du tunnel
                sessionStorage.setItem("deploy_draft", JSON.stringify({ planId: abo.planId, abonnementId: abo.id }))
                router.push("/dashboard/services")
              }}
            >
              🚀 Déployer ce plan
            </Button>
          )}

          {/* Bouton Résilier */}
          {!confirming ? (
            <Button
              variant="outline" size="sm"
              className="w-full h-8 text-[12px] text-red-600 border-red-200 hover:bg-red-50"
              onClick={() => setConfirming(true)}
            >
              Résilier l'abonnement
            </Button>
          ) : (
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
                {loading ? <Loader2 className="w-3 h-3 animate-spin" /> : "Confirmer"}
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ── Page principale ───────────────────────────────────────────────────────────

export default function MesAbonnementsPage() {
  const [abonnements, setAbonnements] = React.useState<AbonnementResponse[]>([])
  const [loading,     setLoading]     = React.useState(true)
  const [error,       setError]       = React.useState<string | null>(null)
  const [actionError, setActionError] = React.useState<string | null>(null)

  React.useEffect(() => {
    abonnementApi.mesAbonnements()
      .then(data  => setAbonnements(Array.isArray(data) ? data : []))
      .catch(err  => setError(err?.message ?? "Erreur de chargement"))
      .finally(() => setLoading(false))
  }, [])

  const handleResilier = async (id: number) => {
    try {
      setActionError(null)
      const updated = await abonnementApi.resilier(id)
      setAbonnements(prev => prev.map(a => a.id === id ? updated : a))
    } catch (e: any) {
      setActionError(e.message ?? "Erreur lors de la résiliation")
    }
  }

  const actifs   = abonnements.filter(a => a.status === "ACTIF")
  const inactifs = abonnements.filter(a => a.status !== "ACTIF")

  return (
    <SidebarInset>
      <header className="flex h-14 items-center gap-3 border-b border-border/60 px-5 bg-background/95 backdrop-blur sticky top-0 z-10">
        <SidebarTrigger className="-ml-1 size-8 text-muted-foreground hover:text-foreground hover:bg-muted rounded-md transition-colors" />
        <Separator orientation="vertical" className="h-4 opacity-40" />
        <h1 className="text-[14px] font-semibold">Mes Abonnements</h1>
        <span className="ml-auto text-[12px] text-muted-foreground">
          {actifs.length} actif{actifs.length !== 1 ? "s" : ""}
        </span>
      </header>

      <div className="p-6 max-w-4xl mx-auto w-full space-y-8">

        {loading && (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="size-5 animate-spin text-muted-foreground" />
          </div>
        )}

        {error && (
          <div className="flex items-center gap-2 text-[13px] text-red-600 bg-red-50 border border-red-200 rounded-xl px-4 py-3">
            <AlertTriangle className="w-4 h-4 shrink-0" />{error}
          </div>
        )}

        {actionError && (
          <div className="flex items-center gap-2 text-[13px] text-red-600 bg-red-50 border border-red-200 rounded-xl px-4 py-3">
            <AlertTriangle className="w-4 h-4 shrink-0" />{actionError}
          </div>
        )}

        {!loading && abonnements.length === 0 && !error && (
          <div className="text-center py-20">
            <p className="text-[15px] font-medium text-foreground">Aucun abonnement</p>
            <p className="text-[13px] text-muted-foreground mt-1">
              Souscrivez à un plan depuis le Marketplace.
            </p>
            <Button className="mt-5" onClick={() => window.location.href = "/dashboard/services"}>
              Explorer les services →
            </Button>
          </div>
        )}

        {actifs.length > 0 && (
          <section className="space-y-3">
            <p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-muted-foreground">
              Actifs ({actifs.length})
            </p>
            <div className="grid gap-4 sm:grid-cols-2">
              {actifs.map(a => (
                <AbonnementCard key={a.id} abo={a} onResilier={handleResilier} />
              ))}
            </div>
          </section>
        )}

        {inactifs.length > 0 && (
          <section className="space-y-3">
            <p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-muted-foreground">
              Historique ({inactifs.length})
            </p>
            <div className="grid gap-4 sm:grid-cols-2 opacity-60">
              {inactifs.map(a => (
                <AbonnementCard key={a.id} abo={a} onResilier={handleResilier} />
              ))}
            </div>
          </section>
        )}
      </div>
    </SidebarInset>
  )
}