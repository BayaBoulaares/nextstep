"use client"

import * as React from "react"
import { useSession } from "next-auth/react"
import { getDeploymentsByUser }    from "@/lib/services/deployments.api"
import {  getAllServices } from "@/lib/services/cloud-services.api"

// ── Hook générique ────────────────────────────────────────────────────────────

export function useApi<T>(
  fetcher: () => Promise<T>,
  deps: React.DependencyList = []
) {
  const [data,    setData]    = React.useState<T | null>(null)
  const [loading, setLoading] = React.useState(true)
  const [error,   setError]   = React.useState<string | null>(null)

  const load = React.useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      setData(await fetcher())
    } catch (e: any) {
      setError(e.message ?? "Erreur inconnue")
    } finally {
      setLoading(false)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps)

  React.useEffect(() => { load() }, [load])

  return { data, loading, error, reload: load }
}

// ── Hook : services actifs de l'utilisateur (dashboard) ──────────────────────

export function useUserDeployments() {
  const { data: session } = useSession()
  const userId = (session as any)?.userId as string | undefined

  return useApi(
    () => userId
      ? getDeploymentsByUser(userId)
      : Promise.resolve([]),
    [userId]
  )
}

// ── Hook : services d'un type de cloud (page détail) ─────────────────────────



// ── Hook : tous les services (catalogue) ─────────────────────────────────────

export function useAllServices() {
  return useApi(getAllServices)
}
// Ajouter dans useApi.ts

import { getMyInvoices, getInvoiceLines } from "@/lib/services/billing.api"
import type { InvoiceResponse, InvoiceLineDTO } from "@/lib/types"

// Dans useApi.ts — remplacer useMyInvoices

export function useMyInvoices() {
  const { data: session } = useSession()

  // Essayer plusieurs sources pour l'userId
  const userId = React.useMemo(() => {
    const s = session as any
    // Source 1 : userId exposé explicitement
    if (s?.userId) return s.userId as string
    // Source 2 : sub du token JWT décodé
    if (s?.accessToken) {
      try {
        const payload = JSON.parse(
          atob(s.accessToken.split('.')[1].replace(/-/g, '+').replace(/_/g, '/'))
        )
        return payload.sub as string
      } catch { /* ignore */ }
    }
    return undefined
  }, [session])

  // Log temporaire pour déboguer
  React.useEffect(() => {
    console.log('[billing] userId résolu:', userId)
  }, [userId])

  return useApi<InvoiceResponse[]>(
    () => userId ? getMyInvoices(userId) : Promise.resolve([]),
    [userId]
  )
}

export function useInvoiceLines(invoiceId: number | null) {
  return useApi<InvoiceLineDTO[]>(
    () => invoiceId ? getInvoiceLines(invoiceId) : Promise.resolve([]),
    [invoiceId]
  )
}