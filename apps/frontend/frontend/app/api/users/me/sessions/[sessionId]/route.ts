// src/app/api/users/me/sessions/[sessionId]/route.ts
import { auth } from "@/auth"
import { NextRequest, NextResponse } from "next/server"

const API_URL = process.env.API_URL!

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { sessionId: string } }
) {
  const session = await auth()
  if (!session?.accessToken)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const res = await fetch(`${API_URL}/api/users/me/sessions/${params.sessionId}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${session.accessToken}` },
  })
  return NextResponse.json({}, { status: res.status })
}