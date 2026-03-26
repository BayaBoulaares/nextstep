// app/dashboard/mes-plans/page.tsx
"use client"

import { useEffect, useState } from "react"
import { useSession } from "next-auth/react"
import { SidebarInset, SidebarTrigger } from "@/components/ui/sidebar"
import { Separator } from "@/components/ui/separator"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

interface AbonnementResponse {
  id: number
  planId: number
  planName: string
  serviceName: string
  status: "ACTIF" | "RESILIE" | "SUSPENDU" | "EXPIRE"
  prixSnapshot: number
  billingCycle: string
  dateDebut: string
  dateFin: string | null
  autoRenouvellement: boolean
  isPayAsYouGo: boolean
  deploymentId?: number
  resourceName?: string
}

const statusColors: Record<string, string> = {
  ACTIF:     "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
  RESILIE:   "bg-red-500/10 text-red-400 border-red-500/20",
  SUSPENDU:  "bg-yellow-500/10 text-yellow-400 border-yellow-500/20",
  EXPIRE:    "bg-gray-500/10 text-gray-400 border-gray-500/20",
}

const cycleLabel: Record<string, string> = {
  MENSUEL: "/ mois",
  ANNUEL:  "/ an",
  HORAIRE: "/ heure",
  USAGE:   "pay-as-you-go",
}

export default function MesPlansPage() {
  const { data: session } = useSession()
  const [abonnements, setAbonnements] = useState<AbonnementResponse[]>([])
  const [loading, setLoading]         = useState(true)
  const [error, setError]             = useState<string | null>(null)

  useEffect(() => {
    if (!session?.accessToken) return

    fetch("http://localhost:8081/api/abonnements/mes-abonnements", {
      headers: {
        Authorization: `Bearer ${session.accessToken}`,
      },
    })
      .then(res => {
        if (!res.ok) throw new Error(`Erreur ${res.status}`)
        return res.json()
      })
      .then(data => setAbonnements(data))
      .catch(err => setError(err.message))
      .finally(() => setLoading(false))
  }, [session?.accessToken])

  return (
    <SidebarInset>
      {/* Header */}
      <header className="flex h-14 items-center gap-3 border-b border-border/60 px-5 bg-background/95 backdrop-blur sticky top-0 z-10">
        <SidebarTrigger className="-ml-1 size-8 text-muted-foreground hover:text-foreground hover:bg-muted rounded-md transition-colors" />
        <Separator orientation="vertical" className="h-4 opacity-40" />
        <h1 className="text-[14px] font-semibold">Mes Plans</h1>
        <span className="ml-auto text-[12px] text-muted-foreground">
          {abonnements.length} abonnement{abonnements.length !== 1 ? "s" : ""}
        </span>
      </header>

      <div className="p-6">
        {/* Loading */}
        {loading && (
          <div className="flex items-center justify-center h-40 text-muted-foreground text-[13px]">
            Chargement...
          </div>
        )}

        {/* Erreur */}
        {error && (
          <div className="rounded-lg border border-red-500/20 bg-red-500/10 p-4 text-red-400 text-[13px]">
            Erreur : {error}
          </div>
        )}

        {/* Vide */}
        {!loading && !error && abonnements.length === 0 && (
          <div className="flex flex-col items-center justify-center h-40 gap-2">
            <p className="text-muted-foreground text-[13px]">
              Vous n'avez pas encore d'abonnement actif.
            </p>
          </div>
        )}

        {/* Liste des abonnements */}
        {!loading && !error && abonnements.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {abonnements.map(abo => (
              <Card key={abo.id} className="border border-border/60 bg-card/50">
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <CardTitle className="text-[14px] font-semibold">
                        {abo.planName}
                      </CardTitle>
                      <p className="text-[12px] text-muted-foreground mt-0.5">
                        {abo.serviceName}
                      </p>
                    </div>
                    <Badge
                      variant="outline"
                      className={`text-[11px] px-2 py-0.5 ${statusColors[abo.status] ?? ""}`}
                    >
                      {abo.status}
                    </Badge>
                  </div>
                </CardHeader>

                <CardContent className="space-y-3">
                  {/* Prix */}
                  <div className="flex items-baseline gap-1">
                    {abo.isPayAsYouGo ? (
                      <span className="text-[13px] text-muted-foreground">
                        Facturation à l'usage
                      </span>
                    ) : (
                      <>
                        <span className="text-[18px] font-bold">
                          {abo.prixSnapshot} €
                        </span>
                        <span className="text-[12px] text-muted-foreground">
                          {cycleLabel[abo.billingCycle] ?? abo.billingCycle}
                        </span>
                      </>
                    )}
                  </div>

                  {/* Dates */}
                  <div className="text-[12px] text-muted-foreground space-y-1">
                    <div className="flex justify-between">
                      <span>Début</span>
                      <span>{new Date(abo.dateDebut).toLocaleDateString("fr-FR")}</span>
                    </div>
                    {abo.dateFin && (
                      <div className="flex justify-between">
                        <span>Fin</span>
                        <span>{new Date(abo.dateFin).toLocaleDateString("fr-FR")}</span>
                      </div>
                    )}
                    <div className="flex justify-between">
                      <span>Renouvellement auto</span>
                      <span>{abo.autoRenouvellement ? "✅ Oui" : "❌ Non"}</span>
                    </div>
                  </div>

                  {/* Déploiement lié */}
                  {abo.resourceName && (
                    <div className="rounded-md bg-muted/40 px-3 py-2 text-[12px]">
                      <span className="text-muted-foreground">Ressource : </span>
                      <span className="font-medium">{abo.resourceName}</span>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </SidebarInset>
  )
}
/*```

---

## Ce que fait cette page
```
1. Récupère le accessToken depuis la session NextAuth
2. Appelle GET /api/abonnements/mes-abonnements
   → Spring Boot résout le clientId depuis le JWT
   → Retourne les abonnements du user connecté
3. Affiche chaque abonnement dans une Card avec :
   - Nom du plan + service
   - Badge de statut coloré (ACTIF/RESILIE/...)
   - Prix + cycle de facturation
   - Dates début/fin
   - Ressource déployée si liée*/