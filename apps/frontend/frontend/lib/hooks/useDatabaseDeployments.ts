// @/lib/hooks/useDatabaseDeployments.ts

import * as React from "react"
import { apiFetch } from "@/lib/apiClient"
import { getDatabaseResource } from "@/lib/services/database.api"
import type { DatabaseResourceResponse, DatabaseStatus } from "@/lib/types"

// ── Normalisation BASE_DONNEES ────────────────────────────────────────────────

function normalizeDatabaseStatus(status: string): DatabaseStatus {
  const valid: DatabaseStatus[] = [
    "PROVISIONING", "READY", "FAILED", "DELETING", "DELETED",
  ]
  return valid.includes(status as DatabaseStatus)
    ? (status as DatabaseStatus)
    : "PROVISIONING"
}

function normalizeDatabaseResource(
  raw: DatabaseResourceResponse
): DatabaseResourceResponse {
  return {
    ...raw,
    status: normalizeDatabaseStatus(raw.status as string),
  }
}

// ── Type ──────────────────────────────────────────────────────────────────────

export interface DatabaseDeployment {
  deploymentId:     number
  resourceName:     string
  categoryName:     string
  planName:         string | null
  monthlyPriceHt:   number | null
  createdAt:        string | null
  deploymentStatus: string
  database:         DatabaseResourceResponse | null
}

// ── Hook ──────────────────────────────────────────────────────────────────────

export function useDatabaseDeployments() {
  const [items,   setItems]   = React.useState<DatabaseDeployment[]>([])
  const [loading, setLoading] = React.useState(true)
  const [error,   setError]   = React.useState<string | null>(null)

  const load = React.useCallback(async () => {
    setLoading(true)
    setError(null)

    try {
      // 1. Récupérer tous les déploiements de l'utilisateur
      const deployments = await apiFetch<any[]>("/api/deployments/user/me")

      // 2. Filtrer les déploiements BASE_DONNEES non supprimés/arrêtés
      const dbDeps = deployments.filter(d =>
        d.categoryName === "BASE_DONNEES"
        && d.status !== "SUPPRIME"
        && d.status !== "ARRETE"
      )

      // 3. Pour chaque déploiement, récupérer la DatabaseResource
      const results = await Promise.all(
        dbDeps.map(async (d): Promise<DatabaseDeployment> => {
          let database: DatabaseResourceResponse | null = null

          try {
            const raw = await getDatabaseResource(d.id)
            const normalized = normalizeDatabaseResource(raw)

            // Ignorer les ressources supprimées
            if (normalized.status === "DELETED") {
              database = null
            } else {
              database = normalized
            }

          } catch (e: any) {
            // 404 = pas encore provisionné → database reste null
            if (!e.message?.includes("404")) {
              console.warn(`[DATABASE] deploymentId=${d.id}:`, e.message)
            }
          }

          return {
            deploymentId:     d.id,
            resourceName:     d.resourceName,
            categoryName:     d.categoryName ?? "",
            planName:         d.planName,
            monthlyPriceHt:   d.monthlyPriceHt,
            createdAt:        d.createdAt,
            deploymentStatus: d.status,
            database,
          }
        })
      )

      setItems(results)

    } catch (e: any) {
      setError(e.message ?? "Impossible de charger les bases de données.")
    } finally {
      setLoading(false)
    }
  }, [])

  React.useEffect(() => { load() }, [load])

  return { items, loading, error, refetch: load }
}