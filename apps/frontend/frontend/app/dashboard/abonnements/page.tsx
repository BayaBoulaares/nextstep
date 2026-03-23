// app/dashboard/abonnements/page.tsx
"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { SidebarInset, SidebarTrigger } from "@/components/ui/sidebar"
import { Separator } from "@/components/ui/separator"
import { Button }    from "@/components/ui/button"
import {
  Loader2, AlertTriangle, Zap, Calendar,
  Server, CreditCard, ArrowRight, X, Check,
  Package, Clock, TrendingUp,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { abonnementApi } from "@/app/features/abonnements/services/abonnementApi"
import type { AbonnementResponse, AbonnementStatus, BillingCycle } from "@/lib/types"

// ── Helpers ───────────────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<AbonnementStatus, { label: string; dot: string; badge: string }> = {
  EN_ATTENTE: { label: "En attente",  dot: "bg-amber-400",   badge: "bg-amber-50 text-amber-700 border-amber-200"      },
  ACTIF:      { label: "Actif",       dot: "bg-emerald-500", badge: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  SUSPENDU:   { label: "Suspendu",    dot: "bg-orange-400",  badge: "bg-orange-50 text-orange-700 border-orange-200"   },
  RESILIE:    { label: "Résilié",     dot: "bg-red-400",     badge: "bg-red-50 text-red-700 border-red-200"            },
  EXPIRE:     { label: "Expiré",      dot: "bg-slate-300",   badge: "bg-slate-50 text-slate-500 border-slate-200"      },
}

const CYCLE_LABEL: Record<BillingCycle, string> = {
  HORAIRE: "/ h",
  MENSUEL: "/ mois",
  ANNUEL:  "/ an",
  USAGE:   "à l'usage",
}

function fmt(iso: string | null) {
  if (!iso) return "—"
  return new Date(iso).toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric" })
}

// ── Stat badge ────────────────────────────────────────────────────────────────

function StatBadge({ icon: Icon, label, value, accent = false }: {
  icon: React.ElementType; label: string; value: string | number; accent?: boolean
}) {
  return (
    <div className={cn(
      "flex items-center gap-3 rounded-xl border px-4 py-3 transition-colors",
      accent ? "bg-foreground text-background border-foreground" : "bg-card border-border hover:bg-muted/30"
    )}>
      <div className={cn(
        "w-8 h-8 rounded-lg flex items-center justify-center shrink-0",
        accent ? "bg-background/10" : "bg-muted"
      )}>
        <Icon className="w-4 h-4" />
      </div>
      <div>
        <p className="text-[18px] font-semibold leading-none tabular-nums">{value}</p>
        <p className={cn("text-[11px] mt-0.5", accent ? "opacity-60" : "text-muted-foreground")}>{label}</p>
      </div>
    </div>
  )
}

// ── Info row ──────────────────────────────────────────────────────────────────

function InfoRow({ icon, label, value }: {
  icon: React.ReactNode; label: string; value: React.ReactNode
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <div className="flex items-center gap-1.5 text-muted-foreground shrink-0">
        {icon}
        <span className="text-[11px]">{label}</span>
      </div>
      <span className="text-[12px] text-foreground text-right">{value}</span>
    </div>
  )
}

// ── Carte abonnement ──────────────────────────────────────────────────────────

function AbonnementCard({ abo, onResilier, index }: {
  abo: AbonnementResponse
  onResilier: (id: number) => Promise<void>
  index: number
}) {
  const router = useRouter()
  const [confirming, setConfirming] = React.useState(false)
  const [loading,    setLoading]    = React.useState(false)
  const cfg      = STATUS_CONFIG[abo.status]
  const isActive = abo.status === "ACTIF"
  const canDeploy = abo.isPayAsYouGo && isActive && !abo.deploymentId

  const handleResilier = async () => {
    setLoading(true)
    try { await onResilier(abo.id) }
    finally { setLoading(false); setConfirming(false) }
  }

  return (
    <div
      className="group relative bg-card border border-border rounded-2xl overflow-hidden transition-all duration-200 hover:shadow-sm hover:-translate-y-px"
      style={{ animationDelay: `${index * 50}ms` }}
    >
      {/* Trait couleur gauche (statut) */}
      <div className={cn("absolute left-0 top-4 bottom-4 w-0.5 rounded-full", cfg.dot)} />

      {/* Header */}
      <div className="pl-5 pr-5 pt-5 pb-4">
        <div className="flex items-start justify-between gap-2">

          <div className="flex items-center gap-2.5 min-w-0">
            <div className={cn(
              "w-9 h-9 rounded-xl border flex items-center justify-center text-[16px] shrink-0",
              abo.isPayAsYouGo ? "bg-amber-50 border-amber-100" : "bg-muted border-border"
            )}>
              {abo.isPayAsYouGo ? "⚡" : "📦"}
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 flex-wrap">
                <p className="text-[13px] font-semibold text-foreground truncate">{abo.planName}</p>
                {abo.isPayAsYouGo && (
                  <span className="inline-flex items-center gap-0.5 text-[9px] font-bold tracking-widest uppercase text-amber-700 bg-amber-50 border border-amber-200 rounded-full px-1.5 py-0.5">
                    <Zap className="w-2 h-2" />PAYG
                  </span>
                )}
              </div>
              {abo.serviceName && (
                <p className="text-[11px] text-muted-foreground truncate">{abo.serviceName}</p>
              )}
            </div>
          </div>

          {/* Badge statut */}
          <span className={cn(
            "shrink-0 text-[10px] font-semibold px-2 py-0.5 rounded-full border uppercase tracking-wide",
            cfg.badge
          )}>
            {cfg.label}
          </span>
        </div>
      </div>

      {/* Séparateur */}
      <div className="h-px bg-border/60 mx-5" />

      {/* Infos */}
      <div className="px-5 py-4 space-y-2.5">
        <InfoRow
          icon={<CreditCard className="w-3.5 h-3.5" />}
          label="Facturation"
          value={
            abo.isPayAsYouGo
              ? <span className="text-amber-600 font-medium">À l'usage</span>
              : <span>
                  <span className="font-semibold">{abo.prixSnapshot.toFixed(2)} €</span>
                  <span className="text-muted-foreground ml-0.5">{CYCLE_LABEL[abo.billingCycle]}</span>
                </span>
          }
        />
        <InfoRow
          icon={<Calendar className="w-3.5 h-3.5" />}
          label="Depuis"
          value={fmt(abo.dateDebut)}
        />
        {abo.dateFin ? (
          <InfoRow
            icon={<Clock className="w-3.5 h-3.5" />}
            label="Expire le"
            value={fmt(abo.dateFin)}
          />
        ) : (
          <InfoRow
            icon={<Clock className="w-3.5 h-3.5" />}
            label="Renouvellement"
            value={<span className="text-emerald-600">Automatique</span>}
          />
        )}
        {abo.resourceName ? (
          <InfoRow
            icon={<Server className="w-3.5 h-3.5" />}
            label="Ressource"
            value={<code className="text-[11px] bg-muted px-1.5 py-0.5 rounded font-mono">{abo.resourceName}</code>}
          />
        ) : abo.isPayAsYouGo && isActive ? (
          <InfoRow
            icon={<Server className="w-3.5 h-3.5 opacity-30" />}
            label="Ressource"
            value={<span className="italic text-[11px] text-muted-foreground/60">Non déployé</span>}
          />
        ) : null}
      </div>

      {/* Actions — uniquement si actif */}
      {isActive && (
        <>
          <div className="h-px bg-border/60 mx-5" />
          <div className="px-5 py-4 space-y-2">

            {/* Déployer si PAYG sans déploiement */}
            {canDeploy && (
              <Button size="sm" className="w-full h-8 text-[12px] gap-1.5" onClick={() => {
                sessionStorage.setItem("deploy_draft", JSON.stringify({ planId: abo.planId, abonnementId: abo.id }))
                router.push("/dashboard/services")
              }}>
                <Server className="w-3.5 h-3.5" />
                Déployer ce plan
                <ArrowRight className="w-3 h-3 ml-auto" />
              </Button>
            )}

            {/* Résilier */}
            {!confirming ? (
              <button
                onClick={() => setConfirming(true)}
                className="w-full h-8 text-[12px] text-muted-foreground hover:text-red-600 hover:bg-red-50 border border-transparent hover:border-red-200 rounded-lg transition-all flex items-center justify-center gap-1.5"
              >
                <X className="w-3.5 h-3.5" />Résilier l'abonnement
              </button>
            ) : (
              <div className="space-y-2">
                <p className="text-[11px] text-center text-muted-foreground">Confirmer la résiliation ?</p>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" className="flex-1 h-8 text-[12px]"
                    onClick={() => setConfirming(false)} disabled={loading}>
                    Annuler
                  </Button>
                  <Button size="sm" className="flex-1 h-8 text-[12px] bg-red-600 hover:bg-red-700 text-white"
                    onClick={handleResilier} disabled={loading}>
                    {loading
                      ? <Loader2 className="w-3 h-3 animate-spin" />
                      : <><Check className="w-3 h-3 mr-1" />Confirmer</>
                    }
                  </Button>
                </div>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  )
}

// ── État vide ─────────────────────────────────────────────────────────────────

function EmptyState() {
  const router = useRouter()
  return (
    <div className="flex flex-col items-center justify-center py-24 gap-4 text-center">
      <div className="w-14 h-14 rounded-2xl bg-muted border border-border flex items-center justify-center text-2xl">
        📭
      </div>
      <div>
        <p className="text-[15px] font-semibold text-foreground">Aucun abonnement</p>
        <p className="text-[13px] text-muted-foreground mt-1 max-w-xs leading-relaxed">
          Souscrivez à un plan depuis le Marketplace pour démarrer.
        </p>
      </div>
      <Button className="gap-2 mt-2" onClick={() => router.push("/dashboard/services")}>
        Explorer les services <ArrowRight className="w-4 h-4" />
      </Button>
    </div>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────

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
  const payg     = actifs.filter(a => a.isPayAsYouGo)
  const totalMensuel = actifs
    .filter(a => !a.isPayAsYouGo && a.billingCycle === "MENSUEL")
    .reduce((s, a) => s + a.prixSnapshot, 0)

  return (
    <SidebarInset>

      {/* Header */}
      <header className="flex h-14 items-center gap-3 border-b border-border/60 px-5 bg-background/95 backdrop-blur sticky top-0 z-10">
        <SidebarTrigger className="-ml-1 size-8 text-muted-foreground hover:text-foreground hover:bg-muted rounded-md transition-colors" />
        <Separator orientation="vertical" className="h-4 opacity-40" />
        <CreditCard className="w-4 h-4 text-muted-foreground" />
        <h1 className="text-[14px] font-semibold">Mes Abonnements</h1>
        {!loading && abonnements.length > 0 && (
          <span className="ml-auto text-[11px] text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
            {actifs.length} actif{actifs.length !== 1 ? "s" : ""}
          </span>
        )}
      </header>

      <div className="p-6 max-w-5xl mx-auto w-full space-y-8">

        {/* Erreur action */}
        {actionError && (
          <div className="flex items-center gap-2 text-[12px] text-red-600 bg-red-50 border border-red-200 rounded-xl px-4 py-3">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            {actionError}
            <button onClick={() => setActionError(null)} className="ml-auto hover:text-red-800">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Loading */}
        {loading && (
          <div className="flex items-center justify-center py-24">
            <Loader2 className="size-5 animate-spin text-muted-foreground" />
          </div>
        )}

        {/* Erreur */}
        {error && !loading && (
          <div className="flex items-center gap-2 text-[13px] text-red-600 bg-red-50 border border-red-200 rounded-xl px-4 py-3">
            <AlertTriangle className="w-4 h-4 shrink-0" />{error}
          </div>
        )}

        {/* Vide */}
        {!loading && !error && abonnements.length === 0 && <EmptyState />}

        {/* Contenu */}
        {!loading && !error && abonnements.length > 0 && (
          <>
            {/* Stats */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <StatBadge icon={Package}    label="Actifs"       value={actifs.length}                   accent />
              <StatBadge icon={TrendingUp} label="/ mois (HT)"  value={`${totalMensuel.toFixed(0)} €`} />
              <StatBadge icon={Zap}        label="Plans PAYG"   value={payg.length}                    />
              <StatBadge icon={Clock}      label="Total"        value={abonnements.length}              />
            </div>

            {/* Actifs */}
            {actifs.length > 0 && (
              <section className="space-y-4">
                <div className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
                  <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-muted-foreground">
                    Actifs · {actifs.length}
                  </p>
                </div>
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {actifs.map((a, i) => (
                    <AbonnementCard key={a.id} abo={a} onResilier={handleResilier} index={i} />
                  ))}
                </div>
              </section>
            )}

            {/* Historique */}
            {inactifs.length > 0 && (
              <section className="space-y-4">
                <div className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-slate-300 shrink-0" />
                  <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-muted-foreground">
                    Historique · {inactifs.length}
                  </p>
                </div>
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 opacity-50">
                  {inactifs.map((a, i) => (
                    <AbonnementCard key={a.id} abo={a} onResilier={handleResilier} index={i} />
                  ))}
                </div>
              </section>
            )}
          </>
        )}
      </div>
    </SidebarInset>
  )
}