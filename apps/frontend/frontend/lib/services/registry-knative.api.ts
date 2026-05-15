// lib/services/registry-knative.api.ts

import type {
  ImageRegistryRequest,
  ImageRegistryResponse,
  KnativeServiceRequest,
  KnativeServiceResponse,
} from "@/lib/types"
import { apiFetch } from "@/lib/apiClient"

// ── IMAGE REGISTRY ────────────────────────────────────────────────────────────
export const registryApi = {
  list:     ():                          Promise<ImageRegistryResponse[]> => apiFetch("/api/v1/registries"),
  getById:  (id: number):                Promise<ImageRegistryResponse>   => apiFetch(`/api/v1/registries/${id}`),
  create:   (p: ImageRegistryRequest):   Promise<ImageRegistryResponse>   => apiFetch("/api/v1/registries", { method: "POST", body: JSON.stringify(p) }),
  delete:   (id: number):                Promise<void>                    => apiFetch(`/api/v1/registries/${id}`, { method: "DELETE" }),
}

// ── KNATIVE SERVERLESS ────────────────────────────────────────────────────────
export const knativeApi = {
  list:       ():                            Promise<KnativeServiceResponse[]> => apiFetch("/api/v1/serverless"),
  listByType: (type: "SERVING"|"FUNCTION"):  Promise<KnativeServiceResponse[]> => apiFetch(`/api/v1/serverless?type=${type}`),
  getById:    (id: number):                  Promise<KnativeServiceResponse>   => apiFetch(`/api/v1/serverless/${id}`),
  create:     (p: KnativeServiceRequest):    Promise<KnativeServiceResponse>   => apiFetch("/api/v1/serverless", { method: "POST", body: JSON.stringify(p) }),
  sync:       (id: number):                  Promise<KnativeServiceResponse>   => apiFetch(`/api/v1/serverless/${id}/sync`, { method: "POST" }),
  delete:     (id: number):                  Promise<void>                     => apiFetch(`/api/v1/serverless/${id}`, { method: "DELETE" }),
}