// features/services/hooks/useService.ts
"use client"

import { useState, useEffect, useCallback } from "react"
import { serviceApi } from "../services/serviceApi"
import { ApiError } from "@/lib/apiClient"
import type {
  CloudService,
  Plan,
  CreateServicePayload,
  UpdateServicePayload,
  CreatePlanPayload,
  UpdatePlanPayload,
} from "../types"

// ══════════════════════════════════════════════════════════════════════════════
// useServices — liste + CRUD service
// Backend : GET /api/services → List<CloudServiceDTO> (pas de pagination)
// ══════════════════════════════════════════════════════════════════════════════

export function useServices() {
  const [services, setServices] = useState<CloudService[]>([])
  const [loading,  setLoading]  = useState(true)
  const [error,    setError]    = useState<string | null>(null)

  const fetchServices = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const data = await serviceApi.getAll()
      setServices(Array.isArray(data) ? data : [])
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

  useEffect(() => { fetchServices() }, [fetchServices])

  const createService = async (payload: CreateServicePayload): Promise<CloudService> => {
    const created = await serviceApi.create(payload)
    setServices(prev => [created, ...prev])
    return created
  }

  const updateService = async (id: number, payload: UpdateServicePayload): Promise<CloudService> => {
    const updated = await serviceApi.update(id, payload)
    setServices(prev => prev.map(s => s.id === id ? updated : s))
    return updated
  }

  const deleteService = async (id: number): Promise<void> => {
    await serviceApi.delete(id)
    setServices(prev => prev.filter(s => s.id !== id))
  }

  return { services, loading, error, refetch: fetchServices, createService, updateService, deleteService }
}

// ══════════════════════════════════════════════════════════════════════════════
// usePlans — plans d'un service + CRUD plan
// Backend : GET /api/plans/service/:serviceId → List<PlanDTO>
// ══════════════════════════════════════════════════════════════════════════════

export function usePlans(serviceId: number | null) {
  const [plans,    setPlans]   = useState<Plan[]>([])
  const [loading,  setLoading] = useState(false)
  const [error,    setError]   = useState<string | null>(null)

  const fetchPlans = useCallback(async () => {
    if (serviceId === null) {
      setPlans([])
      setError(null)
      return
    }
    try {
      setLoading(true)
      setError(null)
      const data = await serviceApi.getPlansByService(serviceId)
      setPlans(Array.isArray(data) ? data : [])
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
  }, [serviceId])

  useEffect(() => { fetchPlans() }, [fetchPlans])

  const createPlan = async (payload: CreatePlanPayload): Promise<Plan> => {
    const created = await serviceApi.createPlan(payload)
    setPlans(prev => [...prev, created])
    return created
  }

  const updatePlan = async (planId: number, payload: UpdatePlanPayload): Promise<Plan> => {
    const updated = await serviceApi.updatePlan(planId, payload)
    setPlans(prev => prev.map(p => p.id === planId ? updated : p))
    return updated
  }

  const togglePlan = async (planId: number): Promise<Plan> => {
    const toggled = await serviceApi.togglePlan(planId)
    setPlans(prev => prev.map(p => p.id === planId ? toggled : p))
    return toggled
  }

  const deletePlan = async (planId: number): Promise<void> => {
    await serviceApi.deletePlan(planId)
    setPlans(prev => prev.filter(p => p.id !== planId))
  }

  return { plans, loading, error, refetch: fetchPlans, createPlan, updatePlan, togglePlan, deletePlan }
}

// ══════════════════════════════════════════════════════════════════════════════
// useServiceStats — stats agrégées pour le dashboard
// ══════════════════════════════════════════════════════════════════════════════

export function useServiceStats() {
  const [stats, setStats] = useState({
    totalServices:  0,
    activeServices: 0,
    totalPlans:     0,
    activePlans:    0,
    categories:     0,
    lowestPrice:    null as number | null,
  })
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState<string | null>(null)

  useEffect(() => {
    async function load() {
      try {
        setLoading(true)
        const [services, plans] = await Promise.all([
          serviceApi.getAll(),
          serviceApi.getAllPlans(),
        ])

        const svcs = Array.isArray(services) ? services : []
        const plns = Array.isArray(plans)    ? plans    : []

        const cats        = new Set(svcs.map(s => s.category)).size
        // ✅ PlanDTO.isActive (pas .active) — ServiceStatus "ACTIF" (pas "ACTIVE")
        const activePlans = plns.filter(p => p.isActive)
        const prices      = activePlans.map(p => p.price).filter(p => p > 0)

        setStats({
          totalServices:  svcs.length,
          activeServices: svcs.filter(s => s.status === "ACTIF").length,  // ✅ "ACTIF"
          totalPlans:     plns.length,
          activePlans:    activePlans.length,
          categories:     cats,
          lowestPrice:    prices.length > 0 ? Math.min(...prices) : null,
        })
      } catch (err) {
        setError(
          err instanceof ApiError
            ? err.message
            : "Erreur réseau"
        )
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  return { stats, loading, error }
}