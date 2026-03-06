// src/app/api/auth/reset-password/route.ts
import { NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest) {
  try {
    const { token, email, password } = await request.json()
    console.log("🔑 reset-password pour:", email, "token:", token?.substring(0, 8) + "...")

    if (!token || !email || !password) {
      return NextResponse.json({ message: "Token, email et mot de passe requis" }, { status: 400 })
    }

    const url = `${process.env.API_URL}/api/auth/reset-password`
    console.log("📡 Appel:", url)

    const res = await fetch(url, {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ token, email, password }),
    })

    console.log("📬 Spring status:", res.status)
    const text = await res.text()
    console.log("📬 Spring response:", text)

    const data = JSON.parse(text)

    if (!res.ok) return NextResponse.json(data, { status: res.status })
    return NextResponse.json(data)

  } catch (err: any) {
    console.error("❌ reset-password Next.js error:", err.message)
    return NextResponse.json({ message: err.message }, { status: 500 })
  }
}