// middleware.ts  ← nom obligatoire pour Next.js
import { auth } from "@/auth"   // ← importer depuis @/auth, pas @/lib/auth
import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

const ADMIN_ONLY = [
  "/audit-logs",
  "/transactions",
  "/dashboard/users",
  "/dashboard/analytics",
]

const PROTECTED = [
  "/dashboard",
  "/audit-logs",
  "/transactions",
  "/services",
]

export default auth((req: any) => {
  const { pathname } = req.nextUrl
  const session = req.auth

  const needsAuth = PROTECTED.some(
    r => pathname === r || pathname.startsWith(r + "/")
  )

  if (needsAuth && !session) {
    const url = new URL("/login", req.url)
    url.searchParams.set("callbackUrl", pathname)
    return NextResponse.redirect(url)
  }

  const isAdminOnly = ADMIN_ONLY.some(
    r => pathname === r || pathname.startsWith(r + "/")
  )

  if (isAdminOnly && session) {
    const roles: string[] = (session as any)?.roles ?? []
    if (!roles.includes("admin")) {
      return NextResponse.rewrite(new URL("/not-found", req.url))
    }
  }

  return NextResponse.next()
})

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/audit-logs/:path*",
    "/transactions/:path*",
    "/services/:path*",
  ],
}