"use client"
import * as React from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { useSession } from "next-auth/react"
import {
  IconChartBar,
  IconCloudComputing,
  IconCreditCard,
  IconDashboard,
  IconHelp,
  IconListDetails,
  IconSearch,
  IconSettings,
  IconShield,
  IconUsers,
  IconChevronDown,
  IconServer,
  IconContainer,
  IconPackage,
  IconFileInvoice,
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
  SidebarMenuSub,
  SidebarMenuSubItem,
  SidebarMenuSubButton,
} from "@/components/ui/sidebar"
import { NavUser } from "@/components/nav-user"
import { NavSecondary } from "@/components/nav-secondary"
import { MonitorIcon, HardDrive, Leaf, Braces, ShieldCheck } from "lucide-react"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"

const ICON_COLOR = "#0a7fcf"

const NAV_CLIENT = [
  { title: "Services Cloud", url: "/dashboard/services", icon: IconCloudComputing },
  { title: "Mes Plans", url: "/dashboard/mes-plans", icon: IconListDetails },
  { title: "Mes Abonnements", url: "/dashboard/abonnements", icon: IconFileInvoice },
  { title: "Stockage", url: "/dashboard/storage", icon: HardDrive },
]

// Types de déploiements possibles pour le client
// En production, ces données viendraient de l'API selon les abonnements du client
const DEPLOYMENT_TYPES = [
  { title: "Machines Virtuelles", url: "/dashboard/vms", icon: MonitorIcon },
  //{ title: "Conteneurs",          url: "/dashboard/deployments/containers",  icon: IconContainer },
  //{ title: "Serveurs Dédiés",     url: "/dashboard/deployments/servers",     icon: IconServer },
]

const NAV_COMMON = [
  { title: "Dashboard", url: "/dashboard", icon: IconDashboard },
]

const NAV_ADMIN_ONLY = [
  { title: "Services Cloud", url: "/dashboard/services", icon: IconCloudComputing },
  { title: "Clients", url: "/dashboard/admin/clients", icon: IconUsers },
  { title: "Audit Logs", url: "/dashboard/audit-logs", icon: IconShield },
  { title: "Abonnements", url: "/dashboard/admin/abonnements", icon: IconChartBar },
  { title: "Ordonnanceur Carbone", url: "/dashboard/ia/carbon_scheduler", icon: Leaf },
  { title: "Générateur YAML", url: "/dashboard/ia/yaml-generator", icon: Braces },
  { title: "Auto-Guérison", url: "/dashboard/ia/auto-healer", icon: ShieldCheck },
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
          <Icon className="size-4 shrink-0" style={{ color: ICON_COLOR }} />
          <span>{title}</span>
        </Link>
      </SidebarMenuButton>
    </SidebarMenuItem>
  )
}

// Dropdown "Mes Déploiements"
function DeploymentsNavItem({ types }: { types: typeof DEPLOYMENT_TYPES }) {
  const pathname = usePathname()
  const isAnyActive = types.some(t => pathname.startsWith(t.url))
  const [open, setOpen] = React.useState(isAnyActive)

  return (
    <Collapsible open={open} onOpenChange={setOpen} className="w-full">
      <SidebarMenuItem>
        <CollapsibleTrigger asChild>
          <SidebarMenuButton className="flex items-center gap-2 w-full">
            <MonitorIcon className="size-4 shrink-0" style={{ color: ICON_COLOR }} />
            <span className="flex-1 text-left">Mes Déploiements</span>
            <IconChevronDown
              className="size-4 transition-transform duration-200"
              style={{
                color: ICON_COLOR,
                transform: open ? "rotate(180deg)" : "rotate(0deg)",
              }}
            />
          </SidebarMenuButton>
        </CollapsibleTrigger>

        <CollapsibleContent>
          <SidebarMenuSub>
            {types.map(({ title, url, icon: Icon }) => {
              const isActive = pathname === url || pathname.startsWith(url + "/")
              return (
                <SidebarMenuSubItem key={url}>
                  <SidebarMenuSubButton asChild isActive={isActive}>
                    <Link href={url} className="flex items-center gap-2">
                      <Icon className="size-4 shrink-0" style={{ color: ICON_COLOR }} />
                      <span>{title}</span>
                    </Link>
                  </SidebarMenuSubButton>
                </SidebarMenuSubItem>
              )
            })}
          </SidebarMenuSub>
        </CollapsibleContent>
      </SidebarMenuItem>
    </Collapsible>
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
              <Link href="/dashboard" className="flex items-center">
                <img src="/logo-nextstep.png" alt="NextStep" className="h-6 w-auto" />
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent className="pt-7">
        <SidebarGroup>
          <SidebarMenu>
            {NAV_COMMON.map(item => <NavItem key={item.url} {...item} />)}

            {!isAdmin && (
              <>
                {NAV_CLIENT.map(item => <NavItem key={item.url} {...item} />)}
                {/* Dropdown Mes Déploiements */}
                <DeploymentsNavItem types={DEPLOYMENT_TYPES} />
              </>
            )}
          </SidebarMenu>
        </SidebarGroup>

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