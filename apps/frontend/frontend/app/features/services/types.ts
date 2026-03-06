//services/types
// ─── Enums (miroir exact des enums Java backend) ─────────────────────────────

/** ServiceStatus.java : ACTIF | INACTIF | MAINTENANCE */
export type ServiceStatus = "ACTIF" | "INACTIF" | "MAINTENANCE"

/** ServiceCategory.java */
export type ServiceCategory =
  | "CALCUL"
  | "HEBERGEMENT"
  | "STOCKAGE"
  | "BASE_DONNEES"
  | "RESEAU"
  | "EMAIL"
  | "IA"
  | "SECURITE"
  | "IAM"

/** CloudType.java : PRIVÉ | PUBLIC | HYBRIDE */
export type CloudType = "PRIVÉ" | "PUBLIC" | "HYBRIDE"

/** PlanTier.java */
export type PlanTier =
  | "DEMARRAGE"
  | "AVANTAGE"
  | "ESSENTIEL"
  | "CONFORT"
  | "ELITE"
  | "PROFESSIONNEL"
  | "ENTREPRISE"

/** BillingCycle.java : HORAIRE | MENSUEL | ANNUEL */
export type BillingCycle = "HORAIRE" | "MENSUEL" | "ANNUEL"

// ─── DTOs (miroir exact des classes @Data Java) ───────────────────────────────

/**
 * Miroir de PlanDTO.java
 * Champs : id, name, description, tier, price (BigDecimal→number),
 *          billingCycle, vcores, ramGb, storageGb,
 *          isActive, serviceId, serviceName, badge, isPopular
 */
export interface PlanDTO {
  id:           number
  name:         string
  description:  string | null
  tier:         PlanTier
  price:        number          // BigDecimal Java → number JS
  billingCycle: BillingCycle
  vcores:       number | null
  ramGb:        number | null
  storageGb:    number | null
  isActive:     boolean         // Boolean Java → boolean JS
  serviceId:    number
  serviceName:  string | null
  badge:        string | null   // ex: "POPULAIRE", "RECOMMANDÉ"
  isPopular:    boolean | null
}

/**
 * Miroir de CloudServiceDTO.java
 * Champs : id, name, description, category, cloudType, icon, status, plans
 */
export interface CloudServiceDTO {
  id:          number
  name:        string
  description: string | null
  category:    ServiceCategory
  cloudType:   CloudType
  icon:        string | null
  status:      ServiceStatus
  plans:       PlanDTO[]
}

// ─── Payloads de requête (miroir des classes @Valid @RequestBody Java) ─────────

/**
 * Miroir de CloudServiceRequest.java
 * @NotBlank name
 * @NotNull  cloudType, category, status
 * optionnel: description, icon
 */
export interface CloudServiceRequest {
  name:        string           // @NotBlank
  description?: string
  cloudType:   CloudType        // @NotNull
  icon?:       string
  category:    ServiceCategory  // @NotNull
  status:      ServiceStatus    // @NotNull
}

/**
 * Miroir de PlanRequest.java
 * @NotBlank name
 * @NotNull  tier, price, billingCycle, serviceId
 * optionnel: description, vcores, ramGb, storageGb, badge, isPopular
 */
export interface PlanRequest {
  name:         string          // @NotBlank
  description?: string
  tier:         PlanTier        // @NotNull
  price:        number          // @NotNull BigDecimal
  billingCycle: BillingCycle    // @NotNull
  vcores?:      number
  ramGb?:       number
  storageGb?:   number
  badge?:       string
  isPopular?:   boolean
  serviceId:    number          // @NotNull Long
}

// ─── Alias pour les hooks / composants ────────────────────────────────────────

/** Alias utilisé dans useService.ts pour la couche feature */
export type CloudService      = CloudServiceDTO
export type Plan              = PlanDTO
export type CreateServicePayload = CloudServiceRequest
export type UpdateServicePayload = Partial<CloudServiceRequest>
export type CreatePlanPayload    = PlanRequest
export type UpdatePlanPayload    = Partial<PlanRequest>