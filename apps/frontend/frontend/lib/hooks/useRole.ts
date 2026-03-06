"use client"

import { useSession } from "next-auth/react"

export function useRole() {
  const { data: session, status } = useSession()

  const roles: string[] = (session as any)?.roles ?? []
  const isAdmin = status === "authenticated" && roles.includes("admin")
  const userId  = session?.user?.id as string | undefined
  const userName = session?.user?.name ?? ""

  return { isAdmin, userId, userName, roles, sessionStatus: status }
}