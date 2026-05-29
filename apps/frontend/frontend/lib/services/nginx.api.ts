// lib/services/nginx.api.ts
import { apiFetch } from "@/lib/apiClient"
import type { NginxDeploymentResult } from "@/lib/types"

export function getNginxStatus(): Promise<NginxDeploymentResult> {
  return apiFetch<NginxDeploymentResult>("/api/hosting/nginx/status")
}

export function provisionNginx(planId: number): Promise<NginxDeploymentResult> {
  return apiFetch<NginxDeploymentResult>(
    `/api/hosting/nginx/provision?planId=${planId}`,
    { method: "POST" }
  )
}

export function deprovisionNginx(): Promise<void> {
  return apiFetch<void>("/api/hosting/nginx", { method: "DELETE" })
}