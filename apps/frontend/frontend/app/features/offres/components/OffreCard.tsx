// features/offres/components/OffreCard.tsx
"use client"

import * as React from "react"
import { useState, useMemo } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuGroup,
  DropdownMenuLabel, DropdownMenuRadioGroup,
  DropdownMenuRadioItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Pencil, Trash2, Search, X,
  SlidersHorizontal, CalendarDays, TriangleAlert, Package,
} from "lucide-react"
import {
  Carousel, CarouselContent, CarouselItem,
  CarouselNext, CarouselPrevious,
} from "@/components/ui/carousel"
import type { Offre, TypeOffre } from "../types"

interface OffreCarouselProps {
  offres: Offre[]
  onDelete?: (id: number) => void
  onUpdate?: (id: number) => void
}

const FILTER_FIELDS = [
  { value: "all", label: "Tous les champs" },
  { value: "titre", label: "Titre" },
  { value: "type", label: "Type" },
  { value: "description", label: "Description" },
  { value: "prix", label: "Prix (max €)" },
]

const TYPE_CONFIG: Record<TypeOffre, { label: string; className: string }> = {
  STANDARD: { label: "Standard", className: "bg-gray-100 text-gray-700 border-gray-200" },
  PREMIUM: { label: "Premium", className: "bg-purple-100 text-purple-700 border-purple-200" },
  ENTREPRISE: { label: "Entreprise", className: "bg-blue-100 text-blue-700 border-blue-200" },
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("fr-FR", {
    day: "2-digit", month: "short", year: "numeric",
  })
}

export function OffreCarousel({ offres, onDelete, onUpdate }: OffreCarouselProps) {
  const [search, setSearch] = useState("")
  const [filterField, setFilterField] = useState("all")
  const [deleteTargetId, setDeleteTargetId] = useState<number | null>(null)

  const deleteTarget = offres.find((o) => o.id === deleteTargetId)
  const currentLabel = FILTER_FIELDS.find((f) => f.value === filterField)?.label ?? "Tous les champs"

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return offres
    return offres.filter((offre) => {
      switch (filterField) {
        case "titre": return offre.titre.toLowerCase().includes(q)
        case "type": return offre.type.toLowerCase().includes(q)
        case "description": return offre.description?.toLowerCase().includes(q) ?? false
        case "prix": {
          const max = parseFloat(q)
          return !isNaN(max) && offre.prix <= max
        }
        default:
          return (
            offre.titre.toLowerCase().includes(q) ||
            (offre.description?.toLowerCase().includes(q) ?? false) ||
            offre.type.toLowerCase().includes(q) ||
            offre.prix.toString().includes(q)
          )
      }
    })
  }, [offres, search, filterField])

  const handleDeleteClick = (id: number) => setDeleteTargetId(id)
  const handleDeleteCancel = () => setDeleteTargetId(null)
  const handleDeleteConfirm = () => {
    if (deleteTargetId !== null) {
      onDelete?.(deleteTargetId)
      setDeleteTargetId(null)
    }
  }

  return (
    <div className="w-full flex flex-col gap-6">

      {/* ── Barre de recherche + filtre ── */}
      <div className="flex gap-3 items-center max-w-3xl">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" className="shrink-0 gap-2 min-w-[170px] justify-between">
              <div className="flex items-center gap-2">
                <SlidersHorizontal className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm">{currentLabel}</span>
              </div>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-48">
            <DropdownMenuGroup>
              <DropdownMenuLabel>Filtrer par</DropdownMenuLabel>
              <DropdownMenuRadioGroup
                value={filterField}
                onValueChange={(val) => { setFilterField(val); setSearch("") }}
              >
                {FILTER_FIELDS.map((f) => (
                  <DropdownMenuRadioItem key={f.value} value={f.value}>
                    {f.label}
                  </DropdownMenuRadioItem>
                ))}
              </DropdownMenuRadioGroup>
            </DropdownMenuGroup>
          </DropdownMenuContent>
        </DropdownMenu>

        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
          <Input
            type={filterField === "prix" ? "number" : "search"}
            placeholder={
              filterField === "prix" ? "Prix maximum (€)..." :
                filterField === "titre" ? "Rechercher par titre..." :
                  filterField === "type" ? "Ex: standard, premium..." :
                    filterField === "description" ? "Rechercher dans la description..." :
                      "Rechercher une offre..."
            }
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 pr-9"
          />
          {search && (
            <button
              onClick={() => setSearch("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        <span className="text-sm text-muted-foreground shrink-0 tabular-nums">
          {filtered.length}/{offres.length}
        </span>
      </div>

      {/* ── Carousel ou état vide ── */}
      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-[380px] text-muted-foreground gap-3">
          <Search className="h-12 w-12 opacity-20" />
          <p className="text-sm font-medium">Aucune offre ne correspond</p>
          <button
            onClick={() => setSearch("")}
            className="text-xs underline underline-offset-4 hover:text-foreground transition-colors"
          >
            Réinitialiser la recherche
          </button>
        </div>
      ) : (
        <div className="relative">
          <Carousel className="w-full px-12" opts={{ align: "start", watchDrag: false }}>
            <CarouselContent className="-ml-5">
              {filtered.map((offre) => {
                const typeConf = TYPE_CONFIG[offre.type]
                const isPendingDelete = deleteTargetId === offre.id

                return (
                  <CarouselItem key={offre.id} className="pl-5 basis-full sm:basis-1/2 lg:basis-1/3">
                    <Card className={`relative h-[380px] flex flex-col justify-between
                                     transition-all duration-300 border rounded-2xl overflow-hidden
                                     ${isPendingDelete
                        ? "border-red-300 shadow-lg shadow-red-100"
                        : "border-gray-200 hover:shadow-xl"
                      }`}>

                      {/* ══ OVERLAY de confirmation ══ */}
                      {isPendingDelete && (
                        <div className="absolute inset-0 z-10 flex flex-col items-center justify-center
                                        bg-white/95 backdrop-blur-sm rounded-2xl
                                        animate-in fade-in-0 zoom-in-95 duration-200">

                          <div className="flex items-center justify-center w-16 h-16 rounded-full
                                          bg-red-100 mb-5 ring-4 ring-red-50">
                            <Trash2 className="h-7 w-7 text-red-500" />
                          </div>

                          <p className="text-base font-semibold text-gray-900 mb-1">
                            Supprimer cette offre ?
                          </p>

                          <p className="text-sm text-muted-foreground text-center px-6 mb-1 line-clamp-2">
                            « {deleteTarget?.titre} »
                          </p>

                          <div className="flex items-center gap-1.5 text-xs text-red-500 mb-6">
                            <TriangleAlert className="h-3.5 w-3.5 shrink-0" />
                            <span>Cette action est irréversible</span>
                          </div>

                          <div className="flex gap-3 w-full px-8">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={handleDeleteCancel}
                              className="flex-1 h-9 border-gray-200 text-gray-600
                                         hover:bg-gray-50 hover:text-gray-900 transition-colors"
                            >
                              Annuler
                            </Button>
                            <Button
                              variant="destructive"
                              size="sm"
                              onClick={handleDeleteConfirm}
                              className="flex-1 h-9 bg-red-500 hover:bg-red-600
                                         shadow-sm shadow-red-200 transition-colors"
                            >
                              Supprimer
                            </Button>
                          </div>
                        </div>
                      )}

                      {/* ══ CONTENU NORMAL de la carte ══ */}
                      <CardHeader className="pb-2 pt-5 px-5">
                        <div className="mb-2">
                          <Badge
                            variant="outline"
                            className={`text-xs font-medium px-2.5 py-0.5 ${typeConf.className}`}
                          >
                            {typeConf.label}
                          </Badge>
                          {!offre.actif && (
                            <Badge variant="outline" className="ml-2 text-xs text-gray-400 border-gray-200">
                              Inactive
                            </Badge>
                          )}
                        </div>

                        <CardTitle className="text-lg font-semibold leading-tight line-clamp-2">
                          {offre.titre}
                        </CardTitle>

                        <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1.5">
                          <CalendarDays className="h-3 w-3" />
                          {formatDate(offre.dateDebut)} → {formatDate(offre.dateFin)}
                        </p>
                      </CardHeader>

                      <CardContent className="flex flex-col flex-1 justify-between px-5 pb-5">
                        <p className="text-sm text-muted-foreground line-clamp-3 leading-relaxed">
                          {offre.description ?? "Aucune description disponible."}
                        </p>

                        {/* Afficher le nombre de services si disponibles */}
                        {offre.services && offre.services.length > 0 && (
                          <p className="text-xs text-muted-foreground flex items-center gap-1 mt-2">
                            <Package className="h-3.5 w-3.5" />
                            {offre.services.length} service{offre.services.length > 1 ? "s" : ""} inclus
                          </p>
                        )}

                        <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-100">
                          <span className="text-2xl font-bold text-primary">
                            {offre.prix.toLocaleString("fr-FR", { minimumFractionDigits: 2 })} €
                          </span>
                          <div className="flex items-center gap-1">
                            <Button
                              size="icon" variant="ghost"
                              onClick={(e) => { e.stopPropagation(); onUpdate?.(offre.id) }}
                              disabled={isPendingDelete}
                              className="h-9 w-9 rounded-full text-gray-500
                                         hover:bg-gray-100 hover:text-gray-900 transition-colors"
                              aria-label="Modifier l'offre"
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              size="icon" variant="ghost"
                              onClick={(e) => { e.stopPropagation(); handleDeleteClick(offre.id) }}
                              disabled={isPendingDelete}
                              className="h-9 w-9 rounded-full text-red-400
                                         hover:bg-red-50 hover:text-red-600 transition-colors"
                              aria-label="Supprimer l'offre"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </CarouselItem>
                )
              })}
            </CarouselContent>

            <CarouselPrevious className="left-0 top-1/2 -translate-y-1/2" />
            <CarouselNext className="right-0 top-1/2 -translate-y-1/2" />
          </Carousel>
        </div>
      )}
    </div>
  )
}