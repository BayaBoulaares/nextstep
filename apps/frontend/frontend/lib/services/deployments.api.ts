// lib/services/deployments.api.ts
import { apiFetch } from "@/lib/apiClient"
import type { DeploymentDTO, DeploymentRequest, DeploymentStatus } from "@/lib/types"

// ── Lecture ───────────────────────────────────────────────────────────────────

export const getDeploymentsByUser = (userId: string) =>
  apiFetch<DeploymentDTO[]>(`/api/deployments/user/${userId}`)

export const getDeploymentById = (id: number) =>
  apiFetch<DeploymentDTO>(`/api/deployments/${id}`)

export const getAllDeployments = () =>
  apiFetch<DeploymentDTO[]>("/api/deployments")

// ── Écriture ──────────────────────────────────────────────────────────────────

// ✅ POST /api/deployments/user/{userId} (pas /api/deployments)
export const createDeployment = (userId: string, data: DeploymentRequest) =>
  apiFetch<DeploymentDTO>(`/api/deployments/user/${userId}`, {
    method: "POST",
    body:   JSON.stringify(data),   // ✅ userId dans l'URL, pas dans le body
  })

export const startProvisioning = (id: number) =>
  apiFetch<DeploymentDTO>(`/api/deployments/${id}/provision`, { method: "PATCH" })

// ✅ markRunning existe dans le controller
export const markRunning = (id: number) =>
  apiFetch<DeploymentDTO>(`/api/deployments/${id}/running`, { method: "PATCH" })

// ✅ status via @RequestParam (pas body JSON)
export const changeDeploymentStatus = (id: number, status: DeploymentStatus) =>
  apiFetch<DeploymentDTO>(`/api/deployments/${id}/status?status=${status}`, {
    method: "PATCH",
  })

export const deleteDeployment = (id: number) =>
  apiFetch<void>(`/api/deployments/${id}`, { method: "DELETE" })