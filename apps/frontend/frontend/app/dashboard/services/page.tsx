// app/dashboard/services/page.tsx
"use client"

import * as React from "react"
import Link from "next/link"
import { ArrowUpRight, Loader2, AlertTriangle, Plus, Pencil, Trash2 } from "lucide-react"
import { SidebarInset, SidebarTrigger } from "@/components/ui/sidebar"
import { Separator } from "@/components/ui/separator"
import { Button }    from "@/components/ui/button"
import { IconShield, IconUser } from "@tabler/icons-react"
import { useAllServices }     from "@/lib/hooks/useApi"
import { useRole }            from "@/lib/hooks/useRole"
import { adminDeleteService } from "@/lib/services/admin.api"
import { ServiceFormModal }   from "@/components/admin/ServiceFormModal"
import { ConfirmDialog }      from "@/components/admin/ConfirmDialog"
// ✅ Import unique depuis @/lib/types — plus jamais depuis services/types
import type { CloudServiceDTO } from "@/lib/types"
import { cn } from "@/lib/utils"

// ── Types locaux ──────────────────────────────────────────────────────────────

type Modal =
  | { type: "create" }
  | { type: "edit";   service: CloudServiceDTO }
  | { type: "delete"; service: CloudServiceDTO }
  | null

// ── Mappings CloudType ────────────────────────────────────────────────────────
// ✅ Slugs URL en minuscules avec accent (correspond à SLUG_MAP dans [type]/page.tsx)

const CLOUD_SLUG: Record<string, string> = {
  "PRIVÉ":   "prive",
  "PUBLIC":  "public",
  "HYBRIDE": "hybride",
}

const CLOUD_LABEL: Record<string, string> = {
  "PRIVÉ":   "Cloud Privé",
  "PUBLIC":  "Cloud Public",
  "HYBRIDE": "Cloud Hybride",
}

const CLOUD_ICON: Record<string, string> = {
  "PRIVÉ":   "🔒",
  "PUBLIC":  "🌐",
  "HYBRIDE": "⚡",
}

const TAG_STYLE: Record<string, string> = {
  "PRIVÉ":   "bg-slate-100 text-slate-600 border-slate-200",
  "PUBLIC":  "bg-slate-50  text-slate-500 border-slate-200",
  "HYBRIDE": "bg-slate-100 text-slate-600 border-slate-200",
}

// ── Carte cloud (vue CLIENT) ──────────────────────────────────────────────────

function ClientCloudCard({ cloudType, count }: { cloudType: string; count: number }) {
  return (
    <Link
      href={`/dashboard/services/${CLOUD_SLUG[cloudType] ?? cloudType.toLowerCase()}`}
      className="group relative flex flex-col gap-6 border border-border rounded-2xl p-7 bg-card hover:shadow-sm hover:border-foreground/20 transition-all duration-200"
    >
      <div className="w-1.5 h-8 rounded-full bg-slate-800" />
      <div>
        <h2 className="text-base font-semibold tracking-tight text-foreground mb-1">
          {CLOUD_ICON[cloudType]} {CLOUD_LABEL[cloudType] ?? cloudType}
        </h2>
        <p className="text-[12px] text-muted-foreground">{count} service{count > 1 ? "s" : ""}</p>
      </div>
      <span className={cn("text-[11px] font-medium px-2.5 py-0.5 rounded-full border w-fit", TAG_STYLE[cloudType])}>
        {cloudType}
      </span>
      <ArrowUpRight className="absolute top-6 right-6 w-3.5 h-3.5 text-muted-foreground/25 group-hover:text-muted-foreground transition-colors" />
    </Link>
  )
}

// ── Ligne service (vue ADMIN) ─────────────────────────────────────────────────

function AdminServiceRow({
  service, onEdit, onDelete,
}: {
  service:  CloudServiceDTO
  onEdit:   () => void
  onDelete: () => void
}) {
  // ✅ PlanDTO.isActive (pas .active)
  const activePlans = service.plans.filter(p => p.isActive).length

  return (
    <div className="group flex items-center gap-4 px-5 py-3.5 border-b border-border/60 last:border-0 hover:bg-muted/20 transition-colors">
      <div className="text-xl w-8 shrink-0 text-center">{service.icon ?? "🖥️"}</div>
      <div className="flex-1 min-w-0">
        {/* ✅ service.name (pas service.title) */}
        <p className="text-[13px] font-semibold text-foreground truncate">{service.name}</p>
        <p className="text-[11px] text-muted-foreground truncate mt-0.5">{service.description}</p>
      </div>
      <div className="hidden md:flex items-center gap-2 shrink-0">
        <span className={cn("text-[10px] font-medium px-2 py-0.5 rounded-full border", TAG_STYLE[service.cloudType])}>
          {CLOUD_LABEL[service.cloudType] ?? service.cloudType}
        </span>
        <span className="text-[10px] font-medium px-2 py-0.5 rounded-full border border-border bg-muted text-muted-foreground">
          {service.category}
        </span>
        {/* ✅ ServiceStatus "ACTIF" (pas "ACTIVE") */}
        <span className={cn(
          "text-[10px] font-medium px-2 py-0.5 rounded-full border",
          service.status === "ACTIF"       && "border-emerald-200 bg-emerald-50 text-emerald-700",
          service.status === "INACTIF"     && "border-zinc-200 bg-zinc-50 text-zinc-500",
          service.status === "MAINTENANCE" && "border-amber-200 bg-amber-50 text-amber-700",
        )}>
          {service.status}
        </span>
      </div>
      <span className="text-[12px] text-muted-foreground shrink-0 hidden sm:block tabular-nums">
        {service.plans.length} plan{service.plans.length > 1 ? "s" : ""}
        {" "}({activePlans} actif{activePlans > 1 ? "s" : ""})
      </span>
      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
        <Link
          href={`/dashboard/services/${CLOUD_SLUG[service.cloudType] ?? service.cloudType.toLowerCase()}`}
          className="w-7 h-7 flex items-center justify-center rounded-md hover:bg-muted transition-colors"
          title="Voir les plans"
          onClick={e => e.stopPropagation()}
        >
          <ArrowUpRight className="w-3.5 h-3.5 text-muted-foreground" />
        </Link>
        <button
          onClick={onEdit}
          className="w-7 h-7 flex items-center justify-center rounded-md hover:bg-muted transition-colors"
          title="Modifier"
        >
          <Pencil className="w-3.5 h-3.5 text-muted-foreground" />
        </button>
        <button
          onClick={onDelete}
          className="w-7 h-7 flex items-center justify-center rounded-md hover:bg-muted transition-colors"
          title="Supprimer"
        >
          <Trash2 className="w-3.5 h-3.5 text-muted-foreground" />
        </button>
      </div>
    </div>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function ServicesPage() {
  const { isAdmin } = useRole()
  const { data: services, loading, error, reload } = useAllServices()

  const [modal,         setModal]         = React.useState<Modal>(null)
  const [deleteLoading, setDeleteLoading] = React.useState(false)

  // Grouper par cloudType pour la vue client
  const byCloud = React.useMemo(() => {
    if (!services) return {} as Record<string, CloudServiceDTO[]>
    return services.reduce<Record<string, CloudServiceDTO[]>>((acc, s) => {
      ;(acc[s.cloudType] ??= []).push(s)
      return acc
    }, {})
  }, [services])

  const handleDelete = async () => {
    if (modal?.type !== "delete") return
    setDeleteLoading(true)
    try {
      await adminDeleteService(modal.service.id)
      setModal(null)
      reload()
    } finally {
      setDeleteLoading(false)
    }
  }

  return (
    <SidebarInset>

      <header className="flex h-14 items-center gap-3 border-b border-border/60 px-5 bg-background/95 backdrop-blur sticky top-0 z-10">
        <SidebarTrigger className="-ml-1 size-8 text-muted-foreground hover:text-foreground hover:bg-muted rounded-md transition-colors" />
        <Separator orientation="vertical" className="h-4 opacity-40" />
        <nav className="flex items-center gap-1.5 text-[13px]">
          <span className="text-muted-foreground">Dashboard</span>
          <span className="text-muted-foreground/30">/</span>
          <span className="font-medium text-foreground">Services Cloud</span>
        </nav>
        <div className="ml-auto flex items-center gap-1.5 rounded-full border border-border bg-muted/40 px-3 py-1 text-[11px] font-medium tracking-wide">
          {isAdmin
            ? <><IconShield className="size-3 text-foreground/60" /><span className="text-foreground/70 uppercase">Admin</span></>
            : <><IconUser   className="size-3 text-foreground/60" /><span className="text-foreground/70 uppercase">Client</span></>
          }
        </div>
      </header>

      <div className="flex flex-1 flex-col gap-8 p-6 max-w-5xl mx-auto w-full">

        <div className="pt-6 pb-2 text-center">
          <p className="text-[11px] font-semibold tracking-[0.18em] uppercase text-muted-foreground mb-4">
            Marketplace Cloud
          </p>
          <h1 className="text-3xl font-semibold tracking-tight text-foreground">
            {isAdmin ? "Gestion des services" : "Choisissez votre "}
            {!isAdmin && <em className="not-italic font-light text-muted-foreground">infrastructure</em>}
          </h1>
          <p className="mt-2 text-[13px] text-muted-foreground max-w-sm mx-auto">
            {isAdmin
              ? "Créez, modifiez et supprimez les services cloud et leurs plans."
              : "Privé, public ou hybride — chaque service disponible en quelques clics."}
          </p>
        </div>

        <Separator className="opacity-50" />

        {loading && (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="size-4 animate-spin text-muted-foreground" />
          </div>
        )}

        {!loading && error && (
          <div className="flex items-center gap-3 border border-border rounded-xl px-5 py-4 text-[13px] text-muted-foreground">
            <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0" />
            {error}
            <button onClick={reload} className="ml-auto underline text-foreground text-[12px]">Réessayer</button>
          </div>
        )}

        {/* ── Vue CLIENT : 3 cartes cloudType cliquables ── */}
        {!loading && !error && !isAdmin && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {Object.entries(byCloud).map(([cloudType, svcs]) => (
              <ClientCloudCard key={cloudType} cloudType={cloudType} count={svcs.length} />
            ))}
            {Object.keys(byCloud).length === 0 && (
              <p className="col-span-3 text-center text-[13px] text-muted-foreground py-12">
                Aucun service disponible.
              </p>
            )}
          </div>
        )}

        {/* ── Vue ADMIN : liste avec actions CRUD ── */}
        {!loading && !error && isAdmin && (
          <div>
            <div className="flex items-center justify-between mb-3">
              <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
                Tous les services ({services?.length ?? 0})
              </p>
              <Button size="sm" className="h-8 text-[12px] gap-1.5" onClick={() => setModal({ type: "create" })}>
                <Plus className="w-3.5 h-3.5" /> Nouveau service
              </Button>
            </div>
            <div className="border border-border rounded-2xl overflow-hidden bg-card">
              {services && services.length > 0
                ? services.map(s => (
                    <AdminServiceRow
                      key={s.id} service={s}
                      onEdit={()   => setModal({ type: "edit",   service: s })}
                      onDelete={() => setModal({ type: "delete", service: s })}
                    />
                  ))
                : (
                  <div className="px-5 py-12 text-center text-[13px] text-muted-foreground">
                    Aucun service.{" "}
                    <button onClick={() => setModal({ type: "create" })} className="underline text-foreground">
                      Créer le premier
                    </button>
                  </div>
                )
              }
            </div>
          </div>
        )}
      </div>

      {(modal?.type === "create" || modal?.type === "edit") && (
        <ServiceFormModal
          service={modal.type === "edit" ? modal.service : undefined}
          onClose={() => setModal(null)}
          onSaved={() => { setModal(null); reload() }}
        />
      )}

      {modal?.type === "delete" && (
        <ConfirmDialog
          title="Supprimer le service"
          // ✅ service.name (pas service.title)
          message={`Supprimer "${modal.service.name}" et tous ses plans ? Cette action est irréversible.`}
          loading={deleteLoading}
          onConfirm={handleDelete}
          onCancel={() => setModal(null)}
        />
      )}

    </SidebarInset>
  )
}