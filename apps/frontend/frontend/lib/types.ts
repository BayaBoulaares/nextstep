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
// types/storage.ts

export type StorageType = "OBJECT_STORAGE" | "BLOCK_STORAGE" | "FILE_STORAGE";
export type StorageStatut = "EN_COURS" | "ACTIF" | "ERREUR" | "SUPPRIME";

export interface StorageProvisionRequest {
  type: StorageType;
  capaciteGo: number;
  planId: number;
  nomPersonnalise?: string;
}

export interface StorageResponse {
  id: number;
  abonnementId: number;
  type: StorageType;
  capaciteGo: number;
  namespace: string;
  ressourceNom: string;
  statut: StorageStatut;
  createdAt: string;
  // Object Storage
  endpointS3?: string;
  accessKey?: string;
  secretKey?: string;
  bucketName?: string;
  // Block / File
  storageClassName?: string;
  accessMode?: string;
}

export const STORAGE_LABELS: Record<StorageType, string> = {
  OBJECT_STORAGE: "Object Storage",
  BLOCK_STORAGE: "Block Storage",
  FILE_STORAGE: "File Storage",
};

export const STORAGE_DESCRIPTIONS: Record<StorageType, string> = {
  OBJECT_STORAGE: "Stockage S3-compatible pour fichiers, backups et médias",
  BLOCK_STORAGE: "Volumes persistants hautes performances pour bases de données",
  FILE_STORAGE: "Partage NFS multi-pods pour fichiers partagés",
};

export const STORAGE_ICONS: Record<StorageType, string> = {
  OBJECT_STORAGE: "🪣",
  BLOCK_STORAGE: "💾",
  FILE_STORAGE: "📁",
};

export const STATUT_COLORS: Record<StorageStatut, string> = {
  EN_COURS: "text-yellow-600 bg-yellow-50",
  ACTIF: "text-green-600 bg-green-50",
  ERREUR: "text-red-600 bg-red-50",
  SUPPRIME: "text-gray-500 bg-gray-50",
};



export interface StorageProvisionRequest {
  type: StorageType
  capaciteGo: number
  planId: number
  nomPersonnalise?: string
}

export interface StorageResponse {
  id: number
  abonnementId: number
  type: StorageType
  capaciteGo: number
  namespace: string
  ressourceNom: string
  statut: StorageStatut
  createdAt: string
  // Object Storage uniquement
  endpointS3?: string
  accessKey?: string
  secretKey?: string
  bucketName?: string
  // Block / File Storage
  storageClassName?: string
  accessMode?: string
}

export const STORAGE_META: Record<StorageType, {
  label: string
  icon: string
  tech: string
  accessMode: string
  useCases: string[]
  prixParGo: number
  planId: number
  storageClass: string
  color: "blue" | "amber" | "teal"
}> = {
  OBJECT_STORAGE: {
    label: "Object Storage",
    icon: "ti-bucket",
    tech: "NooBaa · S3-compatible",
    accessMode: "API S3 · multi-tenant",
    useCases: ["Backups", "Médias", "Artefacts CI"],
    prixParGo: 0.02,
    planId: 10,
    storageClass: "openshift-storage.noobaa.io",
    color: "blue",
  },
  BLOCK_STORAGE: {
    label: "Block Storage",
    icon: "ti-device-floppy",
    tech: "Ceph RBD · ReadWriteOnce",
    accessMode: "Volume persistant · 1 pod",
    useCases: ["Bases de données", "Redis", "Kafka"],
    prixParGo: 0.05,
    planId: 11,
    storageClass: "ocs-storagecluster-ceph-rbd",
    color: "amber",
  },
  FILE_STORAGE: {
    label: "File Storage",
    icon: "ti-folder",
    tech: "CephFS · ReadWriteMany",
    accessMode: "Partage NFS · multi-pods",
    useCases: ["Logs partagés", "CMS", "Assets"],
    prixParGo: 0.04,
    planId: 12,
    storageClass: "ocs-storagecluster-cephfs",
    color: "teal",
  },
}

export const STORAGE_SIZES = [10, 50, 100, 250, 500, 1000]

export const STATUT_META: Record<StorageStatut, { label: string; color: string }> = {
  EN_COURS: { label: "En cours",  color: "text-amber-600  bg-amber-50  border-amber-200"  },
  ACTIF:    { label: "Actif",     color: "text-green-700  bg-green-50  border-green-200"  },
  ERREUR:   { label: "Erreur",    color: "text-red-600    bg-red-50    border-red-200"    },
  SUPPRIME: { label: "Supprimé",  color: "text-gray-500   bg-gray-50   border-gray-200"   },
}
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