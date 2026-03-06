"use client"

import * as React from "react"
import {
  flexRender, getCoreRowModel, getFilteredRowModel,
  getPaginationRowModel, getSortedRowModel, useReactTable,
  type ColumnDef, type ColumnFiltersState, type SortingState,
} from "@tanstack/react-table"
import {
  IconChevronLeft, IconChevronRight, IconChevronsLeft, IconChevronsRight,
  IconPencil, IconTrash, IconPlus, IconSearch, IconChevronUp, IconChevronDown,
  IconDotsVertical, IconLoader2, IconAlertCircle, IconRefresh,
} from "@tabler/icons-react"
import { Badge }  from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input }  from "@/components/ui/input"
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table"
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { cn } from "@/lib/utils"
// ✅ apiFetch gère le Bearer token automatiquement
import { apiFetch } from "@/lib/apiClient"
import type { CloudServiceDTO, ServiceStatus, ServiceCategory } from "../types"
import { ServiceDialog, type DialogMode } from "./service-dialog"

// ─── Labels ───────────────────────────────────────────────────────────────────

const categoryLabels: Record<ServiceCategory, string> = {
  CALCUL:       "Calcul",
  HEBERGEMENT:  "Hébergement",
  STOCKAGE:     "Stockage",
  BASE_DONNEES: "Base de données",
  RESEAU:       "Réseau",
  EMAIL:        "Email",
  IA:           "Intelligence Artificielle",
  SECURITE:     "Sécurité",
  IAM:          "Gestion d'accès",
}

const statusConfig: Record<ServiceStatus, { label: string; className: string }> = {
  ACTIF: {
    label: "Actif",
    className: "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-400",
  },
  MAINTENANCE: {
    label: "Maintenance",
    className: "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-400",
  },
  INACTIF: {
    label: "Inactif",
    className: "border-zinc-200 bg-zinc-50 text-zinc-500 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-500",
  },
}

function StatusBadge({ status }: { status: ServiceStatus }) {
  const cfg = statusConfig[status] ?? { label: status, className: "border-zinc-200 bg-zinc-50 text-zinc-500" }
  return (
    <Badge variant="outline" className={cn("text-[11px] font-medium h-5 px-2 rounded-md", cfg.className)}>
      {cfg.label}
    </Badge>
  )
}

// ─── Hook fetch ───────────────────────────────────────────────────────────────
// ✅ Utilise apiFetch — Bearer token ajouté automatiquement

function useServices() {
  const [services, setServices] = React.useState<CloudServiceDTO[]>([])
  const [loading,  setLoading]  = React.useState(true)
  const [error,    setError]    = React.useState<string | null>(null)

  const fetch_ = React.useCallback(() => {
    setLoading(true)
    setError(null)
    // ✅ apiFetch au lieu de fetch() direct — ajoute Authorization: Bearer <token>
    apiFetch<CloudServiceDTO[]>("/api/services")
      .then(setServices)
      .catch(e => setError(e.message ?? "Impossible de charger les services."))
      .finally(() => setLoading(false))
  }, [])

  React.useEffect(() => { fetch_() }, [fetch_])

  async function deleteService(id: number) {
    // ✅ apiFetch pour DELETE aussi
    await apiFetch(`/api/services/${id}`, { method: "DELETE" })
    setServices(prev => prev.filter(s => s.id !== id))
  }

  return { services, loading, error, refetch: fetch_, deleteService }
}

// ─── Props ────────────────────────────────────────────────────────────────────

interface ServicesTableProps {
  isAdmin?: boolean
}

// ══════════════════════════════════════════════════════════════════════════════

export function ServicesTable({ isAdmin = false }: ServicesTableProps) {
  const { services, loading, error, refetch, deleteService } = useServices()

  const [selectedService, setSelectedService] = React.useState<CloudServiceDTO | null>(null)
  const [dialogMode,      setDialogMode]      = React.useState<DialogMode>("view")
  const [dialogOpen,      setDialogOpen]      = React.useState(false)
  const [deleteTarget,    setDeleteTarget]    = React.useState<CloudServiceDTO | null>(null)
  const [deleteLoading,   setDeleteLoading]   = React.useState(false)
  const [globalFilter,    setGlobalFilter]    = React.useState("")
  const [sorting,         setSorting]         = React.useState<SortingState>([])
  const [columnFilters,   setColumnFilters]   = React.useState<ColumnFiltersState>([])
  const [pagination,      setPagination]      = React.useState({ pageIndex: 0, pageSize: 8 })

  function openDialog(service: CloudServiceDTO, mode: DialogMode = "view") {
    setSelectedService(service); setDialogMode(mode); setDialogOpen(true)
  }
  function openCreate() {
    setSelectedService(null); setDialogMode("create"); setDialogOpen(true)
  }

  async function handleDeleteConfirm() {
    if (!deleteTarget) return
    setDeleteLoading(true)
    try { await deleteService(deleteTarget.id) } catch (e: any) { console.error(e.message) }
    finally { setDeleteLoading(false); setDeleteTarget(null) }
  }

  const columns: ColumnDef<CloudServiceDTO>[] = [
    {
      accessorKey: "name",
      header: ({ column }) => <SortableHeader column={column} label="Service" />,
      cell: ({ row }) => {
        const s = row.original
        return (
          <div className="flex items-center gap-3 min-w-0">
            {s.icon && <span className="text-xl flex-shrink-0">{s.icon}</span>}
            <div className="min-w-0">
              <p className="font-medium text-sm leading-tight truncate">{s.name}</p>
              {s.description && (
                <p className="text-[11px] text-muted-foreground truncate max-w-[220px]">{s.description}</p>
              )}
            </div>
          </div>
        )
      },
    },
    {
      accessorKey: "category",
      header: ({ column }) => <SortableHeader column={column} label="Catégorie" />,
      cell: ({ row }) => (
        <span className="text-xs text-muted-foreground">
          {categoryLabels[row.original.category] ?? row.original.category}
        </span>
      ),
    },
    {
      accessorKey: "cloudType",
      header: "Type cloud",
      cell: ({ row }) => {
        const map: Record<string, string> = {
          "PRIVÉ":   "Cloud Privé",
          "PUBLIC":  "Cloud Public",
          "HYBRIDE": "Cloud Hybride",
        }
        return <span className="text-xs text-muted-foreground">{map[row.original.cloudType] ?? row.original.cloudType}</span>
      },
    },
    {
      accessorKey: "status",
      header: "Statut",
      cell: ({ row }) => <StatusBadge status={row.original.status} />,
    },
    {
      id: "plans",
      header: "Plans",
      cell: ({ row }) => {
        const count  = row.original.plans?.length ?? 0
        const active = row.original.plans?.filter(p => p.isActive).length ?? 0
        return (
          <div className="flex items-center gap-1.5">
            <span className="text-sm font-medium tabular-nums">{count}</span>
            {count > 0 && (
              <span className="text-[10px] text-muted-foreground">
                ({active} actif{active > 1 ? "s" : ""})
              </span>
            )}
          </div>
        )
      },
    },
    {
      id: "pricing",
      header: () => <span className="block text-right">Tarif min.</span>,
      cell: ({ row }) => {
        const activePlans = (row.original.plans ?? []).filter(p => p.isActive)
        if (activePlans.length === 0)
          return <span className="block text-right text-xs text-muted-foreground">—</span>

        const min   = Math.min(...activePlans.map(p => p.price))
        const found = activePlans.find(p => p.price === min)
        const cycleMap: Record<string, string> = { HORAIRE: "/h", MENSUEL: "/mois", ANNUEL: "/an" }
        const cycle = found ? (cycleMap[found.billingCycle] ?? "") : ""

        return (
          <div className="text-right">
            <span className="font-mono text-sm font-semibold tabular-nums">
              {min === 0 ? "Gratuit" : `${min.toFixed(2)} €`}
            </span>
            {min > 0 && <span className="text-[11px] text-muted-foreground ml-0.5">{cycle}</span>}
          </div>
        )
      },
    },
    {
      id: "actions",
      header: "",
      cell: ({ row }) => {
        const s = row.original
        return (
          <div className="flex items-center justify-end gap-1" onClick={e => e.stopPropagation()}>
            <Button size="sm" variant="ghost"
              className="h-7 px-2.5 text-xs text-muted-foreground hover:text-foreground"
              onClick={e => { e.stopPropagation(); openDialog(s, "view") }}>
              {isAdmin ? "Plans" : "Offres"}
            </Button>
            {isAdmin && (
              <>
                <Button size="icon" variant="ghost"
                  className="size-7 text-muted-foreground hover:text-foreground hover:bg-muted"
                  onClick={e => { e.stopPropagation(); openDialog(s, "edit") }}>
                  <IconPencil className="size-3.5" />
                </Button>
                <Button size="icon" variant="ghost"
                  className="size-7 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                  onClick={e => { e.stopPropagation(); setDeleteTarget(s) }}>
                  <IconTrash className="size-3.5" />
                </Button>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button size="icon" variant="ghost"
                      className="size-7 text-muted-foreground sm:hidden"
                      onClick={e => e.stopPropagation()}>
                      <IconDotsVertical className="size-3.5" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="text-sm">
                    <DropdownMenuItem onClick={() => openDialog(s, "view")}>Voir les plans</DropdownMenuItem>
                    <DropdownMenuItem onClick={() => openDialog(s, "edit")}>
                      <IconPencil className="size-3.5 mr-2" /> Modifier
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem className="text-destructive focus:text-destructive"
                      onClick={() => setDeleteTarget(s)}>
                      <IconTrash className="size-3.5 mr-2" /> Supprimer
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </>
            )}
          </div>
        )
      },
    },
  ]

  const table = useReactTable({
    data: services, columns,
    state: { sorting, columnFilters, pagination, globalFilter },
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onPaginationChange: setPagination,
    onGlobalFilterChange: setGlobalFilter,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
  })

  const rows = table.getRowModel().rows

  return (
    <>
      <div className="flex flex-col gap-3">

        <div className="flex items-center justify-between px-4 lg:px-6">
          <div className="relative w-64">
            <IconSearch className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground pointer-events-none" />
            <Input placeholder="Rechercher un service…" value={globalFilter}
              onChange={e => setGlobalFilter(e.target.value)}
              className="pl-8 h-8 text-sm bg-muted/40 border-transparent focus-visible:border-border focus-visible:bg-background" />
          </div>
          <div className="flex items-center gap-2">
            {!loading && (
              <span className="text-xs text-muted-foreground">
                {table.getFilteredRowModel().rows.length} service(s)
              </span>
            )}
            <Button size="icon" variant="ghost"
              className="size-8 text-muted-foreground hover:text-foreground"
              onClick={refetch} title="Actualiser">
              <IconRefresh className={cn("size-3.5", loading && "animate-spin")} />
            </Button>
            {isAdmin && (
              <Button size="sm" className="h-8 text-xs gap-1.5" onClick={openCreate}>
                <IconPlus className="size-3.5" /> Nouveau service
              </Button>
            )}
          </div>
        </div>

        {error && (
          <div className="mx-4 lg:mx-6 flex items-center gap-2 rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
            <IconAlertCircle className="size-4 flex-shrink-0" />
            <span>{error}</span>
            <Button variant="ghost" size="sm" className="ml-auto h-6 text-xs" onClick={refetch}>Réessayer</Button>
          </div>
        )}

        <div className="px-4 lg:px-6">
          <div className="rounded-xl border border-border/60 overflow-hidden">
            <Table>
              <TableHeader>
                {table.getHeaderGroups().map(hg => (
                  <TableRow key={hg.id} className="border-b border-border/60 bg-muted/30 hover:bg-muted/30">
                    {hg.headers.map(h => (
                      <TableHead key={h.id} className="h-9 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground/70 px-3">
                        {h.isPlaceholder ? null : flexRender(h.column.columnDef.header, h.getContext())}
                      </TableHead>
                    ))}
                  </TableRow>
                ))}
              </TableHeader>
              <TableBody>
                {loading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <TableRow key={i} className="border-b border-border/40">
                      {columns.map((_, j) => (
                        <TableCell key={j} className="py-3 px-3">
                          <div className="h-4 rounded bg-muted/60 animate-pulse w-3/4" />
                        </TableCell>
                      ))}
                    </TableRow>
                  ))
                ) : rows.length > 0 ? (
                  rows.map((row, i) => (
                    <TableRow key={row.id}
                      className={cn(
                        "cursor-pointer border-b border-border/40 transition-colors hover:bg-muted/20",
                        i === rows.length - 1 && "border-0"
                      )}
                      onClick={() => openDialog(row.original, "view")}>
                      {row.getVisibleCells().map(cell => (
                        <TableCell key={cell.id} className="py-3 px-3">
                          {flexRender(cell.column.columnDef.cell, cell.getContext())}
                        </TableCell>
                      ))}
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={columns.length} className="h-32 text-center text-sm text-muted-foreground">
                      {globalFilter ? `Aucun résultat pour "${globalFilter}"` : "Aucun service trouvé."}
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </div>

        <div className="flex items-center justify-between px-4 lg:px-6 py-1">
          <p className="text-xs text-muted-foreground">
            Page <span className="font-medium text-foreground">{table.getState().pagination.pageIndex + 1}</span>
            {" "}sur{" "}
            <span className="font-medium text-foreground">{Math.max(table.getPageCount(), 1)}</span>
          </p>
          <div className="flex items-center gap-1">
            {[
              { icon: <IconChevronsLeft  className="size-3.5" />, fn: () => table.setPageIndex(0),                       disabled: !table.getCanPreviousPage() },
              { icon: <IconChevronLeft   className="size-3.5" />, fn: () => table.previousPage(),                         disabled: !table.getCanPreviousPage() },
              { icon: <IconChevronRight  className="size-3.5" />, fn: () => table.nextPage(),                             disabled: !table.getCanNextPage()     },
              { icon: <IconChevronsRight className="size-3.5" />, fn: () => table.setPageIndex(table.getPageCount() - 1), disabled: !table.getCanNextPage()     },
            ].map((btn, i) => (
              <Button key={i} variant="ghost" size="icon"
                className="size-7 text-muted-foreground hover:text-foreground"
                onClick={btn.fn} disabled={btn.disabled}>
                {btn.icon}
              </Button>
            ))}
          </div>
        </div>
      </div>

      <ServiceDialog
        service={selectedService}
        mode={dialogMode}
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        isAdmin={isAdmin}
        onServiceSaved={() => { setDialogOpen(false); refetch() }}
      />

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
              onClick={handleDeleteConfirm} disabled={deleteLoading}>
              {deleteLoading && <IconLoader2 className="size-3.5 animate-spin" />}
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}

function SortableHeader({ column, label, className }: { column: any; label: string; className?: string }) {
  const sorted = column.getIsSorted()
  return (
    <button
      className={cn("flex items-center gap-1 hover:text-foreground transition-colors", className)}
      onClick={() => column.toggleSorting(sorted === "asc")}>
      {label}
      <span className="flex flex-col">
        <IconChevronUp   className={cn("size-2.5 -mb-0.5", sorted === "asc"  ? "text-foreground" : "opacity-30")} />
        <IconChevronDown className={cn("size-2.5",          sorted === "desc" ? "text-foreground" : "opacity-30")} />
      </span>
    </button>
  )
}