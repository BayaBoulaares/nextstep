"use client"

import { Pencil, Trash2, Clock, Zap, Star, Settings, CheckSquare } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge }  from "@/components/ui/badge"
import {
  Accordion, AccordionContent, AccordionItem, AccordionTrigger,
} from "@/components/ui/accordion"
import type { Service, TypeOffre } from "../types"

interface ServicesListProps {
  services:   Service[]
  onEdit?:    (id: number) => void
  onDelete?:  (id: number) => void
  isLoading?: boolean
}

// ── Icône + couleur selon TypeOffre ──────────────────────────
const TYPE_CONFIG: Record<TypeOffre, { icon: React.ElementType; color: string; label: string }> = {
  STANDARD:   { icon: CheckSquare, color: "bg-gray-800 text-white",   label: "Standard"   },
  PREMIUM:    { icon: Star,        color: "bg-amber-500 text-white",  label: "Premium"    },
  ENTERPRISE: { icon: Zap,         color: "bg-blue-600 text-white",   label: "Enterprise" },
  CUSTOM:     { icon: Settings,    color: "bg-purple-600 text-white", label: "Sur mesure" },
}

// ── Badge statut ─────────────────────────────────────────────
function StatusBadge({ actif }: { actif: boolean }) {
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium
      ${actif
        ? "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200"
        : "bg-gray-100 text-gray-500 ring-1 ring-gray-200"
      }`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${actif ? "bg-emerald-500" : "bg-gray-400"}`} />
      {actif ? "Actif" : "Inactif"}
    </span>
  )
}

// ── Formatage durée ──────────────────────────────────────────
function formatDuree(minutes?: number): string {
  if (!minutes) return "—"
  if (minutes < 60) return `${minutes} min`
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  return m > 0 ? `${h}h${m.toString().padStart(2, "0")}` : `${h}h`
}

// ── Formatage date ISO ────────────────────────────────────────
function formatDate(iso?: string): string {
  if (!iso) return "—"
  return new Date(iso).toLocaleDateString("fr-FR", {
    day: "2-digit", month: "short", year: "numeric",
  })
}

// ── Squelette de chargement ──────────────────────────────────
function SkeletonRow() {
  return (
    <div className="bg-white border border-gray-100 rounded-2xl px-5 py-4 animate-pulse">
      <div className="grid grid-cols-[1fr_1.5fr_1fr_auto] gap-4 items-center">
        <div className="h-6 w-16 rounded-full bg-gray-100" />
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-xl bg-gray-100" />
          <div className="space-y-1.5">
            <div className="h-4 w-32 rounded bg-gray-100" />
            <div className="h-3 w-20 rounded bg-gray-50" />
          </div>
        </div>
        <div className="h-4 w-12 rounded bg-gray-100" />
        <div className="flex gap-1">
          <div className="h-8 w-8 rounded-full bg-gray-100" />
          <div className="h-8 w-8 rounded-full bg-gray-100" />
        </div>
      </div>
    </div>
  )
}

// ── Composant principal ───────────────────────────────────────
export function ServicesList({ services, onEdit, onDelete, isLoading }: ServicesListProps) {

  if (isLoading) {
    return (
      <div className="flex flex-col gap-2">
        {[...Array(3)].map((_, i) => <SkeletonRow key={i} />)}
      </div>
    )
  }

  if (services.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <Settings className="h-12 w-12 text-gray-200 mb-4" />
        <p className="text-gray-400 font-medium">Aucun service</p>
        <p className="text-sm text-gray-300 mt-1">Ajoutez votre premier service pour commencer</p>
      </div>
    )
  }

  return (
    <div className="w-full">

      {/* En-tête colonnes */}
      <div className="grid grid-cols-[1fr_1.5fr_1fr_auto] gap-4 px-5 py-3 mb-1">
        <span className="text-xs font-semibold text-gray-400 uppercase tracking-widest">Statut</span>
        <span className="text-xs font-semibold text-gray-400 uppercase tracking-widest">Service</span>
        <span className="text-xs font-semibold text-gray-400 uppercase tracking-widest">Durée</span>
        <span className="text-xs font-semibold text-gray-400 uppercase tracking-widest">Actions</span>
      </div>

      <Accordion type="single" collapsible className="flex flex-col gap-2">
        {services.map((service) => {
          const config = TYPE_CONFIG[service.type] ?? TYPE_CONFIG.STANDARD
          const Icon   = config.icon

          return (
            <AccordionItem
              key={service.id}
              value={`service-${service.id}`}
              className="bg-white border border-gray-100 rounded-2xl shadow-sm hover:shadow-md transition-shadow duration-200 px-5 overflow-hidden"
            >
              <div className="grid grid-cols-[1fr_1.5fr_1fr_auto] gap-4 items-center">

                {/* Statut */}
                <div className="py-4">
                  <StatusBadge actif={service.actif} />
                </div>

                {/* Nom + icône */}
                <div className="flex items-center gap-3 py-4">
                  <div className={`h-9 w-9 rounded-xl flex items-center justify-center flex-shrink-0 ${config.color}`}>
                    <Icon className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-gray-900">{service.nom}</p>
                    <p className="text-xs text-gray-400">{config.label}</p>
                  </div>
                </div>

                {/* Durée */}
                <div className="py-4 flex items-center gap-1.5">
                  <Clock className="h-3.5 w-3.5 text-gray-300" />
                  <span className="text-sm font-medium text-gray-700">
                    {formatDuree(service.dureeEstimee)}
                  </span>
                </div>

                {/* Boutons + trigger */}
                <div className="flex items-center gap-1 py-4">
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={(e) => { e.stopPropagation(); onEdit?.(service.id) }}
                    className="h-8 w-8 rounded-full text-gray-400 hover:text-gray-900 hover:bg-gray-100 transition-colors"
                    aria-label={`Modifier ${service.nom}`}
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={(e) => { e.stopPropagation(); onDelete?.(service.id) }}
                    className="h-8 w-8 rounded-full text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors"
                    aria-label={`Supprimer ${service.nom}`}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                  <AccordionTrigger className="h-8 w-8 flex items-center justify-center rounded-full hover:bg-gray-100 [&>svg]:text-gray-400 [&[data-state=open]>svg]:text-gray-900 p-0 ml-1" />
                </div>
              </div>

              {/* Détails expandables */}
              <AccordionContent>
                <div className="border-t border-gray-50 pt-4 pb-5 grid grid-cols-3 gap-6">

                  <div>
                    <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-1">
                      Description
                    </p>
                    <p className="text-sm text-gray-600 leading-relaxed">
                      {service.description || "—"}
                    </p>
                  </div>

                  <div className="flex flex-col gap-3">
                    <div>
                      <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-1">
                        Type
                      </p>
                      <Badge className={`text-xs rounded-lg ${config.color}`}>
                        {config.label}
                      </Badge>
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-1">
                        Durée estimée
                      </p>
                      <p className="text-sm font-medium text-gray-700">
                        {formatDuree(service.dureeEstimee)}
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-col gap-3">
                    <div>
                      <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-1">
                        Créé le
                      </p>
                      <p className="text-sm text-gray-600">{formatDate(service.dateCreation)}</p>
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-1">
                        Modifié le
                      </p>
                      <p className="text-sm text-gray-600">{formatDate(service.dateModification)}</p>
                    </div>
                  </div>

                </div>
              </AccordionContent>
            </AccordionItem>
          )
        })}
      </Accordion>

    </div>
  )
}