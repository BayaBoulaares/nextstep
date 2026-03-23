// // features/services/services/serviceApi.ts
// import { apiFetch } from "@/lib/apiClient"
// import type {
//   CloudService,
//   Plan,
//   CreateServicePayload,
//   UpdateServicePayload,
//   CreatePlanPayload,
//   UpdatePlanPayload,
// } from "../types"

// const SERVICES = "/api/services"
// const PLANS    = "/api/plans"

// // ─── Transforme PlanDTO (backend) → Plan (frontend) ──────────────────────────
// // Le backend renvoie les champs en camelCase grâce à Jackson (par défaut).
// // PlanDTO.java : id, name, description, tier, price, billingCycle,
// //                vcores, ramGb, storageGb, isActive, serviceId,
// //                serviceName, badge, isPopular
// function toPlan(raw: any): Plan {
//   return {
//     id:          raw.id,
//     name:        raw.name,
//     description: raw.description  ?? null,
//     tier:        raw.tier,
//     price:       Number(raw.price),
//     billingCycle: raw.billingCycle,
//     vcores:      raw.vcores       ?? null,
//     ramGb:       raw.ramGb        ?? null,
//     storageGb:   raw.storageGb    ?? null,
//     isActive:    raw.isActive     ?? false,   // Boolean Java → isActive (pas "active")
//     serviceId:   raw.serviceId,
//     serviceName: raw.serviceName  ?? null,
//     badge:       raw.badge        ?? null,
//     isPopular:   raw.isPopular    ?? null,
//   }
// }

// // ─── Transforme CloudServiceDTO (backend) → CloudService (frontend) ──────────
// // CloudServiceDTO.java : id, name, description, category,
// //                        cloudType, icon, status, plans
// function toService(raw: any): CloudService {
//   return {
//     id:          raw.id,
//     name:        raw.name,
//     description: raw.description ?? null,
//     category:    raw.category,
//     cloudType:   raw.cloudType,               // nouveau champ Java
//     icon:        raw.icon        ?? null,     // nouveau champ Java
//     status:      raw.status,
//     plans:       Array.isArray(raw.plans) ? raw.plans.map(toPlan) : [],
//   }
// }

// // ════════════════════════════════════════════════════════════════════════════
// export const serviceApi = {

//   // ─── Services ─────────────────────────────────────────────────────────────

//   getAll: async (): Promise<CloudService[]> => {
//     const raw = await apiFetch(SERVICES)
//     return Array.isArray(raw) ? raw.map(toService) : []
//   },

//   getById: async (id: number): Promise<CloudService> => {
//     const raw = await apiFetch(`${SERVICES}/${id}`)
//     return toService(raw)
//   },

//   getByCategory: async (category: string): Promise<CloudService[]> => {
//     const raw = await apiFetch(`${SERVICES}/category/${category}`)
//     return Array.isArray(raw) ? raw.map(toService) : []
//   },

//   /** GET /api/services/cloud/:cloudType — endpoint CloudType */
//   getByCloudType: async (cloudType: string): Promise<CloudService[]> => {
//     const raw = await apiFetch(`${SERVICES}/cloud/${cloudType}`)
//     return Array.isArray(raw) ? raw.map(toService) : []
//   },

//   /**
//    * POST /api/services
//    * Body = CloudServiceRequest.java :
//    *   name (@NotBlank), cloudType (@NotNull), category (@NotNull),
//    *   status (@NotNull), description?, icon?
//    */
//   create: async (payload: CreateServicePayload): Promise<CloudService> => {
//     const raw = await apiFetch(SERVICES, {
//       method: "POST",
//       body: JSON.stringify(payload),
//     })
//     return toService(raw)
//   },

//   update: async (id: number, payload: UpdateServicePayload): Promise<CloudService> => {
//     const raw = await apiFetch(`${SERVICES}/${id}`, {
//       method: "PUT",
//       body: JSON.stringify(payload),
//     })
//     return toService(raw)
//   },

//   delete: (id: number): Promise<void> =>
//     apiFetch(`${SERVICES}/${id}`, { method: "DELETE" }),

//   // ─── Plans ────────────────────────────────────────────────────────────────

//   getAllPlans: async (): Promise<Plan[]> => {
//     const raw = await apiFetch(PLANS)
//     return Array.isArray(raw) ? raw.map(toPlan) : []
//   },

//   getPlanById: async (planId: number): Promise<Plan> => {
//     const raw = await apiFetch(`${PLANS}/${planId}`)
//     return toPlan(raw)
//   },

//   getPlansByService: async (serviceId: number): Promise<Plan[]> => {
//     const raw = await apiFetch(`${PLANS}/service/${serviceId}`)
//     return Array.isArray(raw) ? raw.map(toPlan) : []
//   },

//   /**
//    * POST /api/plans
//    * Body = PlanRequest.java :
//    *   name (@NotBlank), tier (@NotNull), price (@NotNull),
//    *   billingCycle (@NotNull), serviceId (@NotNull),
//    *   description?, vcores?, ramGb?, storageGb?, badge?, isPopular?
//    */
//   createPlan: async (payload: CreatePlanPayload): Promise<Plan> => {
//     const body = {
//       serviceId:    payload.serviceId,
//       name:         payload.name,
//       description:  payload.description  ?? null,
//       tier:         payload.tier,
//       price:        payload.price,
//       billingCycle: payload.billingCycle,
//       vcores:       payload.vcores        ?? null,
//       ramGb:        payload.ramGb         ?? null,
//       storageGb:    payload.storageGb     ?? null,
//       badge:        payload.badge         ?? null,
//       isPopular:    payload.isPopular     ?? false,
//     }
//     const raw = await apiFetch(PLANS, {
//       method: "POST",
//       body:   JSON.stringify(body),
//     })
//     return toPlan(raw)
//   },

//   /**
//    * PUT /api/plans/:id
//    * Même shape que PlanRequest.java — on n'envoie que les champs définis.
//    * Attention : isActive n'est PAS dans PlanRequest → utiliser /toggle pour ça.
//    */
//   updatePlan: async (planId: number, payload: UpdatePlanPayload): Promise<Plan> => {
//     const body: Record<string, unknown> = {}
//     if (payload.name         !== undefined) body.name         = payload.name
//     if (payload.description  !== undefined) body.description  = payload.description
//     if (payload.tier         !== undefined) body.tier         = payload.tier
//     if (payload.price        !== undefined) body.price        = payload.price
//     if (payload.billingCycle !== undefined) body.billingCycle = payload.billingCycle
//     if (payload.vcores       !== undefined) body.vcores       = payload.vcores
//     if (payload.ramGb        !== undefined) body.ramGb        = payload.ramGb
//     if (payload.storageGb    !== undefined) body.storageGb    = payload.storageGb
//     if (payload.badge        !== undefined) body.badge        = payload.badge
//     if (payload.isPopular    !== undefined) body.isPopular    = payload.isPopular
//     if (payload.serviceId    !== undefined) body.serviceId    = payload.serviceId

//     const raw = await apiFetch(`${PLANS}/${planId}`, {
//       method: "PUT",
//       body: JSON.stringify(body),
//     })
//     return toPlan(raw)
//   },

//   /** PATCH /api/plans/:id/toggle — active ↔ inactif */
//   togglePlan: async (planId: number): Promise<Plan> => {
//     const raw = await apiFetch(`${PLANS}/${planId}/toggle`, { method: "PATCH" })
//     return toPlan(raw)
//   },

//   deletePlan: (planId: number): Promise<void> =>
//     apiFetch(`${PLANS}/${planId}`, { method: "DELETE" }),
// }
// app/features/services/services/serviceApi.ts
// ─────────────────────────────────────────────────────────────────────────────
// MODIFICATIONS PAR RAPPORT À TON FICHIER ACTUEL :
//
//  1. toPlan()      → price devient nullable (Number() seulement si non null)
//                   → ajout isPayAsYouGo, planPricings (nouveaux champs PlanDTO)
//  2. createPlan()  → price = null si PAYG, billingCycle forcé à "USAGE" si PAYG
//                   → ajout isPayAsYouGo dans le body envoyé
//  3. updatePlan()  → ajout isPayAsYouGo dans la liste des champs mis à jour
//
//  Tout le reste est IDENTIQUE à ton fichier actuel.
// ─────────────────────────────────────────────────────────────────────────────
import { apiFetch } from "@/lib/apiClient"
import type {
  CloudService,
  Plan,
  PlanPricingDTO,
  CreateServicePayload,
  UpdateServicePayload,
  CreatePlanPayload,
  UpdatePlanPayload,
} from "../types"

const SERVICES = "/api/services"
const PLANS    = "/api/plans"

// ── Nouveau transformateur pour PlanPricingDTO ────────────────────────────────
function toPlanPricing(raw: any): PlanPricingDTO {
  return {
    id:           raw.id,
    metricType:   raw.metricType,
    metricLabel:  raw.metricLabel  ?? raw.metricType,
    pricePerUnit: Number(raw.pricePerUnit),
    unit:         raw.unit         ?? "",
    freeQuota:    Number(raw.freeQuota ?? 0),
  }
}

// ── toPlan — MODIFIÉ ──────────────────────────────────────────────────────────
// Différences vs ton code actuel :
//   - price : était Number(raw.price)  →  raw.price != null ? Number(raw.price) : null
//   - ajout  isPayAsYouGo : raw.isPayAsYouGo ?? false
//   - ajout  planPricings : tableau mappé via toPlanPricing
function toPlan(raw: any): Plan {
  return {
    id:           raw.id,
    name:         raw.name,
    description:  raw.description  ?? null,
    tier:         raw.tier,
    // ⚠️ MODIFICATION : price est null pour les plans PAYG
    price:        raw.price != null ? Number(raw.price) : null,
    billingCycle: raw.billingCycle,
    vcores:       raw.vcores        ?? null,
    ramGb:        raw.ramGb         ?? null,
    storageGb:    raw.storageGb     ?? null,
    isActive:     raw.isActive      ?? false,
    serviceId:    raw.serviceId,
    serviceName:  raw.serviceName   ?? null,
    badge:        raw.badge         ?? null,
    isPopular:    raw.isPopular     ?? null,
    // ⚠️ NOUVEAU
    isPayAsYouGo: raw.isPayAsYouGo  ?? false,
    planPricings: Array.isArray(raw.planPricings)
      ? raw.planPricings.map(toPlanPricing)
      : [],
  }
}

// ── toService — INCHANGÉ ──────────────────────────────────────────────────────
function toService(raw: any): CloudService {
  return {
    id:          raw.id,
    name:        raw.name,
    description: raw.description ?? null,
    category:    raw.category,
    cloudType:   raw.cloudType,
    icon:        raw.icon        ?? null,
    status:      raw.status,
    plans:       Array.isArray(raw.plans) ? raw.plans.map(toPlan) : [],
  }
}

// ════════════════════════════════════════════════════════════════════════════
export const serviceApi = {

  // ── Services — INCHANGÉS ─────────────────────────────────────────────────

  getAll: async (): Promise<CloudService[]> => {
    const raw = await apiFetch(SERVICES)
    return Array.isArray(raw) ? raw.map(toService) : []
  },

  getById: async (id: number): Promise<CloudService> => {
    const raw = await apiFetch(`${SERVICES}/${id}`)
    return toService(raw)
  },

  getByCategory: async (category: string): Promise<CloudService[]> => {
    const raw = await apiFetch(`${SERVICES}/category/${category}`)
    return Array.isArray(raw) ? raw.map(toService) : []
  },

  getByCloudType: async (cloudType: string): Promise<CloudService[]> => {
    const raw = await apiFetch(`${SERVICES}/cloud/${cloudType}`)
    return Array.isArray(raw) ? raw.map(toService) : []
  },

  create: async (payload: CreateServicePayload): Promise<CloudService> => {
    const raw = await apiFetch(SERVICES, {
      method: "POST",
      body:   JSON.stringify(payload),
    })
    return toService(raw)
  },

  update: async (id: number, payload: UpdateServicePayload): Promise<CloudService> => {
    const raw = await apiFetch(`${SERVICES}/${id}`, {
      method: "PUT",
      body:   JSON.stringify(payload),
    })
    return toService(raw)
  },

  delete: (id: number): Promise<void> =>
    apiFetch(`${SERVICES}/${id}`, { method: "DELETE" }),

  // ── Plans ────────────────────────────────────────────────────────────────

  getAllPlans: async (): Promise<Plan[]> => {
    const raw = await apiFetch(PLANS)
    return Array.isArray(raw) ? raw.map(toPlan) : []
  },

  getPlanById: async (planId: number): Promise<Plan> => {
    const raw = await apiFetch(`${PLANS}/${planId}`)
    return toPlan(raw)
  },

  getPlansByService: async (serviceId: number): Promise<Plan[]> => {
    const raw = await apiFetch(`${PLANS}/service/${serviceId}`)
    return Array.isArray(raw) ? raw.map(toPlan) : []
  },

  /**
   * createPlan — MODIFIÉ
   * ⚠️ Si isPayAsYouGo = true :
   *   - price envoyé comme null (PlanService.java valide que price est null)
   *   - billingCycle forcé à "USAGE" (inutile de l'envoyer, le backend le force aussi)
   * ⚠️ Ajout de isPayAsYouGo dans le body
   */
  createPlan: async (payload: CreatePlanPayload): Promise<Plan> => {
    const isPayg = payload.isPayAsYouGo ?? false
    const body = {
      serviceId:    payload.serviceId,
      name:         payload.name,
      description:  payload.description  ?? null,
      tier:         payload.tier,
      // ⚠️ MODIFICATION : null si PAYG, sinon valeur obligatoire
      price:        isPayg ? null : payload.price,
      billingCycle: isPayg ? "USAGE" : (payload.billingCycle ?? "MENSUEL"),
      vcores:       payload.vcores        ?? null,
      ramGb:        payload.ramGb         ?? null,
      storageGb:    payload.storageGb     ?? null,
      badge:        payload.badge         ?? null,
      isPopular:    payload.isPopular     ?? false,
      // ⚠️ NOUVEAU
      isPayAsYouGo: isPayg,
    }
    const raw = await apiFetch(PLANS, { method: "POST", body: JSON.stringify(body) })
    return toPlan(raw)
  },

  /**
   * updatePlan — MODIFIÉ
   * ⚠️ Ajout de isPayAsYouGo dans la liste des champs conditionnels
   */
  updatePlan: async (planId: number, payload: UpdatePlanPayload): Promise<Plan> => {
    const body: Record<string, unknown> = {}
    if (payload.name         !== undefined) body.name         = payload.name
    if (payload.description  !== undefined) body.description  = payload.description
    if (payload.tier         !== undefined) body.tier         = payload.tier
    if (payload.price        !== undefined) body.price        = payload.price
    if (payload.billingCycle !== undefined) body.billingCycle = payload.billingCycle
    if (payload.vcores       !== undefined) body.vcores       = payload.vcores
    if (payload.ramGb        !== undefined) body.ramGb        = payload.ramGb
    if (payload.storageGb    !== undefined) body.storageGb    = payload.storageGb
    if (payload.badge        !== undefined) body.badge        = payload.badge
    if (payload.isPopular    !== undefined) body.isPopular    = payload.isPopular
    if (payload.serviceId    !== undefined) body.serviceId    = payload.serviceId
    // ⚠️ NOUVEAU
    if (payload.isPayAsYouGo !== undefined) body.isPayAsYouGo = payload.isPayAsYouGo

    const raw = await apiFetch(`${PLANS}/${planId}`, {
      method: "PUT",
      body:   JSON.stringify(body),
    })
    return toPlan(raw)
  },

  // ── Inchangés ─────────────────────────────────────────────────────────────

  togglePlan: async (planId: number): Promise<Plan> => {
    const raw = await apiFetch(`${PLANS}/${planId}/toggle`, { method: "PATCH" })
    return toPlan(raw)
  },

  deletePlan: (planId: number): Promise<void> =>
    apiFetch(`${PLANS}/${planId}`, { method: "DELETE" }),
}