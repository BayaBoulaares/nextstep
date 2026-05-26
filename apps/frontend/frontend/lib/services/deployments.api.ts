// lib/services/deployments.api.ts
import { apiFetch } from "@/lib/apiClient"
import type {
  DeploymentDTO,
  DeploymentStatus,
  DeploymentRequest,
  AbonnementResponse,
  AbonnementRequest,
  InvoiceResponse,
} from "@/lib/types"

// ── Lecture des déploiements ──────────────────────────────────────────────────

export const getDeploymentsByUser = (userId: string) =>
  apiFetch<DeploymentDTO[]>(`/api/deployments/user/${userId}`)

export const getDeploymentById = (id: number) =>
  apiFetch<DeploymentDTO>(`/api/deployments/${id}`)

export const getAllDeployments = () =>
  apiFetch<DeploymentDTO[]>("/api/deployments/user/me")

// ── Création ──────────────────────────────────────────────────────────────────

// POST /api/deployments/user/{userId} — userId dans l'URL, payload dans le body
/*export const createDeployment = (userId: string, data: DeploymentRequest) =>
  apiFetch<DeploymentDTO>(`/api/deployments/user/${userId}`, {
    method: "POST",
    body:   JSON.stringify(data),
  })*/
 export const createDeployment = (data: DeploymentRequest) =>
  apiFetch<DeploymentDTO>("/api/deployments", {
    method: "POST",
    body:   JSON.stringify(data),
  })

// ── Cycle de vie ──────────────────────────────────────────────────────────────

export const startProvisioning = (id: number) =>
  apiFetch<DeploymentDTO>(`/api/deployments/${id}/provision`, { method: "PATCH" })

export const markRunning = (id: number) =>
  apiFetch<DeploymentDTO>(`/api/deployments/${id}/running`, { method: "PATCH" })

// status via @RequestParam — encodeURIComponent pour "ARRETÉ" et "SUPPRIMÉ"
export const changeDeploymentStatus = (id: number, status: DeploymentStatus) =>
  apiFetch<DeploymentDTO>(`/api/deployments/${id}/status?status=${encodeURIComponent(status)}`, {
    method: "PATCH",
  })

export const deleteDeployment = (id: number) =>
  apiFetch<void>(`/api/deployments/${id}`, { method: "DELETE" })

// ── Abonnements liés ─────────────────────────────────────────────────────────

export const getAbonnementsByUser = (userId: string) =>
  apiFetch<AbonnementResponse[]>(`/api/abonnements/user/${userId}`)

export const getAbonnementById = (id: number) =>
  apiFetch<AbonnementResponse>(`/api/abonnements/${id}`)

export const createAbonnement = (data: AbonnementRequest) =>
  apiFetch<AbonnementResponse>("/api/abonnements", {
    method: "POST",
    body:   JSON.stringify(data),
  })

export const resilierAbonnement = (id: number) =>
  apiFetch<AbonnementResponse>(`/api/abonnements/${id}/resilier`, { method: "PATCH" })

// ── Factures ──────────────────────────────────────────────────────────────────

export const getInvoicesByAbonnement = (abonnementId: number) =>
  apiFetch<InvoiceResponse[]>(`/api/factures/abonnement/${abonnementId}`)