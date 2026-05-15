"use client"

import * as React from "react"
import {
  IconPencil, IconTrash, IconPlus, IconSearch,
  IconLoader2, IconAlertCircle, IconRefresh,
  IconChevronRight, IconLayoutGrid, IconList,
} from "@tabler/icons-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import {
  Table, TableBody, TableCell, TableHead,
  TableHeader, TableRow,
} from "@/components/ui/table"
import { cn } from "@/lib/utils"
import { apiFetch, ApiError } from "@/lib/apiClient"
import type { CloudServiceDTO, ServiceStatus, ServiceCategory } from "@/lib/types"
// ✅ ServicePlansDialog gère add/edit/delete/toggle des plans
import { ServicePlansDialog } from "@/components/admin/ServicePlansDialog"
// ✅ ServiceFormModal pour créer ou modifier un service
import { ServiceFormModal } from "@/components/admin/ServiceFormModal"

// ─── Labels ───────────────────────────────────────────────────────────────────

const CATEGORY_LABELS: Record<ServiceCategory, string> = {
  CALCUL: "Calcul",
  HEBERGEMENT: "Hébergement",
  STOCKAGE: "Stockage",
  BASE_DONNEES: "Base de données",
  RESEAU: "Réseau",
  EMAIL: "Email",
  IA: "IA",
  SECURITE: "Sécurité",
  IAM: "Accès",
}

const ALL_CATEGORIES: { value: ServiceCategory | "TOUS"; label: string }[] = [
  { value: "TOUS", label: "Tous" },
  { value: "CALCUL", label: "Calcul" },
  { value: "HEBERGEMENT", label: "Hébergement" },
  { value: "STOCKAGE", label: "Stockage" },
  { value: "BASE_DONNEES", label: "Base de données" },
  { value: "RESEAU", label: "Réseau" },
  { value: "EMAIL", label: "Email" },
  { value: "IA", label: "IA" },
  { value: "SECURITE", label: "Sécurité" },
  { value: "IAM", label: "Accès" },
]

const STATUS_CONFIG: Record<ServiceStatus, { label: string; dot: string; badge: string }> = {
  ACTIF: {
    label: "Actif",
    dot: "bg-emerald-500",
    badge: "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 dark:ring-emerald-800",
  },
  MAINTENANCE: {
    label: "Maintenance",
    dot: "bg-amber-400",
    badge: "bg-amber-50 text-amber-700 ring-1 ring-amber-200 dark:bg-amber-950/40 dark:text-amber-400 dark:ring-amber-800",
  },
  INACTIF: {
    label: "Inactif",
    dot: "bg-zinc-400",
    badge: "bg-zinc-100 text-zinc-500 ring-1 ring-zinc-200 dark:bg-zinc-800 dark:text-zinc-400 dark:ring-zinc-700",
  },
}

const BILLING_SUFFIX: Record<string, string> = {
  HORAIRE: "/h",
  MENSUEL: "/mois",
  ANNUEL: "/an",
}

// ─── Hook fetch ───────────────────────────────────────────────────────────────

function useServices() {
  const [services, setServices] = React.useState<CloudServiceDTO[]>([])
  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState<string | null>(null)

  const load = React.useCallback(() => {
    setLoading(true)
    setError(null)
    apiFetch<CloudServiceDTO[]>("/api/services")
      .then(setServices)
      .catch((e: unknown) => {
        const msg = e instanceof ApiError
          ? `Erreur ${e.status} — ${e.message}`
          : (e instanceof Error ? e.message : "Impossible de charger les services.")
        setError(msg)
      })
      .finally(() => setLoading(false))
  }, [])

  React.useEffect(() => { load() }, [load])

  async function deleteService(id: number): Promise<void> {
    await apiFetch<void>(`/api/services/${id}`, { method: "DELETE" })
    setServices(prev => prev.filter(s => s.id !== id))
  }

  return { services, loading, error, refetch: load, deleteService }
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getMinPrice(service: CloudServiceDTO): string {
  const active = (service.plans ?? []).filter(p => p.isActive)
  if (!active.length) return "—"
  const min = Math.min(...active.map(p => p.price))
  const found = active.find(p => p.price === min)
  const suffix = found ? (BILLING_SUFFIX[found.billingCycle] ?? "") : ""
  return min === 0 ? "Gratuit" : `dès ${min.toFixed(2)} TND${suffix}`
}

function StatusPill({ status }: { status: ServiceStatus }) {
  const cfg = STATUS_CONFIG[status] ?? STATUS_CONFIG.INACTIF
  return (
    <span className={cn(
      "inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-medium",
      cfg.badge
    )}>
      <span className={cn("size-1.5 rounded-full flex-shrink-0", cfg.dot)} />
      {cfg.label}
    </span>
  )
}

// ─── ServiceCard ──────────────────────────────────────────────────────────────
// Boutons edit / delete TOUJOURS visibles en mode admin
// (l'ancienne version utilisait opacity-0 group-hover qui posait problème)

function ServiceCard({
  service, isAdmin, onView, onEdit, onDelete,
}: {
  service: CloudServiceDTO
  isAdmin: boolean
  onView: () => void
  onEdit: () => void
  onDelete: () => void
}) {
  const planCount = service.plans?.length ?? 0
  const activeCount = service.plans?.filter(p => p.isActive).length ?? 0
  const minPrice = getMinPrice(service)
  const catLabel = CATEGORY_LABELS[service.category] ?? service.category

  return (
    <div
      className="group relative flex flex-col bg-background border border-border/60 rounded-2xl overflow-hidden
                 hover:border-border hover:shadow-sm transition-all duration-200 cursor-pointer"
      onClick={onView}
    >
      {/* ✅ Boutons admin — toujours visibles, pas opacity-0 */}
      {isAdmin && (
        <div
          className="absolute top-2.5 right-2.5 flex items-center gap-1 z-10"
          onClick={e => e.stopPropagation()}
        >
          <button
            onClick={onEdit}
            title="Modifier le service"
            className="size-7 flex items-center justify-center rounded-lg border border-border/60
                       bg-background text-muted-foreground hover:text-foreground hover:bg-muted
                       hover:border-border transition-colors shadow-sm"
          >
            <IconPencil className="size-3.5" />
          </button>
          <button
            onClick={onDelete}
            title="Supprimer le service"
            className="size-7 flex items-center justify-center rounded-lg border border-border/60
                       bg-background text-muted-foreground hover:text-destructive
                       hover:bg-destructive/10 hover:border-destructive/30 transition-colors shadow-sm"
          >
            <IconTrash className="size-3.5" />
          </button>
        </div>
      )}

      <div className="flex flex-col gap-3 p-4 flex-1">
        <div className="flex items-start gap-2">
          <div className="size-10 rounded-xl bg-muted/60 flex items-center justify-center text-2xl flex-shrink-0 border border-border/40">
            {service.icon ?? "🖥️"}
          </div>
          {/* StatusPill — décalé vers le bas en admin pour éviter le chevauchement avec les boutons */}
          <div className={cn("ml-auto", isAdmin && "mt-8")}>
            <StatusPill status={service.status} />
          </div>
        </div>

        <div className="flex-1">
          <p className="font-semibold text-sm leading-tight text-foreground">{service.name}</p>
          {service.description && (
            <p className="text-[12px] text-muted-foreground mt-1 leading-relaxed line-clamp-2">
              {service.description}
            </p>
          )}
        </div>

        <span className="self-start text-[11px] px-2 py-0.5 rounded-md bg-muted text-muted-foreground font-medium">
          {catLabel}
        </span>
      </div>

      <div className="flex items-center justify-between px-4 py-3 border-t border-border/40 bg-muted/20">
        <div className="flex flex-col">
          <span className="text-[11px] text-muted-foreground">
            <span className="font-medium text-foreground">{planCount}</span>{" "}
            plan{planCount !== 1 ? "s" : ""}
            {planCount > 0 && (
              <span className="text-muted-foreground/70">
                {" "}· {activeCount} actif{activeCount !== 1 ? "s" : ""}
              </span>
            )}
          </span>
          <span className="text-[11px] font-medium text-foreground/80 mt-0.5">{minPrice}</span>
        </div>
        <IconChevronRight className="size-4 text-muted-foreground/40 group-hover:text-muted-foreground transition-colors" />
      </div>
    </div>
  )
}

// ─── ServiceRow (vue liste) ───────────────────────────────────────────────────

function ServiceRow({
  service, isAdmin, onView, onEdit, onDelete,
}: {
  service: CloudServiceDTO
  isAdmin: boolean
  onView: () => void
  onEdit: () => void
  onDelete: () => void
}) {
  const planCount = service.plans?.length ?? 0
  const activeCount = service.plans?.filter(p => p.isActive).length ?? 0
  const minPrice = getMinPrice(service)

  return (
    <TableRow className="cursor-pointer hover:bg-muted/20 transition-colors" onClick={onView}>
      <TableCell className="py-3 px-4">
        <div className="flex items-center gap-3">
          <span className="text-xl flex-shrink-0">{service.icon ?? "🖥️"}</span>
          <div className="min-w-0">
            <p className="font-medium text-sm truncate">{service.name}</p>
            {service.description && (
              <p className="text-[11px] text-muted-foreground truncate max-w-[240px]">{service.description}</p>
            )}
          </div>
        </div>
      </TableCell>
      <TableCell className="py-3 px-4">
        <span className="text-xs text-muted-foreground">
          {CATEGORY_LABELS[service.category] ?? service.category}
        </span>
      </TableCell>
      <TableCell className="py-3 px-4"><StatusPill status={service.status} /></TableCell>
      <TableCell className="py-3 px-4">
        <span className="text-sm tabular-nums font-medium">{planCount}</span>
        {planCount > 0 && (
          <span className="text-[11px] text-muted-foreground ml-1">
            ({activeCount} actif{activeCount !== 1 ? "s" : ""})
          </span>
        )}
      </TableCell>
      <TableCell className="py-3 px-4 text-right">
        <span className="text-sm font-mono font-medium">{minPrice}</span>
      </TableCell>
      {/* ✅ Actions toujours visibles */}
      <TableCell className="py-3 px-4" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-end gap-1">
          <Button
            size="sm" variant="ghost"
            className="h-7 px-2.5 text-xs text-muted-foreground hover:text-foreground"
            onClick={onView}
          >
            {isAdmin ? "Plans" : "Offres"}
          </Button>
          {isAdmin && (
            <>
              <Button size="icon" variant="ghost"
                className="size-7 text-muted-foreground hover:text-foreground hover:bg-muted"
                onClick={onEdit} title="Modifier">
                <IconPencil className="size-3.5" />
              </Button>
              <Button size="icon" variant="ghost"
                className="size-7 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                onClick={onDelete} title="Supprimer">
                <IconTrash className="size-3.5" />
              </Button>
            </>
          )}
        </div>
      </TableCell>
    </TableRow>
  )
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function CardSkeleton() {
  return (
    <div className="flex flex-col bg-background border border-border/40 rounded-2xl overflow-hidden animate-pulse">
      <div className="p-4 flex flex-col gap-3">
        <div className="flex items-start justify-between">
          <div className="size-10 rounded-xl bg-muted" />
          <div className="h-5 w-16 rounded-full bg-muted" />
        </div>
        <div className="space-y-1.5">
          <div className="h-4 w-3/4 rounded bg-muted" />
          <div className="h-3 w-full rounded bg-muted/60" />
          <div className="h-3 w-2/3 rounded bg-muted/60" />
        </div>
        <div className="h-5 w-16 rounded-md bg-muted" />
      </div>
      <div className="h-10 bg-muted/30 border-t border-border/40" />
    </div>
  )
}

// ─── Main ─────────────────────────────────────────────────────────────────────

interface ServicesTableProps {
  isAdmin?: boolean
}

export function ServicesTable({ isAdmin = false }: ServicesTableProps) {
  const { services, loading, error, refetch, deleteService } = useServices()

  const [query, setQuery] = React.useState("")
  const [activeTab, setActiveTab] = React.useState<ServiceCategory | "TOUS">("TOUS")
  const [viewMode, setViewMode] = React.useState<"grid" | "list">("grid")

  // ✅ Dialog plans — ServicePlansDialog (add/edit/delete/toggle plan intégrés)
  const [plansTarget, setPlansTarget] = React.useState<CloudServiceDTO | null>(null)
  // ✅ Form service — null = fermé, "create" = nouveau, CloudServiceDTO = édition
  const [formTarget, setFormTarget] = React.useState<CloudServiceDTO | "create" | null>(null)
  // Confirm delete
  const [deleteTarget, setDeleteTarget] = React.useState<CloudServiceDTO | null>(null)
  const [deleteLoading, setDeleteLoading] = React.useState(false)

  async function handleDeleteConfirm() {
    if (!deleteTarget) return
    setDeleteLoading(true)
    try { await deleteService(deleteTarget.id) } catch (e) { console.error(e) }
    finally { setDeleteLoading(false); setDeleteTarget(null) }
  }

  const filtered = React.useMemo(() => {
    const q = query.toLowerCase()
    return services.filter(s => {
      const catOk = activeTab === "TOUS" || s.category === activeTab
      const qOk = !q || s.name.toLowerCase().includes(q) || (s.description ?? "").toLowerCase().includes(q)
      return catOk && qOk
    })
  }, [services, query, activeTab])

  const usedCategories = React.useMemo(() => {
    const used = new Set(services.map(s => s.category))
    return ALL_CATEGORIES.filter(c => c.value === "TOUS" || used.has(c.value as ServiceCategory))
  }, [services])

  return (
    <>
      <div className="flex flex-col gap-4">

        {/* Toolbar */}
        <div className="flex flex-col gap-3 px-4 lg:px-6">
          <div className="flex items-center gap-2">
            <div className="relative flex-1 max-w-72">
              <IconSearch className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground pointer-events-none" />
              <Input
                placeholder="Rechercher un service…"
                value={query}
                onChange={e => setQuery(e.target.value)}
                className="pl-8 h-8 text-sm bg-muted/40 border-transparent focus-visible:border-border focus-visible:bg-background"
              />
            </div>
            <div className="flex items-center gap-1 ml-auto">
              {!loading && (
                <span className="text-xs text-muted-foreground mr-1">
                  {filtered.length} service{filtered.length !== 1 ? "s" : ""}
                </span>
              )}
              <div className="flex items-center border border-border/60 rounded-lg overflow-hidden">
                <Button size="icon" variant="ghost"
                  className={cn("size-8 rounded-none border-0",
                    viewMode === "grid" ? "bg-muted text-foreground" : "text-muted-foreground")}
                  onClick={() => setViewMode("grid")}>
                  <IconLayoutGrid className="size-3.5" />
                </Button>
                <Button size="icon" variant="ghost"
                  className={cn("size-8 rounded-none border-0 border-l border-border/60",
                    viewMode === "list" ? "bg-muted text-foreground" : "text-muted-foreground")}
                  onClick={() => setViewMode("list")}>
                  <IconList className="size-3.5" />
                </Button>
              </div>
              <Button size="icon" variant="ghost"
                className="size-8 text-muted-foreground hover:text-foreground"
                onClick={refetch}>
                <IconRefresh className={cn("size-3.5", loading && "animate-spin")} />
              </Button>
              {isAdmin && (
                <Button size="sm" className="h-8 text-xs gap-1.5 bg-[#0a7fcf] hover:bg-[#0869b0] text-white"
                  onClick={() => setFormTarget("create")}>
                  <IconPlus className="size-3.5" /> Nouveau service
                </Button>
              )}
            </div>
          </div>

          {!loading && usedCategories.length > 1 && (
            <div className="flex items-center gap-1.5 flex-wrap">
              {usedCategories.map(cat => (
                <button key={cat.value} onClick={() => setActiveTab(cat.value)}
                  className={cn(
                    "px-3 py-1 text-xs rounded-full border transition-all font-medium",
                    activeTab === cat.value
                      ? "bg-[#0a7fcf] text-white border-[#0a7fcf]"
                      : "bg-transparent text-muted-foreground border-border/60 hover:border-[#0a7fcf] hover:text-[#0a7fcf]"
                  )}>
                  {cat.label}
                </button>
              ))}
            </div>
          )}
        </div>

        {error && (
          <div className="mx-4 lg:mx-6 flex items-center gap-2 rounded-xl border border-destructive/30 bg-destructive/5 px-3 py-2.5 text-sm text-destructive">
            <IconAlertCircle className="size-4 flex-shrink-0" />
            <span className="flex-1">{error}</span>
            <Button variant="ghost" size="sm" className="h-6 text-xs" onClick={refetch}>Réessayer</Button>
          </div>
        )}

        {/* Grid */}
        {viewMode === "grid" && (
          <div className="px-4 lg:px-6">
            {loading ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                {Array.from({ length: 8 }).map((_, i) => <CardSkeleton key={i} />)}
              </div>
            ) : filtered.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-center">
                <div className="size-14 rounded-2xl bg-muted flex items-center justify-center text-2xl mb-4">📦</div>
                <p className="font-medium text-sm text-muted-foreground">Aucun service trouvé</p>
                {isAdmin && !query && (
                  <Button size="sm" className="mt-4 text-xs gap-1.5" onClick={() => setFormTarget("create")}>
                    <IconPlus className="size-3.5" /> Créer le premier service
                  </Button>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                {filtered.map(service => (
                  <ServiceCard
                    key={service.id}
                    service={service}
                    isAdmin={isAdmin}
                    onView={() => setPlansTarget(service)}
                    onEdit={() => setFormTarget(service)}
                    onDelete={() => setDeleteTarget(service)}
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {/* Liste */}
        {viewMode === "list" && (
          <div className="px-4 lg:px-6">
            <div className="rounded-xl border border-border/60 overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/30 hover:bg-muted/30 border-b border-border/60">
                    <TableHead className="h-9 px-4 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground/70">Service</TableHead>
                    <TableHead className="h-9 px-4 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground/70">Catégorie</TableHead>
                    <TableHead className="h-9 px-4 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground/70">Statut</TableHead>
                    <TableHead className="h-9 px-4 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground/70">Plans</TableHead>
                    <TableHead className="h-9 px-4 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground/70 text-right">Tarif min.</TableHead>
                    <TableHead className="h-9 px-4 w-[160px]" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    Array.from({ length: 6 }).map((_, i) => (
                      <TableRow key={i} className="border-b border-border/40">
                        {Array.from({ length: 6 }).map((_, j) => (
                          <TableCell key={j} className="py-3 px-4">
                            <div className="h-4 rounded bg-muted/60 animate-pulse w-3/4" />
                          </TableCell>
                        ))}
                      </TableRow>
                    ))
                  ) : filtered.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="h-32 text-center text-sm text-muted-foreground">
                        {query ? `Aucun résultat pour "${query}"` : "Aucun service trouvé."}
                      </TableCell>
                    </TableRow>
                  ) : (
                    filtered.map(service => (
                      <ServiceRow
                        key={service.id}
                        service={service}
                        isAdmin={isAdmin}
                        onView={() => setPlansTarget(service)}
                        onEdit={() => setFormTarget(service)}
                        onDelete={() => setDeleteTarget(service)}
                      />
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </div>
        )}
      </div>

      {/* ✅ ServicePlansDialog — dialog plans avec add/edit/delete/toggle intégrés */}
      {plansTarget && (
        <ServicePlansDialog
          service={plansTarget}
          isAdmin={isAdmin}
          onClose={() => setPlansTarget(null)}
          onSaved={refetch}
        />
      )}

      {/* ✅ ServiceFormModal — create ou edit */}
      {formTarget !== null && (
        <ServiceFormModal
          service={formTarget === "create" ? undefined : formTarget}
          onClose={() => setFormTarget(null)}
          onSaved={() => { setFormTarget(null); refetch() }}
        />
      )}

      {/* Confirm delete */}
      <AlertDialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer ce service ?</AlertDialogTitle>
            <AlertDialogDescription>
              Le service <strong>{deleteTarget?.name}</strong> et tous ses plans seront définitivement supprimés.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteLoading}>Annuler</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive hover:bg-destructive/90 text-destructive-foreground gap-1.5"
              onClick={handleDeleteConfirm}
              disabled={deleteLoading}
            >
              {deleteLoading && <IconLoader2 className="size-3.5 animate-spin" />}
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}