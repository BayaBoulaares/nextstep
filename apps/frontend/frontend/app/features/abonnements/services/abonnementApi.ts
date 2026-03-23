// app/features/abonnements/services/abonnementApi.ts
// ─────────────────────────────────────────────────────────────────────────────
// NOUVEAU FICHIER — à créer dans app/features/abonnements/services/
//
// Couvre tous les endpoints du AbonnementController.java et UsageController.java :
//   POST   /api/abonnements
//   GET    /api/abonnements/mes-abonnements
//   GET    /api/abonnements/:id
//   DELETE /api/abonnements/:id/resilier
//   PATCH  /api/abonnements/:id/deployment/:deploymentId
//   GET    /api/usage/abonnements/:id?debut=&fin=
//   GET    /api/usage/factures
// ─────────────────────────────────────────────────────────────────────────────
import { apiFetch } from "@/lib/apiClient"
import type {
  AbonnementRequest,
  AbonnementResponse,
  UsageRecordResponse,
  InvoiceResponse,
} from "../../services/types"

const ABO   = "/api/abonnements"
const USAGE = "/api/usage"

// ── Transformateurs raw JSON → TypeScript ────────────────────────────────────

function toAbonnement(raw: any): AbonnementResponse {
  return {
    id:                 raw.id,
    planId:             raw.planId,
    planName:           raw.planName           ?? "",
    serviceName:        raw.serviceName        ?? null,
    isPayAsYouGo:       raw.isPayAsYouGo       ?? false,
    status:             raw.status,
    prixSnapshot:       Number(raw.prixSnapshot ?? 0),
    billingCycle:       raw.billingCycle,
    dateDebut:          raw.dateDebut,
    dateFin:            raw.dateFin            ?? null,
    dateResiliation:    raw.dateResiliation    ?? null,
    autoRenouvellement: raw.autoRenouvellement ?? true,
    deploymentId:       raw.deploymentId       ?? null,
    resourceName:       raw.resourceName       ?? null,
    createdAt:          raw.createdAt,
  }
}

function toUsageRecord(raw: any): UsageRecordResponse {
  return {
    id:           raw.id,
    abonnementId: raw.abonnementId,
    deploymentId: raw.deploymentId,
    resourceName: raw.resourceName ?? "",
    metricType:   raw.metricType,
    metricLabel:  raw.metricLabel  ?? raw.metricType,
    quantity:     Number(raw.quantity),
    cost:         Number(raw.cost),
    periodStart:  raw.periodStart,
    periodEnd:    raw.periodEnd,
    recordedAt:   raw.recordedAt,
  }
}

function toInvoice(raw: any): InvoiceResponse {
  return {
    id:           raw.id,
    abonnementId: raw.abonnementId,
    planName:     raw.planName    ?? "",
    status:       raw.status,
    periodStart:  raw.periodStart,
    periodEnd:    raw.periodEnd,
    totalHt:      Number(raw.totalHt ?? 0),
    issuedAt:     raw.issuedAt    ?? null,
    paidAt:       raw.paidAt      ?? null,
    createdAt:    raw.createdAt,
  }
}

// ════════════════════════════════════════════════════════════════════════════

export const abonnementApi = {

  /** POST /api/abonnements — souscrire à un plan */
  souscrire: async (payload: AbonnementRequest): Promise<AbonnementResponse> => {
    const raw = await apiFetch(ABO, {
      method: "POST",
      body:   JSON.stringify(payload),
    })
    return toAbonnement(raw)
  },

  /** GET /api/abonnements/mes-abonnements — tous les abonnements du client connecté */
  mesAbonnements: async (): Promise<AbonnementResponse[]> => {
    const raw = await apiFetch(`${ABO}/mes-abonnements`)
    return Array.isArray(raw) ? raw.map(toAbonnement) : []
  },

  /** GET /api/abonnements/:id */
  getById: async (id: number): Promise<AbonnementResponse> => {
    const raw = await apiFetch(`${ABO}/${id}`)
    return toAbonnement(raw)
  },

  /** DELETE /api/abonnements/:id/resilier — résilie l'abonnement (propriétaire uniquement) */
  resilier: async (id: number): Promise<AbonnementResponse> => {
    const raw = await apiFetch(`${ABO}/${id}/resilier`, { method: "DELETE" })
    return toAbonnement(raw)
  },

  /** PATCH /api/abonnements/:aboId/deployment/:depId — lie un déploiement à l'abonnement */
  lierDeployment: async (abonnementId: number, deploymentId: number): Promise<AbonnementResponse> => {
    const raw = await apiFetch(
      `${ABO}/${abonnementId}/deployment/${deploymentId}`,
      { method: "PATCH" },
    )
    return toAbonnement(raw)
  },

  /**
   * GET /api/usage/abonnements/:id?debut=...&fin=...
   * Records de consommation sur une période (format ISO 8601 : "2026-03-01T00:00:00")
   */
  getUsage: async (
    abonnementId: number,
    debut:        string,
    fin:          string,
  ): Promise<UsageRecordResponse[]> => {
    const params = new URLSearchParams({ debut, fin })
    const raw = await apiFetch(`${USAGE}/abonnements/${abonnementId}?${params}`)
    return Array.isArray(raw) ? raw.map(toUsageRecord) : []
  },

  /** GET /api/usage/factures — factures PAYG du client connecté */
  mesFactures: async (): Promise<InvoiceResponse[]> => {
    const raw = await apiFetch(`${USAGE}/factures`)
    return Array.isArray(raw) ? raw.map(toInvoice) : []
  },
}