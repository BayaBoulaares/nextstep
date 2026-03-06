"use client"

import * as React from "react"
import { X, Plus, Loader2, AlertCircle, Pencil, Trash2, Power, PowerOff } from "lucide-react"
import { Button }   from "@/components/ui/button"
import { cn }       from "@/lib/utils"
import { apiFetch } from "@/lib/apiClient"
import type { CloudServiceDTO, PlanDTO } from "@/lib/types"
import { PlanFormModal } from "@/components/admin/PlanFormModal"
import { ConfirmDialog } from "@/components/admin/ConfirmDialog"

// ─── Labels ───────────────────────────────────────────────────────────────────

const TIER_LABEL: Record<string, string> = {
  DEMARRAGE:     "Démarrage",
  AVANTAGE:      "Avantage",
  ESSENTIEL:     "Essentiel",
  CONFORT:       "Confort",
  ELITE:         "Élite",
  PROFESSIONNEL: "Professionnel",
  ENTREPRISE:    "Entreprise",
}

const CYCLE_LABEL: Record<string, string> = {
  HORAIRE: "/h",
  MENSUEL: "/mois",
  ANNUEL:  "/an",
}

// ─── Props ────────────────────────────────────────────────────────────────────

interface ServicePlansDialogProps {
  service:  CloudServiceDTO
  isAdmin?: boolean
  onClose:  () => void
  onSaved?: () => void
}

// ══════════════════════════════════════════════════════════════════════════════

export function ServicePlansDialog({
  service, isAdmin = false, onClose, onSaved,
}: ServicePlansDialogProps) {

  const [plans,        setPlans]        = React.useState<PlanDTO[]>([])
  const [loading,      setLoading]      = React.useState(true)
  const [error,        setError]        = React.useState<string | null>(null)
  const [showPlanForm, setShowPlanForm] = React.useState(false)
  const [editingPlan,  setEditingPlan]  = React.useState<PlanDTO | undefined>(undefined)
  const [deletingPlan, setDeletingPlan] = React.useState<PlanDTO | null>(null)
  const [deleteLoad,   setDeleteLoad]   = React.useState(false)
  const [toggleLoad,   setToggleLoad]   = React.useState<number | null>(null)

  // ── Charger les plans ──────────────────────────────────────────────────────
  const loadPlans = React.useCallback(async () => {
    setLoading(true); setError(null)
    try {
      const data = await apiFetch<PlanDTO[]>(`/api/plans/service/${service.id}`)
      setPlans(data)
    } catch (e: any) {
      setError(e.message ?? "Impossible de charger les plans.")
    } finally {
      setLoading(false)
    }
  }, [service.id])

  React.useEffect(() => { loadPlans() }, [loadPlans])

  // Fermeture sur Escape
  React.useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === "Escape" && !showPlanForm && !deletingPlan) onClose() }
    window.addEventListener("keydown", h)
    return () => window.removeEventListener("keydown", h)
  }, [onClose, showPlanForm, deletingPlan])

  // ── Handlers ───────────────────────────────────────────────────────────────

  function handlePlanSaved(saved: PlanDTO) {
    setPlans(prev => {
      const idx = prev.findIndex(p => p.id === saved.id)
      return idx >= 0
        ? prev.map(p => p.id === saved.id ? saved : p)
        : [...prev, saved]
    })
    setShowPlanForm(false)
    setEditingPlan(undefined)
    onSaved?.()
  }

  async function handleToggle(plan: PlanDTO) {
    setToggleLoad(plan.id)
    try {
      const updated = await apiFetch<PlanDTO>(`/api/plans/${plan.id}/toggle`, { method: "PATCH" })
      setPlans(prev => prev.map(p => p.id === updated.id ? updated : p))
      onSaved?.()
    } catch (e: any) {
      setError(e.message)
    } finally {
      setToggleLoad(null)
    }
  }

  async function handleDelete() {
    if (!deletingPlan) return
    setDeleteLoad(true)
    try {
      await apiFetch(`/api/plans/${deletingPlan.id}`, { method: "DELETE" })
      setPlans(prev => prev.filter(p => p.id !== deletingPlan.id))
      setDeletingPlan(null)
      onSaved?.()
    } catch (e: any) {
      setError(e.message)
    } finally {
      setDeleteLoad(false)
    }
  }

  // ── Tri : actifs d'abord, inactifs ensous ──────────────────────────────────
  const activePlans   = plans.filter(p => p.isActive)
  const inactivePlans = plans.filter(p => !p.isActive)

  return (
    <>
      <div className="fixed inset-0 z-40 flex items-center justify-center p-4">
        {/* Backdrop */}
        <div className="absolute inset-0 bg-black/30 backdrop-blur-[2px]" onClick={onClose} />

        {/* Dialog */}
        <div className="relative z-10 bg-background border border-border/70 rounded-2xl shadow-2xl w-full max-w-lg flex flex-col max-h-[85vh] overflow-hidden">

          {/* ── Header ── */}
          <div className="flex items-start gap-3 px-6 pt-5 pb-4 border-b border-border/60 flex-shrink-0">
            {service.icon && (
              <span className="text-2xl leading-none mt-0.5 flex-shrink-0">{service.icon}</span>
            )}
            <div className="flex-1 min-w-0">
              <h2 className="text-[15px] font-semibold tracking-tight truncate">{service.name}</h2>
              {service.description && (
                <p className="text-[12px] text-muted-foreground mt-0.5 line-clamp-1">
                  {service.description}
                </p>
              )}
            </div>
            <button
              onClick={onClose}
              className="flex-shrink-0 w-7 h-7 flex items-center justify-center rounded-lg bg-muted hover:bg-muted/80 transition-colors"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* ── Corps scrollable ── */}
          <div className="flex-1 overflow-y-auto px-5 py-4 space-y-2">

            {error && (
              <div className="flex items-center gap-2 rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2.5 text-[12px] text-destructive">
                <AlertCircle className="size-3.5 flex-shrink-0" />{error}
              </div>
            )}

            {/* Chargement */}
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="size-4 animate-spin text-muted-foreground" />
              </div>

            /* Aucun plan */
            ) : plans.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 gap-2 text-center">
                <p className="text-[13px] text-muted-foreground">Aucun plan configuré pour ce service.</p>
                {isAdmin && (
                  <Button
                    size="sm" variant="outline" className="h-7 text-[11px] gap-1.5 mt-1"
                    onClick={() => { setEditingPlan(undefined); setShowPlanForm(true) }}
                  >
                    <Plus className="size-3" /> Créer le premier plan
                  </Button>
                )}
              </div>

            /* Liste */
            ) : (
              <>
                {activePlans.map(plan => (
                  <PlanCard
                    key={plan.id}
                    plan={plan}
                    isAdmin={isAdmin}
                    toggling={toggleLoad === plan.id}
                    onEdit={() => { setEditingPlan(plan); setShowPlanForm(true) }}
                    onDelete={() => setDeletingPlan(plan)}
                    onToggle={() => handleToggle(plan)}
                  />
                ))}

                {/* Séparateur inactifs */}
                {inactivePlans.length > 0 && activePlans.length > 0 && (
                  <div className="flex items-center gap-2 py-1">
                    <div className="flex-1 h-px bg-border/40" />
                    <span className="text-[10px] text-muted-foreground/50 uppercase tracking-wider">
                      Inactifs ({inactivePlans.length})
                    </span>
                    <div className="flex-1 h-px bg-border/40" />
                  </div>
                )}

                {inactivePlans.map(plan => (
                  <PlanCard
                    key={plan.id}
                    plan={plan}
                    isAdmin={isAdmin}
                    toggling={toggleLoad === plan.id}
                    onEdit={() => { setEditingPlan(plan); setShowPlanForm(true) }}
                    onDelete={() => setDeletingPlan(plan)}
                    onToggle={() => handleToggle(plan)}
                  />
                ))}
              </>
            )}
          </div>

          {/* ── Footer ── */}
          <div className="flex-shrink-0 border-t border-border/60 px-5 py-3.5 flex items-center justify-between">
            {/* Compteur */}
            {!loading && (
              <p className="text-[11px] text-muted-foreground">
                {activePlans.length} plan{activePlans.length > 1 ? "s" : ""} actif{activePlans.length > 1 ? "s" : ""}
                {inactivePlans.length > 0 && ` · ${inactivePlans.length} inactif${inactivePlans.length > 1 ? "s" : ""}`}
              </p>
            )}

            {/* Bouton ajouter plan (admin uniquement) */}
            {isAdmin && (
              <Button
                size="sm" className="h-8 text-[12px] gap-1.5 ml-auto"
                onClick={() => { setEditingPlan(undefined); setShowPlanForm(true) }}
              >
                <Plus className="size-3.5" /> Ajouter un plan
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Modal ajout / édition plan */}
      {showPlanForm && (
        <PlanFormModal
          serviceId={service.id}
          plan={editingPlan}
          onClose={() => { setShowPlanForm(false); setEditingPlan(undefined) }}
          onSaved={handlePlanSaved}
        />
      )}

      {/* Confirmation suppression */}
      {deletingPlan && (
        <ConfirmDialog
          title="Supprimer ce plan ?"
          message={`Le plan "${deletingPlan.name}" sera définitivement supprimé. Cette action est irréversible.`}
          loading={deleteLoad}
          onConfirm={handleDelete}
          onCancel={() => setDeletingPlan(null)}
        />
      )}
    </>
  )
}

// ══════════════════════════════════════════════════════════════════════════════
// CARTE PLAN
// ══════════════════════════════════════════════════════════════════════════════

function PlanCard({ plan, isAdmin, toggling, onEdit, onDelete, onToggle }: {
  plan:     PlanDTO
  isAdmin:  boolean
  toggling: boolean
  onEdit:   () => void
  onDelete: () => void
  onToggle: () => void
}) {
  const cycle    = CYCLE_LABEL[plan.billingCycle] ?? ""
  const tier     = TIER_LABEL[plan.tier] ?? plan.tier

  const specs = [
    plan.vcores    ? `${plan.vcores} vCPU`   : "",
    plan.ramGb     ? `${plan.ramGb} Go RAM`  : "",
    plan.storageGb ? `${plan.storageGb} Go`  : "",
  ].filter(Boolean)

  const subline = specs.length > 0 ? specs.join(", ") : plan.description ?? ""

  return (
    <div className={cn(
      "group flex items-start gap-3 rounded-xl border px-4 py-3 transition-all",
      plan.isActive
        ? "border-border/60 bg-card hover:border-border hover:bg-muted/10"
        : "border-border/30 bg-muted/5 opacity-55"
    )}>

      {/* Point statut */}
      <span className={cn(
        "w-2 h-2 rounded-full flex-shrink-0 mt-[5px]",
        plan.isActive ? "bg-emerald-500" : "bg-zinc-500"
      )} />

      {/* Texte */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center flex-wrap gap-x-2 gap-y-1">
          <span className={cn(
            "text-[13px] font-semibold leading-tight",
            !plan.isActive && "text-muted-foreground"
          )}>
            {plan.name}
          </span>

          {/* Badge marketing (RECOMMANDÉ, etc.) */}
          {plan.badge && (
            <span className="text-[9px] font-bold tracking-[0.08em] px-1.5 py-[2px] rounded bg-foreground text-background uppercase">
              {plan.badge}
            </span>
          )}

          {/* isPopular sans badge */}
          {plan.isPopular && !plan.badge && (
            <span className="text-[9px] font-bold tracking-[0.08em] px-1.5 py-[2px] rounded bg-primary/90 text-primary-foreground uppercase">
              Populaire
            </span>
          )}

          {/* Tier discret */}
          <span className="text-[10px] text-muted-foreground/60 border border-border/40 px-1.5 py-[1px] rounded">
            {tier}
          </span>
        </div>

        {subline && (
          <p className="text-[11px] text-muted-foreground mt-0.5 truncate font-mono tracking-tight">
            {subline}
          </p>
        )}
      </div>

      {/* Prix */}
      <div className="flex-shrink-0 text-right">
        {plan.price === 0 ? (
          <span className="text-[13px] font-semibold text-emerald-500">Gratuit</span>
        ) : (
          <span className={cn("text-[13px] font-semibold tabular-nums", !plan.isActive && "text-muted-foreground")}>
            {plan.price.toFixed(0)}€
            <span className="text-[11px] font-normal text-muted-foreground">{cycle}</span>
          </span>
        )}
      </div>

      {/* Actions admin (hover) */}
      {isAdmin && (
        <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0 -mr-1">
          <button
            onClick={onToggle} disabled={toggling}
            title={plan.isActive ? "Désactiver" : "Activer"}
            className={cn(
              "w-6 h-6 flex items-center justify-center rounded-md transition-colors",
              plan.isActive
                ? "text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/40"
                : "text-muted-foreground hover:bg-muted"
            )}
          >
            {toggling
              ? <Loader2 className="size-3 animate-spin" />
              : plan.isActive ? <Power className="size-3" /> : <PowerOff className="size-3" />
            }
          </button>
          <button
            onClick={onEdit}
            title="Modifier"
            className="w-6 h-6 flex items-center justify-center rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
          >
            <Pencil className="size-3" />
          </button>
          <button
            onClick={onDelete}
            title="Supprimer"
            className="w-6 h-6 flex items-center justify-center rounded-md text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
          >
            <Trash2 className="size-3" />
          </button>
        </div>
      )}
    </div>
  )
}