// // lib/hooks/useDeployments.ts
// "use client"

// import * as React from "react"
// import { useSession } from "next-auth/react"
// import {
//   createDeployment,
//   startProvisioning,
// } from "@/lib/services/deployments.api"
// import type { DeploymentRequest, DeploymentDTO } from "@/lib/types"

// // ── Type draft ────────────────────────────────────────────────────────────────

// export interface DeploymentDraft extends Partial<DeploymentRequest> {
//   serviceId?: number   // stocké dans le draft, jamais envoyé au backend
// }

// // ── SessionStorage ────────────────────────────────────────────────────────────

// const KEY = "deploy_draft"

// export function saveDraft(req: DeploymentDraft) {
//   sessionStorage.setItem(KEY, JSON.stringify(req))
// }

// export function loadDraft(): DeploymentDraft | null {
//   try {
//     const raw = sessionStorage.getItem(KEY)
//     return raw ? JSON.parse(raw) : null
//   } catch { return null }
// }

// export function clearDraft() {
//   sessionStorage.removeItem(KEY)
// }

// // ── Hook ──────────────────────────────────────────────────────────────────────

// export function useDeploymentTunnel() {
//   const { data: session } = useSession()
//   const userId = session?.user?.id

//   const [deployment, setDeployment] = React.useState<DeploymentDTO | null>(null)
//   const [loading,    setLoading]    = React.useState(false)
//   const [error,      setError]      = React.useState<string | null>(null)

//   // ── confirm : crée le déploiement côté backend ────────────────────────────
//   const confirm = React.useCallback(async (request: DeploymentRequest) => {
//     if (!userId) throw new Error("Non authentifié")
//     setLoading(true)
//     setError(null)
//     try {
//       const d = await createDeployment(userId, request)
//       setDeployment(d)
//       // clearDraft() intentionnellement absent ici :
//       // le draft est nettoyé par deploiement/page après succès du provisionnement,
//       // pas dès la création — en cas d'échec du provisionnement, le draft reste disponible.
//       return d
//     } catch (e: any) {
//       setError(e.message)
//       throw e
//     } finally {
//       setLoading(false)
//     }
//   }, [userId])

//   // ── provision : déclenche le provisionnement OpenShift ────────────────────
//   // CORRECTION : ajout du bloc catch pour remettre loading=false en cas d'erreur
//   const provision = React.useCallback(async (id: number) => {
//     setLoading(true)
//     try {
//       const d = await startProvisioning(id)
//       setDeployment(d)
//       return d
//     } catch (e: any) {
//       setError(e.message)
//       throw e           // re-throw pour que deploiement/page puisse catch
//     } finally {
//       setLoading(false) // garanti même en cas d'erreur
//     }
//   }, [])

//   // ── pollUntilRunning : poll toutes les 3s jusqu'à EN_LIGNE ou ECHEC ───────
//   const pollUntilRunning = React.useCallback(async (
//     id: number,
//     onStep: (d: DeploymentDTO) => void,
//     maxMs = 300_000   // 5 minutes
//   ) => {
//     const start = Date.now()
//     return new Promise<DeploymentDTO>((resolve, reject) => {
//       const tick = async () => {
//         try {
//           const { getDeploymentById } = await import("@/lib/services/deployments.api")
//           const d = await getDeploymentById(id)
//           onStep(d)
//           if (d.status === "EN_LIGNE") return resolve(d)
//           if (d.status === "ECHEC")   return reject(new Error("Provisionnement échoué"))
//           if (Date.now() - start > maxMs) return reject(new Error("Timeout"))
//           setTimeout(tick, 3000)
//         } catch (e) {
//           reject(e)
//         }
//       }
//       tick()
//     })
//   }, [])

//   return { deployment, loading, error, confirm, provision, pollUntilRunning }
// }
// lib/hooks/useDeployments.ts
"use client"

import * as React from "react"
import { useSession } from "next-auth/react"
import {
  createDeployment,
  startProvisioning,
} from "@/lib/services/deployments.api"
import type { DeploymentRequest, DeploymentDTO } from "@/lib/types"

export interface DeploymentDraft extends Partial<DeploymentRequest> {
  serviceId?: number
}

// ✅ Réponse enrichie du polling avec vmPassword
export interface DeploymentPollResult extends DeploymentDTO {
  vmPassword?: string
}

const KEY = "deploy_draft"

export function saveDraft(req: DeploymentDraft) {
  sessionStorage.setItem(KEY, JSON.stringify(req))
}

export function loadDraft(): DeploymentDraft | null {
  try {
    const raw = sessionStorage.getItem(KEY)
    return raw ? JSON.parse(raw) : null
  } catch { return null }
}

export function clearDraft() {
  sessionStorage.removeItem(KEY)
}

export function useDeploymentTunnel() {
  const { data: session } = useSession()
  const userId = session?.user?.id

  const [deployment,   setDeployment]   = React.useState<DeploymentDTO | null>(null)
  const [loading,      setLoading]      = React.useState(false)
  const [error,        setError]        = React.useState<string | null>(null)
  // ✅ Stocker le password reçu après provisionnement
  const [vmPassword,   setVmPassword]   = React.useState<string | null>(null)
  const [vmName,       setVmName]       = React.useState<string | null>(null)

  const confirm = React.useCallback(async (request: DeploymentRequest) => {
    if (!userId) throw new Error("Non authentifié")
    setLoading(true)
    setError(null)
    try {
      const d = await createDeployment(userId, request)
      setDeployment(d)
      return d
    } catch (e: any) {
      setError(e.message)
      throw e
    } finally {
      setLoading(false)
    }
  }, [userId])

  const provision = React.useCallback(async (id: number) => {
    setLoading(true)
    try {
      const d = await startProvisioning(id)
      setDeployment(d)
      return d
    } catch (e: any) {
      setError(e.message)
      throw e
    } finally {
      setLoading(false)
    }
  }, [])

  const pollUntilRunning = React.useCallback(async (
    id: number,
    onStep: (d: DeploymentPollResult) => void,
    maxMs = 300_000
  ) => {
    const start = Date.now()
    return new Promise<DeploymentPollResult>((resolve, reject) => {
      const tick = async () => {
        try {
          const { getDeploymentById } = await import("@/lib/services/deployments.api")

          // ✅ getDeploymentById retourne maintenant vmPassword aussi
          const d = await getDeploymentById(id) as DeploymentPollResult
          onStep(d)

          if (d.status === "EN_LIGNE") {
            // ✅ Sauvegarder le password pour l'afficher dans le PasswordDialog
            if (d.vmPassword) {
              setVmPassword(d.vmPassword)
              setVmName(d.resourceName ?? null)
            }
            return resolve(d)
          }

          if (d.status === "ECHEC")
            return reject(new Error("Provisionnement échoué"))

          if (Date.now() - start > maxMs)
            return reject(new Error("Timeout"))

          setTimeout(tick, 3000)
        } catch (e) {
          reject(e)
        }
      }
      tick()
    })
  }, [])

  // ✅ Réinitialiser le password après affichage
  const clearVmPassword = React.useCallback(() => {
    setVmPassword(null)
    setVmName(null)
  }, [])

  return {
    deployment, loading, error,
    confirm, provision, pollUntilRunning,
    vmPassword, vmName, clearVmPassword  // ✅ exposés pour le PasswordDialog
  }
}