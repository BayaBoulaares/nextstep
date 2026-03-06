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

export type ServiceStatus = "ACTIF" | "INACTIF" | "MAINTENANCE"

export type ServiceCategory =
  | "CALCUL" | "HEBERGEMENT" | "STOCKAGE" | "BASE_DONNEES"
  | "RESEAU" | "EMAIL" | "IA" | "SECURITE" | "IAM"

export type CloudType = "PRIVÉ" | "PUBLIC" | "HYBRIDE"

export type PlanTier =
  | "DEMARRAGE" | "AVANTAGE" | "ESSENTIEL" | "CONFORT"
  | "ELITE" | "PROFESSIONNEL" | "ENTREPRISE"

export type BillingCycle = "HORAIRE" | "MENSUEL" | "ANNUEL"

export type DeploymentStatus =
  | "EN_LIGNE" | "MAINTENANCE" | "ECHEC" | "PROVISIONNEMENT"
  | "ARRETÉ" | "EN_ATTENTE" | "SUPPRIMÉ"

/** AvailabilityZone.java */
export type AvailabilityZone = "EO" | "DATAXION" | "TT"

// ─── DTOs ─────────────────────────────────────────────────────────────────────

export interface PlanDTO {
  id:           number
  name:         string
  description:  string | null
  tier:         PlanTier
  price:        number
  billingCycle: BillingCycle
  vcores:       number | null
  ramGb:        number | null
  storageGb:    number | null
  isActive:     boolean
  serviceId:    number
  serviceName:  string | null
  badge:        string | null
  isPopular:    boolean | null
}

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

/** Miroir de DeploymentDTO.java */
export interface DeploymentDTO {
  id:                 number
  resourceName:       string
  description:        string | null
  status:             DeploymentStatus

  // Plan & service
  planId:             number
  planName:           string
  serviceId:          number
  serviceName:        string
  serviceIcon:        string | null
  cloudTypeName:      string

  // Localisation
  regionName:         string
  datacenterLabel:    string | null
  availabilityZone:   AvailabilityZone | null

  // Config
  operatingSystem:    string | null
  vcores:             number | null
  ramGb:              number | null
  storageGb:          number | null

  // Options
  backupEnabled:      boolean | null
  monitoringEnabled:  boolean | null
  antiDdosEnabled:    boolean | null

  // Réseau
  vpcId:              string | null
  subnetId:           string | null

  // Tarif
  monthlyPriceHt:     number

  // Projet
  projectId:          number | null
  projectName:        string | null

  // Dates
  createdAt:          string | null
  deployedAt:         string | null
}

/** Miroir de DeploymentRequest.java */
export interface DeploymentRequest {
  resourceName:         string           // @NotBlank
  planId:               number           // @NotNull
  projectId?:            number           // @NotNull
  regionId?:             number           // @NotNull
  availabilityZone?:    AvailabilityZone
  description?:         string
  operatingSystem?:     string
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

// ─── Requests services/plans ──────────────────────────────────────────────────

export interface CloudServiceRequest {
  name:         string
  description?: string
  cloudType:    CloudType
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
  serviceId:    number
  vcores?:      number
  ramGb?:       number
  storageGb?:   number
  badge?:       string
  isPopular?:   boolean
}

// ─── Alias ────────────────────────────────────────────────────────────────────

export type CloudService         = CloudServiceDTO
export type Plan                 = PlanDTO
export type CreateServicePayload = CloudServiceRequest
export type UpdateServicePayload = Partial<CloudServiceRequest>
export type CreatePlanPayload    = PlanRequest
export type UpdatePlanPayload    = Partial<PlanRequest>