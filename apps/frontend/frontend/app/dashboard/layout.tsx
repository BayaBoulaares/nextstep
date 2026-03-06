
// app/dashboard/layout.tsx
import { SidebarProvider } from "@/components/ui/sidebar"
import { AppSidebar }      from "@/components/app-sidebar"
import { SessionGuard } from "@/components/SessionGuard"

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <SidebarProvider>
      <SessionGuard>                          {/* ← ajoutez ça */}
        <div className="flex min-h-screen w-full bg-background">
          <AppSidebar />
          <div className="flex flex-1 flex-col min-w-0">
            {children}
          </div>
        </div>
      </SessionGuard>                         {/* ← et ça */}
    </SidebarProvider>
  )
}