"use client"
// components/app-sidebar.tsx
// MODIFICATION : ajout de "Mes Abonnements" dans NAV_CLIENT

import * as React from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { useSession } from "next-auth/react"
import {
  IconChartBar,
  IconCloudComputing,
  IconCreditCard,      // ← NOUVEAU icône pour Mes Abonnements
  IconDashboard,
  IconHelp,
  IconInnerShadowTop,
  IconListDetails,
  IconSearch,
  IconSettings,
  IconShield,
  IconUsers,
} from "@tabler/icons-react"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarGroup,
  SidebarGroupLabel,
} from "@/components/ui/sidebar"
import { NavUser } from "@/components/nav-user"
import { NavSecondary } from "@/components/nav-secondary"
import { MonitorIcon } from "lucide-react"

// ⚠️ MODIFICATION : ajout de "Mes Abonnements"
const NAV_CLIENT = [
  { title: "Services Cloud", url: "/dashboard/services", icon: IconCloudComputing },
  { title: "Mes Plans", url: "/dashboard/mes-plans", icon: IconListDetails },
  { title: "Mes Abonnements", url: "/dashboard/abonnements", icon: IconCreditCard }, // ← NOUVEAU
  { title: "Mes Vms", url: "/dashboard/vms", icon: MonitorIcon  }, // ← NOUVEAU

]
const NAV_COMMON = [
  { title: "Dashboard", url: "/dashboard", icon: IconDashboard },
]
const NAV_ADMIN_ONLY = [
  { title: "Services Cloud", url: "/dashboard/services", icon: IconCloudComputing },
  { title: "Clients", url: "/dashboard/admin/clients", icon: IconUsers },
  { title: "Audit Logs", url: "/dashboard/audit-logs", icon: IconShield },
  { title: "Analytics", url: "/dashboard/analytics", icon: IconChartBar },
]

const NAV_SECONDARY = [
  { title: "Paramètres", url: "/dashboard/settings", icon: IconSettings },
  { title: "Aide", url: "/dashboard/help", icon: IconHelp },
  { title: "Recherche", url: "/dashboard/search", icon: IconSearch },
]

function NavItem({
  title, url, icon: Icon, adminStyle = false,
}: {
  title: string; url: string; icon: React.ElementType; adminStyle?: boolean
}) {
  const pathname = usePathname()
  const isActive = pathname === url || pathname.startsWith(url + "/")

  return (
    <SidebarMenuItem>
      <SidebarMenuButton
        asChild
        isActive={isActive}
        className={adminStyle
          ? "text-zinc-800 hover:text-zinc-900 hover:bg-zinc-100 data-[active=true]:bg-zinc-200 data-[active=true]:text-zinc-900"
          : undefined
        }
      >
        <Link href={url} className="flex items-center gap-2">
          <Icon className="size-4 shrink-0" />
          <span>{title}</span>
        </Link>
      </SidebarMenuButton>
    </SidebarMenuItem>
  )
}

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const { data: session } = useSession()
  const roles: string[] = (session as any)?.roles ?? []
  const isAdmin = roles.includes("admin")

  const user = {
    name: session?.user?.name ?? "Utilisateur",
    email: session?.user?.email ?? "",
    avatar: session?.user?.image ?? "",
  }

  return (
    <Sidebar collapsible="offcanvas" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton asChild className="data-[slot=sidebar-menu-button]:!p-1.5">
              <Link href="/dashboard" className="flex items-center gap-2">
                <IconInnerShadowTop className="!size-5" />
                <span className="text-base font-semibold">NextStep</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarMenu>
            {/* Dashboard pour tout le monde */}
            {NAV_COMMON.map(item => <NavItem key={item.url} {...item} />)}

            {/* Items client uniquement */}
            {!isAdmin && NAV_CLIENT.map(item => <NavItem key={item.url} {...item} />)}
          </SidebarMenu>
        </SidebarGroup>

        {/* Section admin */}
        {isAdmin && (
          <SidebarGroup>
            <SidebarGroupLabel>Administration</SidebarGroupLabel>
            <SidebarMenu>
              {NAV_ADMIN_ONLY.map(item => <NavItem key={item.url} {...item} adminStyle />)}
            </SidebarMenu>
          </SidebarGroup>
        )}

        <NavSecondary items={NAV_SECONDARY} className="mt-auto" />
      </SidebarContent>

      <SidebarFooter>
        <NavUser user={user} />
      </SidebarFooter>
    </Sidebar>
  )
}