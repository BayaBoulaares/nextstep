import { type AuthOptions } from "@/types/next-auth"
import CredentialsProvider from "next-auth/providers/credentials"
import KeycloakProvider from "next-auth/providers/keycloak"

function extractKeycloakRoles(accessToken: string): string[] {
  try {
    const payload = JSON.parse(
      Buffer.from(accessToken.split(".")[1], "base64url").toString()
    )
    if (Array.isArray(payload?.realm_access?.roles)) return payload.realm_access.roles
    if (Array.isArray(payload?.roles)) return payload.roles
  } catch {}
  return []
}

export const authOptions: AuthOptions = {
  providers: [
    // 🔴 NOUVEAU: Provider Keycloak (pour Google via Keycloak)
    KeycloakProvider({
  clientId: process.env.KEYCLOAK_CLIENT_ID!,
  clientSecret: process.env.KEYCLOAK_CLIENT_SECRET!,
  issuer: `${process.env.KEYCLOAK_URL}/realms/${process.env.KEYCLOAK_REALM}`,
  authorization: {
    params: {
      scope: "openid profile email",
      kc_idp_hint: "google", // Pour aller directement à Google
      code_challenge_method: "s256", // Forcer en minuscules
    }
  },
      // Personnalisation des URLs
      wellKnown: `${process.env.KEYCLOAK_URL}/realms/${process.env.KEYCLOAK_REALM}/.well-known/openid-configuration`,
      // Mapper les informations Keycloak vers le format NextAuth
      profile(profile) {
        return {
          id: profile.sub,
          email: profile.email,
          name: profile.name || `${profile.given_name} ${profile.family_name}`,
          firstName: profile.given_name,
          lastName: profile.family_name,
          roles: extractKeycloakRoles(profile.access_token || ""),
          provider: "keycloak",
        }
      },
    }),

    // Provider Credentials existant
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email:      { label: "Email",        type: "email"    },
        password:   { label: "Mot de passe", type: "password" },
        rememberMe: { label: "Remember Me",  type: "text"     },
      },
      async authorize(credentials) {
        // ... votre code existant pour credentials ...
        if (!credentials?.email || !credentials?.password) return null

        try {
          const tokenRes = await fetch(
            `${process.env.KEYCLOAK_URL}/realms/${process.env.KEYCLOAK_REALM}/protocol/openid-connect/token`,
            {
              method: "POST",
              headers: { "Content-Type": "application/x-www-form-urlencoded" },
              body: new URLSearchParams({
                grant_type:    "password",
                client_id:     process.env.KEYCLOAK_CLIENT_ID!,
                client_secret: process.env.KEYCLOAK_CLIENT_SECRET!,
                username:      credentials.email,
                password:      credentials.password,
                scope:         "openid profile email",
              }),
            }
          )

          if (!tokenRes.ok) return null
          const tokens = await tokenRes.json()

          const userInfoRes = await fetch(
            `${process.env.KEYCLOAK_URL}/realms/${process.env.KEYCLOAK_REALM}/protocol/openid-connect/userinfo`,
            { headers: { Authorization: `Bearer ${tokens.access_token}` } }
          )
          if (!userInfoRes.ok) return null
          const userInfo = await userInfoRes.json()

          const roles = extractKeycloakRoles(tokens.access_token)

          return {
            id:           userInfo.sub,
            email:        userInfo.email,
            name:         userInfo.name,
            firstName:    userInfo.given_name,
            lastName:     userInfo.family_name,
            accessToken:  tokens.access_token,
            refreshToken: tokens.refresh_token,
            idToken:      tokens.id_token,
            expiresAt:    Math.floor(Date.now() / 1000) + tokens.expires_in,
            rememberMe:   credentials.rememberMe === "on",
            roles,
            provider:     "credentials",
          }
        } catch (err) {
          console.error("❌ Keycloak auth error:", err)
          return null
        }
      },
    }),
  ],

  callbacks: {
    // Callback JWT modifié pour gérer les deux providers
    async jwt({ token, user, account, profile }) {
      // Premier login avec credentials
      if (user && account?.provider === "credentials") {
        token.accessToken  = (user as any).accessToken
        token.refreshToken = (user as any).refreshToken
        token.idToken      = (user as any).idToken
        token.expiresAt    = (user as any).expiresAt
        token.rememberMe   = (user as any).rememberMe
        token.firstName    = (user as any).firstName
        token.lastName     = (user as any).lastName
        token.roles        = (user as any).roles ?? []
        token.provider     = "credentials"
        return token
      }

      // 🔴 NOUVEAU: Premier login avec Keycloak (Google)
      if (account && account.provider === "keycloak") {
        // Récupérer les tokens depuis le compte
        token.accessToken = account.access_token
        token.refreshToken = account.refresh_token
        token.idToken = account.id_token
        token.expiresAt = Math.floor(Date.now() / 1000) + (account.expires_in as number || 3600)
        token.provider = "keycloak"
        
        // Récupérer les infos du profil
        if (profile) {
          token.firstName = profile.given_name
          token.lastName = profile.family_name
          token.email = profile.email
          token.roles = extractKeycloakRoles(account.access_token || "")
          
          // 🔴 IMPORTANT: Synchroniser avec votre backend Spring Boot
          try {
            await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/auth/oauth2/success`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${account.access_token}`
              },
              body: JSON.stringify({
                email: profile.email,
                firstName: profile.given_name,
                lastName: profile.family_name,
                provider: 'google',
                providerId: profile.sub
              })
            })
          } catch (error) {
            console.error('❌ Erreur synchro backend:', error)
          }
        }
        return token
      }

      // Token refresh logic existant...
      const now = Math.floor(Date.now() / 1000)
      if (now < ((token.expiresAt as number) ?? 0) - 30) {
        return token
      }

      // Refresh token pour credentials
      if (token.provider === "credentials") {
        try {
          const refreshRes = await fetch(
            `${process.env.KEYCLOAK_URL}/realms/${process.env.KEYCLOAK_REALM}/protocol/openid-connect/token`,
            {
              method: "POST",
              headers: { "Content-Type": "application/x-www-form-urlencoded" },
              body: new URLSearchParams({
                grant_type:    "refresh_token",
                client_id:     process.env.KEYCLOAK_CLIENT_ID!,
                client_secret: process.env.KEYCLOAK_CLIENT_SECRET!,
                refresh_token: token.refreshToken as string,
              }),
            }
          )

          if (!refreshRes.ok) return { ...token, error: "RefreshTokenError" }

          const refreshed = await refreshRes.json()
          return {
            ...token,
            accessToken:  refreshed.access_token,
            refreshToken: refreshed.refresh_token ?? token.refreshToken,
            idToken:      refreshed.id_token ?? token.idToken,
            expiresAt:    Math.floor(Date.now() / 1000) + refreshed.expires_in,
            roles:        extractKeycloakRoles(refreshed.access_token),
            error:        undefined,
          }
        } catch {
          return { ...token, error: "RefreshTokenError" }
        }
      }

      return token
    },

    async session({ session, token }) {
      // Enrichir la session avec les données du token
      session.accessToken = token.accessToken as string
      ;(session as any).idToken = token.idToken
      ;(session as any).roles = token.roles ?? []
      ;(session as any).error = token.error
      ;(session as any).provider = token.provider
      
      if (session.user) {
        session.user.id = token.sub
        session.user.email = token.email as string
        session.user.firstName = token.firstName as string
        session.user.lastName = token.lastName as string
        session.user.name = `${token.firstName || ''} ${token.lastName || ''}`.trim()
      }
      return session
    },

    // 🔴 NOUVEAU: Callback de redirection
    async redirect({ url, baseUrl }) {
      // Permet les redirections relatives et absolues vers le même domaine
      if (url.startsWith("/")) return `${baseUrl}${url}`
      else if (new URL(url).origin === baseUrl) return url
      return baseUrl
    },

    // 🔴 NOUVEAU: Callback pour vérifier le signIn
    async signIn({ user, account, profile }) {
      if (account?.provider === "keycloak") {
        // Vérifier si l'utilisateur existe déjà dans votre backend
        try {
          const response = await fetch(
            `${process.env.NEXT_PUBLIC_API_URL}/api/auth/oauth2/check-user?email=${profile?.email}`,
            { headers: { 'Content-Type': 'application/json' } }
          )
          const data = await response.json()
          
          if (data.exists && data.provider !== 'google') {
            // L'email existe déjà avec un autre provider
            return '/auth/error?error=OAuthAccountNotLinked'
          }
        } catch (error) {
          console.error('❌ Erreur vérification utilisateur:', error)
        }
      }
      return true
    }
  },

  session: {
    strategy: "jwt",
    maxAge:   30 * 24 * 60 * 60, // 30 jours
  },

  pages: {
    signIn: "/login",
    error:  "/auth/error",
  },

  secret: process.env.NEXTAUTH_SECRET,
  
  // 🔴 NOUVEAU: Configuration debug
  debug: process.env.NODE_ENV === "development",
}