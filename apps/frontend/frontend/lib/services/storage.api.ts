// lib/services/storage.api.ts

import { apiFetch } from "@/lib/apiClient"
import type { StorageProvisionRequest, StorageResponse } from "@/lib/types"

const BASE = "/api/storage"

export async function provisionStorage(
  req: StorageProvisionRequest
): Promise<StorageResponse> {
  return apiFetch(`${BASE}/provision`, {
    method: "POST",
    body: JSON.stringify(req),
  })
}

export async function getStorage(id: number): Promise<StorageResponse> {
  return apiFetch(`${BASE}/${id}`)
}

export async function getMesStorages(): Promise<StorageResponse[]> {
  return apiFetch(`${BASE}/me`)
}

export async function deleteStorage(id: number): Promise<void> {
  return apiFetch(`${BASE}/${id}`, { method: "DELETE" })
}