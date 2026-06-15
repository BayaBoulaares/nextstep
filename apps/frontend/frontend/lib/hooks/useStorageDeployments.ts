// @/lib/hooks/useStorageDeployments.ts

import * as React from "react"
import { apiFetch } from "@/lib/apiClient"
import { getStorageResource } from "@/lib/services/storage.api"
import type { StorageResourceResponse, StorageType } from "@/lib/types"
// ── Normalisation STOCKAGE → OBJECT_STORAGE ───────────────────────────────────

function normalizeStorageType(type: string): StorageType {
  if (type === "STOCKAGE") return "OBJECT_STORAGE"
  return type as StorageType
}

function normalizeStorageResource(
  raw: StorageResourceResponse
): StorageResourceResponse {
  return {
    ...raw,
    storageType: normalizeStorageType(raw.storageType as string),
  }
}
// ── Type ──────────────────────────────────────────────────────────────────────

export interface StorageDeployment {
  deploymentId: number
  resourceName: string
  categoryName: string
  planName: string | null
  monthlyPriceHt: number | null
  createdAt: string | null
  deploymentStatus: string
  storage: StorageResourceResponse | null
  storageType: StorageType | null

}

// ── Hook ──────────────────────────────────────────────────────────────────────

export function useStorageDeployments() {
  const [items, setItems] = React.useState<StorageDeployment[]>([])
  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState<string | null>(null)

  const load = React.useCallback(async () => {
    setLoading(true)
    setError(null)

    try {
      // 1. Récupérer tous les déploiements de l'utilisateur
      const deployments = await apiFetch<any[]>("/api/deployments/user/me")

      // 2. Filtrer les déploiements de type stockage non supprimés/arrêtés
      const storageDeps = deployments.filter(d =>
        ["STOCKAGE", "OBJECT_STORAGE", "BLOCK_STORAGE", "FILE_STORAGE"]
          .includes(d.categoryName ?? "")
        && d.status !== "SUPPRIME"
        && d.status !== "ARRETE"
      )

      // 3. Pour chaque déploiement, récupérer la StorageResource
      const results = await Promise.all(
        storageDeps.map(async (d): Promise<StorageDeployment> => {
          let storage: StorageResourceResponse | null = null

          try {
            storage = await getStorageResource(d.id)

            // Ignorer les ressources supprimées
            if (storage?.status === "DELETED") {
              storage = null
            }

          } catch (e: any) {
            // 404 = pas encore provisionné → storage reste null
            // 405 ou autre = log et on continue
            if (!e.message?.includes("404")) {
              console.warn(`[STORAGE] deploymentId=${d.id}:`, e.message)
            }
          }

          return {
            deploymentId: d.id,
            resourceName: d.resourceName,
            categoryName: d.categoryName ?? "",
            planName: d.planName,
            monthlyPriceHt: d.monthlyPriceHt,
            createdAt: d.createdAt,
            deploymentStatus: d.status,
            storage: storage ? normalizeStorageResource(storage) : null,
            // ← dériver le type depuis la catégorie si storage pas encore là
            storageType: storage
              ? normalizeStorageType(storage.storageType as string)
              : normalizeStorageType(d.categoryName ?? ""),
          }
        })
      )

      setItems(results)

    } catch (e: any) {
      setError(e.message ?? "Impossible de charger les ressources de stockage.")
    } finally {
      setLoading(false)
    }
  }, [])

  React.useEffect(() => { load() }, [load])

  return { items, loading, error, refetch: load }
}