// app/dashboard/services/page.tsx
"use client"

import { SidebarInset, SidebarTrigger } from "@/components/ui/sidebar"
import { Separator } from "@/components/ui/separator"
import { IconShield, IconUser } from "@tabler/icons-react"
import { useRole } from "@/lib/hooks/useRole"
import { ServicesTable } from "@/app/features/services/components/services-table"

export default function ServicesPage() {
  const { isAdmin } = useRole()

  return (
    <SidebarInset>

      {/* ── Header ── */}
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
            : <><IconUser  className="size-3 text-foreground/60" /><span className="text-foreground/70 uppercase">Client</span></>
          }
        </div>
      </header>

      {/* ── Page body ── */}
      <div className="flex flex-1 flex-col gap-6 py-6">

        {/* Hero text */}
        <div className="px-4 lg:px-6 text-center">
          <p className="text-[11px] font-semibold tracking-[0.18em] uppercase text-muted-foreground mb-3">
            Marketplace Cloud
          </p>
          <h1 className="text-2xl font-semibold tracking-tight">
            {isAdmin
              ? "Gestion des services"
              : <>Choisissez votre <em className="not-italic font-light text-muted-foreground">infrastructure</em></>
            }
          </h1>
          <p className="mt-1.5 text-[13px] text-muted-foreground max-w-sm mx-auto">
            {isAdmin
              ? "Créez, modifiez et supprimez les services cloud et leurs plans."
              : "Privé, public ou hybride — chaque service disponible en quelques clics."}
          </p>
        </div>

        <Separator className="opacity-40 mx-4 lg:mx-6" />

        {/* Catalogue — grille de cartes + dialog plans */}
        <ServicesTable isAdmin={isAdmin} />

      </div>
    </SidebarInset>
  )
}