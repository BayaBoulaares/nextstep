// app/dashboard/storage/page.tsx
"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { SidebarInset, SidebarTrigger } from "@/components/ui/sidebar"
import { Separator } from "@/components/ui/separator"
import { Button } from "@/components/ui/button"
import { Loader2, Plus, RefreshCw } from "lucide-react"
import { cn } from "@/lib/utils"
import { useStorageList } from "@/lib/hooks/useStorage"
import {
  STORAGE_META, STATUT_META,
  StorageType, StorageResponse,
} from "@/lib/types"

const ICONS: Record<string, string> = {
  "ti-bucket":        "🪣",
  "ti-device-floppy": "💿",
  "ti-folder":        "📁",
}

function formatSize(go: number) {
  return go >= 1000 ? `${go / 1000} To` : `${go} Go`
}

function StorageRow({ s, onDelete }: { s: StorageResponse; onDelete: () => void }) {
  const meta   = STORAGE_META[s.type]
  const statut = STATUT_META[s.statut]

  return (
    <Link
      href={`/dashboard/storage/${s.id}`}
      className="flex items-center gap-4 px-5 py-4 border-b border-border/60
                 last:border-0 hover:bg-muted/30 transition-colors group"
    >
      {/* Icône */}
      <span className="text-xl shrink-0">{ICONS[meta.icon]}</span>

      {/* Infos principales */}
      <div className="flex-1 min-w-0">
        <p className="text-[13px] font-medium text-foreground">{meta.label}</p>
        <p className="text-[11px] text-muted-foreground font-mono truncate mt-0.5">
          {s.ressourceNom}
        </p>
      </div>

      {/* Namespace */}
      <div className="hidden md:block text-[11px] text-muted-foreground font-mono">
        {s.namespace}
      </div>

      {/* Capacité */}
      <div className="text-[13px] font-medium text-foreground w-16 text-right shrink-0">
        {formatSize(s.capaciteGo)}
      </div>

      {/* Statut */}
      <span className={cn(
        "text-[11px] font-medium px-2.5 py-0.5 rounded-full border shrink-0",
        statut.color
      )}>
        {statut.label}
      </span>

      {/* Date */}
      <div className="hidden lg:block text-[11px] text-muted-foreground shrink-0">
        {new Date(s.createdAt).toLocaleDateString("fr-FR")}
      </div>

      <span className="text-muted-foreground group-hover:text-foreground transition-colors text-[13px]">
        →
      </span>
    </Link>
  )
}

export default function MesStoragesPage() {
  const { storages, loading, error, refetch, remove } = useStorageList()
  const router = useRouter()

  // Regrouper par type
  const byType = (type: StorageType) => storages.filter(s => s.type === type)
  const hasAny = storages.length > 0

  return (
    <SidebarInset>
      <header className="flex h-14 items-center gap-3 border-b border-border/60 px-5
                         bg-background/95 backdrop-blur sticky top-0 z-10">
        <SidebarTrigger className="-ml-1 size-8 text-muted-foreground hover:text-foreground
                                    hover:bg-muted rounded-md transition-colors" />
        <Separator orientation="vertical" className="h-4 opacity-40" />
        <nav className="flex items-center gap-1.5 text-[12px] text-muted-foreground">
          <Link href="/dashboard" className="hover:text-foreground transition-colors">Dashboard</Link>
          <span className="opacity-30">/</span>
          <span className="font-medium text-foreground">Mes stockages</span>
        </nav>
        <div className="ml-auto flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={refetch}
            disabled={loading}
          >
            <RefreshCw className={cn("w-3.5 h-3.5", loading && "animate-spin")} />
          </Button>
          <Button
            size="sm"
            className="h-8 text-[12px] gap-1.5"
            onClick={() => router.push("/dashboard/services")}
          >
            <Plus className="w-3.5 h-3.5" />
            Nouveau stockage
          </Button>
        </div>
      </header>

      <div className="p-6 max-w-5xl mx-auto w-full">

        {/* Hero */}
        <div className="mb-6">
          <h1 className="text-xl font-semibold tracking-tight">Mes stockages</h1>
          <p className="text-[13px] text-muted-foreground mt-1">
            {hasAny
              ? `${storages.length} ressource${storages.length > 1 ? "s" : ""} de stockage`
              : "Aucune ressource de stockage provisionnée."}
          </p>
        </div>

        {/* Chargement */}
        {loading && (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
          </div>
        )}

        {/* Erreur */}
        {error && !loading && (
          <div className="text-center py-12">
            <p className="text-[13px] text-muted-foreground mb-3">{error}</p>
            <Button variant="outline" size="sm" onClick={refetch}>Réessayer</Button>
          </div>
        )}

        {/* État vide */}
        {!loading && !error && !hasAny && (
          <div className="border border-border border-dashed rounded-2xl px-8 py-16
                          text-center flex flex-col items-center gap-4">
            <span className="text-4xl">💾</span>
            <div>
              <p className="text-[14px] font-medium text-foreground">
                Aucun stockage provisionné
              </p>
              <p className="text-[12px] text-muted-foreground mt-1">
                Choisissez un type de stockage dans le catalogue.
              </p>
            </div>
            <Button
              size="sm"
              className="text-[12px]"
              onClick={() => router.push("/dashboard/services")}
            >
              Parcourir le catalogue →
            </Button>
          </div>
        )}

        {/* Liste groupée par type */}
        {!loading && !error && hasAny && (
          <div className="space-y-6">

            {/* KPIs */}
            <div className="grid grid-cols-3 gap-3">
              {[
                { label: "Total stockage", value: `${storages.reduce((a, s) => a + s.capaciteGo, 0)} Go` },
                { label: "Ressources actives", value: storages.filter(s => s.statut === "ACTIF").length },
                {
                  label: "Coût mensuel est.",
                  value: storages.reduce((a, s) =>
                    a + s.capaciteGo * STORAGE_META[s.type].prixParGo, 0
                  ).toFixed(2) + " TND"
                },
              ].map(kpi => (
                <div key={kpi.label}
                  className="bg-muted/30 rounded-xl border border-border px-4 py-3">
                  <p className="text-[11px] text-muted-foreground">{kpi.label}</p>
                  <p className="text-[20px] font-semibold text-foreground mt-0.5">
                    {kpi.value}
                  </p>
                </div>
              ))}
            </div>

            {/* Tableau */}
            <div className="border border-border rounded-2xl overflow-hidden bg-card">
              {/* En-tête */}
              <div className="flex items-center gap-4 px-5 py-3
                              border-b border-border bg-muted/20
                              text-[11px] font-medium text-muted-foreground uppercase tracking-wide">
                <span className="w-5" />
                <span className="flex-1">Ressource</span>
                <span className="hidden md:block">Namespace</span>
                <span className="w-16 text-right">Taille</span>
                <span className="w-20 text-center">Statut</span>
                <span className="hidden lg:block w-24">Créé le</span>
                <span className="w-4" />
              </div>

              {/* Lignes */}
              {storages.map(s => (
                <StorageRow key={s.id} s={s} onDelete={() => remove(s.id)} />
              ))}
            </div>
          </div>
        )}
      </div>
    </SidebarInset>
  )
}