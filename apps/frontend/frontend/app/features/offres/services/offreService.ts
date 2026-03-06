// features/offres/services/offreService.ts

import { apiFetch } from "@/lib/apiClient"
import type { Offre, CreateOffrePayload, UpdateOffrePayload } from "../types"

export const offreService = {
  getAll: () =>
    apiFetch<Offre[]>("/offres"),

  getById: (id: number) =>
    apiFetch<Offre>(`/offres/${id}`),

  create: (payload: CreateOffrePayload) =>
    apiFetch<Offre>("/offres", {
      method: "POST",
      body: JSON.stringify(payload),
    }),

  update: (id: number, payload: UpdateOffrePayload) =>
    apiFetch<Offre>(`/offres/${id}`, {
      method: "PATCH",
      body: JSON.stringify(payload),
    }),

  delete: (id: number) =>
    apiFetch<void>(`/offres/${id}`, { method: "DELETE" }),
}