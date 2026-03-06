// src/app/api/debug-env/route.ts
// ⚠️ TEMPORAIRE — à supprimer après diagnostic
import { NextResponse } from "next/server"

export async function GET() {
  return NextResponse.json({
    KEYCLOAK_URL:          process.env.KEYCLOAK_URL          ?? "❌ undefined",
    KEYCLOAK_REALM:        process.env.KEYCLOAK_REALM        ?? "❌ undefined",
    KEYCLOAK_ADMIN_SECRET: process.env.KEYCLOAK_ADMIN_SECRET ? "✅ défini" : "❌ undefined",
    KEYCLOAK_CLIENT_ID:    process.env.KEYCLOAK_CLIENT_ID    ?? "❌ undefined",
    NEXTAUTH_URL:          process.env.NEXTAUTH_URL           ?? "❌ undefined",
    NODE_ENV:              process.env.NODE_ENV,
    cwd:                   process.cwd(),
  })
}