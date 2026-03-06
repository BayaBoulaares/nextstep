"use client"

// components/SessionGuard.tsx
// ✅ Redirige vers /login si le token ne peut pas être rafraîchi
// ✅ À placer dans app/dashboard/layout.tsx

import { useSession, signIn } from "next-auth/react"
import { useEffect }          from "react"

export function SessionGuard({ children }: { children: React.ReactNode }) {
  const { data: session, status } = useSession()

  useEffect(() => {
    const error = (session as any)?.error
    if (error === "RefreshTokenError" || error === "SessionExpired") {
      console.warn("[SessionGuard] Session invalide, redirection login...")
      signIn() // redirige vers /login
    }
  }, [session])

  // Pendant le chargement — ne rien afficher pour éviter le flash
  if (status === "loading") return null

  return <>{children}</>
}