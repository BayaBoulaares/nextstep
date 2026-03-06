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

async function getToken(): Promise<string | undefined> {
  const session = await getSession()
  const token = (session as any)?.accessToken
    // 👇 Ajouter temporairement
  console.log("[apiFetch] session complète:", JSON.stringify(session, null, 2))
  if (token) {
    const payload = JSON.parse(atob(token.split('.')[1]))
    console.log("[apiFetch] JWT payload:", payload)
  }
  if (!token) console.warn("[apiFetch] ⚠️ accessToken absent de la session", session)
  return token
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

  console.log("[apiFetch] →", endpoint, "token:", authToken?.slice(0, 20) + "...")

  const res = await fetch(endpoint, {
    ...rest,
    headers: {
      "Content-Type": "application/json",
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