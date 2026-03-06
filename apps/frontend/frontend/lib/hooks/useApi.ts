"use client"

import * as React from "react"
import { useSession } from "next-auth/react"
import { getDeploymentsByUser }    from "@/lib/services/deployments.api"
import { getServicesByCloudType, getAllServices } from "@/lib/services/cloud-services.api"
import type { CloudType } from "@/lib/types"

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

export function useServicesByCloud(cloudType: CloudType) {
  return useApi(
    () => getServicesByCloudType(cloudType),
    [cloudType]
  )
}

// ── Hook : tous les services (catalogue) ─────────────────────────────────────

export function useAllServices() {
  return useApi(getAllServices)
}