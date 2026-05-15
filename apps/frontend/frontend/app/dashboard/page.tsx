// // app/dashboard/abonnements/page.tsx
// "use client"

// import * as React from "react"
// import { SidebarInset, SidebarTrigger } from "@/components/ui/sidebar"
// import { Separator } from "@/components/ui/separator"
// import { Button } from "@/components/ui/button"
// import { Loader2, AlertTriangle, Calendar, Server } from "lucide-react"
// import { cn } from "@/lib/utils"
// import { abonnementApi } from "@/app/features/abonnements/services/abonnementApi"
// import type { AbonnementResponse, BillingCycle, AbonnementStatus } from "@/lib/types"

// // ── Helpers ───────────────────────────────────────────────────────────────────

// const STATUS_LABEL: Record<AbonnementStatus, string> = {
//   EN_ATTENTE: "En attente",
//   ACTIF: "Actif",
//   SUSPENDU: "Suspendu",
//   RESILIE: "Résilié",
//   EXPIRE: "Expiré",
// }

// const STATUS_CLASS: Record<AbonnementStatus, string> = {
//   EN_ATTENTE: "bg-yellow-50  text-yellow-700  border-yellow-200",
//   ACTIF: "bg-emerald-50 text-emerald-700 border-emerald-200",
//   SUSPENDU: "bg-orange-50  text-orange-700  border-orange-200",
//   RESILIE: "bg-red-50     text-red-700     border-red-200",
//   EXPIRE: "bg-gray-50    text-gray-500    border-gray-200",
// }

// function fmt(iso: string | null): string {
//   if (!iso) return "—"
//   return new Date(iso).toLocaleDateString("fr-FR", {
//     day: "2-digit", month: "short", year: "numeric",
//   })
// }

// // ── AbonnementCard ────────────────────────────────────────────────────────────

// function AbonnementCard({
//   abo,
//   onResilier,
// }: {
//   abo: AbonnementResponse
//   onResilier: (id: number) => Promise<void>
// }) {
//   const [confirming, setConfirming] = React.useState(false)
//   const [loading, setLoading] = React.useState(false)

//   const handleResilier = async () => {
//     setLoading(true)
//     try { await onResilier(abo.id) }
//     finally { setLoading(false); setConfirming(false) }
//   }

//   return (
//     <div className="border border-border rounded-2xl overflow-hidden bg-card shrink-0 w-72 snap-start">
//       {/* Header */}
//       <div className="flex items-center justify-between px-5 py-4 border-b border-border bg-muted/20">
//         <div>
//           <p className="text-[14px] font-semibold text-foreground leading-tight">{abo.planName}</p>
//           {abo.serviceName && (
//             <p className="text-[12px] text-muted-foreground">{abo.serviceName}</p>
//           )}
//         </div>
//         <span className={cn(
//           "text-[11px] font-medium px-2.5 py-0.5 rounded-full border",
//           STATUS_CLASS[abo.status],
//         )}>
//           {STATUS_LABEL[abo.status]}
//         </span>
//       </div>

//       {/* Body */}
//       <div className="px-5 py-4 space-y-2">
//         {[
//           {
//             icon: <Calendar className="w-3.5 h-3.5 text-muted-foreground" />,
//             label: "Début",
//             value: fmt(abo.dateDebut),
//           },
//           {
//             icon: <Calendar className="w-3.5 h-3.5 text-muted-foreground" />,
//             label: "Fin prévue",
//             value: abo.dateFin ? fmt(abo.dateFin) : "Reconductible",
//           },
//           ...(abo.resourceName ? [{
//             icon: <Server className="w-3.5 h-3.5 text-muted-foreground" />,
//             label: "Ressource",
//             value: <span className="font-mono text-[12px]">{abo.resourceName}</span>,
//           }] : []),
//           ...(abo.dateResiliation ? [{
//             icon: <Calendar className="w-3.5 h-3.5 text-muted-foreground" />,
//             label: "Résilié le",
//             value: fmt(abo.dateResiliation),
//           }] : []),
//         ].map((row, i) => (
//           <div key={i} className="flex items-center justify-between gap-2">
//             <div className="flex items-center gap-1.5">
//               {row.icon}
//               <span className="text-[12px] text-muted-foreground">{row.label}</span>
//             </div>
//             <span className="text-[12px] font-medium text-foreground text-right">{row.value}</span>
//           </div>
//         ))}
//       </div>

//       {/* Footer */}
//       {abo.status === "ACTIF" && (
//         <div className="px-5 pb-4 flex flex-col gap-2">
//           {!confirming ? (
//             <Button
//               variant="outline" size="sm"
//               className="w-full h-8 text-[12px] text-red-600 border-red-200 hover:bg-red-50"
//               onClick={() => setConfirming(true)}
//             >
//               Résilier l'abonnement
//             </Button>
//           ) : (
//             <div className="flex gap-2">
//               <Button
//                 variant="outline" size="sm"
//                 className="flex-1 h-8 text-[12px]"
//                 onClick={() => setConfirming(false)}
//                 disabled={loading}
//               >
//                 Annuler
//               </Button>
//               <Button
//                 size="sm"
//                 className="flex-1 h-8 text-[12px] bg-red-600 hover:bg-red-700 text-white"
//                 onClick={handleResilier}
//                 disabled={loading}
//               >
//                 {loading ? <Loader2 className="w-3 h-3 animate-spin" /> : "Confirmer"}
//               </Button>
//             </div>
//           )}
//         </div>
//       )}
//     </div>
//   )
// }

// // ── Page ──────────────────────────────────────────────────────────────────────

// export default function MesAbonnementsPage() {
//   const [abonnements, setAbonnements] = React.useState<AbonnementResponse[]>([])
//   const [loading, setLoading] = React.useState(true)
//   const [error, setError] = React.useState<string | null>(null)
//   const [actionError, setActionError] = React.useState<string | null>(null)

//   React.useEffect(() => {
//     abonnementApi.mesAbonnements()
//       .then(data => setAbonnements(Array.isArray(data) ? data : []))
//       .catch(err => setError(err?.message ?? "Erreur de chargement"))
//       .finally(() => setLoading(false))
//   }, [])

//   const handleResilier = async (id: number) => {
//     try {
//       setActionError(null)
//       const updated = await abonnementApi.resilier(id)
//       setAbonnements(prev => prev.map(a => a.id === id ? updated : a))
//     } catch (e: any) {
//       setActionError(e.message ?? "Erreur lors de la résiliation")
//     }
//   }

//   const actifs = abonnements.filter(a => a.status === "ACTIF")
//   const inactifs = abonnements.filter(a => a.status !== "ACTIF")

//   return (
//     <SidebarInset>
//       <header className="flex h-14 items-center gap-3 border-b border-border/60 pl-2 pr-5 bg-background/95 backdrop-blur sticky top-0 z-10">        <SidebarTrigger className="-ml-1 size-8 text-muted-foreground hover:text-foreground hover:bg-muted rounded-md transition-colors" />
//         <Separator orientation="vertical" className="h-4 opacity-40" />
//         <h1 className="text-[14px] font-semibold">Mes Abonnements</h1>
//         <span className="ml-auto text-[12px] text-muted-foreground">
//           {actifs.length} actif{actifs.length !== 1 ? "s" : ""}
//         </span>
//       </header>

//       <div className="p-6 max-w-4xl mx-auto w-full space-y-8">

//         {loading && (
//           <div className="flex items-center justify-center py-20">
//             <Loader2 className="size-5 animate-spin text-muted-foreground" />
//           </div>
//         )}

//         {(error || actionError) && (
//           <div className="flex items-center gap-2 text-[13px] text-red-600 bg-red-50 border border-red-200 rounded-xl px-4 py-3">
//             <AlertTriangle className="w-4 h-4 shrink-0" />{error ?? actionError}
//           </div>
//         )}

//         {!loading && abonnements.length === 0 && !error && (
//           <div className="text-center py-20">
//             <p className="text-[15px] font-medium text-foreground">Aucun abonnement</p>
//             <p className="text-[13px] text-muted-foreground mt-1">
//               Souscrivez à un plan depuis le Marketplace.
//             </p>
//             <Button
//               className="mt-5 bg-[#0a7fcf] hover:bg-[#0869b0] text-white border-0"
//               onClick={() => window.location.href = "/dashboard/services"}
//             >
//               Explorer les services →
//             </Button>
//           </div>
//         )}

//         {actifs.length > 0 && (
//           <section className="space-y-3">
//             <p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-muted-foreground">
//               Actifs ({actifs.length})
//             </p>
//             <div className="flex gap-4 overflow-x-auto pb-2 snap-x snap-mandatory scroll-smooth
//               [&::-webkit-scrollbar]:h-1.5
//               [&::-webkit-scrollbar-track]:bg-muted/30
//               [&::-webkit-scrollbar-track]:rounded-full
//               [&::-webkit-scrollbar-thumb]:bg-border
//               [&::-webkit-scrollbar-thumb]:rounded-full">
//               {actifs.map(a => (
//                 <AbonnementCard key={a.id} abo={a} onResilier={handleResilier} />
//               ))}
//             </div>
//           </section>
//         )}

//         {inactifs.length > 0 && (
//           <section className="space-y-3">
//             <p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-muted-foreground">
//               Historique ({inactifs.length})
//             </p>
//             <div className="flex gap-4 overflow-x-auto pb-2 opacity-60 snap-x snap-mandatory scroll-smooth
//               [&::-webkit-scrollbar]:h-1.5
//               [&::-webkit-scrollbar-track]:bg-muted/30
//               [&::-webkit-scrollbar-track]:rounded-full
//               [&::-webkit-scrollbar-thumb]:bg-border
//               [&::-webkit-scrollbar-thumb]:rounded-full">
//               {inactifs.map(a => (
//                 <AbonnementCard key={a.id} abo={a} onResilier={handleResilier} />
//               ))}
//             </div>
//           </section>
//         )}
//       </div>
//     </SidebarInset>
//   )
// }
// Version simplifiée sans recharts (si vous ne voulez pas l'installer)
"use client"

import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Users, TrendingUp, Activity, Settings, Plus } from "lucide-react"

export default function AnalyticsPage() {
  return (
    <div className="p-6 space-y-6">
      {/* Première ligne */}
      <div className="grid grid-cols-3 gap-6">
        {/* Carte Active Accounts */}
        <Card className="col-span-1 bg-gradient-to-br from-blue-600 to-blue-700 text-white">
          <CardContent className="p-5">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-blue-100 text-xs">Active Accounts</p>
                <p className="text-3xl font-bold mt-1">45,678</p>
                <p className="text-blue-100 text-xs mt-3">Strong user retention</p>
                <p className="text-blue-100 text-xs">Engagement exceed targets</p>
              </div>
              <Users className="w-8 h-8 text-white/70" />
            </div>
          </CardContent>
        </Card>

        {/* Growth Rate */}
        <Card>
          <CardContent className="p-5">
            <div className="flex justify-between">
              <div>
                <p className="text-muted-foreground text-xs">Growth Rate</p>
                <p className="text-2xl font-bold">+12.5%</p>
              </div>
              <TrendingUp className="w-5 h-5 text-emerald-500" />
            </div>
            <p className="text-xs text-muted-foreground mt-3">Steady performance increase</p>
            <p className="text-xs text-muted-foreground">Meets growth projections</p>
          </CardContent>
        </Card>

        {/* Taux */}
        <Card>
          <CardContent className="p-5">
            <div className="flex justify-between">
              <div>
                <p className="text-muted-foreground text-xs">Taux</p>
                <p className="text-2xl font-bold">+4.5%</p>
              </div>
              <Activity className="w-5 h-5 text-blue-500" />
            </div>
            <p className="text-xs text-muted-foreground mt-3">Steady performance increase</p>
            <p className="text-xs text-muted-foreground">Meets growth projections</p>
          </CardContent>
        </Card>
      </div>

      {/* Section Total Visitors avec Tabs */}
      <Card>
        <CardContent className="p-5">
          <div className="flex justify-between items-center mb-4">
            <div>
              <h3 className="font-semibold">Total Visitors</h3>
              <p className="text-xs text-muted-foreground">Total for the last 3 months</p>
            </div>
            <Tabs defaultValue="3months">
              <TabsList className="h-7">
                <TabsTrigger value="3months" className="text-xs px-2">Last 3 months</TabsTrigger>
                <TabsTrigger value="30days" className="text-xs px-2">Last 30 days</TabsTrigger>
                <TabsTrigger value="7days" className="text-xs px-2">Last 7 days</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
          
          {/* Graphique simplifié */}
          <div className="h-48 flex items-center justify-center bg-muted/20 rounded-lg">
            <div className="text-center">
              <p className="text-sm text-muted-foreground">Graphique des visiteurs</p>
              <p className="text-xs text-muted-foreground">Avr 3 - Jun 30: +100% de croissance</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Ligne des dates */}
      <div className="flex gap-2 overflow-x-auto pb-2">
        {["Apr 3", "Apr 10", "Apr 17", "Apr 24", "May 1", "May 8", "May 15", "May 23", "May 31", "Jun 7", "Jun 14", "Jun 21", "Jun 30"].map(date => (
          <span key={date} className="text-xs text-muted-foreground whitespace-nowrap">{date}</span>
        ))}
      </div>

      {/* Section Activation */}
      <Card className="border-dashed">
        <CardContent className="p-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded bg-amber-50 flex items-center justify-center">
                <svg className="w-4 h-4 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div>
                <p className="text-sm font-medium">Activer Windows</p>
                <p className="text-xs text-muted-foreground">Accédez aux paramètres pour activer</p>
              </div>
            </div>
            <div className="flex gap-2">
              <Button variant="ghost" size="sm" className="h-7 text-xs gap-1">
                <Settings className="w-3 h-3" /> Customize Columns
              </Button>
              <Button size="sm" className="h-7 text-xs gap-1 bg-[#0a7fcf] hover:bg-[#0869b0] text-white">
                <Plus className="w-3 h-3" /> Add Section
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}