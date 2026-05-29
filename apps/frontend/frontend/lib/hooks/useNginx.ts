// lib/hooks/useNginx.ts
"use client"

import * as React from "react"
import { getNginxStatus } from "@/lib/services/nginx.api"
import type { NginxDeploymentResult } from "@/lib/types"

export function useNginx() {
  const [nginx, setNginx]     = React.useState<NginxDeploymentResult | null>(null)
  const [loading, setLoading] = React.useState(true)
  const [error, setError]     = React.useState<string | null>(null)

  React.useEffect(() => {
    getNginxStatus()
      .then(setNginx)
      .catch(e => {
        // 404 = pas encore de déploiement nginx → état normal
        if (e?.status !== 404) setError(e.message)
      })
      .finally(() => setLoading(false))
  }, [])

  return { nginx, loading, error }
}