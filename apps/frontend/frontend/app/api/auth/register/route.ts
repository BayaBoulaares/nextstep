// src/app/api/register/route.ts
import { NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    console.log("📩 Body reçu:", body)

    const apiUrl = process.env.API_URL || "http://localhost:8081"
    console.log("🌐 Appel vers:", `${apiUrl}/api/auth/register`)

    const res = await fetch(`${apiUrl}/api/auth/register`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    })

    console.log("📬 Status Spring Boot:", res.status)

    // ← Fix : lire le body comme texte d'abord pour éviter l'erreur si vide
    const text = await res.text()
    console.log("📦 Réponse brute:", text)

    const data = text ? JSON.parse(text) : {}

    if (!res.ok) {
      return NextResponse.json(
        { message: data.message || `Erreur ${res.status}` },
        { status: res.status }
      )
    }

    return NextResponse.json(data, { status: 201 })

  } catch (error: any) {
    console.error("❌ Erreur API register:", error.message)
    return NextResponse.json(
      { message: error.message || "Erreur serveur" },
      { status: 500 }
    )
  }
}