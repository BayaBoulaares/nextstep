// app/features/abonnements/hooks/useAbonnement.ts
// ─────────────────────────────────────────────────────────────────────────────
// NOUVEAU FICHIER — à créer dans app/features/abonnements/hooks/
// ─────────────────────────────────────────────────────────────────────────────
"use client"

import { useState, useEffect, useCallback } from "react"
import { abonnementApi } from "../../services/abonnementApi"
import { ApiError } from "@/lib/apiClient"
import type {
  AbonnementRequest,
  AbonnementResponse,
  InvoiceResponse,
  UsageRecordResponse,
} from "../../../services/types"

// ══════════════════════════════════════════════════════════════════════════════
// useAbonnements — liste, souscription, résiliation
// ══════════════════════════════════════════════════════════════════════════════

export function useAbonnements() {
  const [abonnements, setAbonnements] = useState<AbonnementResponse[]>([])
  const [loading,     setLoading]     = useState(true)
  const [error,       setError]       = useState<string | null>(null)

  const fetchAbonnements = useCallback(async () => {
    try {
      setLoading(true); setError(null)
      const data = await abonnementApi.mesAbonnements()
      setAbonnements(Array.isArray(data) ? data : [])
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.status === 401
            ? "Session expirée, reconnectez-vous."
            : err.message
          : "Erreur réseau, vérifiez votre connexion.",
      )
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchAbonnements() }, [fetchAbonnements])

  /** Souscrire à un plan. Met à jour la liste localement. */
  const souscrire = async (payload: AbonnementRequest): Promise<AbonnementResponse> => {
    const created = await abonnementApi.souscrire(payload)
    setAbonnements(prev => [created, ...prev])
    return created
  }

  /** Résilier un abonnement. Met à jour le statut localement. */
  const resilier = async (id: number): Promise<AbonnementResponse> => {
    const updated = await abonnementApi.resilier(id)
    setAbonnements(prev => prev.map(a => a.id === id ? updated : a))
    return updated
  }

  /** Lier un déploiement existant à un abonnement. */
  const lierDeployment = async (
    abonnementId: number,
    deploymentId:  number,
  ): Promise<AbonnementResponse> => {
    const updated = await abonnementApi.lierDeployment(abonnementId, deploymentId)
    setAbonnements(prev => prev.map(a => a.id === abonnementId ? updated : a))
    return updated
  }

  return {
    abonnements,
    abonnementsActifs: abonnements.filter(a => a.status === "ACTIF"),
    abonnementsPAYG:   abonnements.filter(a => a.isPayAsYouGo),
    loading,
    error,
    refetch: fetchAbonnements,
    souscrire,
    resilier,
    lierDeployment,
  }
}

// ══════════════════════════════════════════════════════════════════════════════
// useFactures — factures PAYG du client
// ══════════════════════════════════════════════════════════════════════════════

export function useFactures() {
  const [factures, setFactures] = useState<InvoiceResponse[]>([])
  const [loading,  setLoading]  = useState(true)
  const [error,    setError]    = useState<string | null>(null)

  useEffect(() => {
    abonnementApi.mesFactures()
      .then(data  => setFactures(Array.isArray(data) ? data : []))
      .catch(err  => setError(err instanceof ApiError ? err.message : "Erreur réseau"))
      .finally(() => setLoading(false))
  }, [])

  return { factures, loading, error }
}

// ══════════════════════════════════════════════════════════════════════════════
// useUsage — consommation PAYG d'un abonnement sur une période
// ══════════════════════════════════════════════════════════════════════════════

export function useUsage(
  abonnementId: number | null,
  debut:        string,
  fin:          string,
) {
  const [records,  setRecords]  = useState<UsageRecordResponse[]>([])
  const [loading,  setLoading]  = useState(false)
  const [error,    setError]    = useState<string | null>(null)

  useEffect(() => {
    if (!abonnementId) return
    setLoading(true)
    abonnementApi.getUsage(abonnementId, debut, fin)
      .then(data  => setRecords(Array.isArray(data) ? data : []))
      .catch(err  => setError(err instanceof ApiError ? err.message : "Erreur réseau"))
      .finally(() => setLoading(false))
  }, [abonnementId, debut, fin])

  const totalCost = records.reduce((sum, r) => sum + r.cost, 0)

  return { records, totalCost, loading, error }
}