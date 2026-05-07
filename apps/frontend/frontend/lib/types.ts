// @/lib/types.ts
// Source unique de vérité — miroir exact des DTOs et enums Java backend.
// ─────────────────────────────────────────────────────────────────────────────

// ══════════════════════════════════════════════════════════════════════════════
// ENUMS
// ══════════════════════════════════════════════════════════════════════════════

export type ServiceStatus   = "ACTIF" | "INACTIF" | "MAINTENANCE"

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

export type InstanceTypeFamily = "u1" | "cx1" | "m1" | "d1" | "n1" | "o1" | "rt1"

export type PlanTier      = "STARTER" | "BUSINESS" | "ENTERPRISE"
export type BillingCycle  = "HORAIRE" | "MENSUEL" | "ANNUEL"

/** Miroir exact de DeploymentStatus.java */
export type DeploymentStatus =
  | "EN_ATTENTE"
  | "PROVISIONNEMENT"
  | "ACTIF"
  | "EN_LIGNE"
  | "MAINTENANCE"
  | "ARRETE"
  | "ECHEC"
  | "SUPPRIME"

/** Miroir exact de AvailabilityZone.java */
export type AvailabilityZone = "EO" | "DATAXION" | "TT"

export type OperatingSystem =
  | "UBUNTU_24_04_LTS" | "UBUNTU_22_04_LTS"
  | "DEBIAN_12"        | "DEBIAN_11"
  | "ROCKY_LINUX_9"    | "ALMA_LINUX_9"
  | "CENTOS_STREAM_9"
  | "WINDOWS_SERVER_2022" | "WINDOWS_SERVER_2019"
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

export const CATEGORY_INSTANCE_TYPE: Record<ServiceCategory, string | null> = {
  // ── VM ──────────────────────────────
  CALCUL:       "u1.small",
  HEBERGEMENT:  "o1.small",
  IA:           "cx1.xlarge",
  // ── Non-VM ──────────────────────────
  STOCKAGE:     null,
  BASE_DONNEES: null,
  RESEAU:       null,
  EMAIL:        null,
  SECURITE:     null,
  IAM:          null,
}
export const CATEGORY_ICONS: Record<ServiceCategory, string> = {
  CALCUL:       "🖥️",
  HEBERGEMENT:  "🌐",
  IA:           "🤖",
  STOCKAGE:     "💾",
  BASE_DONNEES: "🗄️",
  RESEAU:       "🔀",
  EMAIL:        "📧",
  SECURITE:     "🔒",
  IAM:          "👤",
}
export const CATEGORY_LABELS: Record<ServiceCategory, string> = {
  CALCUL:       "Calcul",
  HEBERGEMENT:  "Hébergement",
  STOCKAGE:     "Stockage",
  BASE_DONNEES: "Base de données",
  RESEAU:       "Réseau",
  EMAIL:        "Email",
  IA:           "Intelligence Artificielle",
  SECURITE:     "Sécurité",
  IAM:          "Gestion d'accès",
}

export type AbonnementStatus = "EN_ATTENTE" | "ACTIF" | "SUSPENDU" | "RESILIE" | "EXPIRE"
export type InvoiceStatus    = "BROUILLON"  | "EMISE" | "PAYEE"    | "EN_RETARD"

// ══════════════════════════════════════════════════════════════════════════════
// DTOs — miroirs exacts des classes Java
// ══════════════════════════════════════════════════════════════════════════════

export interface PlanDTO {
  id:           number
  name:         string
  description:  string | null
  tier:         PlanTier
  price:        number           // BigDecimal Java → number JS
  billingCycle: BillingCycle
  vcores:       number | null
  ramGb:        number | null
  storageGb:    number | null
  isActive:     boolean
  serviceId:    number
  serviceName:  string | null

}

export interface CloudServiceDTO {
  id:                      number
  name:                    string
  description:             string | null
  category:                ServiceCategory
  icon:                    string | null
  status:                  ServiceStatus
  plans:                   PlanDTO[]
  defaultInstanceType?:    string | null
  availableInstanceTypes?: string[]
}

/**
 * Miroir exact de DeploymentDTO.java
 * Utilisé par GET /api/deployments et GET /api/deployments/{id}
 * Correspond au tableau "Mes Services" du dashboard.
 */
export interface DeploymentDTO {
  id:                   number
  resourceName:         string
  description:          string | null
  status:               DeploymentStatus

  // Plan & service
  planId:               number | null
  planName:             string | null
  serviceId:            number | null
  serviceName:          string | null
  serviceIcon:          string | null
  categoryName:         string | null

  // Localisation
  regionName:           string | null      // ex: "Paris"
  datacenterLabel:      string | null      // ex: "DC1"
  availabilityZone:     AvailabilityZone | null

  // OS — enum OperatingSystem (pas string)
  operatingSystem:      OperatingSystem | null
  operatingSystemLabel: string | null      // ex: "Ubuntu 24.04 LTS"

  // Specs
  vcores:               number | null
  ramGb:                number | null
  storageGb:            number | null      // base + additionalStorageGb

  // Options
  backupEnabled:        boolean | null
  monitoringEnabled:    boolean | null
  antiDdosEnabled:      boolean | null

  // Réseau
  vpcId:                string | null
  subnetId:             string | null

  // Tarif
  monthlyPriceHt:       number | null      // BigDecimal Java → number JS

  // Projet
  projectId:            number | null
  projectName:          string | null

  // Dates
  createdAt:            string | null      // LocalDateTime → ISO string
  deployedAt:           string | null
}

// ──────────────────────────────────────────────────────────────────────────────

export interface AbonnementResponse {
  id:                 number
  planId:             number
  planName:           string
  serviceName:        string | null
  status:             AbonnementStatus
  prixSnapshot:       number
  billingCycle:       BillingCycle
  dateDebut:          string
  dateFin:            string | null
  dateResiliation:    string | null
  autoRenouvellement: boolean
  deploymentId:       number | null
  resourceName:       string | null
  createdAt:          string
}

export interface AbonnementRequest {
  planId:              number
  deploymentId?:       number
  autoRenouvellement?: boolean
}

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

// ══════════════════════════════════════════════════════════════════════════════
// PAYLOADS — miroirs des @RequestBody Java
// ══════════════════════════════════════════════════════════════════════════════

export interface CloudServiceRequest {
  name:         string
  description?: string
  icon?:        string
  category:     ServiceCategory
  status:       ServiceStatus
}

export interface PlanRequest {
  name:         string
  description?: string
  tier:         PlanTier
  price:        number
  billingCycle: BillingCycle
  vcores?:      number
  ramGb?:       number
  storageGb?:   number
  serviceId:    number
}
/*export type DeploymentPollResult = {
  status: string
  resourceName?: string
}*/
export interface DeploymentPollResult extends DeploymentDTO {
  vmPassword?: string
}

export interface DeploymentRequest {
  resourceName:         string
  planId:               number
  projectId?:           number
  regionId?:            number
  availabilityZone?:    AvailabilityZone
  description?:         string
  backupEnabled?:       boolean
  monitoringEnabled?:   boolean
  antiDdosEnabled?:     boolean
  additionalStorageGb?: number
  operatingSystem?:     OperatingSystem
}

// ══════════════════════════════════════════════════════════════════════════════
// ALIASES
// ══════════════════════════════════════════════════════════════════════════════

export type CloudService         = CloudServiceDTO
export type Plan                 = PlanDTO
export type CreateServicePayload = CloudServiceRequest
export type UpdateServicePayload = Partial<CloudServiceRequest>
export type CreatePlanPayload    = PlanRequest
export type UpdatePlanPayload    = Partial<PlanRequest>