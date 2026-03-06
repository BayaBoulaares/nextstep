"use client"

import * as React from "react"
import {
  IconCheck, IconX, IconPencil, IconTrash, IconPlus,
  IconChevronRight, IconCpu, IconDatabase, IconServer,
  IconLoader2, IconAlertCircle,
} from "@tabler/icons-react"
import {
  Dialog, DialogContent, DialogTitle, DialogDescription,
} from "@/components/ui/dialog"
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Button }    from "@/components/ui/button"
import { Badge }     from "@/components/ui/badge"
import { Input }     from "@/components/ui/input"
import { Label }     from "@/components/ui/label"
import { Textarea }  from "@/components/ui/textarea"
import { Switch }    from "@/components/ui/switch"
import { Separator } from "@/components/ui/separator"
import {
  Select, SelectContent, SelectItem,
  SelectTrigger, SelectValue,
} from "@/components/ui/select"
import { cn } from "@/lib/utils"
// ✅ apiFetch gère Bearer token automatiquement
import { apiFetch } from "@/lib/apiClient"
import type {
  CloudServiceDTO, PlanDTO,
  ServiceStatus, ServiceCategory, CloudType,
  PlanTier, BillingCycle,
  CloudServiceRequest, PlanRequest,
} from "../types"

// ─── Constantes ───────────────────────────────────────────────────────────────

const CLOUD_TYPE_OPTIONS: { value: CloudType; label: string }[] = [
  { value: "PRIVÉ",   label: "Cloud Privé"   },
  { value: "PUBLIC",  label: "Cloud Public"  },
  { value: "HYBRIDE", label: "Cloud Hybride" },
]

const CATEGORY_OPTIONS: { value: ServiceCategory; label: string }[] = [
  { value: "CALCUL",       label: "Calcul"                    },
  { value: "HEBERGEMENT",  label: "Hébergement"               },
  { value: "STOCKAGE",     label: "Stockage"                  },
  { value: "BASE_DONNEES", label: "Base de données"           },
  { value: "RESEAU",       label: "Réseau"                    },
  { value: "EMAIL",        label: "Email"                     },
  { value: "IA",           label: "Intelligence Artificielle" },
  { value: "SECURITE",     label: "Sécurité"                  },
  { value: "IAM",          label: "Gestion d'accès"           },
]

const STATUS_OPTIONS: { value: ServiceStatus; label: string }[] = [
  { value: "ACTIF",       label: "Actif"       },
  { value: "INACTIF",     label: "Inactif"     },
  { value: "MAINTENANCE", label: "Maintenance" },
]

const TIER_OPTIONS: { value: PlanTier; label: string }[] = [
  { value: "DEMARRAGE",     label: "Démarrage"     },
  { value: "AVANTAGE",      label: "Avantage"      },
  { value: "ESSENTIEL",     label: "Essentiel"     },
  { value: "CONFORT",       label: "Confort"       },
  { value: "ELITE",         label: "Élite"         },
  { value: "PROFESSIONNEL", label: "Professionnel" },
  { value: "ENTREPRISE",    label: "Entreprise"    },
]

const BILLING_OPTIONS: { value: BillingCycle; label: string }[] = [
  { value: "HORAIRE", label: "À l'heure" },
  { value: "MENSUEL", label: "Mensuel"   },
  { value: "ANNUEL",  label: "Annuel"    },
]

const cycleLabel: Record<BillingCycle, string> = {
  HORAIRE: "/h",
  MENSUEL: "/mois",
  ANNUEL:  "/an",
}

// ─── Types locaux ─────────────────────────────────────────────────────────────

type ServiceFormData = {
  name:        string
  description: string
  icon:        string
  cloudType:   CloudType
  category:    ServiceCategory
  status:      ServiceStatus
}

type PlanFormData = {
  name:         string
  description:  string
  tier:         PlanTier
  price:        string
  billingCycle: BillingCycle
  vcores:       string
  ramGb:        string
  storageGb:    string
  badge:        string
  isPopular:    boolean
}

const EMPTY_SERVICE: ServiceFormData = {
  name: "", description: "", icon: "🖥️",
  cloudType: "PRIVÉ", category: "CALCUL", status: "ACTIF",
}

const EMPTY_PLAN: PlanFormData = {
  name: "", description: "", tier: "ESSENTIEL",
  price: "", billingCycle: "MENSUEL",
  vcores: "", ramGb: "", storageGb: "",
  badge: "", isPopular: false,
}

// ─── API calls — tous via apiFetch (Bearer token automatique) ─────────────────

async function apiCreateService(data: CloudServiceRequest): Promise<CloudServiceDTO> {
  return apiFetch<CloudServiceDTO>("/api/services", {
    method: "POST", body: JSON.stringify(data),
  })
}

async function apiUpdateService(id: number, data: CloudServiceRequest): Promise<CloudServiceDTO> {
  return apiFetch<CloudServiceDTO>(`/api/services/${id}`, {
    method: "PUT", body: JSON.stringify(data),
  })
}

async function apiCreatePlan(data: PlanRequest): Promise<PlanDTO> {
  return apiFetch<PlanDTO>("/api/plans", {
    method: "POST", body: JSON.stringify(data),
  })
}

async function apiUpdatePlan(id: number, data: PlanRequest): Promise<PlanDTO> {
  return apiFetch<PlanDTO>(`/api/plans/${id}`, {
    method: "PUT", body: JSON.stringify(data),
  })
}

async function apiDeletePlan(id: number): Promise<void> {
  return apiFetch<void>(`/api/plans/${id}`, { method: "DELETE" })
}

async function apiTogglePlan(id: number): Promise<PlanDTO> {
  return apiFetch<PlanDTO>(`/api/plans/${id}/toggle`, { method: "PATCH" })
}

async function apiGetPlansByService(serviceId: number): Promise<PlanDTO[]> {
  return apiFetch<PlanDTO[]>(`/api/plans/service/${serviceId}`)
}

// ─── Props ────────────────────────────────────────────────────────────────────

export type DialogMode = "view" | "edit" | "create"

interface ServiceDialogProps {
  service:         CloudServiceDTO | null
  mode?:           DialogMode
  open:            boolean
  onClose:         () => void
  isAdmin?:        boolean
  onServiceSaved?: () => void
}

// ══════════════════════════════════════════════════════════════════════════════

export function ServiceDialog({
  service, mode = "view", open, onClose, isAdmin = false, onServiceSaved,
}: ServiceDialogProps) {

  const [plans,        setPlans]        = React.useState<PlanDTO[]>([])
  const [plansLoading, setPlansLoading] = React.useState(false)
  const [plansError,   setPlansError]   = React.useState<string | null>(null)

  const [planForm,     setPlanForm]     = React.useState<PlanFormData | null>(null)
  const [editingPlan,  setEditingPlan]  = React.useState<PlanDTO | null>(null)
  const [deleteTarget, setDeleteTarget] = React.useState<PlanDTO | null>(null)
  const [planSaving,   setPlanSaving]   = React.useState(false)
  const [planDeleting, setPlanDeleting] = React.useState(false)
  const [planError,    setPlanError]    = React.useState<string | null>(null)

  const [serviceForm,   setServiceForm]   = React.useState<ServiceFormData>(EMPTY_SERVICE)
  const [serviceSaving, setServiceSaving] = React.useState(false)
  const [serviceError,  setServiceError]  = React.useState<string | null>(null)

  React.useEffect(() => {
    if (!open) return
    setPlanForm(null); setEditingPlan(null)
    setPlanError(null); setServiceError(null)

    if (mode === "edit" && service) {
      setServiceForm({
        name:        service.name,
        description: service.description ?? "",
        icon:        service.icon         ?? "🖥️",
        cloudType:   service.cloudType,
        category:    service.category,
        status:      service.status,
      })
    } else if (mode === "create") {
      setServiceForm({ ...EMPTY_SERVICE })
    }

    if (service && mode !== "create") {
      setPlansLoading(true)
      setPlansError(null)
      apiGetPlansByService(service.id)
        .then(setPlans)
        .catch(e => setPlansError(e.message ?? "Impossible de charger les plans."))
        .finally(() => setPlansLoading(false))
    } else {
      setPlans([])
    }
  }, [open, mode, service])

  function openAddPlan()   { setEditingPlan(null); setPlanForm({ ...EMPTY_PLAN }); setPlanError(null) }
  function closePlanForm() { setPlanForm(null); setEditingPlan(null); setPlanError(null) }

  function openEditPlan(plan: PlanDTO) {
    setEditingPlan(plan)
    setPlanForm({
      name:         plan.name,
      description:  plan.description  ?? "",
      tier:         plan.tier,
      price:        plan.price.toString(),
      billingCycle: plan.billingCycle,
      vcores:       plan.vcores?.toString()    ?? "",
      ramGb:        plan.ramGb?.toString()     ?? "",
      storageGb:    plan.storageGb?.toString() ?? "",
      badge:        plan.badge                 ?? "",
      isPopular:    plan.isPopular             ?? false,
    })
    setPlanError(null)
  }

  async function submitPlan() {
    if (!planForm || !service?.id) return
    setPlanSaving(true); setPlanError(null)
    try {
      const requestBody: PlanRequest = {
        serviceId:    service.id,
        name:         planForm.name,
        description:  planForm.description  || undefined,
        tier:         planForm.tier,
        price:        parseFloat(planForm.price) || 0,
        billingCycle: planForm.billingCycle,
        vcores:       planForm.vcores    ? parseInt(planForm.vcores,    10) : undefined,
        ramGb:        planForm.ramGb     ? parseInt(planForm.ramGb,     10) : undefined,
        storageGb:    planForm.storageGb ? parseInt(planForm.storageGb, 10) : undefined,
        badge:        planForm.badge     || undefined,
        isPopular:    planForm.isPopular,
      }
      if (editingPlan) {
        const updated = await apiUpdatePlan(editingPlan.id, requestBody)
        setPlans(prev => prev.map(p => p.id === updated.id ? updated : p))
      } else {
        const created = await apiCreatePlan(requestBody)
        setPlans(prev => [...prev, created])
      }
      closePlanForm(); onServiceSaved?.()
    } catch (err: any) {
      setPlanError(err?.message ?? "Une erreur est survenue.")
    } finally {
      setPlanSaving(false)
    }
  }

  async function confirmDeletePlan() {
    if (!deleteTarget) return
    setPlanDeleting(true)
    try {
      await apiDeletePlan(deleteTarget.id)
      setPlans(prev => prev.filter(p => p.id !== deleteTarget.id))
      onServiceSaved?.()
    } catch (err: any) {
      setPlanError(err?.message ?? "Impossible de supprimer ce plan.")
    } finally {
      setPlanDeleting(false); setDeleteTarget(null)
    }
  }

  async function handleTogglePlan(plan: PlanDTO) {
    try {
      const updated = await apiTogglePlan(plan.id)
      setPlans(prev => prev.map(p => p.id === updated.id ? updated : p))
      onServiceSaved?.()
    } catch (err: any) {
      setPlanError(err?.message ?? "Impossible de modifier le plan.")
    }
  }

  async function submitService() {
    if (!serviceForm.name.trim()) return
    setServiceSaving(true); setServiceError(null)
    try {
      const payload: CloudServiceRequest = {
        name:        serviceForm.name.trim(),
        description: serviceForm.description || undefined,
        icon:        serviceForm.icon        || "🖥️",
        cloudType:   serviceForm.cloudType,
        category:    serviceForm.category,
        status:      serviceForm.status,
      }
      if (mode === "create") {
        await apiCreateService(payload)
      } else if (mode === "edit" && service) {
        await apiUpdateService(service.id, payload)
      }
      onServiceSaved?.(); onClose()
    } catch (err: any) {
      try {
        const parsed = JSON.parse(err.message)
        setServiceError(parsed.message ?? err.message)
      } catch {
        setServiceError(err?.message ?? "Une erreur est survenue.")
      }
    } finally {
      setServiceSaving(false)
    }
  }

  const dialogTitle =
    mode === "create" ? "Nouveau service" :
    mode === "edit"   ? `Modifier — ${service?.name ?? ""}` :
                        (service?.name ?? "")

  const dialogDesc =
    mode === "create" ? "Renseignez les informations du nouveau service cloud." :
                        (service?.description ?? "")

  return (
    <>
      <Dialog open={open} onOpenChange={onClose}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto p-0 gap-0">

          <div className="flex items-start gap-4 p-6 pb-4 border-b border-border/60">
            <div className="flex-1 min-w-0">
              <DialogTitle className="text-base font-semibold leading-tight">{dialogTitle}</DialogTitle>
              {dialogDesc && (
                <DialogDescription className="text-xs mt-0.5 line-clamp-2">{dialogDesc}</DialogDescription>
              )}
            </div>
            {service && mode === "view" && (
              <Badge variant="outline" className="text-[10px] h-5 px-1.5 flex-shrink-0 mt-0.5">
                {CATEGORY_OPTIONS.find(c => c.value === service.category)?.label ?? service.category}
              </Badge>
            )}
          </div>

          {(mode === "create" || mode === "edit") && (
            <div className="p-6 space-y-5">
              <ServiceForm
                form={serviceForm}
                onChange={(field, value) => setServiceForm(prev => ({ ...prev, [field]: value }))}
                error={serviceError}
              />
              <div className="flex justify-end gap-2 border-t border-border/40 pt-4">
                <Button variant="outline" size="sm" className="h-8 text-xs"
                  onClick={onClose} disabled={serviceSaving}>Annuler</Button>
                <Button size="sm" className="h-8 text-xs gap-1.5"
                  onClick={submitService}
                  disabled={serviceSaving || !serviceForm.name.trim()}>
                  {serviceSaving ? <IconLoader2 className="size-3.5 animate-spin" /> : <IconCheck className="size-3.5" />}
                  {mode === "create" ? "Créer le service" : "Enregistrer"}
                </Button>
              </div>
            </div>
          )}

          {mode === "view" && isAdmin && (
            <AdminPlansView
              plans={plans} loading={plansLoading} error={plansError ?? planError}
              planForm={planForm} editingPlan={editingPlan} planSaving={planSaving}
              onAddPlan={openAddPlan} onEditPlan={openEditPlan}
              onDeletePlan={setDeleteTarget} onTogglePlan={handleTogglePlan}
              onSubmitPlan={submitPlan} onCancelPlan={closePlanForm}
              setPlanForm={setPlanForm}
            />
          )}

          {mode === "view" && !isAdmin && service && (
            <ClientView service={service} plans={plans} loading={plansLoading} />
          )}

        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer ce plan ?</AlertDialogTitle>
            <AlertDialogDescription>
              Le plan <strong>{deleteTarget?.name}</strong> sera définitivement supprimé.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={planDeleting}>Annuler</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive hover:bg-destructive/90 text-destructive-foreground gap-1.5"
              onClick={confirmDeletePlan} disabled={planDeleting}>
              {planDeleting && <IconLoader2 className="size-3.5 animate-spin" />}
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}

// ── Formulaire service ────────────────────────────────────────────────────────

function ServiceForm({ form, onChange, error }: {
  form:     ServiceFormData
  onChange: (field: keyof ServiceFormData, value: string) => void
  error:    string | null
}) {
  return (
    <div className="space-y-4">
      {error && (
        <div className="flex items-center gap-2 rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2.5 text-sm text-destructive">
          <IconAlertCircle className="size-4 flex-shrink-0" />{error}
        </div>
      )}
      <div className="grid grid-cols-[64px_1fr] gap-3">
        <div className="space-y-1.5">
          <Label className="text-xs">Icône</Label>
          <Input value={form.icon} onChange={e => onChange("icon", e.target.value)}
            className="h-9 text-xl text-center" maxLength={2} />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">Nom <span className="text-destructive">*</span></Label>
          <Input value={form.name} onChange={e => onChange("name", e.target.value)}
            placeholder="ex: Machines Virtuelles" className="h-9 text-sm" autoFocus />
        </div>
      </div>
      <div className="space-y-1.5">
        <Label className="text-xs">Description</Label>
        <Textarea value={form.description} onChange={e => onChange("description", e.target.value)}
          className="text-sm resize-none" rows={3} placeholder="Description courte du service…" />
      </div>
      <div className="grid grid-cols-3 gap-3">
        <div className="space-y-1.5">
          <Label className="text-xs">Type cloud <span className="text-destructive">*</span></Label>
          <Select value={form.cloudType} onValueChange={v => onChange("cloudType", v)}>
            <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
            <SelectContent>
              {CLOUD_TYPE_OPTIONS.map(c => (
                <SelectItem key={c.value} value={c.value} className="text-sm">{c.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">Catégorie <span className="text-destructive">*</span></Label>
          <Select value={form.category} onValueChange={v => onChange("category", v)}>
            <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
            <SelectContent>
              {CATEGORY_OPTIONS.map(c => (
                <SelectItem key={c.value} value={c.value} className="text-sm">{c.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">Statut <span className="text-destructive">*</span></Label>
          <Select value={form.status} onValueChange={v => onChange("status", v)}>
            <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
            <SelectContent>
              {STATUS_OPTIONS.map(s => (
                <SelectItem key={s.value} value={s.value} className="text-sm">{s.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
    </div>
  )
}

// ── Admin plans view ──────────────────────────────────────────────────────────

interface AdminPlansViewProps {
  plans:        PlanDTO[]
  loading:      boolean
  error:        string | null
  planForm:     PlanFormData | null
  editingPlan:  PlanDTO | null
  planSaving:   boolean
  onAddPlan:    () => void
  onEditPlan:   (p: PlanDTO) => void
  onDeletePlan: (p: PlanDTO) => void
  onTogglePlan: (p: PlanDTO) => void
  onSubmitPlan: () => void
  onCancelPlan: () => void
  setPlanForm:  React.Dispatch<React.SetStateAction<PlanFormData | null>>
}

function AdminPlansView({
  plans, loading, error, planForm, editingPlan, planSaving,
  onAddPlan, onEditPlan, onDeletePlan, onTogglePlan,
  onSubmitPlan, onCancelPlan, setPlanForm,
}: AdminPlansViewProps) {
  return (
    <div className="p-6 pt-4 space-y-3">
      {error && !planForm && (
        <div className="flex items-center gap-2 rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2.5 text-sm text-destructive">
          <IconAlertCircle className="size-4 flex-shrink-0" />{error}
        </div>
      )}
      {planForm ? (
        <PlanForm
          form={planForm} isEditing={!!editingPlan} saving={planSaving} error={error}
          onChange={(field, value) => setPlanForm(prev => prev ? { ...prev, [field]: value } : prev)}
          onSubmit={onSubmitPlan} onCancel={onCancelPlan}
        />
      ) : (
        <>
          <div className="flex items-center justify-between">
            <p className="text-xs font-medium text-muted-foreground">
              {loading ? "Chargement…" : `${plans.length} plan(s) configuré(s)`}
            </p>
            <Button size="sm" className="h-7 text-xs gap-1.5" onClick={onAddPlan}>
              <IconPlus className="size-3.5" /> Ajouter un plan
            </Button>
          </div>
          {loading ? (
            <div className="space-y-2">
              {[1,2,3].map(i => (
                <div key={i} className="h-14 rounded-lg border border-border/60 bg-muted/20 animate-pulse" />
              ))}
            </div>
          ) : plans.length === 0 ? (
            <div className="rounded-lg border border-dashed border-border/60 py-10 text-center">
              <p className="text-sm text-muted-foreground">Aucun plan pour ce service.</p>
              <Button variant="link" size="sm" className="mt-1 text-xs" onClick={onAddPlan}>
                Créer le premier plan →
              </Button>
            </div>
          ) : (
            <div className="space-y-2">
              {plans.map(plan => (
                <PlanRow key={plan.id} plan={plan}
                  onEdit={() => onEditPlan(plan)}
                  onDelete={() => onDeletePlan(plan)}
                  onToggle={() => onTogglePlan(plan)}
                />
              ))}
            </div>
          )}
        </>
      )}
    </div>
  )
}

function PlanRow({ plan, onEdit, onDelete, onToggle }: {
  plan: PlanDTO; onEdit: () => void; onDelete: () => void; onToggle: () => void
}) {
  const tierLabel = TIER_OPTIONS.find(t => t.value === plan.tier)?.label ?? plan.tier
  const cycle     = cycleLabel[plan.billingCycle] ?? ""
  const priceStr  = plan.price === 0 ? "Gratuit" : `${plan.price.toFixed(2)} €${cycle}`
  const specs     = [
    plan.vcores    ? `${plan.vcores} vCPU`  : "",
    plan.ramGb     ? `${plan.ramGb} Go RAM` : "",
    plan.storageGb ? `${plan.storageGb} Go` : "",
  ].filter(Boolean)

  return (
    <div className="group flex items-center gap-3 rounded-lg border border-border/60 bg-muted/20 px-3 py-2.5 transition-colors hover:bg-muted/40">
      <div className="flex flex-col items-start gap-0.5 flex-shrink-0">
        <Badge variant="outline" className="text-[10px] h-5 px-1.5 font-medium">{tierLabel}</Badge>
        {!plan.isActive && <span className="text-[9px] text-muted-foreground">inactif</span>}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className="text-sm font-medium leading-tight">{plan.name}</p>
          {plan.badge && (
            <Badge className="text-[9px] h-4 px-1.5 flex-shrink-0 bg-foreground text-background">{plan.badge}</Badge>
          )}
          {plan.isPopular && !plan.badge && (
            <Badge className="text-[9px] h-4 px-1.5 flex-shrink-0 bg-primary text-primary-foreground">Populaire</Badge>
          )}
        </div>
        {specs.length > 0 && (
          <p className="text-[11px] text-muted-foreground truncate">{specs.join(" · ")}</p>
        )}
      </div>
      <span className="text-sm font-mono font-semibold tabular-nums text-right flex-shrink-0">{priceStr}</span>
      <Switch checked={plan.isActive ?? false} onCheckedChange={onToggle} className="flex-shrink-0" />
      <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
        <Button size="icon" variant="ghost"
          className="size-7 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted"
          onClick={onEdit}><IconPencil className="size-3.5" /></Button>
        <Button size="icon" variant="ghost"
          className="size-7 rounded-md text-muted-foreground hover:text-destructive hover:bg-destructive/10"
          onClick={onDelete}><IconTrash className="size-3.5" /></Button>
      </div>
    </div>
  )
}

function PlanForm({ form, isEditing, saving, error, onChange, onSubmit, onCancel }: {
  form:      PlanFormData
  isEditing: boolean
  saving:    boolean
  error:     string | null
  onChange:  (field: keyof PlanFormData, value: string | boolean) => void
  onSubmit:  () => void
  onCancel:  () => void
}) {
  return (
    <div className="rounded-lg border border-border/60 bg-muted/10 p-4 space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold">{isEditing ? "Modifier le plan" : "Nouveau plan"}</p>
        <Button variant="ghost" size="icon" className="size-6 text-muted-foreground"
          onClick={onCancel} disabled={saving}><IconX className="size-3.5" /></Button>
      </div>
      <Separator />
      {error && (
        <div className="flex items-center gap-2 rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
          <IconAlertCircle className="size-4 flex-shrink-0" />{error}
        </div>
      )}
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label className="text-xs">Nom <span className="text-destructive">*</span></Label>
          <Input value={form.name} onChange={e => onChange("name", e.target.value)}
            placeholder="Essentiel M" className="h-8 text-sm" autoFocus />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">Tier <span className="text-destructive">*</span></Label>
          <Select value={form.tier} onValueChange={v => onChange("tier", v)}>
            <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
            <SelectContent>
              {TIER_OPTIONS.map(t => (
                <SelectItem key={t.value} value={t.value} className="text-sm">{t.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label className="text-xs">Prix (€) <span className="text-destructive">*</span></Label>
          <Input type="number" step="0.01" min="0" value={form.price}
            onChange={e => onChange("price", e.target.value)}
            placeholder="49.99" className="h-8 text-sm font-mono" />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">Facturation <span className="text-destructive">*</span></Label>
          <Select value={form.billingCycle} onValueChange={v => onChange("billingCycle", v)}>
            <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
            <SelectContent>
              {BILLING_OPTIONS.map(b => (
                <SelectItem key={b.value} value={b.value} className="text-sm">{b.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
      <div>
        <p className="text-xs font-medium text-muted-foreground mb-2">Spécifications</p>
        <div className="grid grid-cols-3 gap-3">
          {[
            { field: "vcores",    label: "vCPU",     icon: <IconCpu      className="size-3" />, ph: "4"   },
            { field: "ramGb",     label: "RAM (Go)",  icon: <IconServer   className="size-3" />, ph: "8"   },
            { field: "storageGb", label: "SSD (Go)",  icon: <IconDatabase className="size-3" />, ph: "100" },
          ].map(({ field, label, icon, ph }) => (
            <div key={field} className="space-y-1.5">
              <Label className="text-xs flex items-center gap-1 text-muted-foreground">{icon} {label}</Label>
              <Input type="number" min="0"
                value={(form as any)[field]}
                onChange={e => onChange(field as keyof PlanFormData, e.target.value)}
                placeholder={ph} className="h-8 text-sm" />
            </div>
          ))}
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label className="text-xs">Badge</Label>
          <Input value={form.badge} onChange={e => onChange("badge", e.target.value)}
            placeholder="POPULAIRE" className="h-8 text-sm" />
        </div>
        <div className="space-y-1.5 flex flex-col justify-end">
          <div className="flex items-center gap-2 h-8">
            <Switch id="plan-popular" checked={form.isPopular}
              onCheckedChange={v => onChange("isPopular", v)} />
            <Label htmlFor="plan-popular" className="text-xs cursor-pointer">Mettre en avant</Label>
          </div>
        </div>
      </div>
      <div className="space-y-1.5">
        <Label className="text-xs">Description</Label>
        <Textarea value={form.description} onChange={e => onChange("description", e.target.value)}
          placeholder="Idéal pour les projets en production…"
          className="text-sm resize-none" rows={2} />
      </div>
      <div className="flex justify-end gap-2 pt-1">
        <Button variant="outline" size="sm" className="h-8 text-xs"
          onClick={onCancel} disabled={saving}>Annuler</Button>
        <Button size="sm" className="h-8 text-xs gap-1.5"
          onClick={onSubmit} disabled={saving || !form.name.trim() || !form.price.trim()}>
          {saving ? <IconLoader2 className="size-3.5 animate-spin" /> : <IconCheck className="size-3.5" />}
          {isEditing ? "Enregistrer" : "Créer le plan"}
        </Button>
      </div>
    </div>
  )
}

// ── Vue client ────────────────────────────────────────────────────────────────

function ClientView({ service, plans, loading }: {
  service: CloudServiceDTO; plans: PlanDTO[]; loading: boolean
}) {
  const [selected, setSelected] = React.useState<number | null>(null)
  const activePlans = plans.filter(p => p.isActive)

  return (
    <div className="p-6 space-y-4">
      <p className="text-xs text-muted-foreground leading-relaxed bg-muted/30 rounded-lg px-3 py-2.5 border border-border/40">
        Vous payez uniquement ce que vous consommez. Aucun engagement, résiliation immédiate.
      </p>
      {loading ? (
        <div className="space-y-2">
          {[1,2,3].map(i => (
            <div key={i} className="h-16 rounded-lg border border-border/60 bg-muted/20 animate-pulse" />
          ))}
        </div>
      ) : activePlans.length === 0 ? (
        <p className="py-8 text-center text-sm text-muted-foreground">
          Aucune offre disponible pour ce service.
        </p>
      ) : (
        <div className="space-y-2">
          {activePlans.map(plan => {
            const isSelected = selected === plan.id
            const cycle      = cycleLabel[plan.billingCycle] ?? ""
            const priceStr   = plan.price === 0 ? "Gratuit" : `${plan.price.toFixed(2)} €${cycle}`
            const tierLabel  = TIER_OPTIONS.find(t => t.value === plan.tier)?.label ?? plan.tier
            const specs      = [
              plan.vcores    ? `${plan.vcores} vCPU`  : "",
              plan.ramGb     ? `${plan.ramGb} Go RAM` : "",
              plan.storageGb ? `${plan.storageGb} Go` : "",
            ].filter(Boolean)

            return (
              <div key={plan.id}
                className={cn(
                  "rounded-lg border px-4 py-3 cursor-pointer transition-all select-none",
                  isSelected ? "border-primary/40 bg-primary/5" : "border-border/60 hover:bg-muted/10"
                )}
                onClick={() => setSelected(plan.id)}
              >
                <div className="flex items-center gap-3">
                  <div className={cn(
                    "size-4 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-all",
                    isSelected ? "border-primary bg-primary" : "border-border"
                  )}>
                    {isSelected && <div className="size-1.5 rounded-full bg-white" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-sm font-medium">{plan.name}</p>
                      <Badge variant="outline" className="text-[10px] h-4 px-1.5">{tierLabel}</Badge>
                      {plan.badge && (
                        <Badge className="text-[10px] h-4 px-1.5 bg-foreground text-background">{plan.badge}</Badge>
                      )}
                      {plan.isPopular && !plan.badge && (
                        <Badge className="text-[10px] h-4 px-1.5 bg-primary text-primary-foreground">Populaire</Badge>
                      )}
                    </div>
                    {specs.length > 0 && (
                      <p className="text-[11px] text-muted-foreground mt-0.5 truncate">{specs.join(" · ")}</p>
                    )}
                  </div>
                  <p className="font-mono text-sm font-semibold tabular-nums flex-shrink-0">{priceStr}</p>
                  <IconChevronRight className={cn(
                    "size-4 flex-shrink-0",
                    isSelected ? "text-primary" : "text-muted-foreground/40"
                  )} />
                </div>
                {isSelected && plan.description && (
                  <div className="mt-3 ml-7 pt-3 border-t border-border/40">
                    <p className="text-xs text-muted-foreground">{plan.description}</p>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
      <div className="flex justify-end pt-1">
        <Button size="sm" className="h-8 text-xs gap-1.5" disabled={!selected}>
          Déployer{selected ? ` — ${activePlans.find(p => p.id === selected)?.name}` : " un plan"} →
        </Button>
      </div>
    </div>
  )
}