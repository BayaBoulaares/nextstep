"use client"
// src/components/session-provider.tsx

import { SessionProvider as NextAuthSessionProvider } from "next-auth/react"

// ─── Export nommé (correspond à l'import dans layout.tsx) ─────────────────────
export function SessionProvider({ children }: { children: React.ReactNode }) {
  return (
    <NextAuthSessionProvider refetchOnWindowFocus={true} refetchInterval={0}>
      {children}
    </NextAuthSessionProvider>
  )
}