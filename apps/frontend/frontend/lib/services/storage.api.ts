// @/lib/services/storage.api.ts
// Appels API pour les ressources de stockage (Object / Block / File).

import { apiFetch } from "@/lib/apiClient"
import type { StorageResourceResponse, StorageCredentials } from "@/lib/types"

// ── Récupérer la StorageResource liée à un déploiement ────────────────────────

export async function getStorageResource(
  deploymentId: number
): Promise<StorageResourceResponse> {
  return apiFetch<StorageResourceResponse>(
    `/api/deployments/${deploymentId}/storage-resource`  // ← corrigé
  )
}

// ── Récupérer les credentials S3 (Object Storage uniquement) ─────────────────

export async function getStorageCredentials(
  deploymentId: number
): Promise<StorageCredentials> {
  return apiFetch<StorageCredentials>(
    `/api/deployments/${deploymentId}/storage-credentials`
  )
}

// ── Supprimer une ressource de stockage ───────────────────────────────────────

export async function deleteStorageResource(
  deploymentId: number
): Promise<void> {
  return apiFetch<void>(
    `/api/deployments/${deploymentId}/storage`,  // DELETE reste sur /storage
    { method: "DELETE" }
  )
}

// ── Polling du statut jusqu'à READY ou FAILED ────────────────────────────────

export async function pollStorageUntilReady(
  deploymentId: number,
  onUpdate: (status: StorageResourceResponse) => void,
  options: { intervalMs?: number; timeoutMs?: number } = {}
): Promise<StorageResourceResponse> {
  const { intervalMs = 3000, timeoutMs = 300_000 } = options
  const deadline = Date.now() + timeoutMs

  while (Date.now() < deadline) {
    const resource = await getStorageResource(deploymentId)
    onUpdate(resource)

    if (resource.status === "READY" || resource.status === "FAILED") {
      return resource
    }

    await new Promise(resolve => setTimeout(resolve, intervalMs))
  }

  throw new Error(
    "Le provisionnement du stockage dépasse le délai maximum (5 min). Contactez le support."
  )
}

// ── Lister les objets du bucket ───────────────────────────────────────────────
export async function listObjects(
  deploymentId: number
): Promise<{ key: string; size: number; lastModified: string }[]> {
  return apiFetch(
    `/api/storage/${deploymentId}/objects`
  )
}
// ── Uploader un fichier ───────────────────────────────────────────────────────
export async function uploadObject(
  deploymentId: number,
  file: File
): Promise<{ key: string; bucket: string; size: number }> {
  const formData = new FormData()
  formData.append("file", file)

  return apiFetch(`/api/storage/${deploymentId}/upload`, {
    method: "POST",
    body: formData,
    // Ne pas mettre Content-Type → le navigateur le gère avec boundary
  })
}
// ── Télécharger un fichier ────────────────────────────────────────────────────
export function getDownloadUrl(deploymentId: number, key: string): string {
  return `/api/storage/${deploymentId}/download/${encodeURIComponent(key)}`
}

// ── Supprimer un objet ────────────────────────────────────────────────────────
export async function deleteObject(
  deploymentId: number,
  key: string
): Promise<void> {
  return apiFetch(`/api/storage/${deploymentId}/objects/${encodeURIComponent(key)}`, {
    method: "DELETE",
  })
}
