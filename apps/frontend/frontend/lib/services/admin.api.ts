// src/lib/services/admin.api.ts
// ✅ Tous les appels passent par apiClient (port 8081 + Bearer token)
/*import { apiFetch } from "@/lib/apiClient"
import type {
  CloudServiceDTO,
  CloudServiceRequest,
  PlanDTO,
  PlanRequest,
  DeploymentDTO,
  DeploymentStatus,
} from "@/lib/types"

// ── Services ──────────────────────────────────────────────────────────────────

export const adminGetAllServices = () =>
  apiFetch<CloudServiceDTO[]>("/api/services")

export const adminCreateService = (data: CloudServiceRequest) =>
  apiFetch<CloudServiceDTO>("/api/services", {
    method: "POST",
    body:   JSON.stringify(data),
  })

export const adminUpdateService = (id: number, data: CloudServiceRequest) =>
  apiFetch<CloudServiceDTO>(`/api/services/${id}`, {
    method: "PUT",
    body:   JSON.stringify(data),
  })

export const adminDeleteService = (id: number) =>
  apiFetch<void>(`/api/services/${id}`, { method: "DELETE" })

// ── Plans ─────────────────────────────────────────────────────────────────────

export const adminGetPlansByService = (serviceId: number) =>
  apiFetch<PlanDTO[]>(`/api/plans/service/${serviceId}`)

export const adminCreatePlan = (data: PlanRequest) =>
  apiFetch<PlanDTO>("/api/plans", {
    method: "POST",
    body:   JSON.stringify(data),
  })

export const adminUpdatePlan = (id: number, data: PlanRequest) =>
  apiFetch<PlanDTO>(`/api/plans/${id}`, {
    method: "PUT",
    body:   JSON.stringify(data),
  })

export const adminTogglePlan = (id: number) =>
  apiFetch<PlanDTO>(`/api/plans/${id}/toggle`, { method: "PATCH" })

export const adminDeletePlan = (id: number) =>
  apiFetch<void>(`/api/plans/${id}`, { method: "DELETE" })

// ── Déploiements ──────────────────────────────────────────────────────────────

export const adminGetAllDeployments = () =>
  apiFetch<DeploymentDTO[]>("/api/deployments")

export const adminChangeDeploymentStatus = (id: number, status: DeploymentStatus) =>
  apiFetch<DeploymentDTO>(`/api/deployments/${id}/status`, {
    method: "PATCH",
    body:   JSON.stringify({ status }),
  })

export const adminDeleteDeployment = (id: number) =>
  apiFetch<void>(`/api/deployments/${id}`, { method: "DELETE" })
*/
// lib/services/admin.api.ts
// ─────────────────────────────────────────────────────────────────────────────
// Point d'entrée unique pour tous les composants admin.
// Re-exporte les fonctions CRUD depuis cloud-services.api.ts et plans.api.ts
// pour éviter de changer tous les imports existants.
// ─────────────────────────────────────────────────────────────────────────────

// ── Services ──────────────────────────────────────────────────────────────────
export {
  getAllServices   as adminGetAllServices,
  getServiceById   as adminGetServiceById,
  createService    as adminCreateService,
  updateService    as adminUpdateService,
  deleteService    as adminDeleteService,
} from "@/lib/services/cloud-services.api"

// ── Plans ─────────────────────────────────────────────────────────────────────
export {
  getPlansByService as adminGetPlansByService,
  createPlan        as adminCreatePlan,
  updatePlan        as adminUpdatePlan,
  togglePlan        as adminTogglePlan,
  deletePlan        as adminDeletePlan,
} from "@/lib/services/plans.api"

// ── Déploiements ──────────────────────────────────────────────────────────────
export {
  getAllDeployments          as adminGetAllDeployments,
  changeDeploymentStatus    as adminChangeDeploymentStatus,
  deleteDeployment          as adminDeleteDeployment,
} from "@/lib/services/deployments.api"