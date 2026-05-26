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
  | "OBJECT_STORAGE"
  | "BLOCK_STORAGE"
  | "FILE_STORAGE"

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
  OBJECT_STORAGE: null,
  BLOCK_STORAGE:  null,
  FILE_STORAGE:   null,
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
  OBJECT_STORAGE: "🪣",
  BLOCK_STORAGE:  "💿",
  FILE_STORAGE:   "📁",
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
  OBJECT_STORAGE: "Object Storage",
  BLOCK_STORAGE:  "Block Storage",
  FILE_STORAGE:   "File Storage",
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
  availabilitySet?: string | null  
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
  availabilitySet?:     string           // ← ajouter

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

// ══════════════════════════════════════════════════════════════════════════════
// IMAGE REGISTRY — Internal Registry OpenShift uniquement
// ══════════════════════════════════════════════════════════════════════════════

// RegistryType : INTERNAL uniquement (Quay retiré — plan gratuit = pas de repo privé)
export type RegistryType   = "INTERNAL"
export type RegistryStatus = "PROVISIONING" | "ACTIVE" | "ERROR" | "DELETING"

export interface ImageRegistryRequest {
  name:         string
  description?: string
  // Pas de registryType — toujours INTERNAL côté backend
}

export interface ImageRegistryResponse {
  id:                   number
  name:                 string
  description:          string | null
  status:               RegistryStatus
  openshiftNamespace:   string
  registryUrl:          string | null   // URL interne cluster
  externalRegistryUrl:  string | null   // URL externe (Route OpenShift)
  serviceAccountName:   string | null
  pullSecretName:       string | null
  // Commandes générées côté backend
  loginCommand:         string | null
  pushCommand:          string | null
  pullCommand:          string | null
  createdAt:            string
  updatedAt:            string
}

export const REGISTRY_STATUS_META: Record<RegistryStatus, {
  label: string
  color: string
}> = {
  PROVISIONING: { label: "Provisionnement", color: "text-amber-600  bg-amber-50  border-amber-200" },
  ACTIVE:       { label: "Actif",           color: "text-green-700  bg-green-50  border-green-200" },
  ERROR:        { label: "Erreur",          color: "text-red-600    bg-red-50    border-red-200"   },
  DELETING:     { label: "Suppression",     color: "text-gray-500   bg-gray-50   border-gray-200"  },
}

// Features de l'Internal Registry pour affichage catalogue
export const INTERNAL_REGISTRY_FEATURES = [
  "Privé par défaut — isolation namespace OpenShift",
  "ServiceAccount + pull secret auto-générés",
  "Accessible en interne (cluster) et externe (Route)",
  "Compatible S2I et Tekton Pipelines",
  "Zéro coût — inclus dans OpenShift",
]

// ══════════════════════════════════════════════════════════════════════════════
// KNATIVE SERVERLESS — inchangé
// ══════════════════════════════════════════════════════════════════════════════

export type KnativeType     = "SERVING" | "FUNCTION"
export type KnativeStatus   = "DEPLOYING" | "ACTIVE" | "SCALED_TO_ZERO" | "ERROR" | "DELETING"
export type EventSourceType = "API_SERVER" | "PING" | "KAFKA" | "SINK_BINDING"

export interface KnativeServiceRequest {
  name:           string
  knativeType:    KnativeType
  containerImage: string
  minScale?:      number
  maxScale?:      number
  cpuLimit?:      string
  memoryLimit?:   string
  eventSource?:   EventSourceType
  kafkaTopic?:    string
  cronSchedule?:  string
}

export interface KnativeServiceResponse {
  id:                 number
  name:               string
  knativeType:        KnativeType
  status:             KnativeStatus
  containerImage:     string
  serviceUrl:         string | null
  openshiftNamespace: string
  minScale:           number
  maxScale:           number
  cpuLimit:           string
  memoryLimit:        string
  eventSource:        EventSourceType | null
  kafkaTopic:         string | null
  cronSchedule:       string | null
  createdAt:          string
  updatedAt:          string
}

export const KNATIVE_STATUS_META: Record<KnativeStatus, {
  label: string
  color: string
  icon:  string
}> = {
  DEPLOYING:      { label: "Déploiement",  color: "text-amber-600 bg-amber-50  border-amber-200", icon: "⏳" },
  ACTIVE:         { label: "Actif",        color: "text-green-700 bg-green-50  border-green-200", icon: "✅" },
  SCALED_TO_ZERO: { label: "En veille",    color: "text-blue-600  bg-blue-50   border-blue-200",  icon: "💤" },
  ERROR:          { label: "Erreur",       color: "text-red-600   bg-red-50    border-red-200",   icon: "❌" },
  DELETING:       { label: "Suppression",  color: "text-gray-500  bg-gray-50   border-gray-200",  icon: "🗑️" },
}

export const EVENT_SOURCE_META: Record<EventSourceType, {
  label:       string
  icon:        string
  description: string
}> = {
  API_SERVER:   { label: "API Server",  icon: "⚙️", description: "Réagit aux events Kubernetes" },
  PING:         { label: "Cron / Ping", icon: "⏰", description: "Déclenchement planifié (cron)" },
  KAFKA:        { label: "Kafka",       icon: "📨", description: "Traitement de messages async"  },
  SINK_BINDING: { label: "SinkBinding", icon: "🔗", description: "Connecte un pod existant"      },
}
// ══════════════════════════════════════════════════════════════════════════════
// STORAGE
// ══════════════════════════════════════════════════════════════════════════════

export type StorageResourceStatus =
  | "PENDING"
  | "PROVISIONING"
  | "READY"
  | "FAILED"
  | "DELETED"

export type StorageType =
  | "OBJECT_STORAGE"
  | "BLOCK_STORAGE"
  | "FILE_STORAGE"

export interface StorageResourceResponse {
  id:               number
  deploymentId:     number
  resourceName:     string
  namespace:        string
  storageType:      StorageType
  capacity:         string | null
  storageClassName: string | null
  s3Endpoint:       string | null
  bucketName:       string | null
  accessKeyId:      string | null
  secretAccessKey:  string | null
  status:           StorageResourceStatus
  createdAt:        string
  readyAt:          string | null
}

export interface StorageCredentials {
  bucketName:      string
  s3Endpoint:      string
  accessKeyId:     string
  secretAccessKey: string
  consoleEndpoint?: string   // ← ajouter

}

// ── Helpers catégorie ─────────────────────────────────────────────────────────

export const STORAGE_CATEGORIES: ServiceCategory[] = [
  "STOCKAGE",
  "OBJECT_STORAGE",
  "BLOCK_STORAGE",
  "FILE_STORAGE",
]

export const CATEGORIES_WITHOUT_OS: ServiceCategory[] = [
  "STOCKAGE",
  "RESEAU",
  "EMAIL",
  "SECURITE",
  "IAM",
  "BASE_DONNEES",
  "OBJECT_STORAGE",
  "BLOCK_STORAGE",
  "FILE_STORAGE",
]

export const CATEGORIES_WITHOUT_AS: ServiceCategory[] = [
  "STOCKAGE",
  "RESEAU",
  "EMAIL",
  "SECURITE",
  "IAM",
  "BASE_DONNEES",
  "OBJECT_STORAGE",
  "BLOCK_STORAGE",
  "FILE_STORAGE",
]

export function isStorageCategory(category?: ServiceCategory | null): boolean {
  return !!category && STORAGE_CATEGORIES.includes(category)
}

export function requiresVm(category?: ServiceCategory | null): boolean {
  return category === "CALCUL" || category === "HEBERGEMENT" || category === "IA"
}

// ══════════════════════════════════════════════════════════════════════════════
// DATABASE
// ══════════════════════════════════════════════════════════════════════════════

export type DatabaseStatus =
  | "PROVISIONING"
  | "READY"
  | "FAILED"
  | "DELETING"
  | "DELETED"

export interface DatabaseResourceResponse {
  id:               number
  deploymentId:     number
  clusterName:      string
  namespace:        string
  instances:        number
  storageGb:        number
  storageClassName: string
  hostRw:           string | null
  hostRo:           string | null
  port:             number
  dbName:           string
  dbUser:           string
  status:           DatabaseStatus
  readyAt:          string | null
  errorMessage:     string | null
}

export interface DatabaseCredentials {
  host:     string
  hostRo:   string
  port:     number
  dbName:   string
  username: string
  password: string
  jdbcUrl:  string
}

export const DATABASE_CATEGORIES: ServiceCategory[] = ["BASE_DONNEES"]

export function isDatabaseCategory(category?: ServiceCategory | null): boolean {
  return category === "BASE_DONNEES"
}

export const DATABASE_STATUS_META: Record<DatabaseStatus, {
  label: string
  color: string
  icon:  string
}> = {
  PROVISIONING: { label: "Provisionnement", color: "text-amber-600 bg-amber-50  border-amber-200", icon: "⏳" },
  READY:        { label: "Prête",           color: "text-green-700 bg-green-50  border-green-200", icon: "✅" },
  FAILED:       { label: "Erreur",          color: "text-red-600   bg-red-50    border-red-200",   icon: "❌" },
  DELETING:     { label: "Suppression",     color: "text-gray-500  bg-gray-50   border-gray-200",  icon: "🗑️" },
  DELETED:      { label: "Supprimée",       color: "text-gray-400  bg-gray-50   border-gray-200",  icon: "🗑️" },
}

// Étapes UI déploiement BDD
export const DATABASE_DEPLOY_STEPS = [
  { id: 1, label: "Commande validée",      description: "Ressources réservées dans le cluster" },
  { id: 2, label: "Création du cluster",   description: "Déploiement CloudNativePG sur OpenShift" },
  { id: 3, label: "Initialisation",        description: "Primary + Standbys en cours de démarrage" },
  { id: 4, label: "Réplication active",    description: "Streaming replication entre les instances" },
  { id: 5, label: "Base de données prête", description: "Credentials disponibles — connexion active" },
]