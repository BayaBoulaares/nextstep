// app/dashboard/services/deploy/deploiement/page.tsx
"use client"

import * as React from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { SidebarInset, SidebarTrigger } from "@/components/ui/sidebar"
import { Separator } from "@/components/ui/separator"
import { Button } from "@/components/ui/button"
import { Stepper } from "@/components/deploy/stepper"
import { useDeploymentTunnel, clearDraft } from "@/lib/hooks/useDeployments"
import { PasswordDialog } from "@/components/vms/PasswordDialog"
import type { AbonnementResponse, DeploymentPollResult } from "@/lib/types"
import { Check, CheckCircle, Loader2, Rocket, XCircle } from "lucide-react"
import { cn } from "@/lib/utils"

// ─── Constantes ───────────────────────────────────────────────────────────────

const STEPS = [
  { id: 1, label: "Sélection du plan" },
  { id: 2, label: "Configuration" },
  { id: 3, label: "Récapitulatif" },
  { id: 4, label: "Déploiement" },
]

const UI_STEPS = [
  { id: 1, label: "Commande validée", description: "Ressources allouées dans le datacenter" },
  { id: 2, label: "Création de la VM", description: "Hyperviseur KVM — Allocation vCPU & RAM" },
  { id: 3, label: "Installation de l'OS", description: "Image officielle montée sur le volume NVMe" },
  { id: 4, label: "Configuration réseau", description: "VPC, IP privée, groupe de sécurité" },
  { id: 5, label: "Activation des services", description: "Backup, Monitoring, SSH Keys" },
]

const STATUS_TO_STEP: Record<string, number> = {
  EN_ATTENTE: 1,
  PROVISIONNEMENT: 2,
  ACTIF: 6,
  ECHEC: -1,
}

// ─── StepRow ─────────────────────────────────────────────────────────────────

function StepRow({ step, currentStep }: { step: typeof UI_STEPS[0]; currentStep: number }) {
  const done = step.id < currentStep
  const active = step.id === currentStep

  return (
    <div className={cn(
      "flex items-center gap-4 px-5 py-4 border-b border-border/60 last:border-0 transition-colors",
      active && "bg-muted/30"
    )}>
      <div className={cn(
        "w-8 h-8 rounded-full flex items-center justify-center shrink-0 border text-[12px] font-semibold",
        (done || active)
          ? "bg-[#0a7fcf] border-[#0a7fcf] text-white"
          : "bg-background border-border text-muted-foreground"
      )}>
        {done ? <Check className="w-3.5 h-3.5" /> :
          active ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> :
            step.id}
      </div>
      <div className="flex-1">
        <p className={cn(
          "text-[13px] font-medium",
          (done || active) ? "text-foreground" : "text-muted-foreground"
        )}>
          {step.label}
        </p>
        <p className="text-[11px] text-muted-foreground mt-0.5">{step.description}</p>
      </div>
    </div>
  )
}

// ─── Page ────────────────────────────────────────────────────────────────────

export default function DeploiementPage() {
  // ✅ Tous les hooks en haut du composant
  const hasProvisionedRef = React.useRef(false)
  const router = useRouter()
  const searchParams = useSearchParams()

  const { provision, pollUntilRunning, vmPassword, vmName, clearVmPassword } =
    useDeploymentTunnel()

  const [deployment, setDeployment] = React.useState<AbonnementResponse | null>(null)
  const [currentStep, setCurrentStep] = React.useState(1)
  const [done, setDone] = React.useState(false)
  const [errorMsg, setErrorMsg] = React.useState<string | null>(null)
  const [displayName, setDisplayName] = React.useState("Votre service")

  const idParam = searchParams.get("id")
  const retryParam = searchParams.get("retry")

  // ✅ Reset du ref quand l'utilisateur clique "Réessayer" (retryParam change)
  React.useEffect(() => {
    hasProvisionedRef.current = false
  }, [retryParam])

  // ✅ Effet principal de provisionnement
  React.useEffect(() => {
    const id = Number(idParam)
    if (!idParam || isNaN(id) || id <= 0) {
      setErrorMsg("Identifiant de déploiement invalide")
      return
    }

    // Empêche le double appel React StrictMode
    if (hasProvisionedRef.current) return
    hasProvisionedRef.current = true

    setErrorMsg(null)
    setDone(false)
    setCurrentStep(1)
    clearVmPassword()

    const run = async () => {
      try {
        await provision(id)
        setCurrentStep(2)

        await pollUntilRunning(id, (d: DeploymentPollResult) => {
          if ((d.status as string) === "ECHEC") {
            setErrorMsg("Le provisionnement a échoué côté serveur")
            return
          }
          const step = STATUS_TO_STEP[d.status] ?? 2
          setCurrentStep(Math.min(step, UI_STEPS.length + 1))
          if (d.resourceName) setDisplayName(d.resourceName)
        })

        setCurrentStep(UI_STEPS.length + 1)
        setDone(true)
        clearDraft()

      } catch (e: any) {
        const msg: string = e?.message ?? "Erreur lors du provisionnement"
        setErrorMsg(
          msg.toLowerCase().includes("timeout")
            ? "Le provisionnement dépasse le délai maximum (5 min). Contactez le support."
            : msg
        )
      }
    }

    run()
  }, [idParam, retryParam]) // eslint-disable-line react-hooks/exhaustive-deps

  const handleRetry = () => {
    const id = Number(idParam)
    if (!idParam || isNaN(id) || id <= 0) {
      router.push("/dashboard/services/deploy/recapitulatif")
    } else {
      router.replace(`/dashboard/services/deploy/deploiement?id=${idParam}&retry=${Date.now()}`)
    }
  }

  // ── Rendu ─────────────────────────────────────────────────────────────────

  return (
    <SidebarInset>
      {vmPassword && vmName && (
        <PasswordDialog
          vmName={vmName}
          password={vmPassword}
          onClose={clearVmPassword}
        />
      )}

      <header className="flex h-14 items-center border-b border-border/60 px-5 bg-background/95 backdrop-blur sticky top-0 z-10">
        <SidebarTrigger className="-ml-1 size-8 text-muted-foreground hover:text-foreground hover:bg-muted rounded-md transition-colors" />
        <Separator orientation="vertical" className="h-4 opacity-40 mx-3" />

      </header>

      <div className="border-b border-border/60 px-5 py-3 bg-background">
        <Stepper steps={STEPS} current={4} />
      </div>

      <div className="flex flex-col items-center pt-14 px-6 min-h-[calc(100vh-112px)]">

        <div className={cn(
          "w-20 h-20 rounded-full flex items-center justify-center mb-6 transition-all duration-500",
          done && "bg-emerald-50 border-2 border-emerald-500",
          errorMsg && "bg-red-50 border-2 border-red-500",
          !done && !errorMsg && "bg-blue-50 border-2 border-blue-500"
        )}>
          {done ? (
            <CheckCircle className="w-10 h-10 text-emerald-500" />
          ) : errorMsg ? (
            <XCircle className="w-10 h-10 text-red-500" />
          ) : (
            <div className="relative">
              <Rocket className="w-10 h-10 text-[#0a7fcf] animate-pulse" />
              <div className="absolute -bottom-1 -right-1">
                <Loader2 className="w-4 h-4 text-[#0a7fcf] animate-spin" />
              </div>
            </div>
          )}
        </div>

        <h1 className={cn(
          "text-2xl font-semibold tracking-tight mb-2",
          done && "text-emerald-600",
          errorMsg && "text-red-600",
          !done && !errorMsg && "text-[#0a7fcf]"
        )}>
          {done ? "Votre service est prêt" :
            errorMsg ? "Échec du provisionnement" :
              "Déploiement en cours"}
        </h1>

        {!errorMsg && (
          <div className="w-full max-w-md border border-border rounded-2xl overflow-hidden bg-card mb-6">
            {UI_STEPS.map(step => (
              <StepRow key={step.id} step={step} currentStep={currentStep} />
            ))}
          </div>
        )}

        {!done && !errorMsg && (
          <p className="text-[12px] text-muted-foreground font-mono">
            ⏱ Vérification toutes les 3 secondes…
          </p>
        )}

        {done && (
          <div className="flex gap-3">
            <Button
              variant="outline"
              className="h-9 text-[13px] font-medium px-6"
              onClick={() => router.push("/dashboard/vms")}
            >
              Voir déploiments
            </Button>
            <Button
              className="h-9 text-[13px] font-medium px-6 bg-[#0a7fcf] hover:bg-[#0869b0] text-white"
              onClick={() => router.push("/dashboard")}
            >
              Accéder au Dashboard →
            </Button>
          </div>
        )}

        {errorMsg && (
          <div className="flex gap-3">
            <Button variant="outline" className="h-9 text-[13px]" onClick={() => router.back()}>
              ← Retour
            </Button>
            <Button variant="outline" className="h-9 text-[13px]" onClick={handleRetry}>
              Réessayer
            </Button>
            <Button
              className="h-9 text-[13px] font-medium bg-[#0a7fcf] hover:bg-[#0869b0] text-white"
              onClick={() => router.push("/dashboard")}
            >
              Dashboard
            </Button>
          </div>
        )}

      </div>
    </SidebarInset>
  )
}