// components/ui/google-signin-button.tsx
"use client"

import { signIn } from "next-auth/react"
import { Button } from "@/components/ui/button"
import { IconBrandGoogle } from "@tabler/icons-react"
import { useState } from "react"

export function GoogleSignInButton() {
  const [isLoading, setIsLoading] = useState(false)

  const handleGoogleSignIn = async () => {
    setIsLoading(true)
    try {
      await signIn("keycloak", { 
        callbackUrl: "/dashboard",
        // Optionnel: forcer Google directement
        // kc_idp_hint: "google"
      })
    } catch (error) {
      console.error("Google sign-in error:", error)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Button
      variant="outline"
      type="button"
      disabled={isLoading}
      onClick={handleGoogleSignIn}
      className="w-full"
    >
      <IconBrandGoogle className="mr-2 size-4" />
      {isLoading ? "Connexion..." : "Continuer avec Google"}
    </Button>
  )
}