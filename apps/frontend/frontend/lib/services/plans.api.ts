// lib/services/plans.api.ts
// ─────────────────────────────────────────────────────────────────────────────
// Routes : PlanController.java → @RequestMapping("/api/plans")
//
//   GET    /api/plans                          → getAll()
//   GET    /api/plans/:id                      → getById()
//   GET    /api/plans/service/:serviceId       → getByService()
//   POST   /api/plans             [ADMIN]      → create()
//   PUT    /api/plans/:id         [ADMIN]      → update()
//   PATCH  /api/plans/:id/toggle  [ADMIN]      → toggleActive()
//   DELETE /api/plans/:id         [ADMIN]      → delete()
// ─────────────────────────────────────────────────────────────────────────────
import { apiFetch } from "@/lib/apiClient"
import type { PlanDTO, PlanRequest } from "@/lib/types"

// ── Lecture (tous rôles) ──────────────────────────────────────────────────────

export const getAllPlans = () =>
  apiFetch<PlanDTO[]>("/api/plans")

export const getPlanById = (id: number) =>
  apiFetch<PlanDTO>(`/api/plans/${id}`)

export const getPlansByService = (serviceId: number) =>
  apiFetch<PlanDTO[]>(`/api/plans/service/${serviceId}`)

// ── Écriture (ADMIN) ─────────────────────────────────────────────────────────

export const createPlan = (data: PlanRequest) =>
  apiFetch<PlanDTO>("/api/plans", {
    method: "POST",
    body:   JSON.stringify(data),
  })

export const updatePlan = (id: number, data: PlanRequest) =>
  apiFetch<PlanDTO>(`/api/plans/${id}`, {
    method: "PUT",
    body:   JSON.stringify(data),
  })

export const togglePlan = (id: number) =>
  apiFetch<PlanDTO>(`/api/plans/${id}/toggle`, { method: "PATCH" })

export const deletePlan = (id: number) =>
  apiFetch<void>(`/api/plans/${id}`, { method: "DELETE" })