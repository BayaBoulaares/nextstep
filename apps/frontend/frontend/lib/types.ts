// // ─── SOURCE DE VÉRITÉ UNIQUE ──────────────────────────────────────────────────
// // Miroir exact des classes Java backend (DTOs + enums + requests)
// // NE PAS dupliquer dans d'autres fichiers types.
// // ─────────────────────────────────────────────────────────────────────────────

// // ─── Enums (miroir exact des enums Java) ──────────────────────────────────────

// /** ServiceStatus.java */
// export type ServiceStatus = "ACTIF" | "INACTIF" | "MAINTENANCE"

// /** ServiceCategory.java */
// export type ServiceCategory =
//   | "CALCUL"
//   | "HEBERGEMENT"
//   | "STOCKAGE"
//   | "BASE_DONNEES"
//   | "RESEAU"
//   | "EMAIL"
//   | "IA"
//   | "SECURITE"
//   | "IAM"

// /** CloudType.java */
// export type CloudType = "PRIVÉ" | "PUBLIC" | "HYBRIDE"

// /** PlanTier.java */
// export type PlanTier =
//   | "DEMARRAGE"
//   | "AVANTAGE"
//   | "ESSENTIEL"
//   | "CONFORT"
//   | "ELITE"
//   | "PROFESSIONNEL"
//   | "ENTREPRISE"

// /** BillingCycle.java */
// export type BillingCycle = "HORAIRE" | "MENSUEL" | "ANNUEL"

// /** DeploymentStatus.java */
// export type DeploymentStatus =
//   | "EN_LIGNE"
//   | "MAINTENANCE"
//   | "ECHEC"
//   | "PROVISIONNEMENT"
//   | "ARRETÉ"
//   | "EN_ATTENTE"
//   | "SUPPRIMÉ"

// export type AvailabilityZone = "EO" | "DATAXION" | "TT"

// // ─── DTOs retournés par le backend ────────────────────────────────────────────

// /**
//  * Miroir de PlanDTO.java
//  * ⚠️  isActive (Boolean Java) → isActive (boolean TS) — PAS "active"
//  */
// export interface PlanDTO {
//   id:           number
//   name:         string
//   description:  string | null
//   tier:         PlanTier
//   price:        number           // BigDecimal Java → number JS
//   billingCycle: BillingCycle
//   vcores:       number | null
//   ramGb:        number | null
//   storageGb:    number | null
//   isActive:     boolean          // ← Boolean Java sérialisé en "isActive" par Jackson
//   serviceId:    number
//   serviceName:  string | null
//   badge:        string | null    // ex: "POPULAIRE", "RECOMMANDÉ"
//   isPopular:    boolean | null
// }

// /**
//  * Miroir de CloudServiceDTO.java
//  */
// export interface CloudServiceDTO {
//   id:          number
//   name:        string            // ← "name" (pas "title")
//   description: string | null
//   category:    ServiceCategory
//   cloudType:   CloudType
//   icon:        string | null
//   status:      ServiceStatus
//   plans:       PlanDTO[]
// }

// // ─── Payloads envoyés au backend (@Valid @RequestBody) ────────────────────────

// /**
//  * Miroir de CloudServiceRequest.java
//  * @NotBlank name
//  * @NotNull  cloudType, category, status
//  */
// export interface CloudServiceRequest {
//   name:         string           // @NotBlank — obligatoire
//   description?: string           // optionnel
//   cloudType:    CloudType        // @NotNull — obligatoire
//   icon?:        string           // optionnel
//   category:     ServiceCategory  // @NotNull — obligatoire
//   status:       ServiceStatus    // @NotNull — obligatoire
// }

// /**
//  * Miroir de PlanRequest.java
//  * @NotBlank name
//  * @NotNull  tier, price, billingCycle, serviceId
//  * ⚠️  PAS de champ "isActive" ici — géré uniquement via PATCH /plans/:id/toggle
//  * ⚠️  PAS de champ "specs"   ici — calculé côté backend à partir de vcores/ramGb/storageGb
//  */
// export interface PlanRequest {
//   name:         string           // @NotBlank
//   description?: string
//   tier:         PlanTier         // @NotNull
//   price:        number           // @NotNull BigDecimal
//   billingCycle: BillingCycle     // @NotNull
//   serviceId:    number           // @NotNull Long
//   vcores?:      number
//   ramGb?:       number
//   storageGb?:   number
//   badge?:       string
//   isPopular?:   boolean
// }

// // ─── Déploiements ─────────────────────────────────────────────────────────────

// export interface DeploymentMetric {
//   label: string
//   value: string
//   warn:  boolean
// }

// export interface DeploymentDTO {
//   id:            number
//   name:          string
//   cloudType:     CloudType
//   planName:      string
//   region:        string
//   status:        DeploymentStatus
//   pricePerMonth: number
//   metrics:       DeploymentMetric[]
// }

// export interface DeploymentRequest {
//   serviceId:   number
//   planId:      number
//   name:        string
//   projectName: string
//   region:      string
//   zone:        AvailabilityZone
//   os?:         string
//   storageGb?:  number
//   vpcId?:      string
//   options?: {
//     backup?:     boolean
//     monitoring?: boolean
//     ddos?:       boolean
//     ssh?:        boolean
//   }
// }

// // ─── Alias pour la couche feature (services/) ─────────────────────────────────
// // Permet d'importer depuis "features/services/types" sans redéfinir

// export type CloudService         = CloudServiceDTO
// export type Plan                 = PlanDTO
// export type CreateServicePayload = CloudServiceRequest
// export type UpdateServicePayload = Partial<CloudServiceRequest>
// export type CreatePlanPayload    = PlanRequest
// export type UpdatePlanPayload    = Partial<PlanRequest>

// ─── SOURCE DE VÉRITÉ UNIQUE ──────────────────────────────────────────────────
// Miroir exact des classes Java backend (DTOs + enums + requests)
// ─────────────────────────────────────────────────────────────────────────────
//@/lib/types
// @/lib/types.ts
// Source unique de vérité pour tous les types TypeScript du projet.
// Importe toujours depuis "@/lib/types", jamais depuis "@/features/services/types".
// ─────────────────────────────────────────────────────────────────────────────

// ══════════════════════════════════════════════════════════════════════════════
// ENUMS
// ══════════════════════════════════════════════════════════════════════════════

export type ServiceStatus = "ACTIF" | "INACTIF" | "MAINTENANCE"

export type ServiceCategory =
  | "CALCUL" | "HEBERGEMENT" | "STOCKAGE" | "BASE_DONNEES"
  | "RESEAU" | "EMAIL" | "IA" | "SECURITE" | "IAM"

export type CloudType = "PRIVÉ" | "PUBLIC" | "HYBRIDE"

export type PlanTier =
  | "DEMARRAGE" | "AVANTAGE" | "ESSENTIEL" | "CONFORT"
  | "ELITE" | "PROFESSIONNEL" | "ENTREPRISE"

/** BillingCycle.java — USAGE ajouté pour les plans Pay-As-You-Go */
export type BillingCycle = "HORAIRE" | "MENSUEL" | "ANNUEL" | "USAGE"

export type DeploymentStatus =
  | "EN_LIGNE" | "MAINTENANCE" | "ECHEC" | "PROVISIONNEMENT"
  | "ARRETÉ" | "EN_ATTENTE" | "SUPPRIMÉ"

export type AvailabilityZone = "EO" | "DATAXION" | "TT"

/** OperatingSystem.java — remplace le String libre dans Deployment */
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

/** Labels lisibles pour les selects — miroir du champ `label` dans l'enum Java */
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

/** AbonnementStatus.java */
export type AbonnementStatus =
  | "EN_ATTENTE" | "ACTIF" | "SUSPENDU" | "RESILIE" | "EXPIRE"

/** UsageMetricType.java */
export type UsageMetricType =
  | "VCPU_HEURE" | "RAM_GB_HEURE" | "STOCKAGE_GB_MOIS"
  | "REQUETES_1000" | "BANDE_PASSANTE_GB"

/** InvoiceStatus.java */
export type InvoiceStatus = "BROUILLON" | "EMISE" | "PAYEE" | "EN_RETARD"

// ══════════════════════════════════════════════════════════════════════════════
// DTOs
// ══════════════════════════════════════════════════════════════════════════════

/** PlanPricingDTO.java — grille tarifaire unitaire d'un plan PAYG */
export interface PlanPricingDTO {
  id:           number
  metricType:   UsageMetricType
  metricLabel:  string   // fourni par le backend via UsageMetricType.label
  pricePerUnit: number   // BigDecimal → number (6 décimales côté Java)
  unit:         string   // ex: "heure", "Go", "1 000 req."
  freeQuota:    number   // quota gratuit avant facturation
}

/** PlanDTO.java — price nullable pour les plans PAYG */
export interface PlanDTO {
  id:           number
  name:         string
  description:  string | null
  tier:         PlanTier
  price:        number | null    // null si isPayAsYouGo = true
  billingCycle: BillingCycle
  vcores:       number | null
  ramGb:        number | null
  storageGb:    number | null
  isActive:     boolean
  serviceId:    number
  serviceName:  string | null
  badge:        string | null
  isPopular:    boolean | null
  isPayAsYouGo: boolean          // nouveau
  planPricings: PlanPricingDTO[] // vide pour les plans fixes
}

/** CloudServiceDTO.java */
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

/** DeploymentDTO.java — operatingSystem passe de string à enum */
export interface DeploymentDTO {
  id:                   number
  resourceName:         string
  description:          string | null
  status:               DeploymentStatus
  planId:               number
  planName:             string
  serviceId:            number
  serviceName:          string
  serviceIcon:          string | null
  cloudTypeName:        string
  regionName:           string
  datacenterLabel:      string | null
  availabilityZone:     AvailabilityZone | null
  operatingSystem:      OperatingSystem | null  // était string, maintenant enum
  operatingSystemLabel: string | null           // nouveau — label lisible du backend
  vcores:               number | null
  ramGb:                number | null
  storageGb:            number | null
  backupEnabled:        boolean | null
  monitoringEnabled:    boolean | null
  antiDdosEnabled:      boolean | null
  vpcId:                string | null
  subnetId:             string | null
  monthlyPriceHt:       number
  projectId:            number | null
  projectName:          string | null
  createdAt:            string | null
  deployedAt:           string | null
}

/** AbonnementResponse.java */
export interface AbonnementResponse {
  id:                 number
  planId:             number
  planName:           string
  serviceName:        string | null
  isPayAsYouGo:       boolean
  status:             AbonnementStatus
  prixSnapshot:       number        // 0 pour les plans PAYG
  billingCycle:       BillingCycle
  dateDebut:          string
  dateFin:            string | null // null si PAYG ou autoRenouvellement
  dateResiliation:    string | null
  autoRenouvellement: boolean
  deploymentId:       number | null
  resourceName:       string | null // nom du déploiement lié
  createdAt:          string
}

/** UsageRecordResponse.java */
export interface UsageRecordResponse {
  id:           number
  abonnementId: number
  deploymentId: number
  resourceName: string
  metricType:   UsageMetricType
  metricLabel:  string
  quantity:     number  // quantité brute mesurée
  cost:         number  // max(0, qty - freeQuota) × pricePerUnit
  periodStart:  string
  periodEnd:    string
  recordedAt:   string
}

/** InvoiceResponse.java */
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
// REQUEST PAYLOADS
// ══════════════════════════════════════════════════════════════════════════════

export interface CloudServiceRequest {
  name:         string
  description?: string
  cloudType:    CloudType
  icon?:        string
  category:     ServiceCategory
  status:       ServiceStatus
}

/** PlanRequest.java — price nullable, isPayAsYouGo ajouté */
export interface PlanRequest {
  name:          string
  description?:  string
  tier:          PlanTier
  price?:        number | null   // null si isPayAsYouGo = true
  billingCycle?: BillingCycle    // forcé à USAGE côté backend si PAYG
  serviceId:     number
  vcores?:       number
  ramGb?:        number
  storageGb?:    number
  badge?:        string
  isPopular?:    boolean
  isPayAsYouGo?: boolean         // nouveau
}

/** DeploymentRequest.java — operatingSystem passe de string à enum */
export interface DeploymentRequest {
  resourceName:         string
  planId:               number
  projectId?:           number
  regionId?:            number
  availabilityZone?:    AvailabilityZone
  description?:         string
  operatingSystem?:     OperatingSystem  // était string, maintenant enum
  additionalStorageGb?: number
  tagsJson?:            string
  backupEnabled?:       boolean
  monitoringEnabled?:   boolean
  antiDdosEnabled?:     boolean
  sshKeyManagement?:    boolean
  vpcId?:               string
  subnetId?:            string
  securityGroup?:       string
}

/** AbonnementRequest.java */
export interface AbonnementRequest {
  planId:              number
  deploymentId?:       number
  autoRenouvellement?: boolean
}

// ══════════════════════════════════════════════════════════════════════════════
// ALIAS
// ══════════════════════════════════════════════════════════════════════════════

export type CloudService         = CloudServiceDTO
export type Plan                 = PlanDTO
export type CreateServicePayload = CloudServiceRequest
export type UpdateServicePayload = Partial<CloudServiceRequest>
export type CreatePlanPayload    = PlanRequest
export type UpdatePlanPayload    = Partial<PlanRequest>