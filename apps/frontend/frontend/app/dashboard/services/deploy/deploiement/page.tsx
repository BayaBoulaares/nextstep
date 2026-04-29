// // app/dashboard/services/deploy/deploiement/page.tsx
// "use client"

// import * as React from "react"
// import { useRouter, useSearchParams } from "next/navigation"
// import { SidebarInset, SidebarTrigger } from "@/components/ui/sidebar"
// import { Separator } from "@/components/ui/separator"
// import { Button }    from "@/components/ui/button"
// import { Stepper }   from "@/components/deploy/stepper"
// import { useDeploymentTunnel, clearDraft } from "@/lib/hooks/useDeployments"
// import type { DeploymentDTO } from "@/lib/types"
// import { Check, Loader2 } from "lucide-react"
// import { cn } from "@/lib/utils"

// // ─── Constantes ───────────────────────────────────────────────────────────────

// const STEPS = [
//   { id: 1, label: "Sélection du plan" },
//   { id: 2, label: "Configuration"     },
//   { id: 3, label: "Récapitulatif"     },
//   { id: 4, label: "Déploiement"       },
// ]

// const UI_STEPS = [
//   { id: 1, label: "Commande validée",        description: "Ressources allouées dans le datacenter"     },
//   { id: 2, label: "Création de la VM",       description: "Hyperviseur KVM — Allocation vCPU & RAM"    },
//   { id: 3, label: "Installation de l'OS",    description: "Image officielle montée sur le volume NVMe" },
//   { id: 4, label: "Configuration réseau",    description: "VPC, IP privée, groupe de sécurité"         },
//   { id: 5, label: "Activation des services", description: "Backup, Monitoring, SSH Keys"               },
// ]

// // Mapping statut Java → étape UI
// // EN_LIGNE = 6 > UI_STEPS.length → Math.min() cochera toutes les étapes
// const STATUS_TO_STEP: Record<string, number> = {
//   EN_ATTENTE:      1,
//   PROVISIONNEMENT: 2,
//   EN_LIGNE:        6,
//   ECHEC:           -1,
// }

// // ─── StepRow ─────────────────────────────────────────────────────────────────

// function StepRow({ step, currentStep }: { step: typeof UI_STEPS[0]; currentStep: number }) {
//   const done   = step.id < currentStep
//   const active = step.id === currentStep

//   return (
//     <div className={cn(
//       "flex items-center gap-4 px-5 py-4 border-b border-border/60 last:border-0 transition-colors",
//       active && "bg-muted/30"
//     )}>
//       <div className={cn(
//         "w-8 h-8 rounded-full flex items-center justify-center shrink-0 border text-[12px] font-semibold",
//         (done || active)
//           ? "bg-foreground border-foreground text-background"
//           : "bg-background border-border text-muted-foreground"
//       )}>
//         {done   ? <Check   className="w-3.5 h-3.5" />            :
//          active ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> :
//          step.id}
//       </div>
//       <div className="flex-1">
//         <p className={cn(
//           "text-[13px] font-medium",
//           (done || active) ? "text-foreground" : "text-muted-foreground"
//         )}>
//           {step.label}
//         </p>
//         <p className="text-[11px] text-muted-foreground mt-0.5">{step.description}</p>
//       </div>
//     </div>
//   )
// }

// // ─── Page ────────────────────────────────────────────────────────────────────

// export default function DeploiementPage() {
//   const router       = useRouter()
//   const searchParams = useSearchParams()

//   const { provision, pollUntilRunning } = useDeploymentTunnel()

//   const [deployment,  setDeployment]  = React.useState<DeploymentDTO | null>(null)
//   const [currentStep, setCurrentStep] = React.useState(1)
//   const [done,        setDone]        = React.useState(false)
//   const [errorMsg,    setErrorMsg]    = React.useState<string | null>(null)

//   // On lit id ET retry depuis searchParams pour que le useEffect se relance
//   // quand l'utilisateur clique "Réessayer" (retry change → nouvelle dépendance)
//   const idParam    = searchParams.get("id")
//   const retryParam = searchParams.get("retry")  // ignoré dans le corps, sert juste de déclencheur

//   React.useEffect(() => {
//     // C4b — guard robuste : id manquant, NaN ou ≤ 0
//     const id = Number(idParam)
//     if (!idParam || isNaN(id) || id <= 0) {
//       setErrorMsg("Identifiant de déploiement invalide")
//       return
//     }

//     // Reset de l'état à chaque exécution (important pour le retry)
//     setErrorMsg(null)
//     setDone(false)
//     setCurrentStep(1)

//     const run = async () => {
//       try {
//         await provision(id)
//         setCurrentStep(2)

//         await pollUntilRunning(id, (d) => {
//           setDeployment(d)

//           // C4 — ECHEC intercepté dans le callback avant Math.min
//           if (d.status === "ECHEC") {
//             setErrorMsg("Le provisionnement a échoué côté serveur")
//             return
//           }
//           const step = STATUS_TO_STEP[d.status] ?? 2
//           setCurrentStep(Math.min(step, UI_STEPS.length + 1))
//         })

//         setCurrentStep(UI_STEPS.length + 1)
//         setDone(true)
//         clearDraft()  // nettoyage du draft après succès complet

//       } catch (e: any) {
//         const msg: string = e?.message ?? "Erreur lors du provisionnement"
//         setErrorMsg(
//           msg.toLowerCase().includes("timeout")
//             ? "Le provisionnement dépasse le délai maximum (5 min). Contactez le support."
//             : msg
//         )
//       }
//     }

//     run()
//   // retryParam dans les deps : quand l'URL change avec &retry=..., useEffect se relance
//   }, [idParam, retryParam]) // eslint-disable-line react-hooks/exhaustive-deps

//   const displayName = deployment?.resourceName ?? "Votre service"

//   // ── Rendu ────────────────────────────────────────────────────────────────────

//   return (
//     <SidebarInset>
//       <header className="flex h-14 items-center border-b border-border/60 px-5 bg-background/95 backdrop-blur sticky top-0 z-10">
//         <SidebarTrigger className="-ml-1 size-8 text-muted-foreground hover:text-foreground hover:bg-muted rounded-md transition-colors" />
//         <Separator orientation="vertical" className="h-4 opacity-40 mx-3" />
//         <span className="text-[13px] font-medium mx-auto">
//           {done     ? "Déploiement terminé ✓"  :
//            errorMsg ? "Échec du déploiement"   :
//            "Déploiement en cours…"}
//         </span>
//       </header>

//       <div className="border-b border-border/60 px-5 py-3 bg-background">
//         <Stepper steps={STEPS} current={4} />
//       </div>

//       <div className="flex flex-col items-center pt-14 px-6 min-h-[calc(100vh-112px)]">

//         {/* Icône centrale */}
//         <div className={cn(
//           "w-20 h-20 rounded-full border-2 flex items-center justify-center text-3xl mb-6 transition-all duration-500",
//           done     && "border-foreground",
//           errorMsg && "border-red-300",
//           !done && !errorMsg && "border-border"
//         )}>
//           {done      ? "✅" :
//            errorMsg  ? "❌" :
//            <span className="animate-pulse">🚀</span>}
//         </div>

//         {/* Titre */}
//         <h1 className="text-2xl font-semibold tracking-tight mb-2">
//           {done     ? "Votre service est prêt !"  :
//            errorMsg ? "Échec du provisionnement"  :
//            "Déploiement en cours…"}
//         </h1>

//         {/* Sous-titre */}
//         <p className="text-[13px] text-muted-foreground text-center max-w-xs leading-relaxed mb-8">
//           {done
//             ? `${displayName} est opérationnel et accessible.`
//             : errorMsg
//             ? errorMsg
//             : "Votre VM est en cours de provisionnement. Cela prend généralement entre 2 et 4 minutes."}
//         </p>

//         {/* Étapes — masquées en cas d'erreur */}
//         {!errorMsg && (
//           <div className="w-full max-w-md border border-border rounded-2xl overflow-hidden bg-card mb-6">
//             {UI_STEPS.map(step => (
//               <StepRow key={step.id} step={step} currentStep={currentStep} />
//             ))}
//           </div>
//         )}

//         {/* Mention polling */}
//         {!done && !errorMsg && (
//           <p className="text-[12px] text-muted-foreground font-mono">
//             ⏱ Vérification toutes les 3 secondes…
//           </p>
//         )}

//         {/* Bouton succès */}
//         {done && (
//           <Button
//             className="h-9 text-[13px] font-medium px-6"
//             onClick={() => router.push("/dashboard")}
//           >
//             Accéder au Dashboard →
//           </Button>
//         )}

//         {/* Boutons erreur — UN SEUL bloc, pas de doublon */}
//         {errorMsg && (
//           <div className="flex gap-3">
//             <Button
//               variant="outline"
//               className="h-9 text-[13px]"
//               onClick={() => router.back()}
//             >
//               ← Retour
//             </Button>
//             <Button
//               variant="outline"
//               className="h-9 text-[13px]"
//               onClick={() => {
//                 // Relance le useEffect en ajoutant retry dans l'URL
//                 router.replace(
//                   `/dashboard/services/deploy/deploiement?id=${idParam}&retry=${Date.now()}`
//                 )
//               }}
//             >
//               Réessayer
//             </Button>
//             <Button
//               className="h-9 text-[13px]"
//               onClick={() => router.push("/dashboard")}
//             >
//               Dashboard
//             </Button>
//           </div>
//         )}

//       </div>
//     </SidebarInset>
//   )
// }
// app/dashboard/services/deploy/deploiement/page.tsx
"use client"

import * as React from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { SidebarInset, SidebarTrigger } from "@/components/ui/sidebar"
import { Separator } from "@/components/ui/separator"
import { Button }    from "@/components/ui/button"
import { Stepper }   from "@/components/deploy/stepper"
import { useDeploymentTunnel, clearDraft } from "@/lib/hooks/useDeployments"
import { PasswordDialog } from "@/components/vms/PasswordDialog"
import type { DeploymentDTO } from "@/lib/types"
import { Check, Loader2 } from "lucide-react"
import { cn } from "@/lib/utils"

const STEPS = [
  { id: 1, label: "Sélection du plan" },
  { id: 2, label: "Configuration"     },
  { id: 3, label: "Récapitulatif"     },
  { id: 4, label: "Déploiement"       },
]

const UI_STEPS = [
  { id: 1, label: "Commande validée",        description: "Ressources allouées dans le datacenter"     },
  { id: 2, label: "Création de la VM",       description: "Hyperviseur KVM — Allocation vCPU & RAM"    },
  { id: 3, label: "Installation de l'OS",    description: "Image officielle montée sur le volume NVMe" },
  { id: 4, label: "Configuration réseau",    description: "VPC, IP privée, groupe de sécurité"         },
  { id: 5, label: "Activation des services", description: "Backup, Monitoring, SSH Keys"               },
]

const STATUS_TO_STEP: Record<string, number> = {
  EN_ATTENTE:      1,
  PROVISIONNEMENT: 2,
  EN_LIGNE:        6,
  ECHEC:           -1,
}

function StepRow({ step, currentStep }: { step: typeof UI_STEPS[0]; currentStep: number }) {
  const done   = step.id < currentStep
  const active = step.id === currentStep

  return (
    <div className={cn(
      "flex items-center gap-4 px-5 py-4 border-b border-border/60 last:border-0 transition-colors",
      active && "bg-muted/30"
    )}>
      <div className={cn(
        "w-8 h-8 rounded-full flex items-center justify-center shrink-0 border text-[12px] font-semibold",
        (done || active)
          ? "bg-foreground border-foreground text-background"
          : "bg-background border-border text-muted-foreground"
      )}>
        {done   ? <Check   className="w-3.5 h-3.5" />             :
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

export default function DeploiementPage() {
  const router       = useRouter()
  const searchParams = useSearchParams()

  // ✅ Récupérer vmPassword et vmName du hook
  const {
    provision, pollUntilRunning,
    vmPassword, vmName, clearVmPassword
  } = useDeploymentTunnel()

  const [deployment,  setDeployment]  = React.useState<DeploymentDTO | null>(null)
  const [currentStep, setCurrentStep] = React.useState(1)
  const [done,        setDone]        = React.useState(false)
  const [errorMsg,    setErrorMsg]    = React.useState<string | null>(null)

  const idParam    = searchParams.get("id")
  const retryParam = searchParams.get("retry")

  React.useEffect(() => {
    const id = Number(idParam)
    if (!idParam || isNaN(id) || id <= 0) {
      setErrorMsg("Identifiant de déploiement invalide")
      return
    }

    setErrorMsg(null)
    setDone(false)
    setCurrentStep(1)
    clearVmPassword() // ✅ reset password dialog au retry

    const run = async () => {
      try {
        await provision(id)
        setCurrentStep(2)

        await pollUntilRunning(id, (d) => {
          setDeployment(d)
          if (d.status === "ECHEC") {
            setErrorMsg("Le provisionnement a échoué côté serveur")
            return
          }
          const step = STATUS_TO_STEP[d.status] ?? 2
          setCurrentStep(Math.min(step, UI_STEPS.length + 1))
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

  const displayName = deployment?.resourceName ?? "Votre service"

  return (
    <SidebarInset>
      {/* ✅ Dialog password — s'affiche automatiquement quand VM prête */}
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
        <span className="text-[13px] font-medium mx-auto">
          {done     ? "Déploiement terminé ✓"  :
           errorMsg ? "Échec du déploiement"   :
           "Déploiement en cours…"}
        </span>
      </header>

      <div className="border-b border-border/60 px-5 py-3 bg-background">
        <Stepper steps={STEPS} current={4} />
      </div>

      <div className="flex flex-col items-center pt-14 px-6 min-h-[calc(100vh-112px)]">

        <div className={cn(
          "w-20 h-20 rounded-full border-2 flex items-center justify-center text-3xl mb-6 transition-all duration-500",
          done     && "border-foreground",
          errorMsg && "border-red-300",
          !done && !errorMsg && "border-border"
        )}>
          {done      ? "✅" :
           errorMsg  ? "❌" :
           <span className="animate-pulse">🚀</span>}
        </div>

        <h1 className="text-2xl font-semibold tracking-tight mb-2">
          {done     ? "Votre service est prêt !"  :
           errorMsg ? "Échec du provisionnement"  :
           "Déploiement en cours…"}
        </h1>

        <p className="text-[13px] text-muted-foreground text-center max-w-xs leading-relaxed mb-8">
          {done
            ? `${displayName} est opérationnel. Vos identifiants de connexion sont affichés ci-dessus.`
            : errorMsg
            ? errorMsg
            : "Votre VM est en cours de provisionnement. Cela prend généralement entre 2 et 4 minutes."}
        </p>

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
              onClick={() => router.push("/vms")}
            >
              Voir mes VMs
            </Button>
            <Button
              className="h-9 text-[13px] font-medium px-6"
              onClick={() => router.push("/dashboard")}
            >
              Accéder au Dashboard →
            </Button>
          </div>
        )}

        {errorMsg && (
          <div className="flex gap-3">
            <Button
              variant="outline"
              className="h-9 text-[13px]"
              onClick={() => router.back()}
            >
              ← Retour
            </Button>
            <Button
              variant="outline"
              className="h-9 text-[13px]"
              onClick={() => {
                router.replace(
                  `/dashboard/services/deploy/deploiement?id=${idParam}&retry=${Date.now()}`
                )
              }}
            >
              Réessayer
            </Button>
            <Button
              className="h-9 text-[13px]"
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