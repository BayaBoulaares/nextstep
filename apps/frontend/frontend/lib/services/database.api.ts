import { apiFetch } from "@/lib/api"
import type { DatabaseResourceResponse, DatabaseCredentials } from "@/lib/types"

const BASE = "/api/deployments"

export async function getDatabaseResource(
  deploymentId: number
): Promise<DatabaseResourceResponse> {
  return apiFetch(`${BASE}/${deploymentId}/database-resource`)
}

export async function getDatabaseCredentials(
  deploymentId: number
): Promise<DatabaseCredentials> {
  return apiFetch(`${BASE}/${deploymentId}/database-credentials`)
}

export async function deleteDatabaseResource(
  deploymentId: number
): Promise<void> {
  return apiFetch(`${BASE}/${deploymentId}/database`, { method: "DELETE" })
}