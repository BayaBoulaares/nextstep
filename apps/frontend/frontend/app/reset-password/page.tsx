"use client"

import { useState, useEffect, Suspense } from "react"
import { useSearchParams, useRouter }    from "next/navigation"
import { Button }  from "@/components/ui/button"
import { Input }   from "@/components/ui/input"
import { Label }   from "@/components/ui/label"
import { Card, CardContent } from "@/components/ui/card"
import { IconLoader2, IconAlertCircle, IconCircleCheck } from "@tabler/icons-react"

function ResetPasswordForm() {
  const searchParams = useSearchParams()
  const router       = useRouter()

  const token = searchParams.get("token") ?? ""
  const email = searchParams.get("email") ?? ""

  const [password,  setPassword]  = useState("")
  const [confirm,   setConfirm]   = useState("")
  const [error,     setError]     = useState("")
  const [success,   setSuccess]   = useState(false)
  const [loading,   setLoading]   = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError("")

    if (password !== confirm) {
      setError("Les mots de passe ne correspondent pas")
      return
    }
    if (password.length < 8) {
      setError("Le mot de passe doit contenir au moins 8 caractères")
      return
    }

    setLoading(true)
    try {
      const res = await fetch("/api/auth/reset-password", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ token, email, password }),
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.message ?? "Lien invalide ou expiré")
        return
      }

      setSuccess(true)
      setTimeout(() => router.push("/login"), 3000)

    } catch {
      setError("Erreur réseau, réessayez")
    } finally {
      setLoading(false)
    }
  }

  if (!token || !email) {
    return (
      <div className="text-center text-red-500 p-8">
        Lien invalide ou expiré.
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardContent className="p-8">

          {success ? (
            <div className="flex flex-col items-center gap-4 text-center">
              <div className="flex size-12 items-center justify-center rounded-full bg-emerald-100">
                <IconCircleCheck className="size-6 text-emerald-600" />
              </div>
              <h1 className="text-2xl font-bold">Mot de passe modifié !</h1>
              <p className="text-muted-foreground text-sm">
                Redirection vers la connexion dans 3 secondes…
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="flex flex-col gap-5">
              <div className="flex flex-col items-center gap-2 text-center">
                <h1 className="text-2xl font-bold">Nouveau mot de passe</h1>
                <p className="text-muted-foreground text-sm">
                  Choisissez un mot de passe sécurisé
                </p>
              </div>

              {error && (
                <div className="flex items-center gap-2 rounded-md border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-600">
                  <IconAlertCircle className="size-4 flex-shrink-0" />
                  {error}
                </div>
              )}

              <div className="flex flex-col gap-2">
                <Label htmlFor="password">Nouveau mot de passe</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>

              <div className="flex flex-col gap-2">
                <Label htmlFor="confirm">Confirmer le mot de passe</Label>
                <Input
                  id="confirm"
                  type="password"
                  placeholder="••••••••"
                  required
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                />
              </div>

              <Button type="submit" disabled={loading} className="w-full">
                {loading
                  ? <><IconLoader2 className="size-4 animate-spin mr-2" />Enregistrement…</>
                  : "Réinitialiser le mot de passe"
                }
              </Button>
            </form>
          )}

        </CardContent>
      </Card>
    </div>
  )
}

export default function ResetPasswordPage() {
  return (
    <Suspense>
      <ResetPasswordForm />
    </Suspense>
  )
}