"use client"

import { useState } from "react"
import { IconMail, IconLoader2, IconArrowLeft } from "@tabler/icons-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"

interface WaitingVerificationProps {
  email: string
  firstName?: string
  onBack: () => void
}

export function WaitingVerification({ email, firstName, onBack }: WaitingVerificationProps) {
  const [resending, setResending] = useState(false)
  const [resent, setResent]       = useState(false)
  const [error, setError]         = useState("")

  async function handleResend() {
    setResending(true)
    setError("")
    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/auth/resend-verification`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, firstName }),
        }
      )
      if (!res.ok) {
        const data = await res.json()
        setError(data.message ?? "Impossible de renvoyer l'email")
      } else {
        setResent(true)
      }
    } catch {
      setError("Erreur réseau — réessayez")
    } finally {
      setResending(false)
    }
  }

  return (
    <div className="w-full max-w-md">
      <Card className="overflow-hidden">
        <CardContent className="p-8">
          <div className="flex flex-col items-center gap-5 text-center">

            {/* Icône */}
            <div className="w-16 h-16 rounded-full bg-muted border border-border flex items-center justify-center">
              <IconMail className="size-8 text-muted-foreground" />
            </div>

            {/* Titre */}
            <div>
              <h2 className="text-xl font-bold">Vérifiez votre email</h2>
              <p className="text-sm text-muted-foreground mt-1">
                Un lien de vérification a été envoyé à
              </p>
              <p className="text-sm font-semibold mt-0.5">{email}</p>
            </div>

            {/* Instructions */}
            <div className="w-full rounded-lg bg-muted/50 border border-border/60 p-4 text-left space-y-2">
              {[
                "Ouvrez votre boîte mail",
                "Cliquez sur « Vérifier mon email »",
                "Revenez ici pour vous connecter",
              ].map((step, i) => (
                <div key={i} className="flex items-start gap-3">
                  <span className="w-5 h-5 rounded-full bg-foreground text-background text-xs font-bold flex items-center justify-center flex-shrink-0 mt-0.5">
                    {i + 1}
                  </span>
                  <p className="text-sm">{step}</p>
                </div>
              ))}
            </div>

            {/* Erreur */}
            {error && (
              <p className="text-sm text-destructive">{error}</p>
            )}

            {/* Renvoi */}
            {resent ? (
              <div className="w-full rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-700 text-sm p-3 text-center">
                Nouveau lien envoyé — vérifiez votre boîte mail.
              </div>
            ) : (
              <div className="text-sm text-muted-foreground">
                Email non reçu ?{" "}
                <button
                  type="button"
                  onClick={handleResend}
                  disabled={resending}
                  className="underline underline-offset-4 hover:text-foreground font-medium transition-colors disabled:opacity-50"
                >
                  {resending ? (
                    <span className="inline-flex items-center gap-1">
                      <IconLoader2 className="size-3 animate-spin" /> Envoi…
                    </span>
                  ) : "Renvoyer le lien"}
                </button>
              </div>
            )}

            {/* Retour */}
            <button
              type="button"
              onClick={onBack}
              className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              <IconArrowLeft className="size-3.5" />
              Changer d'adresse email
            </button>

          </div>
        </CardContent>
      </Card>
    </div>
  )
}