// features/offres/hooks/useOffres.ts
"use client"

import { useState, useEffect, useCallback } from "react"
import { offreService } from "../services/offreService"
import { ApiError } from "@/lib/apiClient"
import type { Offre, CreateOffrePayload, UpdateOffrePayload } from "../types"

export function useOffres() {
  const [offres, setOffres]   = useState<Offre[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState<string | null>(null)

  const fetchOffres = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const data = await offreService.getAll()
      setOffres(data)
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.status === 401
            ? "Session expirée, reconnectez-vous."
            : err.message
          : "Erreur réseau, vérifiez votre connexion."
      )
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchOffres() }, [fetchOffres])

  const createOffre = async (payload: CreateOffrePayload): Promise<Offre> => {
    const created = await offreService.create(payload)
    setOffres((prev) => [created, ...prev])
    return created
  }

  const updateOffre = async (id: number, payload: UpdateOffrePayload): Promise<Offre> => {
    const updated = await offreService.update(id, payload)
    setOffres((prev) => prev.map((o) => (o.id === id ? updated : o)))
    return updated
  }

  const deleteOffre = async (id: number): Promise<void> => {
    await offreService.delete(id)
    setOffres((prev) => prev.filter((o) => o.id !== id))
  }

  return {
    offres,
    loading,
    error,
    refetch:      fetchOffres,
    createOffre,
    updateOffre,
    deleteOffre,
  }
}