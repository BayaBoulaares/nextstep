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
  name:        string
  vmName:      string
  createdAt:   string | null
  readyToUse:  boolean
  phase:       string   // "Succeeded" | "InProgress" | "Failed"
}

export interface SnapshotCreateResult {
  snapshotName: string
  vmName:       string
  namespace:    string
}

export interface RestoreResult {
  restoreName:  string
  vmName:       string
  snapshotName: string
  namespace:    string
}

export interface VmDTO {
  name:       string
  namespace:  string
  status:     string
  ip?:        string
  cpuCores?:  number
  ramGb?:     string
  osImage?:   string
  createdAt?: string
  vmPassword?: string
  availabilitySet?:  string | null   // ← ajouter
  node?:        string | null   // nœud OpenShift (ex: "node2")
fqdn?:        string | null   // FQDN interne KubeVirt
machineType?: string | null   // ex: "pc-q35-rhel9.6.0"

}

export interface VncUrlDTO {
  url:   string
  token: string
}

export interface VmRequest {
  vmName:      string
  cpuCores:    number
  ramGb:       number
  diskGb:      number
  osImage:     string
  vmPassword?: string
}

export interface TerraformResultDTO {
  status:   string
  vmName:   string
  output:   string
  password: string
}

export interface VmCredentials {
  login:    string
  password: string
}

// ✅ nouveau
export interface VmNetworkInfo {
  serviceName: string
  type:        string
  nodePort:    number
  nodeIp:      string
  sshCommand:  string
}
export interface VmMetrics {
  cpuPercent:   number   // ex: 0.45
  memPercent:   number   // ex: 28.7
  memUsedMiB:   number   // ex: 294
  memTotalMiB:  number   // ex: 1024
  diskPercent:  number
  diskUsed:     string   // ex: "2.3 GB"
  netBps:       number   // octets/s total
}
 
/** Événement Kubernetes lié à la VM */
export interface VmEvent {
  type:     string   // "Normal" | "Warning"
  reason:   string   // ex: "Started", "Pulling"
  message:  string
  lastTime: string   // ex: "09:46"
  count:    number
}

export const getMyVms         = ()             => apiFetch<VmDTO[]>("/api/vms")
export const startVm          = (name: string) => apiFetch<void>(`/api/vms/${name}/start`,       { method: "POST" })
export const stopVm           = (name: string) => apiFetch<void>(`/api/vms/${name}/stop`,        { method: "POST" })
export const rebootVm         = (name: string) => apiFetch<void>(`/api/vms/${name}/reboot`,      { method: "POST" })
export const deleteVm         = (name: string) => apiFetch<void>(`/api/vms/${name}`,             { method: "DELETE" })
export const getVncUrl        = (name: string) => apiFetch<VncUrlDTO>(`/api/vms/${name}/vnc-url`)
export const getVmCredentials = (name: string) => apiFetch<VmCredentials>(`/api/vms/${name}/credentials`)
export const getVmNetwork     = (name: string) => apiFetch<VmNetworkInfo[]>(`/api/vms/${name}/network`)
export const exposeVmSsh      = (name: string) => apiFetch<VmNetworkInfo>(`/api/vms/${name}/expose-ssh`, { method: "POST" })
export const unexposeVmSsh    = (name: string) => apiFetch<void>(`/api/vms/${name}/expose-ssh`,          { method: "DELETE" })
// ✅ NOUVEAU — Métriques
// ─────────────────────────────────────────────
export const getVmMetrics = (name: string): Promise<VmMetrics> =>
  apiFetch(`/api/vms/${name}/metrics`)
 
// ─────────────────────────────────────────────
// ✅ NOUVEAU — Événements Kubernetes
// ─────────────────────────────────────────────
export const getVmEvents = (name: string): Promise<VmEvent[]> =>
  apiFetch(`/api/vms/${name}/events`)
export const createVm = (data: VmRequest) => apiFetch<TerraformResultDTO>("/api/vms/create", {
  method:  "POST",
  headers: { "Content-Type": "application/json" },
  body:    JSON.stringify(data),
})
// ── Snapshot API calls ────────────────────────────────────────────────────────
export const listSnapshots   = (vmName: string)                          =>
  apiFetch<VmSnapshot[]>(`/api/vms/${vmName}/snapshots`)

export const createSnapshot  = (vmName: string, snapshotName?: string)   =>
  apiFetch<SnapshotCreateResult>(`/api/vms/${vmName}/snapshots${snapshotName ? `?snapshotName=${snapshotName}` : ""}`, { method: "POST" })

export const deleteSnapshot  = (vmName: string, snapshotName: string)    =>
  apiFetch<void>(`/api/vms/${vmName}/snapshots/${snapshotName}`,          { method: "DELETE" })

export const restoreSnapshot = (vmName: string, snapshotName: string)    =>
  apiFetch<RestoreResult>(`/api/vms/${vmName}/snapshots/${snapshotName}/restore`, { method: "POST" })
