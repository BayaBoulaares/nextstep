// src/app/api/auth/forgot-password/route.ts
import { NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json()

    if (!email || typeof email !== "string") {
      return NextResponse.json({ message: "Email requis" }, { status: 400 })
    }

    const url = `${process.env.API_URL}/api/auth/forgot-password`
    console.log("🌐 Appel vers:", url)
    console.log("📧 Email:", email)

    const res = await fetch(url, {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ email }),
    })

    // ✅ Lire la réponse Spring Boot pour voir l'erreur exacte
    const text = await res.text()
    console.log("📬 Spring Boot status:", res.status)
    console.log("📦 Spring Boot response:", text)

    const data = text ? JSON.parse(text) : {}
    return NextResponse.json(data, { status: res.status })

  } catch (err: any) {
    console.error("❌ forgot-password error:", err.message)
    return NextResponse.json({ message: "Erreur serveur" }, { status: 500 })
  }
}