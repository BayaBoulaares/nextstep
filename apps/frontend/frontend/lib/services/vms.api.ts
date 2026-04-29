// lib/services/vms.api.ts
import { apiFetch } from "@/lib/apiClient"

export interface VmDTO {
  name:      string
  namespace: string
  status:    string
  ip?:       string
  cpuCores?: number
  ramGb?:    string   // ✅ string (ex: "1Gi")
  osImage?:  string
  createdAt?: string
  vmPassword?: string // ✅ mot de passe affiché une fois après création
}

export interface VncUrlDTO {
  url:   string
  token: string
}

export interface VmRequest {
  vmName:     string
  cpuCores:   number
  ramGb:      number
  diskGb:     number
  osImage:    string
  vmPassword?: string
}

export interface TerraformResultDTO {
  status:   string
  vmName:   string
  output:   string
  password: string
}

export const getMyVms  = ()                  => apiFetch<VmDTO[]>("/api/vms")
export const startVm   = (name: string)      => apiFetch<void>(`/api/vms/${name}/start`,  { method: "POST" })
export const stopVm    = (name: string)      => apiFetch<void>(`/api/vms/${name}/stop`,   { method: "POST" })
export const deleteVm  = (name: string)      => apiFetch<void>(`/api/vms/${name}`,        { method: "DELETE" })
export const getVncUrl = (name: string)      => apiFetch<VncUrlDTO>(`/api/vms/${name}/vnc-url`)
export const createVm  = (data: VmRequest)   => apiFetch<TerraformResultDTO>("/api/vms/create", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify(data),
})
export interface VmCredentials {
  login:    string
  password: string
}
export const rebootVm = (name: string) =>
  apiFetch<void>(`/api/vms/${name}/reboot`, { method: "POST" })

export const getVmCredentials = (name: string) =>
  apiFetch<VmCredentials>(`/api/vms/${name}/credentials`)