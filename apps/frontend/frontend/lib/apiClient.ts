// // lib/apiClient.ts
// import { getSession } from "next-auth/react"

// export class ApiError extends Error {
//   constructor(public status: number, message: string) {
//     super(message)
//     this.name = "ApiError"
//   }
// }

// type FetchOptions = RequestInit & {
//   token?:  string
//   noAuth?: boolean
// }

// async function getToken(): Promise<string | undefined> {
//   const session = await getSession()
//   const token = (session as any)?.accessToken
//     // 👇 Ajouter temporairement
//   console.log("[apiFetch] session complète:", JSON.stringify(session, null, 2))
//   if (token) {
//     const payload = JSON.parse(atob(token.split('.')[1]))
//     console.log("[apiFetch] JWT payload:", payload)
//   }
//   if (!token) console.warn("[apiFetch] ⚠️ accessToken absent de la session", session)
//   return token
// }

// export async function apiFetch<T>(
//   endpoint: string,
//   options: FetchOptions = {}
// ): Promise<T> {
//   const { token: explicitToken, noAuth, ...rest } = options

//   let authToken = explicitToken
//   if (!authToken && !noAuth) authToken = await getToken()

//   if (!authToken && !noAuth) {
//     console.error("[apiFetch] ❌ Pas de token — redirection login")
//     if (typeof window !== "undefined") window.location.href = "/login"
//     throw new ApiError(401, "Non authentifié")
//   }

//   console.log("[apiFetch] →", endpoint, "token:", authToken?.slice(0, 20) + "...")

//   const res = await fetch(endpoint, {
//     ...rest,
//     headers: {
//       "Content-Type": "application/json",
//       ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
//       ...(rest.headers ?? {}),
//     },
//   })

//   if (!res.ok) {
//     if (res.status === 401 && typeof window !== "undefined") {
//       window.location.href = "/login"
//     }
//     const body = await res.json().catch(() => ({ message: res.statusText }))
//     throw new ApiError(res.status, body.message ?? `Erreur ${res.status}`)
//   }

//   if (res.status === 204) return undefined as T
//   return res.json()
// }

// export async function publicFetch<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
//   return apiFetch<T>(endpoint, { ...options, noAuth: true })
// }
// lib/apiClient.ts
import { getSession } from "next-auth/react"

export class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message)
    this.name = "ApiError"
  }
}

type FetchOptions = RequestInit & {
  token?:  string
  noAuth?: boolean
}

/**
 * Récupère le token selon le contexte d'exécution :
 * - Serveur (Server Component, Route Handler) → auth() de next-auth
 * - Client (browser)                          → getSession() de next-auth/react
 *
 * getSession() côté serveur retourne null (pas de cookie accessible),
 * ce qui provoque systématiquement un 401. auth() est la seule API correcte côté serveur.
 */
async function getToken(): Promise<string | undefined> {
  if (typeof window === "undefined") {
    // Côté serveur — import dynamique pour éviter de bundler next-auth/server côté client
    try {
      const { auth } = await import("@/auth")
      const session = await auth()
      const token = (session as any)?.accessToken
      if (!token) console.warn("[apiFetch] ⚠️ accessToken absent (serveur)")
      return token
    } catch (e) {
      console.error("[apiFetch] ❌ auth() échoué:", e)
      return undefined
    }
  }

  // Côté client — lit le cookie de session via le browser
  const session = await getSession()
  const token = (session as any)?.accessToken
  if (!token) console.warn("[apiFetch] ⚠️ accessToken absent (client)")
  return token
}

/**
 * Résout l'URL finale :
 * - Côté serveur, les URLs relatives (/api/...) ne fonctionnent pas.
 *   On préfixe directement avec API_URL pour aller au backend Spring Boot.
 * - Côté client, on garde l'URL relative (Next.js proxy ou API route).
 */
function resolveUrl(endpoint: string): string {
  if (endpoint.startsWith("/")) {
    const base =
      typeof window === "undefined"
        ? (process.env.API_URL ?? "http://localhost:8081")          // serveur
        : (process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8081") // client
    return `${base}${endpoint}`
  }
  return endpoint
}

export async function apiFetch<T>(
  endpoint: string,
  options: FetchOptions = {}
): Promise<T> {
  const { token: explicitToken, noAuth, ...rest } = options

  let authToken = explicitToken
  if (!authToken && !noAuth) authToken = await getToken()

  if (!authToken && !noAuth) {
    console.error("[apiFetch] ❌ Pas de token — redirection login")
    if (typeof window !== "undefined") window.location.href = "/login"
    throw new ApiError(401, "Non authentifié")
  }

  const url = resolveUrl(endpoint)
  const isFormData = rest.body instanceof FormData

  const res = await fetch(url, {
    ...rest,
    headers: {
      //"Content-Type": "application/json",
          ...(!isFormData ? { "Content-Type": "application/json" } : {}),

      ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
      ...(rest.headers ?? {}),
    },
  })

  if (!res.ok) {
    if (res.status === 401 && typeof window !== "undefined") {
      window.location.href = "/login"
    }
    const body = await res.json().catch(() => ({ message: res.statusText }))
    throw new ApiError(res.status, body.message ?? `Erreur ${res.status}`)
  }

  if (res.status === 204) return undefined as T
  return res.json()
}

export async function publicFetch<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  return apiFetch<T>(endpoint, { ...options, noAuth: true })
}