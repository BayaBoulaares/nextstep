// lib/services/cloud-services.api.ts
// ─────────────────────────────────────────────────────────────────────────────
// Routes : CloudServiceController.java → @RequestMapping("/api/services")
//
//   GET    /api/services                       → getAll()
//   GET    /api/services/:id                   → getById()
//   GET    /api/services/cloud/:cloudType      → getByCloudType()
//   GET    /api/services/category/:category    → getByCategory()
//   POST   /api/services          [ADMIN]      → create()
//   PUT    /api/services/:id      [ADMIN]      → update()
//   DELETE /api/services/:id      [ADMIN]      → delete()
// ─────────────────────────────────────────────────────────────────────────────
import { apiFetch } from "@/lib/apiClient"
import type {
  CloudServiceDTO,
  CloudServiceRequest,
  CloudType,
  ServiceCategory,
} from "@/lib/types"

// ── Lecture (tous rôles) ──────────────────────────────────────────────────────

export const getAllServices = () =>
  apiFetch<CloudServiceDTO[]>("/api/services")

export const getServiceById = (id: number) =>
  apiFetch<CloudServiceDTO>(`/api/services/${id}`)

export const getServicesByCloudType = (cloudType: CloudType) =>
  apiFetch<CloudServiceDTO[]>(`/api/services/cloud/${cloudType}`)

export const getServicesByCategory = (category: ServiceCategory) =>
  apiFetch<CloudServiceDTO[]>(`/api/services/category/${category}`)

// ── Écriture (ADMIN) ─────────────────────────────────────────────────────────

export const createService = (data: CloudServiceRequest) =>
  apiFetch<CloudServiceDTO>("/api/services", {
    method: "POST",
    body:   JSON.stringify(data),
  })

export const updateService = (id: number, data: CloudServiceRequest) =>
  apiFetch<CloudServiceDTO>(`/api/services/${id}`, {
    method: "PUT",
    body:   JSON.stringify(data),
  })

export const deleteService = (id: number) =>
  apiFetch<void>(`/api/services/${id}`, { method: "DELETE" })