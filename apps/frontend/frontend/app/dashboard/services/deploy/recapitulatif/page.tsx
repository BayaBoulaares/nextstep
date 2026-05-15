// app/dashboard/services/deploy/recapitulatif/page.tsx
"use client"

import * as React from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { SidebarInset, SidebarTrigger } from "@/components/ui/sidebar"
import { Separator } from "@/components/ui/separator"
import { Button } from "@/components/ui/button"
import { Loader2, AlertTriangle, ShieldAlert } from "lucide-react"
import { Stepper } from "@/components/deploy/stepper"
import { useDeploymentTunnel, type DeploymentDraft } from "@/lib/hooks/useDeployments"
import { getServiceById } from "@/lib/services/cloud-services.api"
// ✅ DeploymentRequest mis à jour : resourceName, planId, projectId, regionId...
//    CloudType supprimé de CloudServiceDTO → plus de colonne "Cloud"
import type { CloudServiceDTO, PlanDTO, DeploymentRequest } from "@/lib/types"
import { OS_LABELS } from "@/lib/types"
import { cn } from "@/lib/utils"

// ─── Constantes ───────────────────────────────────────────────────────────────

const STEPS = [
  { id: 1, label: "Sélection du plan" },
  { id: 2, label: "Configuration" },
  { id: 3, label: "Récapitulatif" },
  { id: 4, label: "Déploiement" },
]

// ─── Utilitaires ─────────────────────────────────────────────────────────────

function planSpecs(plan: PlanDTO): string {
  return [
    plan.vcores ? `${plan.vcores} vCPU` : "",
    plan.ramGb ? `${plan.ramGb} Go RAM` : "",
    plan.storageGb ? `${plan.storageGb} Go SSD` : "",
  ].filter(Boolean).join(" · ") || "—"
}


// ─── RecapSection ─────────────────────────────────────────────────────────────

function RecapSection({ title, rows }: {
  title: string
  rows: { label: string; value: React.ReactNode }[]
}) {
  return (
    <div>
      <p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-muted-foreground mb-2">
        {title}
      </p>
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


// ─── Page ─────────────────────────────────────────────────────────────────────

export default function RecapPage() {
  const router = useRouter()
  const { confirm, loading, error } = useDeploymentTunnel()

  // Protection double-submit
  const isSubmitting = React.useRef(false)

  // États
  const [service, setService] = React.useState<CloudServiceDTO | null>(null)
  const [plan, setPlan] = React.useState<PlanDTO | null>(null)
  const [draft, setDraft] = React.useState<DeploymentDraft | null>(null)
  const [fetching, setFetching] = React.useState(true)
  const [loadError, setLoadError] = React.useState<string | null>(null)
  const [debugInfo, setDebugInfo] = React.useState<string>("")

  // Chargement du draft + service
  React.useEffect(() => {
    const raw = sessionStorage.getItem("deploy_draft")
    //console.log("[RECAP] raw sessionStorage:", raw)

    if (!raw) {
      //setDebugInfo("❌ Aucun draft en sessionStorage")
      setFetching(false)
      return
    }

    let d: DeploymentDraft
    try {
      d = JSON.parse(raw)
    } catch {
      //setDebugInfo("❌ Draft JSON invalide: " + raw)
      setFetching(false)
      return
    }

    //console.log("[RECAP] draft parsé:", d)
    //setDebugInfo(`✓ serviceId=${d.serviceId} planId=${d.planId} resourceName=${d.resourceName}`)
    setDraft(d)

    if (!d.serviceId || !d.planId) {
      //setDebugInfo(`❌ serviceId ou planId manquant`)
      setFetching(false)
      return
    }

    getServiceById(d.serviceId)
      .then(svc => {
        setService(svc)
        const p = svc.plans.find(p => p.id === d.planId)
        if (!p) console.warn("[RECAP] plan introuvable:", d.planId)
        setPlan(p ?? svc.plans[0] ?? null)
      })
      .catch(err => {
        console.error("[RECAP] erreur getServiceById:", err)
        setLoadError("Impossible de charger les détails du service. Vérifiez votre connexion.")
      })
      .finally(() => setFetching(false))
  }, [])

  // handleConfirm avec protection double-submit
  const handleConfirm = async () => {
    if (!draft?.planId || !draft?.resourceName || !plan) return
    if (isSubmitting.current) return
    isSubmitting.current = true

    // ✅ DeploymentRequest revu : resourceName (pas name), plus de serviceId ni vpcId
    const request: DeploymentRequest = {
      resourceName: draft.resourceName!,
      planId: draft.planId!,
      projectId: draft.projectId,
      regionId: draft.regionId,
      availabilityZone: draft.availabilityZone,
      description: draft.description,
      backupEnabled: draft.backupEnabled ?? false,
      monitoringEnabled: draft.monitoringEnabled ?? false,
      antiDdosEnabled: draft.antiDdosEnabled ?? false,
      additionalStorageGb: draft.additionalStorageGb ?? 0,
      operatingSystem: draft.operatingSystem,
      availabilitySet: draft.availabilitySet,     // ← ajouter

    }

    console.log("[RECAP] request:", request)  // déjà présent
    try {
      const deployment = await confirm(request)
      console.log("[RECAP] deployment reçu:", deployment)  // ← ajoute ça
      console.log("[RECAP] deployment.id:", deployment?.id) // ← et ça
      router.push(`/dashboard/services/deploy/deploiement?id=${deployment.id}`)
    } catch (e) {
      console.error("[RECAP] confirm error:", e)  // ← et ça
      isSubmitting.current = false
    }
  }

  // Label OS lisible
  const osLabel = draft?.operatingSystem
    ? (OS_LABELS[draft.operatingSystem] ?? draft.operatingSystem)
    : null

  // ✅ Calcul tarifaire — BillingCycle : HORAIRE | MENSUEL | ANNUEL (USAGE supprimé)
  // On n'a plus de USAGE → isPayg toujours false, bloc PAYG retiré
  const ht = plan ? plan.price : null
  const tva = ht != null ? ht * 0.2 : null
  const total = ht != null && tva != null ? ht + tva : null

  const CYCLE_SUFFIX: Record<string, string> = {
    HORAIRE: "/h",
    MENSUEL: "/mois",
    ANNUEL: "/an",
  }
  const cycleSuffix = plan ? (CYCLE_SUFFIX[plan.billingCycle] ?? "") : ""

  // ── Rendus conditionnels ──────────────────────────────────────────────────

  if (fetching) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="size-4 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (loadError) {
    return (
      <div className="flex h-screen flex-col items-center justify-center gap-4">
        <p className="text-[13px] text-muted-foreground text-center max-w-xs">{loadError}</p>
        <div className="flex gap-3">
          <Button variant="outline" onClick={() => router.back()}>
            ← Configuration
          </Button>
          <Button onClick={() => window.location.reload()}>
            Réessayer
          </Button>
        </div>
      </div>
    )
  }

  if (!draft?.serviceId || !draft?.planId) {
    return (
      <div className="flex h-screen flex-col items-center justify-center gap-4 px-6">
        <p className="text-[13px] text-muted-foreground text-center">Aucune configuration trouvée.</p>
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

  // ── Rendu principal ───────────────────────────────────────────────────────

  return (
    <SidebarInset>
      <header className="flex h-14 items-center gap-3 border-b border-border/60 px-5 bg-background/95 backdrop-blur sticky top-0 z-10">
        <SidebarTrigger className="-ml-1 size-8 text-muted-foreground hover:text-foreground hover:bg-muted rounded-md transition-colors" />
        <Separator orientation="vertical" className="h-4 opacity-40" />
        <nav className="flex items-center gap-1.5 text-[12px] text-muted-foreground">
          <Link href="/dashboard/services" className="hover:text-foreground transition-colors">
            Marketplace
          </Link>
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
          <p className="text-[13px] text-muted-foreground mt-1">
            Vérifiez votre configuration avant de confirmer.
          </p>
        </div>

        {/* Banner debug (dev uniquement) */}
        {/*{process.env.NODE_ENV === "development" && (
          <pre className="mb-4 text-[10px] bg-muted px-3 py-2 rounded-lg text-muted-foreground break-all">
            {debugInfo || `serviceId=${draft.serviceId} planId=${draft.planId} plan=${plan?.name ?? "null"}`}
          </pre>
        )}*/}

        <div className="space-y-6">

          {/* Service commandé — cloudType retiré (plus dans CloudServiceDTO) */}
          <RecapSection
            title="Service commandé"
            rows={[
              { label: "Service", value: `${service?.icon ?? ""} ${service?.name ?? "—"}`.trim() },
              { label: "Catégorie", value: service?.category ?? "—" },
              { label: "Plan", value: plan?.name ?? "—" },
              { label: "Tier", value: plan?.tier ?? "—" },
              { label: "Specs", value: plan ? planSpecs(plan) : "—" },
              { label: "Ressource", value: <span className="font-mono text-[12px]">{draft.resourceName ?? "—"}</span> },
              ...(osLabel ? [{ label: "OS", value: osLabel }] : []),
            ]}
          />

          {/* Configuration */}
          <RecapSection
            title="Configuration"
            rows={[
              { label: "Zone", value: draft.availabilityZone ?? "—" },
              { label: "Backup", value: draft.backupEnabled ? "✓ Activé" : "Non" },
              { label: "Monitoring", value: draft.monitoringEnabled ? "✓ Activé" : "Non" },
              { label: "Anti-DDoS", value: draft.antiDdosEnabled ? "✓ Activé" : "Non" },
              // ← ajouter :
              ...(draft.availabilitySet ? [{
                label: "Availability Set",
                value: (
                  <span className="font-mono text-[12px] bg-muted px-2 py-0.5 rounded">
                    🔗 {draft.availabilitySet}
                  </span>
                )
              }] : []),
            ]}
          />

          {/* Détail tarifaire — USAGE supprimé des BillingCycle, bloc PAYG retiré */}
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-muted-foreground mb-2">
              Détail tarifaire
            </p>
            <div className="border border-border rounded-xl overflow-hidden divide-y divide-border">
              {[
                { label: `Plan ${plan?.name ?? ""} (HT${cycleSuffix})`, price: ht != null ? `${ht.toFixed(2)} TND` : "—", bold: false },
                { label: "Sous-total HT", price: ht != null ? `${ht.toFixed(2)} TND` : "—", bold: false },
                { label: "TVA (20%)", price: tva != null ? `+${tva.toFixed(2)} TND` : "—", bold: false },
                { label: `Total TTC${cycleSuffix}`, price: total != null ? `${total.toFixed(2)} TND` : "—", bold: true },
              ].map((line, i) => (
                <div key={i} className={cn(
                  "flex items-center justify-between px-5 py-3 bg-card",
                  line.bold && "font-semibold"
                )}>
                  <span className={cn("text-[13px]", line.bold ? "text-foreground" : "text-muted-foreground")}>
                    {line.label}
                  </span>
                  <span className={cn("text-[13px] tabular-nums", line.bold && "text-base")}>
                    {line.price}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Bandeau CGS */}
          <div className="flex items-start gap-2.5 border border-amber-200 bg-amber-50 rounded-xl px-4 py-3">

            <p className="text-[11px] text-muted-foreground flex items-center gap-1.5">
              <ShieldAlert className="w-3.5 h-3.5 text-amber-500 flex-shrink-0" />
              En confirmant, vous acceptez les Conditions Générales de Service.{" "}
              La première facture sera émise à la date de déploiement.
            </p>
          </div>

          {/* Erreur confirm */}
          {error && (
            <div className="flex items-center gap-2 text-[12px] text-red-600">
              <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
              {error}
            </div>
          )}

          {/* Actions */}
          {/* Actions - MODIFIÉ : gap-3 et pas de conteneur supplémentaire */}
          <div className="flex items-center gap-3 pt-2">
            <Button
              variant="outline"
              className="h-9 text-[13px] flex-1"  // ← flex-1 pour largeur égale
              onClick={() => router.back()}
            >
              ← Modifier la configuration
            </Button>
            <Button
              className="h-9 text-[13px] font-medium bg-[#0a7fcf] hover:bg-[#0869b0] text-white flex-1"  // ← flex-1
              onClick={handleConfirm}
              disabled={loading || !plan || !draft.resourceName}
            >
              {loading
                ? <><Loader2 className="w-3.5 h-3.5 mr-2 animate-spin" />Création…</>
                : "Confirmer et déployer"
              }
            </Button>
          </div>

        </div>
      </div>
    </SidebarInset>
  )
}