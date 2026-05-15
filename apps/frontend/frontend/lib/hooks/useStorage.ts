// lib/hooks/useStorage.ts
"use client"

import { useState, useEffect, useCallback } from "react"
import {
  provisionStorage,
  getMesStorages,
  deleteStorage as apiDelete,
} from "@/lib/services/storage.api"
import type { StorageProvisionRequest, StorageResponse } from "@/lib/types"

// ── Hook liste ──────────────────────────────────────────────────────────────

export function useStorageList() {
  const [storages, setStorages] = useState<StorageResponse[]>([])
  const [loading, setLoading]   = useState(true)
  const [error, setError]       = useState<string | null>(null)

  const fetch = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await getMesStorages()
      setStorages(data)
    } catch (e: any) {
      setError(e.message ?? "Erreur de chargement")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetch() }, [fetch])

  const remove = useCallback(async (id: number) => {
    await apiDelete(id)
    setStorages(prev => prev.filter(s => s.id !== id))
  }, [])

  return { storages, loading, error, refetch: fetch, remove }
}

// ── Hook provisioning ───────────────────────────────────────────────────────

export function useStorageProvision() {
  const [loading, setLoading]   = useState(false)
  const [error, setError]       = useState<string | null>(null)
  const [result, setResult]     = useState<StorageResponse | null>(null)

  const provision = useCallback(async (req: StorageProvisionRequest) => {
    setLoading(true)
    setError(null)
    setResult(null)
    try {
      const res = await provisionStorage(req)
      setResult(res)
      return res
    } catch (e: any) {
      const msg = e.message ?? "Erreur lors du provisioning"
      setError(msg)
      throw e
    } finally {
      setLoading(false)
    }
  }, [])

  const reset = useCallback(() => {
    setError(null)
    setResult(null)
  }, [])

  return { provision, loading, error, result, reset }
}