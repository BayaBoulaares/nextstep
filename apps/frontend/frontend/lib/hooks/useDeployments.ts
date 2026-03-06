"use client"

import * as React from "react"
import { useSession } from "next-auth/react"
import {
  createDeployment,
  startProvisioning,
} from "@/lib/services/deployments.api"
import type { DeploymentRequest, DeploymentDTO } from "@/lib/types"

// ── Type draft étendu ─────────────────────────────────────────────────────────
// DeploymentRequest.java n'a pas serviceId (userId dans l'URL)
// On l'ajoute uniquement dans le draft sessionStorage pour navigation entre étapes

export interface DeploymentDraft extends Partial<DeploymentRequest> {
  serviceId?: number   // ← stocké dans le draft, pas envoyé au backend
}

// ── Store sessionStorage ──────────────────────────────────────────────────────

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

// ── Hook tunnel ───────────────────────────────────────────────────────────────

export function useDeploymentTunnel() {
  const { data: session } = useSession()
  //const userId = session?.user?.id   // ✅ session.user.id (auth.ts → session.user.id = token.sub)
  const userId = session?.user?.id
  const [deployment, setDeployment] = React.useState<DeploymentDTO | null>(null)
  const [loading,    setLoading]    = React.useState(false)
  const [error,      setError]      = React.useState<string | null>(null)

  const confirm = React.useCallback(async (request: DeploymentRequest) => {
    if (!userId) throw new Error("Non authentifié")
    setLoading(true)
    setError(null)
    try {
      const d = await createDeployment(userId, request)
      setDeployment(d)
      clearDraft()
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
    } finally {
      setLoading(false)
    }
  }, [])

  const pollUntilRunning = React.useCallback(async (
    id: number,
    onStep: (d: DeploymentDTO) => void,
    maxMs = 300_000
  ) => {
    const start = Date.now()
    return new Promise<DeploymentDTO>((resolve, reject) => {
      const tick = async () => {
        try {
          const { getDeploymentById } = await import("@/lib/services/deployments.api")
          const d = await getDeploymentById(id)
          onStep(d)
          if (d.status === "EN_LIGNE") return resolve(d)
          if (d.status === "ECHEC")   return reject(new Error("Provisionnement échoué"))
          if (Date.now() - start > maxMs) return reject(new Error("Timeout"))
          setTimeout(tick, 3000)
        } catch (e) { reject(e) }
      }
      tick()
    })
  }, [])

  return { deployment, loading, error, confirm, provision, pollUntilRunning }
}