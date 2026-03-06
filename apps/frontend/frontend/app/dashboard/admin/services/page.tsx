// app/dashboard/admin/services/page.tsx
"use client"

import { SidebarInset, SidebarTrigger } from "@/components/ui/sidebar"
import { Separator } from "@/components/ui/separator"
import { ServicesTable } from "@/app/features/services/components/services-table"

export default function AdminServicesPage() {
  return (
    <SidebarInset>
      <header className="flex h-14 items-center gap-3 border-b border-border/60 px-5 bg-background/95 backdrop-blur sticky top-0 z-10">
        <SidebarTrigger className="-ml-1 size-8 text-muted-foreground hover:text-foreground hover:bg-muted rounded-md transition-colors" />
        <Separator orientation="vertical" className="h-4 opacity-40" />
        <nav className="flex items-center gap-1.5 text-[13px]">
          <span className="text-muted-foreground">Dashboard</span>
          <span className="text-muted-foreground/30">/</span>
          <span className="font-medium text-foreground">Gestion des services</span>
        </nav>
      </header>

      <div className="flex flex-1 flex-col gap-6 py-6">
        <div className="px-4 lg:px-6">
          <h1 className="text-xl font-semibold tracking-tight">Services Cloud</h1>
          <p className="text-[13px] text-muted-foreground mt-1">
            Créez et gérez les services et leurs plans tarifaires.
          </p>
        </div>

        {/* ✅ isAdmin={true} — active la vue admin dans ServicesTable et ServiceDialog */}
        <ServicesTable isAdmin={true} />
      </div>
    </SidebarInset>
  )
}