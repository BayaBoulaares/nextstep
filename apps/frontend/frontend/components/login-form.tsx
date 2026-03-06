"use client"

import { cn }        from "@/lib/utils"
import { useState }  from "react"
import { signIn }    from "next-auth/react"
import { useRouter } from "next/navigation"
import { Button }          from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input }           from "@/components/ui/input"
import { Label }           from "@/components/ui/label"
import { Checkbox }        from "@/components/ui/checkbox"
import {
  IconLoader2,
  IconAlertCircle,
  IconCircleCheck,
  IconBrandGoogle,
} from "@tabler/icons-react"

interface LoginFormProps {
  className?: string
  onSwitchToRegister?: () => void
}

type View = "login" | "forgot" | "forgot-sent"

export function LoginForm({ className, onSwitchToRegister }: LoginFormProps) {
  const router = useRouter()

  const [view,          setView]          = useState<View>("login")
  const [email,         setEmail]         = useState("")
  const [password,      setPassword]      = useState("")
  const [rememberMe,    setRememberMe]    = useState(false)
  const [forgotEmail,   setForgotEmail]   = useState("")
  const [error,         setError]         = useState("")
  const [loading,       setLoading]       = useState(false)
  const [googleLoading, setGoogleLoading] = useState(false)

  // ── Login email/password ───────────────────────────────────────────────────
  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setError("")
    setLoading(true)
    try {
      const result = await signIn("credentials", {
        redirect:   false,
        email,
        password,
        // ✅ "on" si coché, absent sinon — lu dans authorize() puis propagé au JWT
        rememberMe: rememberMe ? "on" : undefined,
      })
      if (result?.error) {
        // ✅ Distinguer session expirée et mauvais identifiants
        if (result.error === "SessionExpired") {
          setError("Votre session a expiré, veuillez vous reconnecter")
        } else {
          setError("Email ou mot de passe incorrect")
        }
      } else {
        router.push("/dashboard")
      }
    } catch {
      setError("Erreur réseau, réessayez")
    } finally {
      setLoading(false)
    }
  }

  // ── Login Google via Keycloak ──────────────────────────────────────────────
  async function handleGoogleLogin() {
    setGoogleLoading(true)
    try {
      await signIn("keycloak", { callbackUrl: "/dashboard" })
    } catch {
      setError("Erreur lors de la connexion Google")
      setGoogleLoading(false)
    }
  }

  // ── Forgot password ────────────────────────────────────────────────────────
  async function handleForgotPassword(e: React.FormEvent) {
    e.preventDefault()
    setError("")
    setLoading(true)
    try {
      const res = await fetch("/api/auth/forgot-password", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ email: forgotEmail }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        setError(data.message ?? "Erreur lors de l'envoi")
        return
      }
      setView("forgot-sent")
    } catch {
      setError("Erreur réseau, réessayez")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className={cn("flex flex-col gap-6", className)}>
      <Card className="overflow-hidden p-0">
        <CardContent className="grid p-0 md:grid-cols-2">

          <div className="p-6 md:p-8">

            {/* ════════ VIEW : LOGIN ════════ */}
            {view === "login" && (
              <div className="flex flex-col gap-5">
                <div className="flex flex-col items-center gap-2 text-center">
                  <h1 className="text-2xl font-bold">Connexion</h1>
                  <p className="text-muted-foreground text-balance text-sm">
                    Entrez vos identifiants pour accéder à votre espace
                  </p>
                </div>

                {error && (
                  <div className="flex items-center gap-2 rounded-md border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-600">
                    <IconAlertCircle className="size-4 shrink-0" />
                    {error}
                  </div>
                )}

                {/* ── Bouton Google ── */}
                <Button
                  variant="outline"
                  type="button"
                  disabled={googleLoading}
                  onClick={handleGoogleLogin}
                  className="w-full"
                >
                  {googleLoading
                    ? <IconLoader2 className="mr-2 size-4 animate-spin" />
                    : <IconBrandGoogle className="mr-2 size-4" />
                  }
                  {googleLoading ? "Connexion..." : "Continuer avec Google"}
                </Button>

                {/* ── Séparateur ── */}
                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <span className="w-full border-t" />
                  </div>
                  <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-background px-2 text-muted-foreground">
                      Ou avec votre email
                    </span>
                  </div>
                </div>

                {/* ── Formulaire email/password ── */}
                <form onSubmit={handleLogin} className="flex flex-col gap-4">
                  <div className="flex flex-col gap-2">
                    <Label htmlFor="login-email">Email</Label>
                    <Input
                      id="login-email"
                      type="email"
                      placeholder="jean@example.com"
                      required
                      autoComplete="email"
                      value={email}
                      onChange={e => setEmail(e.target.value)}
                    />
                  </div>

                  <div className="flex flex-col gap-2">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="login-password">Mot de passe</Label>
                      <button
                        type="button"
                        onClick={() => { setError(""); setView("forgot") }}
                        className="text-xs text-muted-foreground underline underline-offset-4 hover:text-primary transition-colors"
                      >
                        Mot de passe oublié ?
                      </button>
                    </div>
                    <Input
                      id="login-password"
                      type="password"
                      placeholder="••••••••"
                      required
                      autoComplete="current-password"
                      value={password}
                      onChange={e => setPassword(e.target.value)}
                    />
                  </div>

                  {/* ✅ Checkbox "Se souvenir de moi" — correctement branché */}
                  <div className="flex items-center gap-2">
                    <Checkbox
                      id="remember-me"
                      checked={rememberMe}
                      onCheckedChange={v => setRememberMe(v === true)}
                    />
                    <Label
                      htmlFor="remember-me"
                      className="text-sm font-normal cursor-pointer select-none"
                    >
                      Se souvenir de moi{" "}
                      <span className="text-muted-foreground text-xs">
                        (session de 30 jours)
                      </span>
                    </Label>
                  </div>

                  <Button type="submit" disabled={loading} className="w-full">
                    {loading
                      ? <><IconLoader2 className="size-4 animate-spin mr-2" />Connexion…</>
                      : "Se connecter"
                    }
                  </Button>
                </form>

                <div className="text-center text-sm">
                  Pas encore de compte ?{" "}
                  <button
                    type="button"
                    onClick={onSwitchToRegister}
                    className="underline underline-offset-4 hover:text-primary transition-colors"
                  >
                    Créer un compte
                  </button>
                </div>
              </div>
            )}

            {/* ════════ VIEW : FORGOT PASSWORD ════════ */}
            {view === "forgot" && (
              <form onSubmit={handleForgotPassword} className="flex flex-col gap-5">
                <div className="flex flex-col items-center gap-2 text-center">
                  <h1 className="text-2xl font-bold">Mot de passe oublié</h1>
                  <p className="text-muted-foreground text-balance text-sm">
                    Entrez votre email et nous vous enverrons un lien de réinitialisation
                  </p>
                </div>

                {error && (
                  <div className="flex items-center gap-2 rounded-md border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-600">
                    <IconAlertCircle className="size-4 shrink-0" />
                    {error}
                  </div>
                )}

                <div className="flex flex-col gap-2">
                  <Label htmlFor="forgot-email">Email</Label>
                  <Input
                    id="forgot-email"
                    type="email"
                    placeholder="jean@example.com"
                    required
                    autoComplete="email"
                    value={forgotEmail}
                    onChange={e => setForgotEmail(e.target.value)}
                  />
                </div>

                <Button type="submit" disabled={loading} className="w-full">
                  {loading
                    ? <><IconLoader2 className="size-4 animate-spin mr-2" />Envoi…</>
                    : "Envoyer le lien"
                  }
                </Button>

                <button
                  type="button"
                  onClick={() => { setError(""); setView("login") }}
                  className="text-center text-sm text-muted-foreground underline underline-offset-4 hover:text-primary transition-colors"
                >
                  ← Retour à la connexion
                </button>
              </form>
            )}

            {/* ════════ VIEW : FORGOT SENT ════════ */}
            {view === "forgot-sent" && (
              <div className="flex flex-col gap-5">
                <div className="flex flex-col items-center gap-3 text-center">
                  <div className="flex size-12 items-center justify-center rounded-full bg-emerald-100">
                    <IconCircleCheck className="size-6 text-emerald-600" />
                  </div>
                  <h1 className="text-2xl font-bold">Email envoyé !</h1>
                  <p className="text-muted-foreground text-balance text-sm">
                    Si un compte existe pour <strong>{forgotEmail}</strong>, vous recevrez
                    un lien de réinitialisation dans quelques minutes.
                  </p>
                  <p className="text-muted-foreground text-xs">
                    Vérifiez vos spams si vous ne voyez rien.
                  </p>
                </div>
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => { setForgotEmail(""); setError(""); setView("login") }}
                >
                  Retour à la connexion
                </Button>
              </div>
            )}

          </div>

          {/* ── Panneau droit (image) ── */}
          <div className="bg-muted relative hidden md:block">
            <img
              src="/cloudServiceS.png"
              alt="Image"
              className="absolute inset-0 h-full w-full object-cover dark:brightness-[0.2] dark:grayscale"
            />
          </div>

        </CardContent>
      </Card>
    </div>
  )
}