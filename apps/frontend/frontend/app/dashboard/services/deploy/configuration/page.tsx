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
import { Stepper }   from "@/components/deploy/stepper"
import { getServiceById } from "@/lib/services/cloud-services.api"
import type { CloudServiceDTO, PlanDTO, AvailabilityZone } from "@/lib/types"
import { cn } from "@/lib/utils"

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

const CYCLE_LABEL: Record<string, string> = { HORAIRE: "/h", MENSUEL: "/mois", ANNUEL: "/an" }

function planSpecs(p: PlanDTO): string {
  return [
    p.vcores    ? `${p.vcores} vCPU`      : "",
    p.ramGb     ? `${p.ramGb} Go RAM`     : "",
    p.storageGb ? `${p.storageGb} Go SSD` : "",
  ].filter(Boolean).join(" · ")
}

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

export default function ConfigurationPage() {
  const router = useRouter()

  const [service,  setService]  = React.useState<CloudServiceDTO | null>(null)
  const [plan,     setPlan]     = React.useState<PlanDTO | null>(null)
  const [fetching, setFetching] = React.useState(true)
  const [serviceId, setServiceId] = React.useState<number | null>(null)
  const [planId,    setPlanId]    = React.useState<number | null>(null)

  const [resourceName,  setResourceName]  = React.useState("")
  const [description,   setDescription]   = React.useState("")
  const [zone,          setZone]          = React.useState<AvailabilityZone>("EO")
  const [backupEnabled, setBackupEnabled] = React.useState(true)

  React.useEffect(() => {
    // ── Lecture sessionStorage côté client uniquement ──
    const raw = sessionStorage.getItem("deploy_draft")
    console.log("[CONFIG] raw sessionStorage:", raw)

    if (!raw) { setFetching(false); return }

    let draft: any
    try { draft = JSON.parse(raw) } catch { setFetching(false); return }

    console.log("[CONFIG] draft:", draft)

    const sid = draft?.serviceId
    const pid = draft?.planId

    if (!sid || !pid) {
      console.warn("[CONFIG] serviceId ou planId manquant dans le draft")
      setFetching(false)
      return
    }

    setServiceId(sid)
    setPlanId(pid)

    getServiceById(sid)
      .then(svc => {
        console.log("[CONFIG] service chargé:", svc.name, "plans:", svc.plans.map(p => p.id))
        setService(svc)
        const p = svc.plans.find(p => p.id === pid) ?? svc.plans[0]
        setPlan(p ?? null)
      })
      .catch(err => console.error("[CONFIG] erreur getServiceById:", err))
      .finally(() => setFetching(false))
  }, [])

  const basePrice = plan?.price ?? 0
  const cycleStr  = plan ? (CYCLE_LABEL[plan.billingCycle] ?? "") : ""

  const handleContinue = () => {
    if (!serviceId || !planId) return

    // ✅ Écriture directe dans sessionStorage — merge complet
    const existing = (() => {
      try { return JSON.parse(sessionStorage.getItem("deploy_draft") ?? "{}") } catch { return {} }
    })()

    const updated = {
      ...existing,           // garde serviceId + planId
      serviceId,             // réécrit explicitement
      planId,
      resourceName,
      description,
      availabilityZone: zone,
      backupEnabled,
    }

    console.log("[CONFIG] saveDraft:", updated)
    sessionStorage.setItem("deploy_draft", JSON.stringify(updated))
    router.push("/dashboard/services/deploy/recapitulatif")
  }

  if (fetching) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="size-4 animate-spin text-muted-foreground" />
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

          {/* Plan sélectionné */}
          <div className="flex items-center justify-between border border-border rounded-xl px-5 py-3.5 bg-muted/20">
            <div className="flex items-center gap-3">
              <span className="text-xl">{service?.icon ?? "🖥️"}</span>
              <div>
                <p className="text-[13px] font-semibold text-foreground">
                  {plan?.name ?? "—"}{plan && planSpecs(plan) ? ` — ${planSpecs(plan)}` : ""}
                </p>
                <p className="text-[11px] text-muted-foreground">{service?.cloudType} · {service?.name}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-[13px] font-semibold tabular-nums">
                {basePrice === 0 ? "Gratuit" : `${basePrice.toFixed(2)} €${cycleStr}`}
              </span>
              <Button variant="outline" size="sm" className="h-7 text-[12px]" onClick={() => router.back()}>
                Changer
              </Button>
            </div>
          </div>

          <SectionCard icon="🏷️" title="Identification" sub="Nom de la ressource">
            <div className="space-y-1.5">
              <Label className="text-[12px]">Nom de la ressource *</Label>
              <Input value={resourceName} onChange={e => setResourceName(e.target.value)}
                placeholder="ex: prod-backend-01" className="h-8 text-[13px]" />
              <p className="text-[11px] text-muted-foreground">Lettres minuscules, chiffres et tirets uniquement</p>
            </div>
            <div className="space-y-1.5">
              <Label className="text-[12px]">Description <span className="text-muted-foreground">(optionnel)</span></Label>
              <Input value={description} onChange={e => setDescription(e.target.value)}
                placeholder="ex: Serveur backend API principal" className="h-8 text-[13px]" />
            </div>
          </SectionCard>

          <SectionCard icon="🌍" title="Zone de disponibilité" sub="Emplacement de déploiement">
            <div className="grid grid-cols-3 gap-2">
              {ZONES.map(z => (
                <button key={z.id} onClick={() => setZone(z.id)}
                  className={cn(
                    "text-left p-3 rounded-xl border text-[12px] transition-all",
                    zone === z.id
                      ? "border-foreground bg-foreground/5 font-medium"
                      : "border-border hover:border-foreground/30 hover:bg-muted/40"
                  )}>
                  <span className="block font-semibold text-foreground">{z.label}</span>
                  <span className="text-muted-foreground text-[11px] mt-0.5 block">{z.sub}</span>
                </button>
              ))}
            </div>
          </SectionCard>

          <SectionCard icon="🔧" title="Options" sub="Services additionnels">
            <div className="flex items-center justify-between py-1">
              <div>
                <p className="text-[13px] font-medium text-foreground">Backup automatique</p>
                <p className="text-[11px] text-muted-foreground mt-0.5">Snapshot quotidien, rétention 30 jours</p>
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
                { label: "Plan",   value: plan?.name ?? "—"            },
                { label: "Specs",  value: plan ? planSpecs(plan) : "—" },
                { label: "Zone",   value: zone                         },
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
                <p className="text-2xl font-semibold tabular-nums text-foreground">
                  {basePrice === 0 ? "Gratuit" : `${basePrice.toFixed(2)} €`}
                </p>
              </div>
            </div>
          </div>

          <Button className="w-full h-9 text-[13px] font-medium"
            onClick={handleContinue}
            disabled={!resourceName.trim()}>
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