// // lib/services/vms.api.ts
// import { apiFetch } from "@/lib/apiClient"

// export interface VmDTO {
//   name:      string
//   namespace: string
//   status:    string
//   ip?:       string
//   cpuCores?: number
//   ramGb?:    string   // ✅ string (ex: "1Gi")
//   osImage?:  string
//   createdAt?: string
//   vmPassword?: string // ✅ mot de passe affiché une fois après création
// }

// export interface VncUrlDTO {
//   url:   string
//   token: string
// }

// export interface VmRequest {
//   vmName:     string
//   cpuCores:   number
//   ramGb:      number
//   diskGb:     number
//   osImage:    string
//   vmPassword?: string
// }

// export interface TerraformResultDTO {
//   status:   string
//   vmName:   string
//   output:   string
//   password: string
// }

// export const getMyVms  = ()                  => apiFetch<VmDTO[]>("/api/vms")
// export const startVm   = (name: string)      => apiFetch<void>(`/api/vms/${name}/start`,  { method: "POST" })
// export const stopVm    = (name: string)      => apiFetch<void>(`/api/vms/${name}/stop`,   { method: "POST" })
// export const deleteVm  = (name: string)      => apiFetch<void>(`/api/vms/${name}`,        { method: "DELETE" })
// export const getVncUrl = (name: string)      => apiFetch<VncUrlDTO>(`/api/vms/${name}/vnc-url`)
// export const createVm  = (data: VmRequest)   => apiFetch<TerraformResultDTO>("/api/vms/create", {
//   method: "POST",
//   headers: { "Content-Type": "application/json" },
//   body: JSON.stringify(data),
// })
// export interface VmCredentials {
//   login:    string
//   password: string
// }
// export const rebootVm = (name: string) =>
//   apiFetch<void>(`/api/vms/${name}/reboot`, { method: "POST" })

// export const getVmCredentials = (name: string) =>
//   apiFetch<VmCredentials>(`/api/vms/${name}/credentials`)
// lib/services/vms.api.ts
import { apiFetch } from "@/lib/apiClient"
export interface VmSnapshot {
  name: string
  vmName: string
  createdAt: string | null
  readyToUse: boolean
  phase: string   // "Succeeded" | "InProgress" | "Failed"
}

export interface SnapshotCreateResult {
  snapshotName: string
  vmName: string
  namespace: string
}

export interface RestoreResult {
  restoreName: string
  vmName: string
  snapshotName: string
  namespace: string
}
// ── Clone types ───────────────────────────────────────────────────────────────
export interface VmCloneRequest {
  cloneName: string
  vmPassword?: string
}
 
export interface VmCloneResult {
  status: string
  vmName: string
  output: string
  password: string
}
 
export interface VmDTO {
  name: string
  namespace: string
  status: string
  ip?: string
  cpuCores?: number
  ramGb?: string
  osImage?: string
  createdAt?: string
  vmPassword?: string
  availabilitySet?: string | null   // ← ajouter
  node?: string | null   // nœud OpenShift (ex: "node2")
  fqdn?: string | null   // FQDN interne KubeVirt
  machineType?: string | null   // ex: "pc-q35-rhel9.6.0"
  dataVolumePhase?: string | null  // "ImportInProgress" | "Succeeded" | null
    instanceType?: string | null  // ← utile pour le clone (copier instanceType source)
  diskGb?: number | null        // ← utile pour le clone


}

export interface VncUrlDTO {
  url: string
  token: string
}

export interface VmRequest {
  vmName: string
  cpuCores: number
  ramGb: number
  diskGb: number
  osImage: string
  vmPassword?: string
}

export interface TerraformResultDTO {
  status: string
  vmName: string
  output: string
  password: string
}

export interface VmCredentials {
  login: string
  password: string
}

// ✅ nouveau
export interface VmNetworkInfo {
  serviceName: string
  type: string
  nodePort: number
  nodeIp: string
  sshCommand: string
}
export interface VmMetrics {
  cpuPercent: number   // ex: 0.45
  memPercent: number   // ex: 28.7
  memUsedMiB: number   // ex: 294
  memTotalMiB: number   // ex: 1024
  diskPercent: number
  diskUsed: string   // ex: "2.3 GB"
  netBps: number   // octets/s total
}

/** Événement Kubernetes lié à la VM */
export interface VmEvent {
  type: string   // "Normal" | "Warning"
  reason: string   // ex: "Started", "Pulling"
  message: string
  lastTime: string   // ex: "09:46"
  count: number
}
export interface VmConfigDTO {
  details: {
    description:      string | null
    cpuCores:         string
    ram:              string
    machineType:      string
    hostname:         string
    headlessMode:     boolean
    guestLogAccess:   boolean
    deleteProtection: boolean
  }
  disks: Array<{
    name:         string
    source:       string
    sourceRef:    string
    size:         string
    reader:       string
    iface:        string
    storageClass: string
    bootable:     boolean
  }>
  networks: Array<{
    name:        string
    model:       string
    networkName: string
    macAddress:  string
  }>
  scheduling: {
    nodeSelector:       string
    tolerations:        string
    affinityRules:      string
    evictionStrategy:   string
    deschedulerEnabled: boolean
    dedicatedResources: string
  }
}

export const getVmConfig = (name: string): Promise<VmConfigDTO> =>
  apiFetch(`/api/vms/${name}/config`)

export const getMyVms = () => apiFetch<VmDTO[]>("/api/vms")
export const startVm = (name: string) => apiFetch<void>(`/api/vms/${name}/start`, { method: "POST" })
export const stopVm = (name: string) => apiFetch<void>(`/api/vms/${name}/stop`, { method: "POST" })
export const rebootVm = (name: string) => apiFetch<void>(`/api/vms/${name}/reboot`, { method: "POST" })
export const deleteVm = (name: string) => apiFetch<void>(`/api/vms/${name}`, { method: "DELETE" })
export const getVncUrl = (name: string) => apiFetch<VncUrlDTO>(`/api/vms/${name}/vnc-url`)
export const getVmCredentials = (name: string) => apiFetch<VmCredentials>(`/api/vms/${name}/credentials`)
export const getVmNetwork = (name: string) => apiFetch<VmNetworkInfo[]>(`/api/vms/${name}/network`)
export const exposeVmSsh = (name: string) => apiFetch<VmNetworkInfo>(`/api/vms/${name}/expose-ssh`, { method: "POST" })
export const unexposeVmSsh = (name: string) => apiFetch<void>(`/api/vms/${name}/expose-ssh`, { method: "DELETE" })
// ─────────────────────────────────────────────
// ✅ Métriques — gère 204 No Content → null
// ─────────────────────────────────────────────
export async function getVmMetrics(name: string): Promise<VmMetrics | null> {
  const { getSession } = await import("next-auth/react")
  const session = await getSession()
  const token = (session as any)?.accessToken ?? ""
 
  const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8081"
  const res = await fetch(`${API_BASE}/api/vms/${name}/metrics`, {
    headers: {
      "Content-Type":  "application/json",
      "Authorization": `Bearer ${token}`,
    },
  })
 
  // 204 = pas de métriques disponibles (Prometheus non configuré)
  if (res.status === 204) return null
  if (!res.ok) throw new Error(`Métriques indisponibles (${res.status})`)
 
  return res.json()
}
 
// ─────────────────────────────────────────────
// ✅ Événements Kubernetes
// ─────────────────────────────────────────────
export const getVmEvents = (name: string): Promise<VmEvent[]> =>
  apiFetch<VmEvent[]>(`/api/vms/${name}/events`)
/**
 * Clone une VM existante dans le même tenant.
 * POST /api/vms/{sourceVmName}/clone
 * Body : { cloneName, vmPassword? }
 */
export const cloneVm = (sourceVmName: string, data: VmCloneRequest) =>
  apiFetch<VmCloneResult>(`/api/vms/${sourceVmName}/clone`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  })
 
// ── Snapshot API calls ────────────────────────────────────────────────────────
export const listSnapshots = (vmName: string) =>
  apiFetch<VmSnapshot[]>(`/api/vms/${vmName}/snapshots`)

export const createSnapshot = (vmName: string, snapshotName?: string) =>
  apiFetch<SnapshotCreateResult>(`/api/vms/${vmName}/snapshots${snapshotName ? `?snapshotName=${snapshotName}` : ""}`, { method: "POST" })

export const deleteSnapshot = (vmName: string, snapshotName: string) =>
  apiFetch<void>(`/api/vms/${vmName}/snapshots/${snapshotName}`, { method: "DELETE" })

export const restoreSnapshot = (vmName: string, snapshotName: string) =>
  apiFetch<RestoreResult>(`/api/vms/${vmName}/snapshots/${snapshotName}/restore`, { method: "POST" })
export interface VmConfigUpdateRequest {
  description?:      string
  cpuCores?:         string
  ram?:              string
  hostname?:         string
  headlessMode?:     boolean
  guestLogAccess?:   boolean
  deleteProtection?: boolean
}
 
export const updateVmConfig = (name: string, data: VmConfigUpdateRequest): Promise<void> =>
  apiFetch(`/api/vms/${name}/config`, {
    method:  "PATCH",
    headers: { "Content-Type": "application/json" },
    body:    JSON.stringify(data),
  })

  // ── Ajouter dans lib/services/vms.api.ts ─────────────────────────────────────

// ─── Réseau — actions sur les interfaces ────────────────────────────────────

/** Définir le lien vers le bas (true) ou le remettre en état up (false) */
export const setInterfaceLinkState = (
  vmName:    string,
  ifaceName: string,
  linkDown:  boolean
): Promise<void> =>
  apiFetch(`/api/vms/${vmName}/interfaces/${ifaceName}/link`, {
    method:  "PATCH",
    headers: { "Content-Type": "application/json" },
    body:    JSON.stringify({ linkDown }),
  })

/** Modifier le modèle d'une interface (virtio, e1000…) */
export const updateVmInterface = (
  vmName:    string,
  ifaceName: string,
  model:     string
): Promise<void> =>
  apiFetch(`/api/vms/${vmName}/interfaces/${ifaceName}`, {
    method:  "PATCH",
    headers: { "Content-Type": "application/json" },
    body:    JSON.stringify({ model }),
  })

/** Supprimer une interface réseau (VM doit être arrêtée) */
export const deleteVmInterface = (
  vmName:    string,
  ifaceName: string
): Promise<void> =>
  apiFetch(`/api/vms/${vmName}/interfaces/${ifaceName}`, {
    method: "DELETE",
  })