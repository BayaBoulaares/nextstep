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
export type BillingCycle = "HORAIRE" | "MENSUEL" | "ANNUEL" | "USAGE"

export type OperatingSystem =
  | "UBUNTU_24_04_LTS"
  | "UBUNTU_22_04_LTS"
  | "DEBIAN_12"
  | "DEBIAN_11"
  | "ROCKY_LINUX_9"
  | "ALMA_LINUX_9"
  | "CENTOS_STREAM_9"
  | "WINDOWS_SERVER_2022"
  | "WINDOWS_SERVER_2019"
  | "NONE"


export const OS_LABELS: Record<OperatingSystem, string> = {
  UBUNTU_24_04_LTS:    "Ubuntu 24.04 LTS",
  UBUNTU_22_04_LTS:    "Ubuntu 22.04 LTS",
  DEBIAN_12:           "Debian 12 (Bookworm)",
  DEBIAN_11:           "Debian 11 (Bullseye)",
  ROCKY_LINUX_9:       "Rocky Linux 9",
  ALMA_LINUX_9:        "AlmaLinux 9",
  CENTOS_STREAM_9:     "CentOS Stream 9",
  WINDOWS_SERVER_2022: "Windows Server 2022",
  WINDOWS_SERVER_2019: "Windows Server 2019",
  NONE:                "Sans OS (stockage / réseau)",
}

/** AbonnementStatus.java — NOUVEAU */
export type AbonnementStatus =
  | "EN_ATTENTE"
  | "ACTIF"
  | "SUSPENDU"
  | "RESILIE"
  | "EXPIRE"
 
/** UsageMetricType.java — NOUVEAU */
export type UsageMetricType =
  | "VCPU_HEURE"
  | "RAM_GB_HEURE"
  | "STOCKAGE_GB_MOIS"
  | "REQUETES_1000"
  | "BANDE_PASSANTE_GB"
 
/** InvoiceStatus.java — NOUVEAU */
export type InvoiceStatus = "BROUILLON" | "EMISE" | "PAYEE" | "EN_RETARD"
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
  price:        number  | null   // ← MODIFICATION : nullable pour les plans PAYG
  billingCycle: BillingCycle
  vcores:       number | null
  ramGb:        number | null
  storageGb:    number | null
  isActive:     boolean         // Boolean Java → boolean JS
  serviceId:    number
  serviceName:  string | null
  badge:        string | null   // ex: "POPULAIRE", "RECOMMANDÉ"
  isPopular:    boolean | null
  isPayAsYouGo: boolean          // ← NOUVEAU
  planPricings: PlanPricingDTO[] // ← NOUVEAU ([] pour les plans fixes)
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
  price:        number  | null        // @NotNull BigDecimal
  billingCycle: BillingCycle    // @NotNull
  vcores?:      number
  ramGb?:       number
  storageGb?:   number
  badge?:       string
  isPopular?:   boolean
  isPayAsYouGo?: boolean         // ← NOUVEAU
  serviceId:    number          // @NotNull Long
}

export interface PlanPricingDTO {
  id:           number
  metricType:   UsageMetricType
  metricLabel:  string   // ex: "vCPU" — fourni par le backend via UsageMetricType.label
  pricePerUnit: number   // BigDecimal Java → number JS (6 décimales côté Java)
  unit:         string   // ex: "heure", "Go", "1 000 req."
  freeQuota:    number   // quota gratuit avant facturation (ex: 10 Go inclus)
}
/**
 * AbonnementResponse.java — NOUVEAU
 * Retourné par GET /api/abonnements/mes-abonnements et POST /api/abonnements
 */
export interface AbonnementResponse {
  id:                 number
  planId:             number
  planName:           string
  serviceName:        string | null
  isPayAsYouGo:       boolean
  status:             AbonnementStatus
  prixSnapshot:       number   // prix figé à la souscription (0 pour PAYG)
  billingCycle:       BillingCycle
  dateDebut:          string   // ISO 8601
  dateFin:            string | null  // null si PAYG ou autoRenouvellement
  dateResiliation:    string | null
  autoRenouvellement: boolean
  deploymentId:       number | null
  resourceName:       string | null  // nom du déploiement lié
  createdAt:          string
}
/**
 * AbonnementRequest.java — NOUVEAU
 * Body de POST /api/abonnements
 */
export interface AbonnementRequest {
  planId:              number
  deploymentId?:       number
  autoRenouvellement?: boolean
}

/**
 * UsageRecordResponse.java — NOUVEAU
 * Retourné par GET /api/usage/abonnements/:id
 */
export interface UsageRecordResponse {
  id:           number
  abonnementId: number
  deploymentId: number
  resourceName: string
  metricType:   UsageMetricType
  metricLabel:  string   // label lisible fourni par le backend
  quantity:     number   // quantité brute mesurée
  cost:         number   // coût calculé = max(0, qty - freeQuota) × pricePerUnit
  periodStart:  string
  periodEnd:    string
  recordedAt:   string
}

/**
 * InvoiceResponse.java — NOUVEAU
 * Retourné par GET /api/usage/factures
 */
export interface InvoiceResponse {
  id:           number
  abonnementId: number
  planName:     string
  status:       InvoiceStatus
  periodStart:  string
  periodEnd:    string
  totalHt:      number
  issuedAt:     string | null
  paidAt:       string | null
  createdAt:    string
}
// ─── Alias pour les hooks / composants ────────────────────────────────────────

/** Alias utilisé dans useService.ts pour la couche feature */
export type CloudService      = CloudServiceDTO
export type Plan              = PlanDTO
export type CreateServicePayload = CloudServiceRequest
export type UpdateServicePayload = Partial<CloudServiceRequest>
export type CreatePlanPayload    = PlanRequest
export type UpdatePlanPayload    = Partial<PlanRequest>