"use client"

import {
  IconCreditCard,
  IconDotsVertical,
  IconLogout,
  IconNotification,
  IconUserCircle,
} from "@tabler/icons-react"
import { signOut, useSession } from "next-auth/react"
import { useRouter }           from "next/navigation"
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@/components/ui/avatar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar"

export function NavUser({
  user,
}: {
  user: {
    name:   string
    email:  string
    avatar: string
  }
}) {
  const { isMobile }   = useSidebar()
  const { data: session } = useSession()
  const router         = useRouter()

  // ── Logout ──────────────────────────────────────────────────────────────────
  // 1. Invalide la session Keycloak (end_session_endpoint)
  // 2. Détruit la session NextAuth côté client
  // 3. Redirige vers /login

  async function handleLogout() {
    // Récupérer le token Keycloak depuis la session
    const idToken = (session as any)?.idToken as string | undefined

    // ✅ Déconnecter NextAuth (détruit le cookie de session)
    await signOut({ redirect: false })

    // ✅ Déconnecter Keycloak (invalide la session SSO)
    // Sans ça, l'utilisateur peut se reconnecter sans saisir son mot de passe
    const keycloakUrl   = process.env.NEXT_PUBLIC_KEYCLOAK_URL
    const keycloakRealm = process.env.NEXT_PUBLIC_KEYCLOAK_REALM

    if (keycloakUrl && keycloakRealm) {
      const logoutUrl = new URL(
        `${keycloakUrl}/realms/${keycloakRealm}/protocol/openid-connect/logout`
      )
      // post_logout_redirect_uri : où Keycloak redirige après déconnexion
      logoutUrl.searchParams.set(
        "post_logout_redirect_uri",
        `${window.location.origin}/login`
      )
      // id_token_hint permet à Keycloak d'identifier la session à fermer
      if (idToken) {
        logoutUrl.searchParams.set("id_token_hint", idToken)
      }

      window.location.href = logoutUrl.toString()
      return
    }

    // Fallback si variables env absentes : simple redirect
    router.push("/login")
  }

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <SidebarMenuButton
              size="lg"
              className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
            >
              <Avatar className="h-8 w-8 rounded-lg grayscale">
                <AvatarImage src={user.avatar} alt={user.name} />
                <AvatarFallback className="rounded-lg">
                  {user.name?.charAt(0)?.toUpperCase() ?? "U"}
                </AvatarFallback>
              </Avatar>
              <div className="grid flex-1 text-left text-sm leading-tight">
                <span className="truncate font-medium">{user.name}</span>
                <span className="text-muted-foreground truncate text-xs">
                  {user.email}
                </span>
              </div>
              <IconDotsVertical className="ml-auto size-4" />
            </SidebarMenuButton>
          </DropdownMenuTrigger>

          <DropdownMenuContent
            className="w-(--radix-dropdown-menu-trigger-width) min-w-56 rounded-lg"
            side={isMobile ? "bottom" : "right"}
            align="end"
            sideOffset={4}
          >
            <DropdownMenuLabel className="p-0 font-normal">
              <div className="flex items-center gap-2 px-1 py-1.5 text-left text-sm">
                <Avatar className="h-8 w-8 rounded-lg">
                  <AvatarImage src={user.avatar} alt={user.name} />
                  <AvatarFallback className="rounded-lg">
                    {user.name?.charAt(0)?.toUpperCase() ?? "U"}
                  </AvatarFallback>
                </Avatar>
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-medium">{user.name}</span>
                  <span className="text-muted-foreground truncate text-xs">
                    {user.email}
                  </span>
                </div>
              </div>
            </DropdownMenuLabel>

            <DropdownMenuSeparator />

            <DropdownMenuGroup>
              <DropdownMenuItem asChild>
                <a href="/dashboard/profile" className="flex items-center gap-2 cursor-pointer">
                  <IconUserCircle className="size-4" />
                  Mon compte
                </a>
              </DropdownMenuItem>
              <DropdownMenuItem>
                <IconCreditCard className="size-4" />
                Facturation
              </DropdownMenuItem>
              <DropdownMenuItem>
                <IconNotification className="size-4" />
                Notifications
              </DropdownMenuItem>
            </DropdownMenuGroup>

            <DropdownMenuSeparator />

            {/* ── Bouton Logout ── */}
            <DropdownMenuItem
              onClick={handleLogout}
              className="text-red-600 focus:text-red-700 focus:bg-red-50 cursor-pointer"
            >
              <IconLogout className="size-4" />
              Se déconnecter
            </DropdownMenuItem>

          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  )
}