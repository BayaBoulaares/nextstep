// app/dashboard/services/[type]/page.tsx
"use client"

import * as React from "react"
import Link from "next/link"
import { notFound, useRouter } from "next/navigation"
import { ArrowLeft, ArrowUpRight, X, Loader2, AlertTriangle, Pencil, Trash2, Plus } from "lucide-react"
import { SidebarInset, SidebarTrigger } from "@/components/ui/sidebar"
import { Separator } from "@/components/ui/separator"
import { Button }    from "@/components/ui/button"
import { IconShield, IconUser } from "@tabler/icons-react"
import { useServicesByCloud }  from "@/lib/hooks/useApi"
import { useRole }             from "@/lib/hooks/useRole"
import { adminDeleteService, adminDeletePlan, adminTogglePlan } from "@/lib/services/admin.api"
import { ServiceFormModal }    from "@/components/admin/ServiceFormModal"
import { PlanFormModal }       from "@/components/admin/PlanFormModal"
import { ConfirmDialog }       from "@/components/admin/ConfirmDialog"
import type { CloudServiceDTO, CloudType, PlanDTO } from "@/lib/types"
import { cn } from "@/lib/utils"

const SLUG_MAP: Record<string, CloudType> = {
  "prive":   "PRIVÉ",
  "public":  "PUBLIC",
  "hybride": "HYBRIDE",
}
const LABEL_MAP: Record<CloudType, string> = { PRIVÉ: "Cloud Privé", PUBLIC: "Cloud Public", HYBRIDE: "Cloud Hybride" }
const ICON_MAP:  Record<CloudType, string> = { PRIVÉ: "🔒", PUBLIC: "🌐", HYBRIDE: "⚡" }
const CYCLE_LABEL: Record<string, string>  = { HORAIRE: "/h", MENSUEL: "/mois", ANNUEL: "/an" }

const CATEGORY_LABELS: Record<string, string> = {
  CALCUL: "Calcul", HEBERGEMENT: "Hébergement", STOCKAGE: "Stockage",
  BASE_DONNEES: "Base de données", RESEAU: "Réseau", EMAIL: "Email",
  IA: "Intelligence Artificielle", SECURITE: "Sécurité", IAM: "Gestion d'accès",
}

const planDot: Record<number, string> = {
  0: "bg-slate-800", 1: "bg-slate-600", 2: "bg-slate-400", 3: "bg-slate-300",
}

function planSpecs(plan: PlanDTO): string {
  return [
    plan.vcores    ? `${plan.vcores} vCPU`  : "",
    plan.ramGb     ? `${plan.ramGb} Go RAM` : "",
    plan.storageGb ? `${plan.storageGb} Go` : "",
  ].filter(Boolean).join(" · ")
}

function planPrice(plan: PlanDTO): string {
  if (plan.price === 0) return "Gratuit"
  const cycle = CYCLE_LABEL[plan.billingCycle] ?? ""
  return `${plan.price.toFixed(2)} €${cycle}`
}

// ✅ Extrait l'id du plan depuis tous les champs possibles
// Jackson avec Lombok peut sérialiser l'id sous différents noms
function extractPlanId(plan: PlanDTO): number | null {
  const p = plan as any
  // Cherche dans tous les champs numériques possibles
  const candidates = [p.id, p.planId, p.plan_id, p.ID, p.Id]
  for (const c of candidates) {
    if (c !== null && c !== undefined && typeof c === "number") return c
  }
  // Dernier recours : cherche le premier champ numérique qui ressemble à un id
  for (const [key, val] of Object.entries(p)) {
    if (key.toLowerCase().includes("id") && typeof val === "number" && val > 0) {
      console.log(`[extractPlanId] trouvé via champ "${key}":`, val)
      return val as number
    }
  }
  console.error("[extractPlanId] Aucun id trouvé dans le plan. Champs disponibles:", Object.keys(p))
  return null
}

type Modal =
  | { type: "service-create" }
  | { type: "service-edit";   service: CloudServiceDTO }
  | { type: "service-delete"; service: CloudServiceDTO }
  | { type: "plan-create";    serviceId: number }
  | { type: "plan-edit";      plan: PlanDTO; serviceId: number }
  | { type: "plan-delete";    plan: PlanDTO }
  | null

function ClientServiceModal({
  service, onClose, onSelect,
}: {
  service:  CloudServiceDTO
  onClose:  () => void
  onSelect: (serviceId: number, plan: PlanDTO) => void
}) {
  React.useEffect(() => {
    const h = (e: KeyboardEvent) => e.key === "Escape" && onClose()
    window.addEventListener("keydown", h)
    return () => window.removeEventListener("keydown", h)
  }, [onClose])

  const activePlans = service.plans.filter(p => p.isActive)

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/20 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-10 bg-background border border-border rounded-2xl shadow-xl w-full max-w-md overflow-hidden">
        <div className="px-6 pt-6 pb-4 border-b border-border">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="text-base font-semibold tracking-tight">{service.name}</h2>
              <p className="text-[12px] text-muted-foreground mt-0.5">{service.description}</p>
            </div>
            <button onClick={onClose} className="w-7 h-7 flex items-center justify-center rounded-lg bg-muted hover:bg-muted/80 transition-colors">
              <X className="w-3.5 h-3.5 text-muted-foreground" />
            </button>
          </div>
        </div>
        <div className="p-3 space-y-1.5">
          {activePlans.map((plan, i) => (
            <div key={extractPlanId(plan) ?? i}
              onClick={() => onSelect(service.id, plan)}
              className="flex items-center justify-between px-4 py-3 rounded-xl border border-border hover:bg-muted/50 hover:border-foreground/15 transition-all cursor-pointer"
            >
              <div className="flex items-center gap-3">
                <span className={cn("w-2 h-2 rounded-full shrink-0", planDot[i % 4])} />
                <div>
                  <p className="text-[13px] font-medium">{plan.name}</p>
                  {planSpecs(plan) && (
                    <p className="text-[11px] text-muted-foreground font-mono mt-0.5">{planSpecs(plan)}</p>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0 ml-4">
                <span className="text-[13px] font-semibold tabular-nums">{planPrice(plan)}</span>
                {plan.badge && (
                  <span className="bg-foreground text-background text-[10px] font-semibold px-2 py-0.5 rounded-md">
                    {plan.badge}
                  </span>
                )}
                {plan.isPopular && !plan.badge && (
                  <span className="bg-primary text-primary-foreground text-[10px] font-semibold px-2 py-0.5 rounded-md">
                    Populaire
                  </span>
                )}
              </div>
            </div>
          ))}
          {activePlans.length === 0 && (
            <p className="text-center text-[13px] text-muted-foreground py-6">Aucun plan disponible.</p>
          )}
        </div>
        <div className="px-3 pb-4 pt-2">
          <Button className="w-full h-9 text-[13px] font-medium" size="sm" disabled>
            Sélectionnez un plan ci-dessus
          </Button>
        </div>
      </div>
    </div>
  )
}

function ServiceCard({
  service, isAdmin, onClientSelect, onAdminAction,
}: {
  service:        CloudServiceDTO
  isAdmin:        boolean
  onClientSelect: (serviceId: number, plan: PlanDTO) => void
  onAdminAction:  (modal: Modal) => void
}) {
  const [open, setOpen] = React.useState(false)
  const hasPlans = service.plans.some(p => p.isActive)

  return (
    <>
      <div className={cn(
        "group relative flex flex-col gap-3 border border-border rounded-xl p-5 bg-card transition-all duration-150",
        !isAdmin && hasPlans  && "hover:shadow-sm hover:border-foreground/20 cursor-pointer",
        !isAdmin && !hasPlans && "opacity-60",
      )}
        onClick={() => !isAdmin && hasPlans && setOpen(true)}
      >
        <span className="text-2xl leading-none">{service.icon ?? "🖥️"}</span>
        <div className="flex-1">
          <h4 className="text-[13px] font-semibold tracking-tight">{service.name}</h4>
          <p className="text-[11px] text-muted-foreground leading-relaxed mt-0.5">{service.description}</p>
        </div>

        {isAdmin && (
          <div className="mt-1 space-y-1">
            {service.plans.map(plan => (
              <div key={extractPlanId(plan) ?? plan.name} className="flex items-center justify-between text-[11px] py-1 border-t border-border/50 first:border-0">
                <span className={cn("font-mono", !plan.isActive && "line-through text-muted-foreground/50")}>
                  {plan.name} — {planPrice(plan)}
                </span>
                <div className="flex items-center gap-1">
                  <button onClick={e => { e.stopPropagation(); onAdminAction({ type: "plan-edit", plan, serviceId: service.id }) }} className="p-1 rounded hover:bg-muted transition-colors">
                    <Pencil className="w-3 h-3 text-muted-foreground" />
                  </button>
                  <button onClick={e => { e.stopPropagation(); adminTogglePlan(plan.id).catch(console.error) }} className="p-1 rounded hover:bg-muted transition-colors">
                    <span className={cn("text-[10px] font-semibold px-1 rounded", plan.isActive ? "text-emerald-600" : "text-muted-foreground")}>
                      {plan.isActive ? "ON" : "OFF"}
                    </span>
                  </button>
                  <button onClick={e => { e.stopPropagation(); onAdminAction({ type: "plan-delete", plan }) }} className="p-1 rounded hover:bg-muted transition-colors">
                    <Trash2 className="w-3 h-3 text-muted-foreground" />
                  </button>
                </div>
              </div>
            ))}
            <button onClick={e => { e.stopPropagation(); onAdminAction({ type: "plan-create", serviceId: service.id }) }} className="flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground transition-colors pt-1">
              <Plus className="w-3 h-3" /> Ajouter un plan
            </button>
          </div>
        )}

        {isAdmin && (
          <div className="absolute top-3 right-3 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <button onClick={e => { e.stopPropagation(); onAdminAction({ type: "service-edit", service }) }} className="w-6 h-6 flex items-center justify-center rounded-md bg-muted hover:bg-muted/80 transition-colors">
              <Pencil className="w-3 h-3 text-muted-foreground" />
            </button>
            <button onClick={e => { e.stopPropagation(); onAdminAction({ type: "service-delete", service }) }} className="w-6 h-6 flex items-center justify-center rounded-md bg-muted hover:bg-muted/80 transition-colors">
              <Trash2 className="w-3 h-3 text-muted-foreground" />
            </button>
          </div>
        )}

        {!isAdmin && hasPlans && (
          <ArrowUpRight className="absolute top-4 right-4 w-3.5 h-3.5 text-muted-foreground/20 group-hover:text-muted-foreground/60 transition-colors" />
        )}
      </div>

      {open && !isAdmin && (
        <ClientServiceModal
          service={service}
          onClose={() => setOpen(false)}
          onSelect={(sid, plan) => { setOpen(false); onClientSelect(sid, plan) }}
        />
      )}
    </>
  )
}

function CategorySection({ category, services, isAdmin, onClientSelect, onAdminAction }: {
  category: string; services: CloudServiceDTO[]; isAdmin: boolean
  onClientSelect: (serviceId: number, plan: PlanDTO) => void
  onAdminAction:  (modal: Modal) => void
}) {
  return (
    <div>
      <div className="flex items-center gap-2.5 mb-4">
        <h3 className="text-[13px] font-semibold uppercase tracking-widest">{CATEGORY_LABELS[category] ?? category}</h3>
        <span className="text-[11px] text-muted-foreground font-medium px-2 py-0.5 rounded-md bg-muted">{services.length}</span>
      </div>
      <Separator className="mb-5 opacity-50" />
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {services.map(s => (
          <ServiceCard key={s.id} service={s} isAdmin={isAdmin} onClientSelect={onClientSelect} onAdminAction={onAdminAction} />
        ))}
      </div>
    </div>
  )
}

function CloudDetailContent({ cloudType }: { cloudType: CloudType }) {
  const router      = useRouter()
  const { isAdmin } = useRole()
  const { data: services, loading, error, reload } = useServicesByCloud(cloudType)

  const [modal,         setModal]         = React.useState<Modal>(null)
  const [deleteLoading, setDeleteLoading] = React.useState(false)

  const byCategory = React.useMemo(() => {
    if (!services) return {} as Record<string, CloudServiceDTO[]>
    return services.reduce<Record<string, CloudServiceDTO[]>>((acc, s) => {
      ;(acc[s.category] ??= []).push(s)
      return acc
    }, {})
  }, [services])

  const handleClientSelect = React.useCallback((serviceId: number, plan: PlanDTO) => {
    const planId = extractPlanId(plan)

    if (!planId) {
      // ✅ Affiche tous les champs du plan dans la console pour diagnostiquer
      console.error("[SELECT] plan reçu (tous les champs):", JSON.stringify(plan, null, 2))
      alert(
        `Le plan "${plan.name}" n'a pas d'identifiant.\n\n` +
        `Champs reçus du backend: ${Object.keys(plan as any).join(", ")}\n\n` +
        `→ Redémarrez le backend Spring Boot après avoir remplacé PlanDTO.java`
      )
      return
    }

    const draft = { serviceId, planId }
    console.log("[SELECT] ✅ draft:", draft)
    sessionStorage.setItem("deploy_draft", JSON.stringify(draft))
    router.push("/dashboard/services/deploy/configuration")
  }, [router])

  const handleDeleteService = async () => {
    if (modal?.type !== "service-delete") return
    setDeleteLoading(true)
    try { await adminDeleteService(modal.service.id); setModal(null); reload() }
    finally { setDeleteLoading(false) }
  }

  const handleDeletePlan = async () => {
    if (modal?.type !== "plan-delete") return
    setDeleteLoading(true)
    try { await adminDeletePlan(modal.plan.id); setModal(null); reload() }
    finally { setDeleteLoading(false) }
  }

  return (
    <SidebarInset>
      <header className="flex h-14 items-center gap-3 border-b border-border/60 px-4 bg-background/95 backdrop-blur sticky top-0 z-10">
        <SidebarTrigger className="-ml-1 size-8 text-muted-foreground hover:text-foreground hover:bg-muted rounded-md transition-colors" />
        <Separator orientation="vertical" className="h-4 opacity-40" />
        <nav className="flex items-center gap-1.5 text-[13px]">
          <Link href="/dashboard/services" className="text-muted-foreground hover:text-foreground transition-colors">Services</Link>
          <span className="text-muted-foreground/30">/</span>
          <span className="font-medium">{LABEL_MAP[cloudType]}</span>
        </nav>
        <div className="ml-auto flex items-center gap-1.5 rounded-full border border-border bg-muted/40 px-3 py-1 text-[11px] font-medium tracking-wide">
          {isAdmin
            ? <><IconShield className="size-3 text-foreground/60" /><span className="text-foreground/70 uppercase">Admin</span></>
            : <><IconUser   className="size-3 text-foreground/60" /><span className="text-foreground/70 uppercase">Client</span></>
          }
        </div>
      </header>

      <div className="flex flex-1 flex-col gap-8 p-6 max-w-6xl mx-auto w-full">
        <div className="flex items-center gap-3 pt-1">
          <Link href="/dashboard/services" className="flex items-center justify-center w-8 h-8 rounded-lg border border-border hover:bg-muted transition-colors">
            <ArrowLeft className="w-3.5 h-3.5 text-muted-foreground" />
          </Link>
          <span className="text-[13px] text-muted-foreground">Services Cloud</span>
          <span className="text-muted-foreground/30">/</span>
          <span className="text-[13px] font-medium">{LABEL_MAP[cloudType]}</span>
          {isAdmin && (
            <Button size="sm" className="ml-auto h-8 text-[12px] gap-1.5" onClick={() => setModal({ type: "service-create" })}>
              <Plus className="w-3.5 h-3.5" /> Nouveau service
            </Button>
          )}
        </div>

        <div className="flex items-start gap-5 border border-border rounded-2xl p-7 bg-muted/20">
          <span className="text-4xl shrink-0">{ICON_MAP[cloudType]}</span>
          <div>
            <h1 className="text-xl font-semibold tracking-tight mb-1">{LABEL_MAP[cloudType]}</h1>
            <p className="text-[13px] text-muted-foreground">
              {loading ? "Chargement…" : `${services?.length ?? 0} service${(services?.length ?? 0) > 1 ? "s" : ""} disponible${(services?.length ?? 0) > 1 ? "s" : ""}`}
            </p>
          </div>
        </div>

        {loading && <div className="flex items-center justify-center py-16"><Loader2 className="size-4 animate-spin text-muted-foreground" /></div>}

        {!loading && error && (
          <div className="flex items-center gap-3 border border-border rounded-xl px-5 py-4 text-[13px] text-muted-foreground">
            <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0" />{error}
            <button onClick={reload} className="ml-auto underline text-foreground text-[12px]">Réessayer</button>
          </div>
        )}

        {!loading && !error && (
          <div className="space-y-10">
            {Object.entries(byCategory).map(([cat, svcs]) => (
              <CategorySection key={cat} category={cat} services={svcs} isAdmin={isAdmin} onClientSelect={handleClientSelect} onAdminAction={setModal} />
            ))}
            {Object.keys(byCategory).length === 0 && (
              <div className="text-center py-16 text-[13px] text-muted-foreground">
                Aucun service.{isAdmin && <> <button onClick={() => setModal({ type: "service-create" })} className="underline text-foreground">Créer le premier</button>.</>}
              </div>
            )}
          </div>
        )}
      </div>

      {(modal?.type === "service-create" || modal?.type === "service-edit") && (
        <ServiceFormModal service={modal.type === "service-edit" ? modal.service : undefined} onClose={() => setModal(null)} onSaved={() => { setModal(null); reload() }} />
      )}
      {modal?.type === "service-delete" && (
        <ConfirmDialog title="Supprimer le service" message={`Supprimer "${modal.service.name}" et tous ses plans ?`} loading={deleteLoading} onConfirm={handleDeleteService} onCancel={() => setModal(null)} />
      )}
      {modal?.type === "plan-create" && (
        <PlanFormModal serviceId={modal.serviceId} plan={undefined} onClose={() => setModal(null)} onSaved={() => { setModal(null); reload() }} />
      )}
      {modal?.type === "plan-edit" && (
        <PlanFormModal serviceId={modal.serviceId} plan={modal.plan} onClose={() => setModal(null)} onSaved={() => { setModal(null); reload() }} />
      )}
      {modal?.type === "plan-delete" && (
        <ConfirmDialog title="Supprimer le plan" message={`Supprimer le plan "${modal.plan.name}" ?`} loading={deleteLoading} onConfirm={handleDeletePlan} onCancel={() => setModal(null)} />
      )}
    </SidebarInset>
  )
}

export default function CloudDetailPage({ params }: { params: Promise<{ type: string }> }) {
  const { type } = React.use(params)
  if (!(type in SLUG_MAP)) notFound()
  return <CloudDetailContent cloudType={SLUG_MAP[type]} />
}