// auth.ts  ← RACINE du projet (même niveau que package.json)
import NextAuth, { type NextAuthConfig } from "next-auth"
import CredentialsProvider from "next-auth/providers/credentials"
import KeycloakProvider    from "next-auth/providers/keycloak"

const SESSION_SHORT_S  = 8  * 60 * 60
const SESSION_LONG_S   = 30 * 24 * 60 * 60
const KEYCLOAK_SESSION = 7  * 24 * 60 * 60

const API_URL = process.env.API_URL ?? "http://localhost:8081"

function extractKeycloakRoles(accessToken: string): string[] {
  try {
    const payload = JSON.parse(
      Buffer.from(accessToken.split(".")[1], "base64url").toString()
    )
    if (Array.isArray(payload?.realm_access?.roles)) return payload.realm_access.roles
    if (Array.isArray(payload?.roles))               return payload.roles
  } catch {}
  return []
}

// ✅ Crée ou met à jour l'utilisateur dans Spring Boot au premier login
// POST /api/auth/sync — upsert par keycloakId
async function syncUserWithBackend(params: {
  keycloakId:  string
  email:       string
  firstName:   string
  lastName:    string
  accessToken: string
}): Promise<void> {
  try {
    console.log("[auth] → syncUserWithBackend", params.email, params.keycloakId)
    const res = await fetch(`${API_URL}/api/auth/sync`, {
      method:  "POST",
      headers: {
        "Content-Type":  "application/json",
        "Authorization": `Bearer ${params.accessToken}`,
      },
      body: JSON.stringify({
        keycloakId: params.keycloakId,
        email:      params.email,
        firstName:  params.firstName,
        lastName:   params.lastName,
      }),
    })
    if (res.ok) {
      console.log("[auth] ✅ syncUserWithBackend OK")
    } else {
      const text = await res.text().catch(() => "")
      console.error("[auth] ❌ syncUserWithBackend échoué:", res.status, text)
    }
  } catch (err) {
    // Ne jamais bloquer le login si le backend est injoignable
    console.error("[auth] ❌ syncUserWithBackend exception (login continué):", err)
  }
}

export const config: NextAuthConfig = {
  providers: [
    KeycloakProvider({
      clientId:     process.env.KEYCLOAK_CLIENT_ID!,
      clientSecret: process.env.KEYCLOAK_CLIENT_SECRET!,
      issuer:       `${process.env.KEYCLOAK_URL}/realms/${process.env.KEYCLOAK_REALM}`,
    }),
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email:      { label: "Email",        type: "email"    },
        password:   { label: "Mot de passe", type: "password" },
        rememberMe: { label: "Se souvenir",  type: "text"     },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null
        try {
          const tokenRes = await fetch(
            `${process.env.KEYCLOAK_URL}/realms/${process.env.KEYCLOAK_REALM}/protocol/openid-connect/token`,
            {
              method:  "POST",
              headers: { "Content-Type": "application/x-www-form-urlencoded" },
              body: new URLSearchParams({
                grant_type:    "password",
                client_id:     process.env.KEYCLOAK_CLIENT_ID!,
                client_secret: process.env.KEYCLOAK_CLIENT_SECRET!,
                username:      credentials.email    as string,
                password:      credentials.password as string,
                scope:         "openid profile email",
              }),
            }
          )
          const rawText = await tokenRes.text()
          if (!tokenRes.ok) return null
          if (!(tokenRes.headers.get("content-type") ?? "").includes("application/json")) return null
          const tokens = JSON.parse(rawText)

          const userInfoRes = await fetch(
            `${process.env.KEYCLOAK_URL}/realms/${process.env.KEYCLOAK_REALM}/protocol/openid-connect/userinfo`,
            { headers: { Authorization: `Bearer ${tokens.access_token}` } }
          )
          if (!userInfoRes.ok) return null
          const userInfo = await userInfoRes.json()

          return {
            id:           userInfo.sub,
            email:        userInfo.email,
            name:         userInfo.name ?? `${userInfo.given_name} ${userInfo.family_name}`,
            firstName:    userInfo.given_name,
            lastName:     userInfo.family_name,
            accessToken:  tokens.access_token,
            refreshToken: tokens.refresh_token,
            idToken:      tokens.id_token,
            expiresAt:    Math.floor(Date.now() / 1000) + tokens.expires_in,
            roles:        extractKeycloakRoles(tokens.access_token),
            provider:     "credentials",
            rememberMe:   credentials.rememberMe === "on",
          }
        } catch (err) {
          console.error("[Auth] ❌ Exception:", err)
          return null
        }
      },
    }),
  ],

  callbacks: {
    async jwt({ token, user, account }) {

      // ── Premier login credentials ──────────────────────────────────────────
      if (user && account?.provider === "credentials") {
        const rememberMe = (user as any).rememberMe ?? false

        // ✅ Sync Spring Boot — upsert user au premier login
        await syncUserWithBackend({
          keycloakId:  (user as any).id,
          email:       (user as any).email        ?? "",
          firstName:   (user as any).firstName    ?? "",
          lastName:    (user as any).lastName     ?? "",
          accessToken: (user as any).accessToken,
        })

        return {
          ...token,
          sub:            (user as any).id,
          accessToken:    (user as any).accessToken,
          refreshToken:   (user as any).refreshToken,
          idToken:        (user as any).idToken,
          expiresAt:      (user as any).expiresAt,
          firstName:      (user as any).firstName,
          lastName:       (user as any).lastName,
          roles:          (user as any).roles ?? [],
          provider:       "credentials",
          rememberMe,
          sessionExpires: Math.floor(Date.now() / 1000) + (
            rememberMe ? SESSION_LONG_S : SESSION_SHORT_S
          ),
        }
      }

      // ── Premier login Keycloak OAuth ──────────────────────────────────────
      if (account?.provider === "keycloak") {
        // ✅ Sync Spring Boot — upsert user via OAuth
        await syncUserWithBackend({
          keycloakId:  token.sub ?? "",
          email:       (user as any)?.email         ?? "",
          firstName:   (user as any)?.given_name    ?? user?.name?.split(" ")[0] ?? "",
          lastName:    (user as any)?.family_name   ?? user?.name?.split(" ")[1] ?? "",
          accessToken: account.access_token as string,
        })

        return {
          ...token,
          accessToken:    account.access_token,
          refreshToken:   account.refresh_token,
          idToken:        account.id_token,
          expiresAt:      Math.floor(Date.now() / 1000) + ((account.expires_in as number) ?? 3600),
          roles:          extractKeycloakRoles((account.access_token as string) ?? ""),
          provider:       "keycloak",
          firstName:      (user as any)?.given_name  ?? user?.name?.split(" ")[0] ?? "",
          lastName:       (user as any)?.family_name ?? user?.name?.split(" ")[1] ?? "",
          rememberMe:     false,
          sessionExpires: Math.floor(Date.now() / 1000) + KEYCLOAK_SESSION,
        }
      }

      // ── Vérification session à chaque rafraîchissement ────────────────────
      const now              = Math.floor(Date.now() / 1000)
      const sessionExpiresAt = token.sessionExpires as number
      const remaining        = sessionExpiresAt - now

      if (remaining < 7200) {
        console.log("┌─────────────────────────────────────────")
        console.log("│ ⏰ [REMEMBER ME] Session bientôt expirée")
        console.log("│ rememberMe      :", token.rememberMe)
        console.log("│ temps restant   :", Math.round(remaining / 60), "minutes")
        console.log("│ sessionExpires  :", new Date(sessionExpiresAt * 1000).toLocaleString("fr-FR"))
        console.log("└─────────────────────────────────────────")
      }

      if (token.sessionExpires && now > sessionExpiresAt) {
        console.log("🔴 [REMEMBER ME] SESSION EXPIRÉE")
        return { ...token, error: "SessionExpired" }
      }

      if (now < ((token.expiresAt as number) ?? 0) - 30) return token

      console.log("🔄 [REMEMBER ME] Rafraîchissement du token Keycloak…")
      try {
        const res = await fetch(
          `${process.env.KEYCLOAK_URL}/realms/${process.env.KEYCLOAK_REALM}/protocol/openid-connect/token`,
          {
            method:  "POST",
            headers: { "Content-Type": "application/x-www-form-urlencoded" },
            body: new URLSearchParams({
              grant_type:    "refresh_token",
              client_id:     process.env.KEYCLOAK_CLIENT_ID!,
              client_secret: process.env.KEYCLOAK_CLIENT_SECRET!,
              refresh_token: token.refreshToken as string,
            }),
          }
        )
        if (!res.ok) return { ...token, error: "RefreshTokenError" }
        const refreshed = await res.json()
        return {
          ...token,
          accessToken:  refreshed.access_token,
          refreshToken: refreshed.refresh_token ?? token.refreshToken,
          idToken:      refreshed.id_token      ?? token.idToken,
          expiresAt:    Math.floor(Date.now() / 1000) + refreshed.expires_in,
          roles:        extractKeycloakRoles(refreshed.access_token),
          error:        undefined,
        }
      } catch {
        return { ...token, error: "RefreshTokenError" }
      }
    },

    async session({ session, token }) {
      session.accessToken        = token.accessToken as string
      ;(session as any).idToken  = token.idToken
      ;(session as any).roles    = (token.roles as string[]) ?? []
      ;(session as any).error    = token.error
      ;(session as any).provider = token.provider
      if (session.user) {
        session.user.id        = token.sub as string
        session.user.firstName = token.firstName as string
        session.user.lastName  = token.lastName  as string
        session.user.name      = `${token.firstName ?? ""} ${token.lastName ?? ""}`.trim()
      }
      if (token.error) {
        console.log("⚠️  [REMEMBER ME] session() — erreur:", token.error)
      }
      return session
    },
  },

  session: { strategy: "jwt", maxAge: SESSION_LONG_S },
  pages:   { signIn: "/login", error: "/login" },
}

export const { handlers, auth, signIn, signOut } = NextAuth(config)