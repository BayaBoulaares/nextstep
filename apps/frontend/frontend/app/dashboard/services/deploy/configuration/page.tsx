// app/dashboard/services/deploy/configuration/page.tsx
"use client"

import * as React from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { SidebarInset, SidebarTrigger } from "@/components/ui/sidebar"
import { Separator } from "@/components/ui/separator"
import { Button }    from "@/components/ui/button"
import { Input }     from "@/components/ui/input"
import { Label }     from "@/components/ui/label"
import { Switch }    from "@/components/ui/switch"
import { Loader2 }   from "lucide-react"
import {
  Select, SelectContent, SelectItem,
  SelectTrigger, SelectValue,
} from "@/components/ui/select"
import { Stepper } from "@/components/deploy/stepper"
import { getServiceById } from "@/lib/services/cloud-services.api"
import type {
  CloudServiceDTO, PlanDTO,
  AvailabilityZone, OperatingSystem, ServiceCategory,
} from "@/lib/types"
import { OS_LABELS } from "@/lib/types"
import { cn } from "@/lib/utils"

// ─── Constantes ───────────────────────────────────────────────────────────────

const STEPS = [
  { id: 1, label: "Sélection du plan" },
  { id: 2, label: "Configuration"     },
  { id: 3, label: "Récapitulatif"     },
  { id: 4, label: "Déploiement"       },
]

const ZONES: { id: AvailabilityZone; label: string; sub: string }[] = [
  { id: "EO",       label: "EO",       sub: "Capacité élevée — placement prioritaire" },
  { id: "DATAXION", label: "DATAXION", sub: "Capacité normale"                        },
  { id: "TT",       label: "TT",       sub: "Haute disponibilité automatique (A + B)" },
]

const CYCLE_LABEL: Record<string, string> = {
  HORAIRE: "/h",
  MENSUEL: "/mois",
  ANNUEL:  "/an",
  USAGE:   " à l'usage",
}

// C1 — Regex Kubernetes : kebab-case strict, 1 à 63 caractères
// Règles : commence par [a-z], termine par [a-z0-9], tirets autorisés au milieu
const RESOURCE_NAME_REGEX = /^[a-z][a-z0-9-]{0,61}[a-z0-9]$|^[a-z]$/

// C2 — Catégories pour lesquelles un OS n'a pas de sens
const CATEGORIES_SANS_OS: ServiceCategory[] = ["STOCKAGE", "RESEAU", "EMAIL"]

// ─── Fonctions utilitaires ────────────────────────────────────────────────────

function getOsOptions(category?: ServiceCategory): OperatingSystem[] {
  if (!category || CATEGORIES_SANS_OS.includes(category)) {
    return ["NONE"]
  }
  return [
    "UBUNTU_24_04_LTS",
    "UBUNTU_22_04_LTS",
    "DEBIAN_12",
    "DEBIAN_11",
    "ROCKY_LINUX_9",
    "ALMA_LINUX_9",
    "CENTOS_STREAM_9",
    "WINDOWS_SERVER_2022",
    "WINDOWS_SERVER_2019",
  ]
}

function planSpecs(p: PlanDTO): string {
  return [
    p.vcores    ? `${p.vcores} vCPU`      : "",
    p.ramGb     ? `${p.ramGb} Go RAM`     : "",
    p.storageGb ? `${p.storageGb} Go SSD` : "",
  ].filter(Boolean).join(" · ")
}

// ─── SectionCard ─────────────────────────────────────────────────────────────

function SectionCard({ icon, title, sub, children }: {
  icon: string; title: string; sub: string; children: React.ReactNode
}) {
  return (
    <div className="border border-border rounded-2xl overflow-hidden">
      <div className="flex items-center gap-3 px-6 py-4 border-b border-border bg-muted/20">
        <span className="text-lg">{icon}</span>
        <div>
          <p className="text-[13px] font-semibold text-foreground">{title}</p>
          <p className="text-[11px] text-muted-foreground">{sub}</p>
        </div>
      </div>
      <div className="px-6 py-5 space-y-5 bg-card">{children}</div>
    </div>
  )
}

// ─── Page principale ──────────────────────────────────────────────────────────

export default function ConfigurationPage() {
  const router = useRouter()

  // États — chargement
  const [service,   setService]   = React.useState<CloudServiceDTO | null>(null)
  const [plan,      setPlan]      = React.useState<PlanDTO | null>(null)
  const [fetching,  setFetching]  = React.useState(true)
  const [loadError, setLoadError] = React.useState<string | null>(null)   // E1
  const [serviceId, setServiceId] = React.useState<number | null>(null)
  const [planId,    setPlanId]    = React.useState<number | null>(null)

  // États — formulaire
  const [resourceName,    setResourceName]    = React.useState("")
  const [description,     setDescription]     = React.useState("")
  const [zone,            setZone]            = React.useState<AvailabilityZone>("EO")
  const [backupEnabled,   setBackupEnabled]   = React.useState(true)
  const [operatingSystem, setOperatingSystem] = React.useState<OperatingSystem>("UBUNTU_24_04_LTS")

  // C1 — Validation resourceName
  // Déclaré AVANT tout return conditionnel pour respecter la règle des hooks
  const resourceNameError = React.useMemo(() => {
    if (!resourceName) return null
    if (resourceName.length < 2)  return "Minimum 2 caractères"
    if (resourceName.length > 63) return "Maximum 63 caractères"
    if (!RESOURCE_NAME_REGEX.test(resourceName))
      return "Minuscules, chiffres et tirets uniquement — ne peut pas commencer ou finir par un tiret"
    return null
  }, [resourceName])

  // Chargement initial depuis sessionStorage
  React.useEffect(() => {
    const raw = sessionStorage.getItem("deploy_draft")
    console.log("[CONFIG] raw sessionStorage:", raw)

    if (!raw) { setFetching(false); return }

    let draft: any
    try { draft = JSON.parse(raw) } catch { setFetching(false); return }

    const sid = draft?.serviceId
    const pid = draft?.planId

    if (!sid || !pid) {
      console.warn("[CONFIG] serviceId ou planId manquant dans le draft")
      setFetching(false)
      return
    }

    setServiceId(sid)
    setPlanId(pid)

    // Valeur d'OS issue du draft (peut être undefined si premier passage)
    const draftOs: OperatingSystem | undefined = draft.operatingSystem

    getServiceById(sid)
      .then(svc => {
        setService(svc)

        // C2 — Calcul des OS disponibles pour cette catégorie
        const options = getOsOptions(svc.category)

        // Ordre de priorité :
        //  1. OS du draft SI compatible avec la catégorie (retour en arrière)
        //  2. Premier OS de la liste sinon (nouveau passage ou OS incompatible)
        setOperatingSystem(
          draftOs && options.includes(draftOs) ? draftOs : options[0]
        )

        const p = svc.plans.find(p => p.id === pid) ?? svc.plans[0]
        setPlan(p ?? null)
      })
      .catch(err => {
        console.error("[CONFIG] erreur getServiceById:", err)
        // E1 — stocke l'erreur pour afficher un écran dédié (pas juste un log)
        setLoadError("Impossible de charger le service. Vérifiez votre connexion.")
      })
      .finally(() => setFetching(false))
  }, [])

  // Calcul prix
  const isPayg    = plan?.isPayAsYouGo ?? false
  const basePrice = plan?.price ?? null   // null si plan PAYG
  const cycleStr  = plan ? (CYCLE_LABEL[plan.billingCycle] ?? "") : ""

  // Sauvegarde du draft et navigation vers le récapitulatif
  const handleContinue = () => {
    if (!serviceId || !planId) return

    const existing = (() => {
      try { return JSON.parse(sessionStorage.getItem("deploy_draft") ?? "{}") }
      catch { return {} }
    })()

    sessionStorage.setItem("deploy_draft", JSON.stringify({
      ...existing,
      serviceId,
      planId,
      resourceName,
      description,
      availabilityZone: zone,
      backupEnabled,
      operatingSystem,
    }))
    router.push("/dashboard/services/deploy/recapitulatif")
  }

  // E2 — "Changer" : remet à zéro les champs dépendants du plan
  // avant de revenir à la page de sélection, pour éviter qu'un OS
  // du plan précédent soit conservé pour un nouveau plan incompatible
  const handleChangePlan = () => {
    const existing = (() => {
      try { return JSON.parse(sessionStorage.getItem("deploy_draft") ?? "{}") }
      catch { return {} }
    })()
    // On retire operatingSystem et backupEnabled du draft
    // serviceId et planId seront réécrit par la page de sélection
    const { operatingSystem: _os, backupEnabled: _bk, ...rest } = existing
    sessionStorage.setItem("deploy_draft", JSON.stringify(rest))
    router.back()
  }

  // ── Rendus conditionnels ─────────────────────────────────────────────────────

  if (fetching) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="size-4 animate-spin text-muted-foreground" />
      </div>
    )
  }

  // E1 — Écran d'erreur réseau avec retry (au lieu d'une page vide avec "—")
  if (loadError) {
    return (
      <div className="flex h-screen flex-col items-center justify-center gap-4">
        <p className="text-[13px] text-muted-foreground text-center max-w-xs">
          {loadError}
        </p>
        <div className="flex gap-3">
          <Button variant="outline" onClick={() => router.push("/dashboard/services")}>
            ← Marketplace
          </Button>
          <Button onClick={() => window.location.reload()}>
            Réessayer
          </Button>
        </div>
      </div>
    )
  }

  // ── Rendu principal ──────────────────────────────────────────────────────────

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
          <span>{service?.name ?? "Service"}</span>
          <span className="opacity-30">/</span>
          <span className="font-medium text-foreground">Configuration</span>
        </nav>
      </header>

      <div className="border-b border-border/60 px-5 py-3 bg-background">
        <Stepper steps={STEPS} current={2} />
      </div>

      <div className="flex gap-6 p-6 max-w-6xl mx-auto w-full items-start">
        <div className="flex-1 min-w-0 space-y-5">

          {/* Bandeau plan sélectionné */}
          <div className="flex items-center justify-between border border-border rounded-xl px-5 py-3.5 bg-muted/20">
            <div className="flex items-center gap-3">
              <span className="text-xl">{service?.icon ?? "🖥️"}</span>
              <div>
                <p className="text-[13px] font-semibold text-foreground">
                  {plan?.name ?? "—"}{plan && planSpecs(plan) ? ` — ${planSpecs(plan)}` : ""}
                </p>
                <p className="text-[11px] text-muted-foreground">
                  {service?.cloudType} · {service?.name}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-[13px] font-semibold tabular-nums">
                {isPayg
                  ? <span className="text-amber-600">⚡ À l'usage</span>
                  : basePrice === 0 ? "Gratuit" : `${basePrice!.toFixed(2)} €${cycleStr}`
                }
              </span>
              {/* E2 — reset du draft avant retour à la sélection */}
              <Button
                variant="outline"
                size="sm"
                className="h-7 text-[12px]"
                onClick={handleChangePlan}
              >
                Changer
              </Button>
            </div>
          </div>

          {/* Identification */}
          <SectionCard icon="🏷️" title="Identification" sub="Nom de la ressource">
            <div className="space-y-1.5">
              <Label className="text-[12px]">Nom de la ressource *</Label>
              {/* C1 — toLowerCase automatique pour éviter les fautes de frappe */}
              <Input
                value={resourceName}
                onChange={e => setResourceName(e.target.value.toLowerCase())}
                placeholder="ex: prod-backend-01"
                className={cn("h-8 text-[13px]", resourceNameError && "border-destructive")}
              />
              {resourceNameError
                ? <p className="text-[11px] text-destructive">{resourceNameError}</p>
                : <p className="text-[11px] text-muted-foreground">
                    Minuscules, chiffres et tirets — 2 à 63 caractères
                  </p>
              }
            </div>
            <div className="space-y-1.5">
              <Label className="text-[12px]">
                Description <span className="text-muted-foreground">(optionnel)</span>
              </Label>
              <Input
                value={description}
                onChange={e => setDescription(e.target.value)}
                placeholder="ex: Serveur backend API principal"
                className="h-8 text-[13px]"
              />
            </div>
          </SectionCard>

          {/* C2 — Sélecteur OS filtré selon la catégorie du service */}
          <SectionCard icon="💿" title="Système d'exploitation" sub="Image de démarrage de la VM">
            <div className="space-y-1.5">
              <Label className="text-[12px]">OS <span className="text-destructive">*</span></Label>
              <Select
                value={operatingSystem}
                onValueChange={v => setOperatingSystem(v as OperatingSystem)}
              >
                <SelectTrigger className="h-9 text-[13px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {getOsOptions(service?.category).map(os => (
                    <SelectItem key={os} value={os}>
                      {OS_LABELS[os]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-[11px] text-muted-foreground">
                Image officielle montée sur le volume NVMe lors du provisionnement.
              </p>
            </div>
          </SectionCard>

          {/* Zone de disponibilité */}
          <SectionCard icon="🌍" title="Zone de disponibilité" sub="Emplacement de déploiement">
            <div className="grid grid-cols-3 gap-2">
              {ZONES.map(z => (
                <button
                  key={z.id}
                  onClick={() => setZone(z.id)}
                  className={cn(
                    "text-left p-3 rounded-xl border text-[12px] transition-all",
                    zone === z.id
                      ? "border-foreground bg-foreground/5 font-medium"
                      : "border-border hover:border-foreground/30 hover:bg-muted/40"
                  )}
                >
                  <span className="block font-semibold text-foreground">{z.label}</span>
                  <span className="text-muted-foreground text-[11px] mt-0.5 block">{z.sub}</span>
                </button>
              ))}
            </div>
          </SectionCard>

          {/* Options */}
          <SectionCard icon="🔧" title="Options" sub="Services additionnels">
            <div className="flex items-center justify-between py-1">
              <div>
                <p className="text-[13px] font-medium text-foreground">Backup automatique</p>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  Snapshot quotidien, rétention 30 jours
                </p>
              </div>
              <Switch checked={backupEnabled} onCheckedChange={setBackupEnabled} />
            </div>
          </SectionCard>
        </div>

        {/* Résumé sticky */}
        <div className="w-72 shrink-0 sticky top-[88px] space-y-3">
          <div className="border border-border rounded-2xl overflow-hidden">
            <div className="px-5 py-4 bg-foreground text-background">
              <p className="text-[10px] font-semibold uppercase tracking-widest opacity-60 mb-1">Résumé</p>
              <p className="text-base font-semibold">{service?.name ?? "—"}</p>
              <p className="text-[12px] opacity-60 mt-0.5">{service?.cloudType} · {service?.category}</p>
            </div>
            <div className="px-5 py-4 space-y-2.5 bg-card border-b border-border">
              {[
                { label: "Plan",   value: plan?.name ?? "—"                },
                { label: "Specs",  value: plan ? planSpecs(plan) : "—"     },
                { label: "Zone",   value: zone                             },
                { label: "OS",     value: OS_LABELS[operatingSystem]       },
                { label: "Backup", value: backupEnabled ? "Activé" : "Non" },
              ].map(row => (
                <div key={row.label} className="flex items-center justify-between">
                  <span className="text-[12px] text-muted-foreground">{row.label}</span>
                  <span className="text-[12px] font-medium text-foreground">{row.value}</span>
                </div>
              ))}
            </div>
            <div className="px-5 py-4 bg-card">
              <div className="flex items-end justify-between">
                <div>
                  <p className="text-[11px] text-muted-foreground">Total</p>
                  <p className="text-[10px] text-muted-foreground">HT · {plan?.billingCycle ?? "MENSUEL"}</p>
                </div>
                {isPayg
                  ? <p className="text-[13px] font-semibold text-amber-600">⚡ Variable</p>
                  : <p className="text-2xl font-semibold tabular-nums text-foreground">
                      {basePrice === 0 ? "Gratuit" : `${basePrice!.toFixed(2)} €`}
                    </p>
                }
              </div>
            </div>
          </div>

          {/* C1 — bouton désactivé si resourceName vide ou invalide */}
          <Button
            className="w-full h-9 text-[13px] font-medium"
            onClick={handleContinue}
            disabled={!resourceName.trim() || !!resourceNameError}
          >
            Continuer vers le récapitulatif →
          </Button>
          <div className="border border-border rounded-xl px-4 py-3 text-[12px] text-muted-foreground bg-muted/20 flex items-start gap-2">
            <span className="text-emerald-500 shrink-0 mt-0.5">✓</span>
            SLA 99.96% garanti contractuellement
          </div>
        </div>
      </div>
    </SidebarInset>
  )
}