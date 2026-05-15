// // // app/dashboard/abonnements/page.tsx
// // "use client"

// // import * as React from "react"
// // import { useRouter } from "next/navigation"
// // import { SidebarInset, SidebarTrigger } from "@/components/ui/sidebar"
// // import { Separator } from "@/components/ui/separator"
// // import { Button }    from "@/components/ui/button"
// // import {
// //   Loader2, AlertTriangle, Zap, Calendar,
// //   Server, CreditCard, ArrowRight, X, Check,
// //   Package, Clock, TrendingUp,
// // } from "lucide-react"
// // import { cn } from "@/lib/utils"
// // import { abonnementApi } from "@/app/features/abonnements/services/abonnementApi"
// // import type { AbonnementResponse, AbonnementStatus, BillingCycle } from "@/lib/types"

// // // ── Helpers ───────────────────────────────────────────────────────────────────

// // const STATUS_CONFIG: Record<AbonnementStatus, { label: string; dot: string; badge: string }> = {
// //   EN_ATTENTE: { label: "En attente",  dot: "bg-amber-400",   badge: "bg-amber-50 text-amber-700 border-amber-200"      },
// //   ACTIF:      { label: "Actif",       dot: "bg-emerald-500", badge: "bg-emerald-50 text-emerald-700 border-emerald-200" },
// //   SUSPENDU:   { label: "Suspendu",    dot: "bg-orange-400",  badge: "bg-orange-50 text-orange-700 border-orange-200"   },
// //   RESILIE:    { label: "Résilié",     dot: "bg-red-400",     badge: "bg-red-50 text-red-700 border-red-200"            },
// //   EXPIRE:     { label: "Expiré",      dot: "bg-slate-300",   badge: "bg-slate-50 text-slate-500 border-slate-200"      },
// // }

// // const CYCLE_LABEL: Record<BillingCycle, string> = {
// //   HORAIRE: "/ h",
// //   MENSUEL: "/ mois",
// //   ANNUEL:  "/ an",

// // }

// // function fmt(iso: string | null) {
// //   if (!iso) return "—"
// //   return new Date(iso).toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric" })
// // }

// // // ── Stat badge ────────────────────────────────────────────────────────────────

// // function StatBadge({ icon: Icon, label, value, accent = false }: {
// //   icon: React.ElementType; label: string; value: string | number; accent?: boolean
// // }) {
// //   return (
// //     <div className={cn(
// //       "flex items-center gap-3 rounded-xl border px-4 py-3 transition-colors",
// //       accent ? "bg-foreground text-background border-foreground" : "bg-card border-border hover:bg-muted/30"
// //     )}>
// //       <div className={cn(
// //         "w-8 h-8 rounded-lg flex items-center justify-center shrink-0",
// //         accent ? "bg-background/10" : "bg-muted"
// //       )}>
// //         <Icon className="w-4 h-4" />
// //       </div>
// //       <div>
// //         <p className="text-[18px] font-semibold leading-none tabular-nums">{value}</p>
// //         <p className={cn("text-[11px] mt-0.5", accent ? "opacity-60" : "text-muted-foreground")}>{label}</p>
// //       </div>
// //     </div>
// //   )
// // }

// // // ── Info row ──────────────────────────────────────────────────────────────────

// // function InfoRow({ icon, label, value }: {
// //   icon: React.ReactNode; label: string; value: React.ReactNode
// // }) {
// //   return (
// //     <div className="flex items-center justify-between gap-3">
// //       <div className="flex items-center gap-1.5 text-muted-foreground shrink-0">
// //         {icon}
// //         <span className="text-[11px]">{label}</span>
// //       </div>
// //       <span className="text-[12px] text-foreground text-right">{value}</span>
// //     </div>
// //   )
// // }

// // // ── Carte abonnement ──────────────────────────────────────────────────────────

// // function AbonnementCard({ abo, onResilier, index }: {
// //   abo: AbonnementResponse
// //   onResilier: (id: number) => Promise<void>
// //   index: number
// // }) {
// //   const router = useRouter()
// //   const [confirming, setConfirming] = React.useState(false)
// //   const [loading,    setLoading]    = React.useState(false)
// //   const cfg      = STATUS_CONFIG[abo.status]
// //   const isActive = abo.status === "ACTIF"

// //   const handleResilier = async () => {
// //     setLoading(true)
// //     try { await onResilier(abo.id) }
// //     finally { setLoading(false); setConfirming(false) }
// //   }

// //   return (
// //     <div
// //       className="group relative bg-card border border-border rounded-2xl overflow-hidden transition-all duration-200 hover:shadow-sm hover:-translate-y-px"
// //       style={{ animationDelay: `${index * 50}ms` }}
// //     >
// //       {/* Trait couleur gauche (statut) */}
// //       <div className={cn("absolute left-0 top-4 bottom-4 w-0.5 rounded-full", cfg.dot)} />

// //       {/* Header */}
// //       <div className="pl-5 pr-5 pt-5 pb-4">
// //         <div className="flex items-start justify-between gap-2">

// //           <div className="flex items-center gap-2.5 min-w-0">
  
// //             <div className="min-w-0">
      
// //               {abo.serviceName && (
// //                 <p className="text-[11px] text-muted-foreground truncate">{abo.serviceName}</p>
// //               )}
// //             </div>
// //           </div>

// //           {/* Badge statut */}
// //           <span className={cn(
// //             "shrink-0 text-[10px] font-semibold px-2 py-0.5 rounded-full border uppercase tracking-wide",
// //             cfg.badge
// //           )}>
// //             {cfg.label}
// //           </span>
// //         </div>
// //       </div>

// //       {/* Séparateur */}
// //       <div className="h-px bg-border/60 mx-5" />

// //       {/* Infos */}
// //       <div className="px-5 py-4 space-y-2.5">
  
// //         <InfoRow
// //           icon={<Calendar className="w-3.5 h-3.5" />}
// //           label="Depuis"
// //           value={fmt(abo.dateDebut)}
// //         />
// //         {abo.dateFin ? (
// //           <InfoRow
// //             icon={<Clock className="w-3.5 h-3.5" />}
// //             label="Expire le"
// //             value={fmt(abo.dateFin)}
// //           />
// //         ) : (
// //           <InfoRow
// //             icon={<Clock className="w-3.5 h-3.5" />}
// //             label="Renouvellement"
// //             value={<span className="text-emerald-600">Automatique</span>}
// //           />
// //         )}
// //         {abo.resourceName ? (
// //           <InfoRow
// //             icon={<Server className="w-3.5 h-3.5" />}
// //             label="Ressource"
// //             value={<code className="text-[11px] bg-muted px-1.5 py-0.5 rounded font-mono">{abo.resourceName}</code>}
// //           />
// //         ) : isActive ? (
// //           <InfoRow
// //             icon={<Server className="w-3.5 h-3.5 opacity-30" />}
// //             label="Ressource"
// //             value={<span className="italic text-[11px] text-muted-foreground/60">Non déployé</span>}
// //           />
// //         ) : null}
// //       </div>

// //       {/* Actions — uniquement si actif */}
// //       {isActive && (
// //         <>
// //           <div className="h-px bg-border/60 mx-5" />
// //           <div className="px-5 py-4 space-y-2">


// //             {/* Résilier */}
// //             {!confirming ? (
// //               <button
// //                 onClick={() => setConfirming(true)}
// //                 className="w-full h-8 text-[12px] text-muted-foreground hover:text-red-600 hover:bg-red-50 border border-transparent hover:border-red-200 rounded-lg transition-all flex items-center justify-center gap-1.5"
// //               >
// //                 <X className="w-3.5 h-3.5" />Résilier l'abonnement
// //               </button>
// //             ) : (
// //               <div className="space-y-2">
// //                 <p className="text-[11px] text-center text-muted-foreground">Confirmer la résiliation ?</p>
// //                 <div className="flex gap-2">
// //                   <Button variant="outline" size="sm" className="flex-1 h-8 text-[12px]"
// //                     onClick={() => setConfirming(false)} disabled={loading}>
// //                     Annuler
// //                   </Button>
// //                   <Button size="sm" className="flex-1 h-8 text-[12px] bg-red-600 hover:bg-red-700 text-white"
// //                     onClick={handleResilier} disabled={loading}>
// //                     {loading
// //                       ? <Loader2 className="w-3 h-3 animate-spin" />
// //                       : <><Check className="w-3 h-3 mr-1" />Confirmer</>
// //                     }
// //                   </Button>
// //                 </div>
// //               </div>
// //             )}
// //           </div>
// //         </>
// //       )}
// //     </div>
// //   )
// // }

// // // ── État vide ─────────────────────────────────────────────────────────────────

// // function EmptyState() {
// //   const router = useRouter()
// //   return (
// //     <div className="flex flex-col items-center justify-center py-24 gap-4 text-center">
// //       <div className="w-14 h-14 rounded-2xl bg-muted border border-border flex items-center justify-center text-2xl">
// //         📭
// //       </div>
// //       <div>
// //         <p className="text-[15px] font-semibold text-foreground">Aucun abonnement</p>
// //         <p className="text-[13px] text-muted-foreground mt-1 max-w-xs leading-relaxed">
// //           Souscrivez à un plan depuis le Marketplace pour démarrer.
// //         </p>
// //       </div>
// //       <Button className="gap-2 mt-2" onClick={() => router.push("/dashboard/services")}>
// //         Explorer les services <ArrowRight className="w-4 h-4" />
// //       </Button>
// //     </div>
// //   )
// // }

// // // ── Page ──────────────────────────────────────────────────────────────────────

// // export default function MesAbonnementsPage() {
// //   const [abonnements, setAbonnements] = React.useState<AbonnementResponse[]>([])
// //   const [loading,     setLoading]     = React.useState(true)
// //   const [error,       setError]       = React.useState<string | null>(null)
// //   const [actionError, setActionError] = React.useState<string | null>(null)

// //   React.useEffect(() => {
// //     abonnementApi.mesAbonnements()
// //       .then(data  => setAbonnements(Array.isArray(data) ? data : []))
// //       .catch(err  => setError(err?.message ?? "Erreur de chargement"))
// //       .finally(() => setLoading(false))
// //   }, [])

// //   const handleResilier = async (id: number) => {
// //     setActionError(null)
// //     try {
// //       const updated = await abonnementApi.resilier(id)
// //       setAbonnements(prev => prev.map(a => a.id === id ? updated : a))
// //     } catch (e: any) {
// //       setActionError(e.message ?? "Erreur lors de la résiliation")
// //     }
// //   }

// //   const actifs   = abonnements.filter(a => a.status === "ACTIF")
// //   const inactifs = abonnements.filter(a => a.status !== "ACTIF")

// //   return (
// //     <SidebarInset>

// //       {/* Header */}
// //       <header className="flex h-14 items-center gap-3 border-b border-border/60 px-5 bg-background/95 backdrop-blur sticky top-0 z-10">
// //         <SidebarTrigger className="-ml-1 size-8 text-muted-foreground hover:text-foreground hover:bg-muted rounded-md transition-colors" />
// //         <Separator orientation="vertical" className="h-4 opacity-40" />
// //         <CreditCard className="w-4 h-4 text-muted-foreground" />
// //         <h1 className="text-[14px] font-semibold">Mes Abonnements</h1>
// //         {!loading && abonnements.length > 0 && (
// //           <span className="ml-auto text-[11px] text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
// //             {actifs.length} actif{actifs.length !== 1 ? "s" : ""}
// //           </span>
// //         )}
// //       </header>

// //       <div className="p-6 max-w-5xl mx-auto w-full space-y-8">

// //         {/* Erreur action */}
// //         {actionError && (
// //           <div className="flex items-center gap-2 text-[12px] text-red-600 bg-red-50 border border-red-200 rounded-xl px-4 py-3">
// //             <AlertTriangle className="w-4 h-4 shrink-0" />
// //             {actionError}
// //             <button onClick={() => setActionError(null)} className="ml-auto hover:text-red-800">
// //               <X className="w-3.5 h-3.5" />
// //             </button>
// //           </div>
// //         )}

// //         {/* Loading */}
// //         {loading && (
// //           <div className="flex items-center justify-center py-24">
// //             <Loader2 className="size-5 animate-spin text-muted-foreground" />
// //           </div>
// //         )}

// //         {/* Erreur */}
// //         {error && !loading && (
// //           <div className="flex items-center gap-2 text-[13px] text-red-600 bg-red-50 border border-red-200 rounded-xl px-4 py-3">
// //             <AlertTriangle className="w-4 h-4 shrink-0" />{error}
// //           </div>
// //         )}

// //         {/* Vide */}
// //         {!loading && !error && abonnements.length === 0 && <EmptyState />}

// //         {/* Contenu */}
// //         {!loading && !error && abonnements.length > 0 && (
// //           <>
// //             {/* Stats */}
// //             <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
// //               <StatBadge icon={Package}    label="Actifs"       value={actifs.length}                   accent />
// //               <StatBadge icon={Clock}      label="Total"        value={abonnements.length}              />
// //             </div>

// //             {/* Actifs */}
// //             {actifs.length > 0 && (
// //               <section className="space-y-4">
// //                 <div className="flex items-center gap-2">
// //                   <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
// //                   <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-muted-foreground">
// //                     Actifs · {actifs.length}
// //                   </p>
// //                 </div>
// //                 <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
// //                   {actifs.map((a, i) => (
// //                     <AbonnementCard key={a.id} abo={a} onResilier={handleResilier} index={i} />
// //                   ))}
// //                 </div>
// //               </section>
// //             )}

// //             {/* Historique */}
// //             {inactifs.length > 0 && (
// //               <section className="space-y-4">
// //                 <div className="flex items-center gap-2">
// //                   <span className="w-1.5 h-1.5 rounded-full bg-slate-300 shrink-0" />
// //                   <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-muted-foreground">
// //                     Historique · {inactifs.length}
// //                   </p>
// //                 </div>
// //                 <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 opacity-50">
// //                   {inactifs.map((a, i) => (
// //                     <AbonnementCard key={a.id} abo={a} onResilier={handleResilier} index={i} />
// //                   ))}
// //                 </div>
// //               </section>
// //             )}
// //           </>
// //         )}
// //       </div>
// //     </SidebarInset>
// //   )
// // }
// "use client";

// import { useState } from "react";

// // ─── DATA ─────────────────────────────────────────────────────────────────────

// const mockAbonnementsAdmin = [
//   {
//     id: "ABN-001",
//     client: { nom: "Société Alfa Tech", email: "contact@alfatech.tn", avatar: "AT" },
//     service: "VM Cloud",
//     plan: { nom: "Pro", vCPU: 4, ram: 8, stockage: 100 },
//     prixApplique: 89.99,
//     dateDebut: "2025-01-15",
//     dateFin: null,
//     statut: "ACTIF",
//     deploiement: { statut: "EN_LIGNE", podName: "vm-alfatech-001", namespace: "nextstep-alfa" },
//     factureStatut: "PAYEE",
//   },
//   {
//     id: "ABN-002",
//     client: { nom: "InnovateTN", email: "admin@innovate.tn", avatar: "IN" },
//     service: "VM Cloud",
//     plan: { nom: "Starter", vCPU: 2, ram: 4, stockage: 50 },
//     prixApplique: 39.99,
//     dateDebut: "2025-02-01",
//     dateFin: null,
//     statut: "SUSPENDU",
//     deploiement: { statut: "ARRETE", podName: "vm-innovate-002", namespace: "nextstep-innov" },
//     factureStatut: "EN_ATTENTE",
//   },
//   {
//     id: "ABN-003",
//     client: { nom: "DataSphere SARL", email: "tech@datasphere.tn", avatar: "DS" },
//     service: "Stockage Objet",
//     plan: { nom: "Enterprise", vCPU: 8, ram: 32, stockage: 500 },
//     prixApplique: 199.99,
//     dateDebut: "2024-11-10",
//     dateFin: null,
//     statut: "ACTIF",
//     deploiement: { statut: "EN_LIGNE", podName: "store-datasphere-003", namespace: "nextstep-data" },
//     factureStatut: "PAYEE",
//   },
//   {
//     id: "ABN-004",
//     client: { nom: "StartupHub", email: "ops@startuphub.tn", avatar: "SH" },
//     service: "VM Cloud",
//     plan: { nom: "Starter", vCPU: 2, ram: 4, stockage: 50 },
//     prixApplique: 39.99,
//     dateDebut: "2024-09-01",
//     dateFin: "2025-03-01",
//     statut: "RESILIE",
//     deploiement: { statut: "SUPPRIMÉ", podName: "vm-startup-004", namespace: "nextstep-start" },
//     factureStatut: "PAYEE",
//   },
// ];

// const mockAbonnementsClient = [
//   {
//     id: "ABN-001",
//     service: "VM Cloud",
//     plan: { nom: "Pro", vCPU: 4, ram: 8, stockage: 100 },
//     prixApplique: 89.99,
//     dateDebut: "2025-01-15",
//     dateFin: null,
//     statut: "ACTIF",
//     deploiement: {
//       statut: "EN_LIGNE",
//       podName: "vm-alfatech-001",
//       namespace: "nextstep-alfa",
//       routeUrl: "https://vm-001.apps.ocp4.nextstep-it.com",
//       dateCreation: "2025-01-15T10:30:00",
//     },
//     factureStatut: "PAYEE",
//     prochainRenouvellement: "2025-06-15",
//   },
//   {
//     id: "ABN-005",
//     service: "Hébergement Web",
//     plan: { nom: "Starter", vCPU: 1, ram: 2, stockage: 20 },
//     prixApplique: 19.99,
//     dateDebut: "2025-03-01",
//     dateFin: null,
//     statut: "ACTIF",
//     deploiement: {
//       statut: "PROVISIONNEMENT",
//       podName: "web-alfatech-005",
//       namespace: "nextstep-alfa",
//       routeUrl: null,
//       dateCreation: "2025-05-05T08:00:00",
//     },
//     factureStatut: "EN_ATTENTE",
//     prochainRenouvellement: "2025-06-01",
//   },
// ];

// // ─── THEME ────────────────────────────────────────────────────────────────────

// const theme = {
//   bg: "#F7F8FC",
//   surface: "#FFFFFF",
//   surfaceHover: "#F0F2F9",
//   border: "#E4E8F2",
//   borderStrong: "#CDD3E6",
//   text: "#111827",
//   textSecondary: "#4B5563",
//   textMuted: "#9CA3AF",
//   accent: "#4F46E5",
//   accentLight: "#EEF2FF",
//   accentMid: "#C7D2FE",
//   green: "#059669",
//   greenLight: "#ECFDF5",
//   greenMid: "#A7F3D0",
//   amber: "#D97706",
//   amberLight: "#FFFBEB",
//   amberMid: "#FDE68A",
//   red: "#DC2626",
//   redLight: "#FEF2F2",
//   redMid: "#FECACA",
//   blue: "#2563EB",
//   blueLight: "#EFF6FF",
//   blueMid: "#BFDBFE",
// };

// // ─── STATUS CONFIG ─────────────────────────────────────────────────────────────

// const statutConfig = {
//   ACTIF:           { bg: theme.greenLight, text: theme.green, border: theme.greenMid, dot: theme.green, label: "Actif" },
//   SUSPENDU:        { bg: theme.amberLight, text: theme.amber, border: theme.amberMid, dot: theme.amber, label: "Suspendu" },
//   RESILIE:         { bg: theme.redLight,   text: theme.red,   border: theme.redMid,   dot: theme.red,   label: "Résilié" },
//   EN_LIGNE:        { bg: theme.greenLight, text: theme.green, border: theme.greenMid, dot: theme.green, label: "En ligne" },
//   ARRETE:          { bg: theme.amberLight, text: theme.amber, border: theme.amberMid, dot: theme.amber, label: "Arrêté" },
//   SUPPRIME:        { bg: theme.redLight,   text: theme.red,   border: theme.redMid,   dot: theme.red,   label: "Supprimé" },
//   PROVISIONNEMENT: { bg: theme.blueLight,  text: theme.blue,  border: theme.blueMid,  dot: theme.blue,  label: "Provisionnement" },
//   EN_ATTENTE:      { bg: theme.amberLight, text: theme.amber, border: theme.amberMid, dot: theme.amber, label: "En attente" },
//   PAYEE:           { bg: theme.greenLight, text: theme.green, border: theme.greenMid, dot: theme.green, label: "Payée" },
// };

// // ─── COMPONENTS ───────────────────────────────────────────────────────────────

// function Badge({ statut }) {
//   const cfg = statutConfig[statut] || { bg: "#F3F4F6", text: "#6B7280", border: "#E5E7EB", dot: "#9CA3AF", label: statut };
//   return (
//     <span style={{
//       display: "inline-flex", alignItems: "center", gap: 5,
//       background: cfg.bg, color: cfg.text,
//       padding: "3px 9px", borderRadius: 20,
//       fontSize: 11, fontWeight: 600, letterSpacing: "0.02em",
//       border: `1px solid ${cfg.border}`,
//       whiteSpace: "nowrap",
//     }}>
//       <span style={{
//         width: 5, height: 5, borderRadius: "50%",
//         background: cfg.dot, flexShrink: 0,
//       }} />
//       {cfg.label}
//     </span>
//   );
// }

// function ResourcePill({ icon, value, unit, label }) {
//   return (
//     <div style={{
//       display: "flex", flexDirection: "column", alignItems: "center",
//       background: theme.bg, border: `1px solid ${theme.border}`,
//       borderRadius: 10, padding: "10px 14px", minWidth: 64,
//     }}>
//       <span style={{ fontSize: 16, marginBottom: 4 }}>{icon}</span>
//       <span style={{ color: theme.text, fontSize: 15, fontWeight: 700, lineHeight: 1 }}>{value}</span>
//       <span style={{ color: theme.textMuted, fontSize: 9, marginTop: 1 }}>{unit}</span>
//       <span style={{ color: theme.textMuted, fontSize: 9 }}>{label}</span>
//     </div>
//   );
// }

// function ResourceBar({ label, value, max, unit }) {
//   const pct = Math.min((value / max) * 100, 100);
//   return (
//     <div style={{ marginBottom: 5 }}>
//       <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, color: theme.textMuted, marginBottom: 3 }}>
//         <span>{label}</span>
//         <span style={{ color: theme.textSecondary, fontWeight: 600 }}>{value} {unit}</span>
//       </div>
//       <div style={{ height: 4, background: theme.border, borderRadius: 2, overflow: "hidden" }}>
//         <div style={{
//           height: "100%", width: `${pct}%`,
//           background: `linear-gradient(90deg, ${theme.accent}, #818CF8)`,
//           borderRadius: 2, transition: "width 0.5s ease",
//         }} />
//       </div>
//     </div>
//   );
// }

// function Card({ children, style = {}, onClick, selected }) {
//   return (
//     <div
//       onClick={onClick}
//       style={{
//         background: theme.surface,
//         border: `1px solid ${selected ? theme.accentMid : theme.border}`,
//         borderRadius: 14,
//         overflow: "hidden",
//         transition: "border-color 0.15s, box-shadow 0.15s",
//         boxShadow: selected
//           ? `0 0 0 3px ${theme.accentLight}, 0 2px 12px rgba(79,70,229,0.08)`
//           : "0 1px 4px rgba(0,0,0,0.04)",
//         cursor: onClick ? "pointer" : "default",
//         ...style,
//       }}
//     >
//       {children}
//     </div>
//   );
// }

// function StatCard({ label, value, sub, color = theme.accent, icon }) {
//   return (
//     <div style={{
//       background: theme.surface,
//       border: `1px solid ${theme.border}`,
//       borderRadius: 14, padding: "20px 22px",
//       boxShadow: "0 1px 4px rgba(0,0,0,0.04)",
//       position: "relative", overflow: "hidden",
//     }}>
//       <div style={{
//         position: "absolute", top: -12, right: -12,
//         width: 64, height: 64, borderRadius: "50%",
//         background: `${color}10`,
//       }} />
//       <div style={{ fontSize: 20, marginBottom: 8 }}>{icon}</div>
//       <div style={{ color: theme.textMuted, fontSize: 10, fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 6 }}>{label}</div>
//       <div style={{ color, fontSize: 28, fontWeight: 800, lineHeight: 1, marginBottom: 4 }}>{value}</div>
//       <div style={{ color: theme.textMuted, fontSize: 11 }}>{sub}</div>
//     </div>
//   );
// }

// // ─── ADMIN VIEW ───────────────────────────────────────────────────────────────

// function AdminView() {
//   const [filtre, setFiltre] = useState("TOUS");
//   const [search, setSearch] = useState("");
//   const [selected, setSelected] = useState(null);

//   const filtres = ["TOUS", "ACTIF", "SUSPENDU", "RESILIE"];
//   const filtered = mockAbonnementsAdmin.filter(a =>
//     (filtre === "TOUS" || a.statut === filtre) &&
//     (a.client.nom.toLowerCase().includes(search.toLowerCase()) ||
//      a.id.toLowerCase().includes(search.toLowerCase()))
//   );

//   const totalMRR = mockAbonnementsAdmin
//     .filter(a => a.statut === "ACTIF")
//     .reduce((s, a) => s + a.prixApplique, 0);

//   return (
//     <div style={{ padding: "36px 32px", maxWidth: 1200, margin: "0 auto" }}>

//       {/* Header */}
//       <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 32 }}>
//         <div>
//           <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
//             <span style={{
//               background: theme.accentLight, color: theme.accent,
//               fontSize: 10, fontWeight: 700, letterSpacing: "0.1em",
//               padding: "3px 10px", borderRadius: 20, border: `1px solid ${theme.accentMid}`,
//               textTransform: "uppercase",
//             }}>Administration</span>
//           </div>
//           <h1 style={{ color: theme.text, margin: 0, fontSize: 26, fontWeight: 800, letterSpacing: "-0.02em" }}>
//             Gestion des Abonnements
//           </h1>
//           <p style={{ color: theme.textMuted, fontSize: 13, margin: "6px 0 0" }}>
//             Vue complète de tous les abonnements clients et leur état de déploiement.
//           </p>
//         </div>
//         <button style={{
//           display: "flex", alignItems: "center", gap: 6,
//           background: theme.accent, color: "#fff",
//           border: "none", borderRadius: 10, padding: "10px 18px",
//           fontSize: 13, fontWeight: 600, cursor: "pointer",
//           boxShadow: `0 4px 14px ${theme.accent}40`,
//         }}>
//           <span>＋</span> Nouvel abonnement
//         </button>
//       </div>

//       {/* Stats */}
//       <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 14, marginBottom: 28 }}>
//         <StatCard
//           label="Total abonnements"
//           value={mockAbonnementsAdmin.length}
//           sub="tous statuts confondus"
//           color={theme.accent}
//           icon="📋"
//         />
//         <StatCard
//           label="Actifs"
//           value={mockAbonnementsAdmin.filter(a => a.statut === "ACTIF").length}
//           sub="services en production"
//           color={theme.green}
//           icon="✅"
//         />
//         <StatCard
//           label="Suspendus"
//           value={mockAbonnementsAdmin.filter(a => a.statut === "SUSPENDU").length}
//           sub="en attente de règlement"
//           color={theme.amber}
//           icon="⏸"
//         />
//         <StatCard
//           label="MRR"
//           value={`${totalMRR.toFixed(0)} DT`}
//           sub="revenus mensuels récurrents"
//           color={theme.blue}
//           icon="💰"
//         />
//       </div>

//       {/* Filters */}
//       <div style={{ display: "flex", gap: 12, marginBottom: 20, alignItems: "center" }}>
//         <div style={{
//           display: "flex", gap: 3, background: theme.bg,
//           border: `1px solid ${theme.border}`, borderRadius: 10, padding: 3,
//         }}>
//           {filtres.map(f => (
//             <button key={f} onClick={() => setFiltre(f)} style={{
//               padding: "6px 16px", borderRadius: 7, border: "none", cursor: "pointer",
//               background: filtre === f ? theme.accent : "transparent",
//               color: filtre === f ? "#fff" : theme.textSecondary,
//               fontSize: 12, fontWeight: 600,
//               transition: "all 0.15s",
//             }}>{f.charAt(0) + f.slice(1).toLowerCase()}</button>
//           ))}
//         </div>
//         <div style={{ position: "relative", flex: 1 }}>
//           <span style={{
//             position: "absolute", left: 13, top: "50%", transform: "translateY(-50%)",
//             color: theme.textMuted, fontSize: 14, pointerEvents: "none",
//           }}>🔍</span>
//           <input
//             value={search}
//             onChange={e => setSearch(e.target.value)}
//             placeholder="Rechercher par client ou ID..."
//             style={{
//               width: "100%", boxSizing: "border-box",
//               background: theme.surface, border: `1px solid ${theme.border}`,
//               borderRadius: 10, padding: "10px 16px 10px 38px",
//               color: theme.text, fontSize: 13, outline: "none",
//               transition: "border-color 0.15s",
//             }}
//             onFocus={e => e.target.style.borderColor = theme.accent}
//             onBlur={e => e.target.style.borderColor = theme.border}
//           />
//         </div>
//       </div>

//       {/* Table */}
//       <Card style={{ marginBottom: 16 }}>
//         <table style={{ width: "100%", borderCollapse: "collapse" }}>
//           <thead>
//             <tr style={{ borderBottom: `1px solid ${theme.border}`, background: theme.bg }}>
//               {["ID", "Client", "Service · Plan", "Ressources", "Prix / mois", "Déploiement", "Statut", "Facture", "Actions"].map(h => (
//                 <th key={h} style={{
//                   padding: "12px 16px", textAlign: "left",
//                   fontSize: 10, color: theme.textMuted,
//                   fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase",
//                 }}>{h}</th>
//               ))}
//             </tr>
//           </thead>
//           <tbody>
//             {filtered.map((abn, i) => (
//               <tr
//                 key={abn.id}
//                 onClick={() => setSelected(selected?.id === abn.id ? null : abn)}
//                 style={{
//                   borderBottom: `1px solid ${theme.border}`,
//                   background: selected?.id === abn.id ? theme.accentLight : i % 2 === 0 ? theme.surface : theme.bg,
//                   cursor: "pointer", transition: "background 0.12s",
//                 }}
//                 onMouseEnter={e => { if (selected?.id !== abn.id) e.currentTarget.style.background = theme.surfaceHover; }}
//                 onMouseLeave={e => { e.currentTarget.style.background = selected?.id === abn.id ? theme.accentLight : i % 2 === 0 ? theme.surface : theme.bg; }}
//               >
//                 <td style={{ padding: "14px 16px" }}>
//                   <span style={{
//                     color: theme.accent, fontSize: 11, fontWeight: 700,
//                     fontFamily: "monospace", letterSpacing: "0.02em",
//                   }}>{abn.id}</span>
//                 </td>
//                 <td style={{ padding: "14px 16px" }}>
//                   <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
//                     <div style={{
//                       width: 32, height: 32, borderRadius: 8,
//                       background: `linear-gradient(135deg, ${theme.accent}, #818CF8)`,
//                       display: "flex", alignItems: "center", justifyContent: "center",
//                       fontSize: 10, fontWeight: 800, color: "#fff", flexShrink: 0,
//                     }}>{abn.client.avatar}</div>
//                     <div>
//                       <div style={{ color: theme.text, fontSize: 12, fontWeight: 600 }}>{abn.client.nom}</div>
//                       <div style={{ color: theme.textMuted, fontSize: 10 }}>{abn.client.email}</div>
//                     </div>
//                   </div>
//                 </td>
//                 <td style={{ padding: "14px 16px" }}>
//                   <div style={{ color: theme.text, fontSize: 12, fontWeight: 600 }}>{abn.service}</div>
//                   <span style={{
//                     display: "inline-block", marginTop: 3,
//                     background: theme.accentLight, color: theme.accent,
//                     fontSize: 10, fontWeight: 700, padding: "1px 8px",
//                     borderRadius: 20, border: `1px solid ${theme.accentMid}`,
//                   }}>Plan {abn.plan.nom}</span>
//                 </td>
//                 <td style={{ padding: "14px 16px", minWidth: 130 }}>
//                   <ResourceBar label="vCPU" value={abn.plan.vCPU} max={8} unit="cores" />
//                   <ResourceBar label="RAM" value={abn.plan.ram} max={32} unit="GB" />
//                   <ResourceBar label="SSD" value={abn.plan.stockage} max={500} unit="GB" />
//                 </td>
//                 <td style={{ padding: "14px 16px" }}>
//                   <span style={{ color: theme.green, fontSize: 14, fontWeight: 800 }}>{abn.prixApplique}</span>
//                   <span style={{ color: theme.textMuted, fontSize: 10 }}> DT</span>
//                 </td>
//                 <td style={{ padding: "14px 16px" }}>
//                   <Badge statut={abn.deploiement.statut} />
//                   <div style={{ color: theme.textMuted, fontSize: 9, marginTop: 4, fontFamily: "monospace" }}>{abn.deploiement.podName}</div>
//                 </td>
//                 <td style={{ padding: "14px 16px" }}><Badge statut={abn.statut} /></td>
//                 <td style={{ padding: "14px 16px" }}><Badge statut={abn.factureStatut} /></td>
//                 <td style={{ padding: "14px 16px" }}>
//                   <div style={{ display: "flex", gap: 6 }}>
//                     {abn.statut === "ACTIF" && (
//                       <button
//                         onClick={e => e.stopPropagation()}
//                         style={{
//                           background: theme.amberLight, color: theme.amber,
//                           border: `1px solid ${theme.amberMid}`,
//                           borderRadius: 7, padding: "5px 10px",
//                           fontSize: 10, fontWeight: 600, cursor: "pointer",
//                         }}>Suspendre</button>
//                     )}
//                     {abn.statut === "SUSPENDU" && (
//                       <button
//                         onClick={e => e.stopPropagation()}
//                         style={{
//                           background: theme.greenLight, color: theme.green,
//                           border: `1px solid ${theme.greenMid}`,
//                           borderRadius: 7, padding: "5px 10px",
//                           fontSize: 10, fontWeight: 600, cursor: "pointer",
//                         }}>Réactiver</button>
//                     )}
//                     <button
//                       onClick={e => e.stopPropagation()}
//                       style={{
//                         background: theme.blueLight, color: theme.blue,
//                         border: `1px solid ${theme.blueMid}`,
//                         borderRadius: 7, padding: "5px 10px",
//                         fontSize: 10, fontWeight: 600, cursor: "pointer",
//                       }}>Facture</button>
//                   </div>
//                 </td>
//               </tr>
//             ))}
//           </tbody>
//         </table>
//         {filtered.length === 0 && (
//           <div style={{ padding: "48px", textAlign: "center", color: theme.textMuted }}>
//             <div style={{ fontSize: 32, marginBottom: 12 }}>🔍</div>
//             <div style={{ fontWeight: 600 }}>Aucun résultat trouvé</div>
//             <div style={{ fontSize: 12, marginTop: 4 }}>Essayez un autre filtre ou mot-clé.</div>
//           </div>
//         )}
//       </Card>

//       {/* Detail Panel */}
//       {selected && (
//         <Card selected style={{ animation: "fadeSlide 0.2s ease" }}>
//           <div style={{ padding: "20px 24px", borderBottom: `1px solid ${theme.border}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
//             <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
//               <div style={{
//                 width: 36, height: 36, borderRadius: 9,
//                 background: `linear-gradient(135deg, ${theme.accent}, #818CF8)`,
//                 display: "flex", alignItems: "center", justifyContent: "center",
//                 color: "#fff", fontSize: 12, fontWeight: 800,
//               }}>{selected.client.avatar}</div>
//               <div>
//                 <div style={{ color: theme.text, fontWeight: 700, fontSize: 14 }}>Détails — {selected.id}</div>
//                 <div style={{ color: theme.textMuted, fontSize: 11 }}>{selected.client.nom} · {selected.client.email}</div>
//               </div>
//             </div>
//             <button
//               onClick={() => setSelected(null)}
//               style={{
//                 background: theme.bg, border: `1px solid ${theme.border}`,
//                 borderRadius: 8, width: 32, height: 32,
//                 cursor: "pointer", color: theme.textMuted, fontSize: 16,
//                 display: "flex", alignItems: "center", justifyContent: "center",
//               }}>✕</button>
//           </div>
//           <div style={{ padding: 24, display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 16 }}>
//             <div style={{ background: theme.bg, borderRadius: 12, padding: 16, border: `1px solid ${theme.border}` }}>
//               <div style={{ color: theme.textMuted, fontSize: 10, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 12 }}>Ressources</div>
//               <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
//                 <ResourcePill icon="⚡" value={selected.plan.vCPU} unit="cores" label="vCPU" />
//                 <ResourcePill icon="💾" value={selected.plan.ram} unit="GB" label="RAM" />
//                 <ResourcePill icon="💿" value={selected.plan.stockage} unit="GB" label="SSD" />
//               </div>
//             </div>
//             <div style={{ background: theme.bg, borderRadius: 12, padding: 16, border: `1px solid ${theme.border}` }}>
//               <div style={{ color: theme.textMuted, fontSize: 10, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 12 }}>Déploiement OpenShift</div>
//               <div style={{ marginBottom: 8 }}><Badge statut={selected.deploiement.statut} /></div>
//               <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
//                 <div style={{ display: "flex", justifyContent: "space-between" }}>
//                   <span style={{ color: theme.textMuted, fontSize: 10 }}>Pod</span>
//                   <span style={{ color: theme.text, fontSize: 10, fontFamily: "monospace", fontWeight: 600 }}>{selected.deploiement.podName}</span>
//                 </div>
//                 <div style={{ display: "flex", justifyContent: "space-between" }}>
//                   <span style={{ color: theme.textMuted, fontSize: 10 }}>Namespace</span>
//                   <span style={{ color: theme.text, fontSize: 10, fontFamily: "monospace", fontWeight: 600 }}>{selected.deploiement.namespace}</span>
//                 </div>
//               </div>
//             </div>
//             <div style={{ background: theme.bg, borderRadius: 12, padding: 16, border: `1px solid ${theme.border}` }}>
//               <div style={{ color: theme.textMuted, fontSize: 10, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 12 }}>Période & Facturation</div>
//               <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
//                 <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
//                   <span style={{ color: theme.textMuted, fontSize: 11 }}>Début</span>
//                   <span style={{ color: theme.text, fontSize: 11, fontWeight: 600 }}>{selected.dateDebut}</span>
//                 </div>
//                 <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
//                   <span style={{ color: theme.textMuted, fontSize: 11 }}>Fin</span>
//                   <span style={{ color: theme.text, fontSize: 11, fontWeight: 600 }}>{selected.dateFin || "En cours"}</span>
//                 </div>
//                 <div style={{ marginTop: 6 }}><Badge statut={selected.factureStatut} /></div>
//               </div>
//             </div>
//           </div>
//           <div style={{ padding: "0 24px 20px", display: "flex", gap: 8, justifyContent: "flex-end" }}>
//             <button style={{
//               background: theme.blueLight, color: theme.blue,
//               border: `1px solid ${theme.blueMid}`,
//               borderRadius: 9, padding: "9px 18px",
//               fontSize: 12, fontWeight: 600, cursor: "pointer",
//             }}>📄 Voir la facture</button>
//             {selected.statut === "ACTIF" && (
//               <button style={{
//                 background: theme.redLight, color: theme.red,
//                 border: `1px solid ${theme.redMid}`,
//                 borderRadius: 9, padding: "9px 18px",
//                 fontSize: 12, fontWeight: 600, cursor: "pointer",
//               }}>Résilier l'abonnement</button>
//             )}
//           </div>
//         </Card>
//       )}
//     </div>
//   );
// }

// // ─── CLIENT VIEW ──────────────────────────────────────────────────────────────

// function ClientView() {
//   const [expanded, setExpanded] = useState("ABN-001");

//   const totalMensuel = mockAbonnementsClient
//     .filter(a => a.statut === "ACTIF")
//     .reduce((s, a) => s + a.prixApplique, 0);

//   return (
//     <div style={{ padding: "36px 32px", maxWidth: 860, margin: "0 auto" }}>

//       {/* Header */}
//       <div style={{ marginBottom: 32 }}>
//         <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
//           <span style={{
//             background: theme.greenLight, color: theme.green,
//             fontSize: 10, fontWeight: 700, letterSpacing: "0.1em",
//             padding: "3px 10px", borderRadius: 20, border: `1px solid ${theme.greenMid}`,
//             textTransform: "uppercase",
//           }}>Espace Client</span>
//         </div>
//         <h1 style={{ color: theme.text, margin: 0, fontSize: 26, fontWeight: 800, letterSpacing: "-0.02em" }}>
//           Mes Abonnements
//         </h1>
//         <p style={{ color: theme.textMuted, fontSize: 13, margin: "6px 0 0" }}>
//           Gérez vos services cloud et suivez l'état de vos déploiements.
//         </p>
//       </div>

//       {/* Summary Cards */}
//       <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 14, marginBottom: 28 }}>
//         <StatCard label="Abonnements actifs" value={mockAbonnementsClient.filter(a => a.statut === "ACTIF").length} sub="services en cours" color={theme.green} icon="✅" />
//         <StatCard label="Coût mensuel" value={`${totalMensuel.toFixed(2)} DT`} sub="TTC / mois" color={theme.accent} icon="💳" />
//         <StatCard label="Prochain renouvellement" value="15 Juin" sub="dans 40 jours" color={theme.blue} icon="🗓" />
//       </div>

//       {/* Subscription Cards */}
//       <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
//         {mockAbonnementsClient.map(abn => (
//           <Card key={abn.id} selected={expanded === abn.id} onClick={() => setExpanded(expanded === abn.id ? null : abn.id)}>
//             {/* Card Header */}
//             <div style={{ padding: "20px 24px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
//               <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
//                 {/* Icon */}
//                 <div style={{
//                   width: 46, height: 46, borderRadius: 12, flexShrink: 0,
//                   background: abn.service === "VM Cloud"
//                     ? `linear-gradient(135deg, ${theme.accentLight}, ${theme.accentMid})`
//                     : `linear-gradient(135deg, ${theme.blueLight}, ${theme.blueMid})`,
//                   border: `1px solid ${abn.service === "VM Cloud" ? theme.accentMid : theme.blueMid}`,
//                   display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22,
//                 }}>
//                   {abn.service === "VM Cloud" ? "🖥" : "🌐"}
//                 </div>
//                 <div>
//                   <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
//                     <span style={{ color: theme.text, fontSize: 14, fontWeight: 700 }}>{abn.service}</span>
//                     <span style={{
//                       background: theme.accentLight, color: theme.accent,
//                       fontSize: 10, fontWeight: 700, padding: "2px 9px",
//                       borderRadius: 20, border: `1px solid ${theme.accentMid}`,
//                     }}>Plan {abn.plan.nom}</span>
//                   </div>
//                   <div style={{ color: theme.textMuted, fontSize: 11 }}>
//                     {abn.id} · Depuis le {abn.dateDebut}
//                   </div>
//                 </div>
//               </div>
//               <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
//                 <Badge statut={abn.statut} />
//                 <div style={{ textAlign: "right" }}>
//                   <div style={{ color: theme.green, fontSize: 17, fontWeight: 800 }}>{abn.prixApplique} DT</div>
//                   <div style={{ color: theme.textMuted, fontSize: 10 }}>/ mois</div>
//                 </div>
//                 <span style={{
//                   color: theme.textMuted, fontSize: 13,
//                   transform: expanded === abn.id ? "rotate(180deg)" : "rotate(0deg)",
//                   transition: "transform 0.2s",
//                   display: "inline-block",
//                 }}>▾</span>
//               </div>
//             </div>

//             {/* Expanded Detail */}
//             {expanded === abn.id && (
//               <div style={{ borderTop: `1px solid ${theme.border}`, padding: "20px 24px 24px" }}>
//                 <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>

//                   {/* Ressources */}
//                   <div style={{ background: theme.bg, borderRadius: 12, padding: 18, border: `1px solid ${theme.border}` }}>
//                     <div style={{ color: theme.textMuted, fontSize: 10, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 14 }}>Ressources incluses</div>
//                     <div style={{ display: "flex", gap: 10, marginBottom: 16, flexWrap: "wrap" }}>
//                       <ResourcePill icon="⚡" value={abn.plan.vCPU} unit="cores" label="vCPU" />
//                       <ResourcePill icon="💾" value={abn.plan.ram} unit="GB" label="RAM" />
//                       <ResourcePill icon="💿" value={abn.plan.stockage} unit="GB" label="SSD" />
//                     </div>
//                     <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", background: theme.surface, borderRadius: 10, padding: "10px 14px", border: `1px solid ${theme.border}` }}>
//                       <span style={{ color: theme.textMuted, fontSize: 11 }}>Prochain renouvellement</span>
//                       <span style={{ color: theme.text, fontSize: 11, fontWeight: 700 }}>{abn.prochainRenouvellement}</span>
//                     </div>
//                   </div>

//                   {/* Déploiement */}
//                   <div style={{ background: theme.bg, borderRadius: 12, padding: 18, border: `1px solid ${theme.border}` }}>
//                     <div style={{ color: theme.textMuted, fontSize: 10, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 14 }}>Déploiement</div>
//                     <div style={{ marginBottom: 12 }}><Badge statut={abn.deploiement.statut} /></div>
//                     <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
//                       <div style={{ display: "flex", justifyContent: "space-between" }}>
//                         <span style={{ color: theme.textMuted, fontSize: 11 }}>Pod</span>
//                         <span style={{ color: theme.text, fontSize: 11, fontFamily: "monospace", fontWeight: 600 }}>{abn.deploiement.podName}</span>
//                       </div>
//                       <div style={{ display: "flex", justifyContent: "space-between" }}>
//                         <span style={{ color: theme.textMuted, fontSize: 11 }}>Namespace</span>
//                         <span style={{ color: theme.text, fontSize: 11, fontFamily: "monospace", fontWeight: 600 }}>{abn.deploiement.namespace}</span>
//                       </div>
//                     </div>
//                     {abn.deploiement.routeUrl && (
//                       <a href={abn.deploiement.routeUrl} style={{
//                         display: "block", marginTop: 12, color: theme.blue, fontSize: 10,
//                         textDecoration: "none", background: theme.blueLight,
//                         padding: "8px 12px", borderRadius: 8, fontFamily: "monospace",
//                         border: `1px solid ${theme.blueMid}`, wordBreak: "break-all",
//                       }}>🔗 {abn.deploiement.routeUrl}</a>
//                     )}
//                     {abn.deploiement.statut === "PROVISIONNEMENT" && (
//                       <div style={{
//                         marginTop: 12, background: theme.blueLight,
//                         borderRadius: 9, padding: "12px 14px",
//                         border: `1px solid ${theme.blueMid}`,
//                         display: "flex", alignItems: "center", gap: 10,
//                       }}>
//                         <div style={{
//                           width: 14, height: 14, borderRadius: "50%",
//                           border: `2px solid ${theme.blue}`,
//                           borderTopColor: "transparent",
//                           animation: "spin 1s linear infinite", flexShrink: 0,
//                         }} />
//                         <span style={{ color: theme.blue, fontSize: 12, fontWeight: 500 }}>Déploiement en cours, veuillez patienter…</span>
//                       </div>
//                     )}
//                   </div>
//                 </div>

//                 {/* Billing Row */}
//                 <div style={{
//                   display: "flex", justifyContent: "space-between", alignItems: "center",
//                   marginTop: 16, background: theme.bg, borderRadius: 10,
//                   padding: "14px 18px", border: `1px solid ${theme.border}`,
//                 }}>
//                   <div style={{ display: "flex", gap: 28 }}>
//                     <div>
//                       <div style={{ color: theme.textMuted, fontSize: 10, marginBottom: 4 }}>Statut facture</div>
//                       <Badge statut={abn.factureStatut} />
//                     </div>
//                     <div>
//                       <div style={{ color: theme.textMuted, fontSize: 10, marginBottom: 4 }}>Créé le</div>
//                       <span style={{ color: theme.text, fontSize: 11, fontWeight: 600 }}>
//                         {new Date(abn.deploiement.dateCreation).toLocaleDateString("fr-FR")}
//                       </span>
//                     </div>
//                   </div>
//                   <div style={{ display: "flex", gap: 8 }}>
//                     <button style={{
//                       background: theme.blueLight, color: theme.blue,
//                       border: `1px solid ${theme.blueMid}`,
//                       borderRadius: 9, padding: "9px 16px",
//                       fontSize: 12, fontWeight: 600, cursor: "pointer",
//                     }}>📄 Voir la facture</button>
//                     {abn.statut === "ACTIF" && (
//                       <button style={{
//                         background: theme.redLight, color: theme.red,
//                         border: `1px solid ${theme.redMid}`,
//                         borderRadius: 9, padding: "9px 16px",
//                         fontSize: 12, fontWeight: 600, cursor: "pointer",
//                       }}>Résilier</button>
//                     )}
//                   </div>
//                 </div>
//               </div>
//             )}
//           </Card>
//         ))}
//       </div>
//     </div>
//   );
// }

// // ─── PAGE ─────────────────────────────────────────────────────────────────────

// export default function AbonnementsPage() {
//   // In real usage, replace this with: const { data: session } = useSession()
//   // and derive role from session.user.role
//   const [role, setRole] = useState("admin"); // "admin" | "client"

//   return (
//     <div style={{
//       fontFamily: "'Geist', 'DM Sans', system-ui, sans-serif",
//       background: theme.bg, minHeight: "100vh",
//     }}>

//       {/* Role Switcher — remove in production, use session.user.role instead */}
//       <div style={{
//         position: "fixed", top: 16, right: 16, zIndex: 100,
//         background: theme.surface, border: `1px solid ${theme.border}`,
//         borderRadius: 12, padding: 4, display: "flex", gap: 4,
//         boxShadow: "0 4px 20px rgba(0,0,0,0.08)",
//       }}>
//         <button onClick={() => setRole("admin")} style={{
//           padding: "7px 18px", borderRadius: 8, border: "none", cursor: "pointer",
//           background: role === "admin" ? theme.accent : "transparent",
//           color: role === "admin" ? "#fff" : theme.textSecondary,
//           fontSize: 12, fontWeight: 600, transition: "all 0.15s",
//           display: "flex", alignItems: "center", gap: 5,
//         }}>👑 Admin</button>
//         <button onClick={() => setRole("client")} style={{
//           padding: "7px 18px", borderRadius: 8, border: "none", cursor: "pointer",
//           background: role === "client" ? theme.green : "transparent",
//           color: role === "client" ? "#fff" : theme.textSecondary,
//           fontSize: 12, fontWeight: 600, transition: "all 0.15s",
//           display: "flex", alignItems: "center", gap: 5,
//         }}>👤 Client</button>
//       </div>

//       {role === "admin" ? <AdminView /> : <ClientView />}

//       <style>{`
//         @keyframes spin {
//           from { transform: rotate(0deg); }
//           to   { transform: rotate(360deg); }
//         }
//         @keyframes fadeSlide {
//           from { opacity: 0; transform: translateY(-6px); }
//           to   { opacity: 1; transform: translateY(0); }
//         }
//         * { box-sizing: border-box; }
//         input::placeholder { color: #9CA3AF; }
//         button:hover { opacity: 0.88; }
//         a:hover { opacity: 0.8; }
//       `}</style>
//     </div>
//   );
// }
// app/dashboard/abonnements/page.tsx
"use client"

import * as React from "react"
import { SidebarInset, SidebarTrigger } from "@/components/ui/sidebar"
import { Separator } from "@/components/ui/separator"
import { Button } from "@/components/ui/button"
import { Loader2, AlertTriangle, Calendar, Server } from "lucide-react"
import { cn } from "@/lib/utils"
import { abonnementApi } from "@/app/features/abonnements/services/abonnementApi"
import type { AbonnementResponse, BillingCycle, AbonnementStatus } from "@/lib/types"

// ── Helpers ───────────────────────────────────────────────────────────────────

const STATUS_LABEL: Record<AbonnementStatus, string> = {
  EN_ATTENTE: "En attente",
  ACTIF: "Actif",
  SUSPENDU: "Suspendu",
  RESILIE: "Résilié",
  EXPIRE: "Expiré",
}

const STATUS_CLASS: Record<AbonnementStatus, string> = {
  EN_ATTENTE: "bg-yellow-50  text-yellow-700  border-yellow-200",
  ACTIF: "bg-emerald-50 text-emerald-700 border-emerald-200",
  SUSPENDU: "bg-orange-50  text-orange-700  border-orange-200",
  RESILIE: "bg-red-50     text-red-700     border-red-200",
  EXPIRE: "bg-gray-50    text-gray-500    border-gray-200",
}

function fmt(iso: string | null): string {
  if (!iso) return "—"
  return new Date(iso).toLocaleDateString("fr-FR", {
    day: "2-digit", month: "short", year: "numeric",
  })
}

// ── AbonnementCard ────────────────────────────────────────────────────────────

function AbonnementCard({
  abo,
  onResilier,
}: {
  abo: AbonnementResponse
  onResilier: (id: number) => Promise<void>
}) {
  const [confirming, setConfirming] = React.useState(false)
  const [loading, setLoading] = React.useState(false)

  const handleResilier = async () => {
    setLoading(true)
    try { await onResilier(abo.id) }
    finally { setLoading(false); setConfirming(false) }
  }

  return (
    <div className="border border-border rounded-2xl overflow-hidden bg-card shrink-0 w-72 snap-start">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-border bg-muted/20">
        <div>
          <p className="text-[14px] font-semibold text-foreground leading-tight">{abo.planName}</p>
          {abo.serviceName && (
            <p className="text-[12px] text-muted-foreground">{abo.serviceName}</p>
          )}
        </div>
        <span className={cn(
          "text-[11px] font-medium px-2.5 py-0.5 rounded-full border",
          STATUS_CLASS[abo.status],
        )}>
          {STATUS_LABEL[abo.status]}
        </span>
      </div>

      {/* Body */}
      <div className="px-5 py-4 space-y-2">
        {[
          {
            icon: <Calendar className="w-3.5 h-3.5 text-muted-foreground" />,
            label: "Début",
            value: fmt(abo.dateDebut),
          },
          {
            icon: <Calendar className="w-3.5 h-3.5 text-muted-foreground" />,
            label: "Fin prévue",
            value: abo.dateFin ? fmt(abo.dateFin) : "Reconductible",
          },
          ...(abo.resourceName ? [{
            icon: <Server className="w-3.5 h-3.5 text-muted-foreground" />,
            label: "Ressource",
            value: <span className="font-mono text-[12px]">{abo.resourceName}</span>,
          }] : []),
          ...(abo.dateResiliation ? [{
            icon: <Calendar className="w-3.5 h-3.5 text-muted-foreground" />,
            label: "Résilié le",
            value: fmt(abo.dateResiliation),
          }] : []),
        ].map((row, i) => (
          <div key={i} className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-1.5">
              {row.icon}
              <span className="text-[12px] text-muted-foreground">{row.label}</span>
            </div>
            <span className="text-[12px] font-medium text-foreground text-right">{row.value}</span>
          </div>
        ))}
      </div>

      {/* Footer */}
      {abo.status === "ACTIF" && (
        <div className="px-5 pb-4 flex flex-col gap-2">
          {!confirming ? (
            <Button
              variant="outline" size="sm"
              className="w-full h-8 text-[12px] text-red-600 border-red-200 hover:bg-red-50"
              onClick={() => setConfirming(true)}
            >
              Résilier l'abonnement
            </Button>
          ) : (
            <div className="flex gap-2">
              <Button
                variant="outline" size="sm"
                className="flex-1 h-8 text-[12px]"
                onClick={() => setConfirming(false)}
                disabled={loading}
              >
                Annuler
              </Button>
              <Button
                size="sm"
                className="flex-1 h-8 text-[12px] bg-red-600 hover:bg-red-700 text-white"
                onClick={handleResilier}
                disabled={loading}
              >
                {loading ? <Loader2 className="w-3 h-3 animate-spin" /> : "Confirmer"}
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function MesAbonnementsPage() {
  const [abonnements, setAbonnements] = React.useState<AbonnementResponse[]>([])
  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState<string | null>(null)
  const [actionError, setActionError] = React.useState<string | null>(null)

  React.useEffect(() => {
    abonnementApi.mesAbonnements()
      .then(data => setAbonnements(Array.isArray(data) ? data : []))
      .catch(err => setError(err?.message ?? "Erreur de chargement"))
      .finally(() => setLoading(false))
  }, [])

  const handleResilier = async (id: number) => {
    try {
      setActionError(null)
      const updated = await abonnementApi.resilier(id)
      setAbonnements(prev => prev.map(a => a.id === id ? updated : a))
    } catch (e: any) {
      setActionError(e.message ?? "Erreur lors de la résiliation")
    }
  }

  const actifs = abonnements.filter(a => a.status === "ACTIF")
  const inactifs = abonnements.filter(a => a.status !== "ACTIF")

  return (
    <SidebarInset>
      <header className="flex h-14 items-center gap-3 border-b border-border/60 pl-2 pr-5 bg-background/95 backdrop-blur sticky top-0 z-10">        <SidebarTrigger className="-ml-1 size-8 text-muted-foreground hover:text-foreground hover:bg-muted rounded-md transition-colors" />
        <Separator orientation="vertical" className="h-4 opacity-40" />
        <h1 className="text-[14px] font-semibold">Mes Abonnements</h1>
        <span className="ml-auto text-[12px] text-muted-foreground">
          {actifs.length} actif{actifs.length !== 1 ? "s" : ""}
        </span>
      </header>

      <div className="p-6 max-w-4xl mx-auto w-full space-y-8">

        {loading && (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="size-5 animate-spin text-muted-foreground" />
          </div>
        )}

        {(error || actionError) && (
          <div className="flex items-center gap-2 text-[13px] text-red-600 bg-red-50 border border-red-200 rounded-xl px-4 py-3">
            <AlertTriangle className="w-4 h-4 shrink-0" />{error ?? actionError}
          </div>
        )}

        {!loading && abonnements.length === 0 && !error && (
          <div className="text-center py-20">
            <p className="text-[15px] font-medium text-foreground">Aucun abonnement</p>
            <p className="text-[13px] text-muted-foreground mt-1">
              Souscrivez à un plan depuis le Marketplace.
            </p>
            <Button
              className="mt-5 bg-[#0a7fcf] hover:bg-[#0869b0] text-white border-0"
              onClick={() => window.location.href = "/dashboard/services"}
            >
              Explorer les services →
            </Button>
          </div>
        )}

        {actifs.length > 0 && (
          <section className="space-y-3">
            <p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-muted-foreground">
              Actifs ({actifs.length})
            </p>
            <div className="flex gap-4 overflow-x-auto pb-2 snap-x snap-mandatory scroll-smooth
              [&::-webkit-scrollbar]:h-1.5
              [&::-webkit-scrollbar-track]:bg-muted/30
              [&::-webkit-scrollbar-track]:rounded-full
              [&::-webkit-scrollbar-thumb]:bg-border
              [&::-webkit-scrollbar-thumb]:rounded-full">
              {actifs.map(a => (
                <AbonnementCard key={a.id} abo={a} onResilier={handleResilier} />
              ))}
            </div>
          </section>
        )}

        {inactifs.length > 0 && (
          <section className="space-y-3">
            <p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-muted-foreground">
              Historique ({inactifs.length})
            </p>
            <div className="flex gap-4 overflow-x-auto pb-2 opacity-60 snap-x snap-mandatory scroll-smooth
              [&::-webkit-scrollbar]:h-1.5
              [&::-webkit-scrollbar-track]:bg-muted/30
              [&::-webkit-scrollbar-track]:rounded-full
              [&::-webkit-scrollbar-thumb]:bg-border
              [&::-webkit-scrollbar-thumb]:rounded-full">
              {inactifs.map(a => (
                <AbonnementCard key={a.id} abo={a} onResilier={handleResilier} />
              ))}
            </div>
          </section>
        )}
      </div>
    </SidebarInset>
  )
}