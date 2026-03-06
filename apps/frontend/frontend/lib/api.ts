// src/lib/api.ts
// ✅ Redirige vers apiClient.ts — source unique de vérité
// Gardé pour compatibilité avec les imports existants (cloud-services.api.ts, etc.)
export { apiFetch, publicFetch, ApiError } from "@/lib/apiClient"
