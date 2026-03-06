// src/app/api/users/me/sessions/route.ts
// src/app/api/users/me/sessions/route.ts
import { auth } from "@/auth"
import { NextRequest, NextResponse } from "next/server"

const API_URL = process.env.API_URL!

export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session?.accessToken)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  // ✅ Passer le vrai User-Agent du navigateur au backend
  // Le backend l'ajoutera à la session pour afficher le bon OS/browser
  const userAgent = req.headers.get("user-agent") ?? ""

  const res  = await fetch(`${API_URL}/api/users/me/sessions`, {
    headers: {
      Authorization:  `Bearer ${session.accessToken}`,
      "X-User-Agent": userAgent,   // header custom vers Spring Boot
    },
  })
  const data = await res.json()
  return NextResponse.json(data, { status: res.status })
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { sessionId: string } }
) {
  const session = await auth()
  if (!session?.accessToken)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const res = await fetch(`${API_URL}/api/users/me/sessions/${params.sessionId}`, {
    method:  "DELETE",
    headers: { Authorization: `Bearer ${session.accessToken}` },
  })
  return NextResponse.json({}, { status: res.status })
}