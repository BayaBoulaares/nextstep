// src/app/api/users/me/route.ts

import { NextRequest, NextResponse } from "next/server"
import { auth }                      from "@/auth"

const API_URL = process.env.API_URL ?? "http://localhost:8081"

// ─── Helper : parse JSON sans crasher ────────────────────────────────────────
async function safeJson(res: Response) {
  const text = await res.text()
  if (!text || text.trim() === "") {
    console.error(`[proxy] Réponse vide du backend (status ${res.status})`)
    return null
  }
  try {
    return JSON.parse(text)
  } catch {
    console.error(`[proxy] Réponse non-JSON du backend (status ${res.status}):`, text.slice(0, 300))
    return null
  }
}

// ─── GET /api/users/me ────────────────────────────────────────────────────────
export async function GET() {
  const session = await auth()

  // Debug — vérifie que la session et le token arrivent bien
  console.log("[proxy GET] session existe :", !!session)
  console.log("[proxy GET] accessToken     :", session?.accessToken ? "✅ présent" : "❌ absent")

  if (!session?.accessToken) {
    return NextResponse.json({ message: "Non authentifié" }, { status: 401 })
  }

  const url = `${API_URL}/api/users/me`
  console.log("[proxy GET] → fetch", url)

  let res: Response
  try {
    res = await fetch(url, {
      method:  "GET",
      headers: {
        "Authorization": `Bearer ${session.accessToken}`,
        "Content-Type":  "application/json",
      },
      cache: "no-store",
    })
  } catch (err) {
    // Backend injoignable (connexion refusée, timeout…)
    console.error("[proxy GET] ❌ Backend injoignable :", err)
    return NextResponse.json(
      { message: `Backend injoignable sur ${API_URL}` },
      { status: 502 }
    )
  }

  console.log("[proxy GET] ← status backend :", res.status)

  const data = await safeJson(res)

  if (data === null) {
    return NextResponse.json(
      { message: `Réponse invalide du backend (status ${res.status})` },
      { status: 502 }
    )
  }

  return NextResponse.json(data, { status: res.status })
}

// ─── PATCH /api/users/me ──────────────────────────────────────────────────────
export async function PATCH(req: NextRequest) {
  const session = await auth()

  if (!session?.accessToken) {
    return NextResponse.json({ message: "Non authentifié" }, { status: 401 })
  }

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ message: "Corps de requête invalide" }, { status: 400 })
  }

  const url = `${API_URL}/api/users/me`
  console.log("[proxy PATCH] → fetch", url, body)

  let res: Response
  try {
    res = await fetch(url, {
      method:  "PATCH",
      headers: {
        "Authorization": `Bearer ${session.accessToken}`,
        "Content-Type":  "application/json",
      },
      body: JSON.stringify(body),
    })
  } catch (err) {
    console.error("[proxy PATCH] ❌ Backend injoignable :", err)
    return NextResponse.json(
      { message: `Backend injoignable sur ${API_URL}` },
      { status: 502 }
    )
  }

  console.log("[proxy PATCH] ← status backend :", res.status)

  const data = await safeJson(res)

  if (data === null) {
    return NextResponse.json(
      { message: `Réponse invalide du backend (status ${res.status})` },
      { status: 502 }
    )
  }

  return NextResponse.json(data, { status: res.status })
}
// ─── DELETE /api/users/me ─────────────────────────────────────────────────────
export async function DELETE() {
  const session = await auth()

  console.log("[proxy DELETE] session existe :", !!session)
  console.log("[proxy DELETE] accessToken     :", session?.accessToken ? "✅ présent" : "❌ absent")

  if (!session?.accessToken) {
    return NextResponse.json({ message: "Non authentifié" }, { status: 401 })
  }

  const url = `${API_URL}/api/users/me`
  console.log("[proxy DELETE] → fetch", url)

  let res: Response
  try {
    res = await fetch(url, {
      method:  "DELETE",
      headers: {
        "Authorization": `Bearer ${session.accessToken}`,
        "Content-Type":  "application/json",
      },
    })
  } catch (err) {
    console.error("[proxy DELETE] ❌ Backend injoignable :", err)
    return NextResponse.json(
      { message: `Backend injoignable sur ${API_URL}` },
      { status: 502 }
    )
  }

  console.log("[proxy DELETE] ← status backend :", res.status)

  // 204 No Content — pas de body à parser
  if (res.status === 204) {
    return new NextResponse(null, { status: 204 })
  }

  // 403 — admin ne peut pas supprimer son compte
  if (res.status === 403) {
    const data = await safeJson(res)
    return NextResponse.json(
      { message: data?.message ?? "Action non autorisée" },
      { status: 403 }
    )
  }

  if (!res.ok) {
    const data = await safeJson(res)
    return NextResponse.json(
      { message: data?.message ?? `Erreur suppression (${res.status})` },
      { status: res.status }
    )
  }

  return new NextResponse(null, { status: 204 })
}