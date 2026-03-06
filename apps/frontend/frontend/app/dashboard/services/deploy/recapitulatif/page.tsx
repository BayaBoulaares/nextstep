// app/dashboard/services/deploy/recapitulatif/page.tsx
"use client"

import * as React from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { SidebarInset, SidebarTrigger } from "@/components/ui/sidebar"
import { Separator } from "@/components/ui/separator"
import { Button }    from "@/components/ui/button"
import { Loader2, AlertTriangle } from "lucide-react"
import { Stepper }   from "@/components/deploy/stepper"
import { loadDraft, useDeploymentTunnel, type DeploymentDraft } from "@/lib/hooks/useDeployments"
import { getServiceById } from "@/lib/services/cloud-services.api"
import type { CloudServiceDTO, PlanDTO, DeploymentRequest } from "@/lib/types"
import { cn } from "@/lib/utils"

const STEPS = [
  { id: 1, label: "Sélection du plan" },
  { id: 2, label: "Configuration"     },
  { id: 3, label: "Récapitulatif"     },
  { id: 4, label: "Déploiement"       },
]

function planSpecs(plan: PlanDTO): string {
  return [
    plan.vcores    ? `${plan.vcores} vCPU`      : "",
    plan.ramGb     ? `${plan.ramGb} Go RAM`     : "",
    plan.storageGb ? `${plan.storageGb} Go SSD` : "",
  ].filter(Boolean).join(" · ") || "—"
}

function RecapSection({ title, rows }: {
  title: string
  rows:  { label: string; value: React.ReactNode }[]
}) {
  return (
    <div>
      <p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-muted-foreground mb-2">{title}</p>
      <div className="border border-border rounded-xl overflow-hidden divide-y divide-border">
        {rows.map((row, i) => (
          <div key={i} className="flex items-center justify-between px-5 py-3 bg-card">
            <span className="text-[13px] text-muted-foreground">{row.label}</span>
            <span className="text-[13px] font-medium text-right">{row.value}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

export default function RecapPage() {
  const router = useRouter()
  const { confirm, loading, error } = useDeploymentTunnel()

  const [service,    setService]    = React.useState<CloudServiceDTO | null>(null)
  const [plan,       setPlan]       = React.useState<PlanDTO | null>(null)
  const [draft,      setDraft]      = React.useState<DeploymentDraft | null>(null)
  const [fetching,   setFetching]   = React.useState(true)
  const [debugInfo,  setDebugInfo]  = React.useState<string>("")

  React.useEffect(() => {
    // ── Lecture sessionStorage (client uniquement) ──
    const raw = sessionStorage.getItem("deploy_draft")
    console.log("[RECAP] raw sessionStorage:", raw)

    if (!raw) {
      setDebugInfo("❌ Aucun draft en sessionStorage")
      setFetching(false)
      return
    }

    let d: DeploymentDraft
    try {
      d = JSON.parse(raw)
    } catch {
      setDebugInfo("❌ Draft JSON invalide: " + raw)
      setFetching(false)
      return
    }

    console.log("[RECAP] draft parsé:", d)
    setDebugInfo(`✓ Draft: serviceId=${d.serviceId} planId=${d.planId} resourceName=${d.resourceName}`)
    setDraft(d)

    if (!d.serviceId || !d.planId) {
      setDebugInfo(`❌ serviceId ou planId manquant — serviceId=${d.serviceId} planId=${d.planId}`)
      setFetching(false)
      return
    }

    getServiceById(d.serviceId)
      .then(svc => {
        console.log("[RECAP] service chargé:", svc.name, "plans:", svc.plans.map(p => p.id))
        setService(svc)
        const p = svc.plans.find(p => p.id === d.planId)
        if (!p) {
          console.warn("[RECAP] plan", d.planId, "introuvable dans", svc.plans.map(p => p.id))
          setDebugInfo(`⚠️ Plan ${d.planId} introuvable dans service ${svc.name}`)
        }
        setPlan(p ?? svc.plans[0] ?? null)
      })
      .catch(err => {
        console.error("[RECAP] erreur getServiceById:", err)
        setDebugInfo(`❌ Erreur chargement service: ${err.message}`)
      })
      .finally(() => setFetching(false))
  }, [])

  /*const handleConfirm = async () => {
    if (!draft?.planId || !draft?.resourceName || !plan) return

    const request: DeploymentRequest = {
      resourceName:        draft.resourceName,
      planId:              draft.planId,
      projectId:           draft.projectId ?? 1,
      regionId:            draft.regionId  ?? 1,
      availabilityZone:    draft.availabilityZone,
      description:         draft.description,
      backupEnabled:       draft.backupEnabled     ?? false,
      monitoringEnabled:   draft.monitoringEnabled ?? false,
      antiDdosEnabled:     draft.antiDdosEnabled   ?? false,
      additionalStorageGb: draft.additionalStorageGb ?? 0,
    }

    console.log("[RECAP] envoi DeploymentRequest:", request)
    const deployment = await confirm(request)
    router.push(`/dashboard/services/deploy/deploiement?id=${deployment.id}`)
  }*/
 const handleConfirm = async () => {
  if (!draft?.planId || !draft?.resourceName || !plan) return

  const request: DeploymentRequest = {
    resourceName:        draft.resourceName,
    planId:              draft.planId,
    projectId:           draft.projectId,        // ← undefined si absent, le backend crée "Défaut"
    regionId:            draft.regionId,         // ← undefined si absent
    availabilityZone:    draft.availabilityZone,
    description:         draft.description,
    backupEnabled:       draft.backupEnabled     ?? false,
    monitoringEnabled:   draft.monitoringEnabled ?? false,
    antiDdosEnabled:     draft.antiDdosEnabled   ?? false,
    additionalStorageGb: draft.additionalStorageGb ?? 0,
  }

  console.log("[RECAP] envoi DeploymentRequest:", request)
  const deployment = await confirm(request)
  router.push(`/dashboard/services/deploy/deploiement?id=${deployment.id}`)
}

  const ht    = plan?.price ?? 0
  const tva   = ht * 0.2
  const total = ht + tva

  if (fetching) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="size-4 animate-spin text-muted-foreground" />
      </div>
    )
  }

  // Pas de draft valide
  if (!draft?.serviceId || !draft?.planId) {
    return (
      <div className="flex h-screen flex-col items-center justify-center gap-4 px-6">
        <p className="text-[13px] text-muted-foreground text-center">Aucune configuration trouvée.</p>
        {/* Debug visible en dev */}
        {process.env.NODE_ENV === "development" && debugInfo && (
          <pre className="text-[11px] bg-muted px-4 py-3 rounded-xl text-muted-foreground max-w-md break-all">
            {debugInfo}
          </pre>
        )}
        <Button onClick={() => router.push("/dashboard/services")}>
          Retour au Marketplace
        </Button>
      </div>
    )
  }

  return (
    <SidebarInset>
      <header className="flex h-14 items-center gap-3 border-b border-border/60 px-5 bg-background/95 backdrop-blur sticky top-0 z-10">
        <SidebarTrigger className="-ml-1 size-8 text-muted-foreground hover:text-foreground hover:bg-muted rounded-md transition-colors" />
        <Separator orientation="vertical" className="h-4 opacity-40" />
        <nav className="flex items-center gap-1.5 text-[12px] text-muted-foreground">
          <Link href="/dashboard/services" className="hover:text-foreground transition-colors">Marketplace</Link>
          <span className="opacity-30">/</span>
          <span>Configuration</span>
          <span className="opacity-30">/</span>
          <span className="font-medium text-foreground">Récapitulatif</span>
        </nav>
      </header>

      <div className="border-b border-border/60 px-5 py-3 bg-background">
        <Stepper steps={STEPS} current={3} />
      </div>

      <div className="p-6 max-w-2xl mx-auto w-full">
        <div className="mb-8">
          <h1 className="text-xl font-semibold tracking-tight">Récapitulatif de commande</h1>
          <p className="text-[13px] text-muted-foreground mt-1">Vérifiez votre configuration avant de confirmer.</p>
        </div>

        {/* Debug banner en dev */}
        {process.env.NODE_ENV === "development" && (
          <pre className="mb-4 text-[10px] bg-muted px-3 py-2 rounded-lg text-muted-foreground break-all">
            {debugInfo || `serviceId=${draft.serviceId} planId=${draft.planId} plan=${plan?.name ?? "null"}`}
          </pre>
        )}

        <div className="space-y-6">
          <RecapSection
            title="Service commandé"
            rows={[
              { label: "Service",   value: `${service?.icon ?? ""} ${service?.name ?? "—"}`.trim() },
              { label: "Cloud",     value: service?.cloudType ?? "—"                                },
              { label: "Plan",      value: plan?.name ?? "—"                                        },
              { label: "Specs",     value: plan ? planSpecs(plan) : "—"                             },
              { label: "Ressource", value: <span className="font-mono text-[12px]">{draft.resourceName ?? "—"}</span> },
            ]}
          />

          <RecapSection
            title="Configuration"
            rows={[
              { label: "Zone",   value: draft.availabilityZone ?? "—"             },
              { label: "Backup", value: draft.backupEnabled ? "✓ Activé" : "Non"  },
            ]}
          />

          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-muted-foreground mb-2">Détail tarifaire</p>
            <div className="border border-border rounded-xl overflow-hidden divide-y divide-border">
              {[
                { label: `Plan ${plan?.name ?? ""}`, price: `${ht.toFixed(2)} €`,    bold: false },
                { label: "Sous-total HT",             price: `${ht.toFixed(2)} €`,    bold: false },
                { label: "TVA (20%)",                 price: `+${tva.toFixed(2)} €`,  bold: false },
                { label: "Total TTC / mois",          price: `${total.toFixed(2)} €`, bold: true  },
              ].map((line, i) => (
                <div key={i} className={cn("flex items-center justify-between px-5 py-3 bg-card", line.bold && "font-semibold")}>
                  <span className={cn("text-[13px]", line.bold ? "text-foreground" : "text-muted-foreground")}>{line.label}</span>
                  <span className={cn("text-[13px] tabular-nums", line.bold && "text-base")}>{line.price}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="flex items-start gap-2.5 border border-amber-200 bg-amber-50 rounded-xl px-4 py-3">
            <span className="shrink-0 mt-0.5">⚠️</span>
            <p className="text-[12px] text-amber-800 leading-relaxed">
              En confirmant, vous acceptez les Conditions Générales de Service. La première facture sera émise à la date de déploiement.
            </p>
          </div>

          {error && (
            <div className="flex items-center gap-2 text-[12px] text-red-600">
              <AlertTriangle className="w-3.5 h-3.5 shrink-0" />{error}
            </div>
          )}

          <div className="flex items-center gap-3 pt-2">
            <Button variant="outline" className="h-9 text-[13px]" onClick={() => router.back()}>
              ← Modifier la configuration
            </Button>
            <Button
              className="flex-1 h-9 text-[13px] font-medium"
              onClick={handleConfirm}
              disabled={loading || !plan || !draft.resourceName}
            >
              {loading
                ? <><Loader2 className="w-3.5 h-3.5 mr-2 animate-spin" />Création…</>
                : "✓ Confirmer et déployer"
              }
            </Button>
          </div>
        </div>
      </div>
    </SidebarInset>
  )
}