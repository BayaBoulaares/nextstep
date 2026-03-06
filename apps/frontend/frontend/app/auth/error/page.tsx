// app/auth/error/page.tsx
"use client";

import { useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { IconAlertCircle } from "@tabler/icons-react";

export default function AuthErrorPage() {
  const searchParams = useSearchParams();
  const error = searchParams.get("error");

  const errorMessages: Record<string, string> = {
    OAuthSignin: "Erreur lors de la construction de l'URL d'authentification",
    OAuthCallback: "Erreur lors de la gestion de la réponse du fournisseur",
    OAuthCreateAccount: "Impossible de créer l'utilisateur",
    EmailCreateAccount: "Impossible de créer l'utilisateur",
    Callback: "Erreur lors du callback",
    OAuthAccountNotLinked: "Cet email est déjà utilisé avec un autre fournisseur",
    EmailSignin: "Vérifiez votre email",
    CredentialsSignin: "Échec de la connexion",
    default: "Une erreur est survenue lors de l'authentification",
  };

  return (
    <div className="flex min-h-screen items-center justify-center">
      <Card className="w-full max-w-md p-6">
        <div className="flex flex-col items-center gap-4 text-center">
          <div className="rounded-full bg-red-100 p-3">
            <IconAlertCircle className="size-6 text-red-600" />
          </div>
          <h1 className="text-xl font-semibold">Erreur d'authentification</h1>
          <p className="text-muted-foreground">
            {errorMessages[error || "default"]}
          </p>
          <Button onClick={() => window.location.href = "/auth/login"}>
            Retour à la connexion
          </Button>
        </div>
      </Card>
    </div>
  );
}