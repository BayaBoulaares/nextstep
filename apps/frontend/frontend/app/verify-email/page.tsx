"use client"

import { useEffect, useState } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import { IconCircleCheck, IconAlertCircle, IconLoader2, IconMail } from "@tabler/icons-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"

type Status = "loading" | "success" | "error" | "expired"

export default function VerifyEmailPage() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const token = searchParams.get("token")
  const email = searchParams.get("email")

  const [status, setStatus] = useState<Status>("loading")
  const [message, setMessage] = useState("")
  const [resending, setResending] = useState(false)
  const [resent, setResent] = useState(false)

  useEffect(() => {
    if (!token || !email) {
      setStatus("error")
      setMessage("Lien invalide — paramètres manquants.")
      return
    }
    verifyToken()
  }, [token, email])

  async function verifyToken() {
    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/auth/verify-email?token=${token}&email=${encodeURIComponent(email!)}`,
        { method: "GET" }
      )
      const data = await res.json()

      if (res.ok) {
        setStatus("success")
      } else {
        // Distinguer lien expiré vs invalide
        if (data.message?.toLowerCase().includes("expiré")) {
          setStatus("expired")
        } else {
          setStatus("error")
        }
        setMessage(data.message ?? "Lien invalide")
      }
    } catch {
      setStatus("error")
      setMessage("Erreur réseau — réessayez.")
    }
  }

  async function handleResend() {
    if (!email) return
    setResending(true)
    try {
      await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/auth/resend-verification`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      })
      setResent(true)
    } catch {
      // silencieux
    } finally {
      setResending(false)
    }
  }

  return (
    <main className="min-h-screen flex items-center justify-center p-4 bg-background">
      <div className="w-full max-w-md">
        <Card className="overflow-hidden">
          <CardContent className="p-8">

            {/* ── Chargement ──────────────────────────────────────────────── */}
            {status === "loading" && (
              <div className="flex flex-col items-center gap-4 text-center py-4">
                <IconLoader2 className="size-10 animate-spin text-muted-foreground" />
                <div>
                  <h2 className="text-lg font-semibold">Vérification en cours…</h2>
                  <p className="text-sm text-muted-foreground mt-1">
                    Merci de patienter quelques secondes.
                  </p>
                </div>
              </div>
            )}

            {/* ── Succès ──────────────────────────────────────────────────── */}
            {status === "success" && (
              <div className="flex flex-col items-center gap-4 text-center py-4">
                <div className="w-16 h-16 rounded-full bg-emerald-50 border-2 border-emerald-200 flex items-center justify-center">
                  <IconCircleCheck className="size-9 text-emerald-500" />
                </div>
                <div>
                  <h2 className="text-xl font-bold">Email vérifié !</h2>
                  <p className="text-sm text-muted-foreground mt-1">
                    Votre compte est maintenant actif.
                  </p>
                  {email && (
                    <p className="text-xs text-muted-foreground mt-0.5 font-medium">
                      {email}
                    </p>
                  )}
                </div>
                <Button
                  className="w-full mt-2"
                  onClick={() => {
                    sessionStorage.setItem("email_verified", "true")   // ✅ stocké en mémoire
                    router.push("/login")                              // ✅ URL propre
                  }}
                >
                  Se connecter
                </Button>
              </div>
            )}

            {/* ── Expiré ──────────────────────────────────────────────────── */}
            {status === "expired" && (
              <div className="flex flex-col items-center gap-4 text-center py-4">
                <div className="w-16 h-16 rounded-full bg-amber-50 border-2 border-amber-200 flex items-center justify-center">
                  <IconMail className="size-8 text-amber-500" />
                </div>
                <div>
                  <h2 className="text-xl font-bold">Lien expiré</h2>
                  <p className="text-sm text-muted-foreground mt-1">
                    Ce lien de vérification a expiré (validité 24h).
                  </p>
                </div>

                {resent ? (
                  <div className="w-full rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-700 text-sm p-3 text-center">
                    Nouveau lien envoyé — vérifiez votre boîte mail.
                  </div>
                ) : (
                  <Button
                    className="w-full"
                    onClick={handleResend}
                    disabled={resending}
                  >
                    {resending ? (
                      <IconLoader2 className="size-4 animate-spin mr-2" />
                    ) : null}
                    {resending ? "Envoi…" : "Recevoir un nouveau lien"}
                  </Button>
                )}

                <button
                  onClick={() => router.push("/login")}
                  className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                >
                  Retour à la connexion
                </button>
              </div>
            )}

            {/* ── Erreur ──────────────────────────────────────────────────── */}
            {status === "error" && (
              <div className="flex flex-col items-center gap-4 text-center py-4">
                <div className="w-16 h-16 rounded-full bg-red-50 border-2 border-red-200 flex items-center justify-center">
                  <IconAlertCircle className="size-9 text-red-500" />
                </div>
                <div>
                  <h2 className="text-xl font-bold">Lien invalide</h2>
                  <p className="text-sm text-muted-foreground mt-1">{message}</p>
                </div>
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => router.push("/login")}
                >
                  Retour à la connexion
                </Button>
              </div>
            )}

          </CardContent>
        </Card>
      </div>
    </main>
  )
}