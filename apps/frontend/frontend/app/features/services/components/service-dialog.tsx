// "use client"

// import * as React from "react"
// import {
//   IconCheck, IconX, IconPencil, IconTrash, IconPlus,
//   IconChevronRight, IconCpu, IconDatabase, IconServer,
//   IconLoader2, IconAlertCircle,
// } from "@tabler/icons-react"
// import {
//   Dialog, DialogContent, DialogTitle, DialogDescription,
//   DialogClose,
// } from "@/components/ui/dialog"
// import {
//   AlertDialog, AlertDialogAction, AlertDialogCancel,
//   AlertDialogContent, AlertDialogDescription,
//   AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
// } from "@/components/ui/alert-dialog"
// import { Button } from "@/components/ui/button"
// import { Badge } from "@/components/ui/badge"
// import { Input } from "@/components/ui/input"
// import { Label } from "@/components/ui/label"
// import { Textarea } from "@/components/ui/textarea"
// import { Switch } from "@/components/ui/switch"
// import { Separator } from "@/components/ui/separator"
// import {
//   Select, SelectContent, SelectItem,
//   SelectTrigger, SelectValue,
// } from "@/components/ui/select"
// import { cn } from "@/lib/utils"
// import { apiFetch } from "@/lib/apiClient"
// import type {
//   ServiceCategory, ServiceStatus, PlanTier, BillingCycle,
//   CloudServiceRequest, CloudServiceDTO, PlanDTO, PlanRequest,
// } from "@/lib/types"
// import { useRouter } from "next/navigation"
// import { CATEGORY_OPTIONS, TIER_OPTIONS, BILLING_OPTIONS, STATUS_OPTIONS, CYCLE_SUFFIX } from "@/lib/constants"

// const cycleLabel = CYCLE_SUFFIX

// // ─── Types locaux ─────────────────────────────────────────────────────────────

// type ServiceFormData = {
//   name: string
//   description: string
//   icon: string
//   category: ServiceCategory
//   status: ServiceStatus
// }

// type PlanFormData = {
//   name: string
//   description: string
//   tier: PlanTier
//   price: string
//   billingCycle: BillingCycle
//   vcores: string
//   ramGb: string
//   storageGb: string
// }

// const EMPTY_SERVICE: ServiceFormData = {
//   name: "",
//   description: "",
//   icon: "🖥️",
//   category: "CALCUL",
//   status: "ACTIF",
// }

// const EMPTY_PLAN: PlanFormData = {
//   name: "",
//   description: "",
//   tier: "STARTER",
//   price: "",
//   billingCycle: "MENSUEL",
//   vcores: "",
//   ramGb: "",
//   storageGb: "",
// }

// // ─── API calls ────────────────────────────────────────────────────────────────

// async function apiCreateService(data: CloudServiceRequest): Promise<CloudServiceDTO> {
//   return apiFetch<CloudServiceDTO>("/api/services", {
//     method: "POST",
//     body: JSON.stringify(data),
//   })
// }

// async function apiUpdateService(id: number, data: CloudServiceRequest): Promise<CloudServiceDTO> {
//   return apiFetch<CloudServiceDTO>(`/api/services/${id}`, {
//     method: "PUT",
//     body: JSON.stringify(data),
//   })
// }

// async function apiCreatePlan(data: PlanRequest): Promise<PlanDTO> {
//   return apiFetch<PlanDTO>("/api/plans", { method: "POST", body: JSON.stringify(data) })
// }

// async function apiUpdatePlan(id: number, data: PlanRequest): Promise<PlanDTO> {
//   return apiFetch<PlanDTO>(`/api/plans/${id}`, {
//     method: "PUT",
//     body: JSON.stringify(data),
//   })
// }

// async function apiDeletePlan(id: number): Promise<void> {
//   return apiFetch<void>(`/api/plans/${id}`, { method: "DELETE" })
// }

// async function apiTogglePlan(id: number): Promise<PlanDTO> {
//   return apiFetch<PlanDTO>(`/api/plans/${id}/toggle`, { method: "PATCH" })
// }

// async function apiGetPlansByService(serviceId: number): Promise<PlanDTO[]> {
//   return apiFetch<PlanDTO[]>(`/api/plans/service/${serviceId}`)
// }

// // ─── Props ────────────────────────────────────────────────────────────────────

// export type DialogMode = "view" | "edit" | "create"

// interface ServiceDialogProps {
//   service: CloudServiceDTO | null
//   mode?: DialogMode
//   open: boolean
//   onClose: () => void
//   isAdmin?: boolean
//   onServiceSaved?: () => void
// }

// // ══════════════════════════════════════════════════════════════════════════════
// // COMPOSANT PRINCIPAL
// // ══════════════════════════════════════════════════════════════════════════════

// export function ServiceDialog({
//   service, mode = "view", open, onClose, isAdmin = false, onServiceSaved,
// }: ServiceDialogProps) {

//   const [plans, setPlans] = React.useState<PlanDTO[]>([])
//   const [plansLoading, setPlansLoading] = React.useState(false)
//   const [plansError, setPlansError] = React.useState<string | null>(null)

//   const [planForm, setPlanForm] = React.useState<PlanFormData | null>(null)
//   const [editingPlan, setEditingPlan] = React.useState<PlanDTO | null>(null)
//   const [deleteTarget, setDeleteTarget] = React.useState<PlanDTO | null>(null)
//   const [planSaving, setPlanSaving] = React.useState(false)
//   const [planDeleting, setPlanDeleting] = React.useState(false)
//   const [planError, setPlanError] = React.useState<string | null>(null)

//   const [serviceForm, setServiceForm] = React.useState<ServiceFormData>(EMPTY_SERVICE)
//   const [serviceSaving, setServiceSaving] = React.useState(false)
//   const [serviceError, setServiceError] = React.useState<string | null>(null)

//   React.useEffect(() => {
//     if (!open) return

//     setPlanForm(null)
//     setEditingPlan(null)
//     setPlanError(null)
//     setServiceError(null)

//     if (mode === "edit" && service) {
//       setServiceForm({
//         name: service.name,
//         description: service.description ?? "",
//         icon: service.icon ?? "🖥️",
//         category: service.category,
//         status: service.status,
//       })
//     } else if (mode === "create") {
//       setServiceForm({ ...EMPTY_SERVICE })
//     }

//     if (service && mode !== "create") {
//       setPlansLoading(true)
//       setPlansError(null)
//       apiGetPlansByService(service.id)
//         .then(setPlans)
//         .catch(e => setPlansError(e.message ?? "Impossible de charger les plans."))
//         .finally(() => setPlansLoading(false))
//     } else {
//       setPlans([])
//     }
//   }, [open, mode, service])

//   // ─── Handlers plan ────────────────────────────────────────────────────────

//   function openAddPlan() {
//     setEditingPlan(null)
//     setPlanForm({ ...EMPTY_PLAN })
//     setPlanError(null)
//   }

//   function closePlanForm() {
//     setPlanForm(null)
//     setEditingPlan(null)
//     setPlanError(null)
//   }

//   function openEditPlan(plan: PlanDTO) {
//     setEditingPlan(plan)
//     setPlanForm({
//       name: plan.name,
//       description: plan.description ?? "",
//       tier: plan.tier,
//       price: plan.price.toString(),
//       billingCycle: plan.billingCycle,
//       vcores: plan.vcores?.toString() ?? "",
//       ramGb: plan.ramGb?.toString() ?? "",
//       storageGb: plan.storageGb?.toString() ?? "",
//     })
//     setPlanError(null)
//   }

//   async function submitPlan() {
//     console.log("submitPlan called", { planForm, serviceId: service?.id })
//     if (!planForm || !service?.id) {
//       console.warn("GUARD EXIT — planForm:", planForm, "service.id:", service?.id)
//       return
//     }
//     try {
//       const requestBody: PlanRequest = {
//         serviceId: service.id,
//         name: planForm.name,
//         description: planForm.description || undefined,
//         tier: planForm.tier,
//         price: parseFloat(planForm.price) || 0,
//         billingCycle: planForm.billingCycle,
//         vcores: planForm.vcores ? parseInt(planForm.vcores, 10) : undefined,
//         ramGb: planForm.ramGb ? parseInt(planForm.ramGb, 10) : undefined,
//         storageGb: planForm.storageGb ? parseInt(planForm.storageGb, 10) : undefined,
//       }
//       console.log("requestBody", requestBody)  // ← ajoute ça

//       if (editingPlan) {
//         const updated = await apiUpdatePlan(editingPlan.id, requestBody)
//         setPlans(prev => prev.map(p => p.id === updated.id ? updated : p))
//       } else {
//         const created = await apiCreatePlan(requestBody)
//         setPlans(prev => [...prev, created])
//       }
//       closePlanForm()
//       onServiceSaved?.()
//     } catch (err: any) {
//       console.error("PLAN ERROR", err)  // ← et ça
//       setPlanError(err?.message ?? "Une erreur est survenue.")
//     } finally {
//       setPlanSaving(false)
//     }
//   }

//   async function confirmDeletePlan() {
//     if (!deleteTarget) return
//     setPlanDeleting(true)
//     try {
//       await apiDeletePlan(deleteTarget.id)
//       setPlans(prev => prev.filter(p => p.id !== deleteTarget.id))
//       onServiceSaved?.()
//     } catch (err: any) {
//       setPlanError(err?.message ?? "Impossible de supprimer ce plan.")
//     } finally {
//       setPlanDeleting(false)
//       setDeleteTarget(null)
//     }
//   }

//   async function handleTogglePlan(plan: PlanDTO) {
//     try {
//       const updated = await apiTogglePlan(plan.id)
//       setPlans(prev => prev.map(p => p.id === updated.id ? updated : p))
//       onServiceSaved?.()
//     } catch (err: any) {
//       setPlanError(err?.message ?? "Impossible de modifier le plan.")
//     }
//   }

//   // ─── Handlers service ─────────────────────────────────────────────────────

//   async function submitService() {
//     if (!serviceForm.name.trim()) return
//     setServiceSaving(true)
//     setServiceError(null)
//     try {
//       const payload: CloudServiceRequest = {
//         name: serviceForm.name.trim(),
//         description: serviceForm.description || undefined,
//         icon: serviceForm.icon || "🖥️",
//         category: serviceForm.category,
//         status: serviceForm.status,
//       }

//       if (mode === "create") {
//         await apiCreateService(payload)
//       } else if (mode === "edit" && service) {
//         await apiUpdateService(service.id, payload)
//       }
//       onServiceSaved?.()
//       onClose()
//     } catch (err: any) {
//       try {
//         const parsed = JSON.parse(err.message)
//         setServiceError(parsed.message ?? err.message)
//       } catch {
//         setServiceError(err?.message ?? "Une erreur est survenue.")
//       }
//     } finally {
//       setServiceSaving(false)
//     }
//   }

//   const dialogTitle =
//     mode === "create" ? "Nouveau service" :
//       mode === "edit" ? `Modifier — ${service?.name ?? ""}` :
//         (service?.name ?? "")

//   const dialogDesc =
//     mode === "create" ? "Renseignez les informations du nouveau service cloud." :
//       (service?.description ?? "")

//   return (
//     <>
//       <Dialog open={open} onOpenChange={onClose}>
//         <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto p-0 gap-0">

//           <div className="flex items-start gap-4 p-6 pb-4 border-b border-border/60 relative">
//             <div className="flex-1 min-w-0 pr-16">  {/* ← pr-16 pour laisser de la place à la croix */}
//               <DialogTitle className="text-base font-semibold leading-tight">
//                 {dialogTitle}
//               </DialogTitle>
//               {dialogDesc && (
//                 <DialogDescription className="text-xs mt-0.5 line-clamp-2">
//                   {dialogDesc}
//                 </DialogDescription>
//               )}
//             </div>

//             {service && mode === "view" && (
//               <Badge variant="outline" className="text-[10px] h-5 px-1.5 flex-shrink-0 mt-0.5 mr-8">  {/* ← mr-8 pour éviter la croix */}
//                 {CATEGORY_OPTIONS.find(c => c.value === service.category)?.label ?? service.category}
//               </Badge>
//             )}

//             {/* Bouton de fermeture */}
//             <DialogClose className="absolute right-4 top-4 opacity-70 hover:opacity-100 transition-opacity">
//               <IconX className="size-4" />
//             </DialogClose>
//           </div>
//           {/* ── Formulaire create / edit ── */}
//           {(mode === "create" || mode === "edit") && (
//             <div className="p-6 space-y-5">
//               <ServiceForm
//                 form={serviceForm}
//                 onChange={(field, value) =>
//                   setServiceForm(prev => ({ ...prev, [field]: value }))
//                 }
//                 error={serviceError}
//               />
//               <div className="flex justify-end gap-2 border-t border-border/40 pt-4">
//                 <Button variant="outline" size="sm" className="h-8 text-xs"
//                   onClick={onClose} disabled={serviceSaving}>
//                   Annuler
//                 </Button>
//                 <Button size="sm" className="h-8 text-xs gap-1.5 bg-[#0a7fcf] hover:bg-[#0869b0] text-white"
//                   onClick={submitService}
//                   disabled={serviceSaving || !serviceForm.name.trim()}>
//                   {serviceSaving
//                     ? <IconLoader2 className="size-3.5 animate-spin" />
//                     : <IconCheck className="size-3.5" />}
//                   {mode === "create" ? "Créer le service" : "Enregistrer"}
//                 </Button>
//               </div>
//             </div>
//           )}

//           {/* ── Vue admin : plans ── */}
//           {mode === "view" && isAdmin && (
//             <AdminPlansView
//               plans={plans}
//               loading={plansLoading}
//               error={plansError ?? planError}
//               planForm={planForm}
//               editingPlan={editingPlan}
//               planSaving={planSaving}
//               onAddPlan={openAddPlan}
//               onEditPlan={openEditPlan}
//               onDeletePlan={setDeleteTarget}
//               onTogglePlan={handleTogglePlan}
//               onSubmitPlan={submitPlan}
//               onCancelPlan={closePlanForm}
//               setPlanForm={setPlanForm}
//             />
//           )}

//           {/* ── Vue client ── */}
//           {mode === "view" && !isAdmin && service && (
//             <ClientView service={service} plans={plans} loading={plansLoading} />
//           )}

//         </DialogContent>
//       </Dialog>

//       <AlertDialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
//         <AlertDialogContent>
//           <AlertDialogHeader>
//             <AlertDialogTitle>Supprimer ce plan ?</AlertDialogTitle>
//             <AlertDialogDescription>
//               Le plan <strong>{deleteTarget?.name}</strong> sera définitivement supprimé.
//             </AlertDialogDescription>
//           </AlertDialogHeader>
//           <AlertDialogFooter>
//             <AlertDialogCancel disabled={planDeleting}>Annuler</AlertDialogCancel>
//             <AlertDialogAction
//               className="bg-destructive hover:bg-destructive/90 text-destructive-foreground gap-1.5"
//               onClick={confirmDeletePlan}
//               disabled={planDeleting}
//             >
//               {planDeleting && <IconLoader2 className="size-3.5 animate-spin" />}
//               Supprimer
//             </AlertDialogAction>
//           </AlertDialogFooter>
//         </AlertDialogContent>
//       </AlertDialog>
//     </>
//   )
// }

// // ── Formulaire service ────────────────────────────────────────────────────────

// function ServiceForm({
//   form, onChange, error,
// }: {
//   form: ServiceFormData
//   onChange: (field: keyof ServiceFormData, value: string) => void
//   error: string | null
// }) {
//   return (
//     <div className="space-y-4">
//       {error && (
//         <div className="flex items-center gap-2 rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2.5 text-sm text-destructive">
//           <IconAlertCircle className="size-4 flex-shrink-0" />
//           {error}
//         </div>
//       )}

//       {/* Icône + Nom */}
//       <div className="grid grid-cols-[64px_1fr] gap-3">
//         <div className="space-y-1.5">
//           <Label className="text-xs">Icône</Label>
//           <Input
//             value={form.icon}
//             onChange={e => onChange("icon", e.target.value)}
//             className="h-9 text-xl text-center"
//             maxLength={2}
//           />
//         </div>
//         <div className="space-y-1.5">
//           <Label className="text-xs">
//             Nom <span className="text-destructive">*</span>
//           </Label>
//           <Input
//             value={form.name}
//             onChange={e => onChange("name", e.target.value)}
//             placeholder="ex: Machines Virtuelles"
//             className="h-9 text-sm"
//             autoFocus
//           />
//         </div>
//       </div>

//       {/* Description */}
//       <div className="space-y-1.5">
//         <Label className="text-xs">Description</Label>
//         <Textarea
//           value={form.description}
//           onChange={e => onChange("description", e.target.value)}
//           className="text-sm resize-none"
//           rows={3}
//           placeholder="Description courte du service…"
//         />
//       </div>

//       {/* Catégorie + Statut */}
//       <div className="grid grid-cols-2 gap-3">
//         <div className="space-y-1.5">
//           <Label className="text-xs">Catégorie <span className="text-destructive">*</span></Label>
//           <Select value={form.category} onValueChange={v => onChange("category", v as ServiceCategory)}>
//             <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
//             <SelectContent>
//               {CATEGORY_OPTIONS.map(c => (
//                 <SelectItem key={c.value} value={c.value} className="text-sm">{c.label}</SelectItem>
//               ))}
//             </SelectContent>
//           </Select>
//         </div>
//         <div className="space-y-1.5">
//           <Label className="text-xs">Statut <span className="text-destructive">*</span></Label>
//           <Select value={form.status} onValueChange={v => onChange("status", v as ServiceStatus)}>
//             <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
//             <SelectContent>
//               {STATUS_OPTIONS.map(s => (
//                 <SelectItem key={s.value} value={s.value} className="text-sm">{s.label}</SelectItem>
//               ))}
//             </SelectContent>
//           </Select>
//         </div>
//       </div>
//     </div>
//   )
// }

// // ── Admin plans view ──────────────────────────────────────────────────────────

// interface AdminPlansViewProps {
//   plans: PlanDTO[]
//   loading: boolean
//   error: string | null
//   planForm: PlanFormData | null
//   editingPlan: PlanDTO | null
//   planSaving: boolean
//   onAddPlan: () => void
//   onEditPlan: (p: PlanDTO) => void
//   onDeletePlan: (p: PlanDTO) => void
//   onTogglePlan: (p: PlanDTO) => void
//   onSubmitPlan: () => void
//   onCancelPlan: () => void
//   setPlanForm: React.Dispatch<React.SetStateAction<PlanFormData | null>>
// }

// function AdminPlansView({
//   plans, loading, error, planForm, editingPlan, planSaving,
//   onAddPlan, onEditPlan, onDeletePlan, onTogglePlan,
//   onSubmitPlan, onCancelPlan, setPlanForm,
// }: AdminPlansViewProps) {
//   return (
//     <div className="p-6 pt-4 space-y-3">
//       {error && !planForm && (
//         <div className="flex items-center gap-2 rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2.5 text-sm text-destructive">
//           <IconAlertCircle className="size-4 flex-shrink-0" />{error}
//         </div>
//       )}

//       {planForm ? (
//         <PlanForm
//           form={planForm}
//           isEditing={!!editingPlan}
//           saving={planSaving}
//           error={error}
//           onChange={(field, value) =>
//             setPlanForm(prev => prev ? { ...prev, [field]: value } : prev)
//           }
//           onSubmit={onSubmitPlan}
//           onCancel={onCancelPlan}
//         />
//       ) : (
//         <>
//           <div className="flex items-center justify-between">
//             <p className="text-xs font-medium text-muted-foreground">
//               {loading ? "Chargement…" : `${plans.length} plan(s) configuré(s)`}
//             </p>
//             <Button
//               size="sm"
//               className="h-7 text-xs gap-1.5 bg-[#0a7fcf] hover:bg-[#0869b0] text-white"
//               onClick={onAddPlan}
//             >
//               <IconPlus className="size-3.5" /> Ajouter un plan
//             </Button>
//           </div>

//           {loading ? (
//             <div className="space-y-2">
//               {[1, 2, 3].map(i => (
//                 <div key={i} className="h-14 rounded-lg border border-border/60 bg-muted/20 animate-pulse" />
//               ))}
//             </div>
//           ) : plans.length === 0 ? (
//             <div className="rounded-lg border border-dashed border-border/60 py-10 text-center">
//               <p className="text-sm text-muted-foreground">Aucun plan pour ce service.</p>
//               <Button variant="link" size="sm" className="mt-1 text-xs" onClick={onAddPlan}>
//                 Créer le premier plan →
//               </Button>
//             </div>
//           ) : (
//             <div className="space-y-2">
//               {plans.map(plan => (
//                 <PlanRow
//                   key={plan.id}
//                   plan={plan}
//                   onEdit={() => onEditPlan(plan)}
//                   onDelete={() => onDeletePlan(plan)}
//                   onToggle={() => onTogglePlan(plan)}
//                 />
//               ))}
//             </div>
//           )}
//         </>
//       )}
//     </div>
//   )
// }

// function PlanRow({ plan, onEdit, onDelete, onToggle }: {
//   plan: PlanDTO; onEdit: () => void; onDelete: () => void; onToggle: () => void
// }) {
//   const tierLabel = TIER_OPTIONS.find(t => t.value === plan.tier)?.label ?? plan.tier
//   const cycle = cycleLabel[plan.billingCycle] ?? ""
//   const priceStr = plan.price === 0 ? "Gratuit" : `${plan.price.toFixed(2)} TND${cycle}`
//   const specs = [
//     plan.vcores ? `${plan.vcores} vCPU` : "",
//     plan.ramGb ? `${plan.ramGb} Go RAM` : "",
//     plan.storageGb ? `${plan.storageGb} Go` : "",
//   ].filter(Boolean)
//   const specsDisplay = specs.length > 0 ? specs.join(" · ") : ""

//   return (
//     <div className="group flex items-center gap-3 rounded-lg border border-border/60 bg-muted/20 px-3 py-2.5 transition-colors hover:bg-muted/40">
//       <div className="flex flex-col items-start gap-0.5 flex-shrink-0">
//         <Badge variant="outline" className="text-[10px] h-5 px-1.5 font-medium">{tierLabel}</Badge>
//         {!plan.isActive && <span className="text-[9px] text-muted-foreground">inactif</span>}
//       </div>
//       <div className="flex-1 min-w-0">
//         <p className="text-sm font-medium leading-tight">{plan.name}</p>
//         {specsDisplay && <p className="text-[11px] text-muted-foreground truncate">{specsDisplay}</p>}
//       </div>
//       <span className="text-sm font-mono font-semibold tabular-nums text-right flex-shrink-0">
//         {priceStr}
//       </span>
//       <Switch
//         checked={plan.isActive ?? false}
//         onCheckedChange={onToggle}
//         className="flex-shrink-0 data-[state=checked]:bg-[#0a7fcf] data-[state=checked]:border-[#0a7fcf]"
//       />
//       <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
//         <Button size="icon" variant="ghost"
//           className="size-7 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted"
//           onClick={onEdit}>
//           <IconPencil className="size-3.5" />
//         </Button>
//         <Button size="icon" variant="ghost"
//           className="size-7 rounded-md text-muted-foreground hover:text-destructive hover:bg-destructive/10"
//           onClick={onDelete}>
//           <IconTrash className="size-3.5" />
//         </Button>

//       </div>
//     </div>
//   )
// }

// function PlanForm({ form, isEditing, saving, error, onChange, onSubmit, onCancel }: {
//   form: PlanFormData
//   isEditing: boolean
//   saving: boolean
//   error: string | null
//   onChange: (field: keyof PlanFormData, value: string) => void
//   onSubmit: () => void
//   onCancel: () => void
// }) {
//   return (
//     <div className="rounded-lg border border-border/60 bg-muted/10 p-4 space-y-4">
//       <div className="flex items-center justify-between">
//         <p className="text-sm font-semibold">{isEditing ? "Modifier le plan" : "Nouveau plan"}</p>
//         <Button variant="ghost" size="icon" className="size-6 text-muted-foreground"
//           onClick={onCancel} disabled={saving}>
//           <IconX className="size-3.5" />
//         </Button>
//       </div>
//       <Separator />

//       {error && (
//         <div className="flex items-center gap-2 rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
//           <IconAlertCircle className="size-4 flex-shrink-0" />{error}
//         </div>
//       )}

//       <div className="grid grid-cols-2 gap-3">
//         <div className="space-y-1.5">
//           <Label className="text-xs">Nom <span className="text-destructive">*</span></Label>
//           <Input value={form.name} onChange={e => onChange("name", e.target.value)}
//             placeholder="Essentiel M" className="h-8 text-sm" autoFocus />
//         </div>
//         <div className="space-y-1.5">
//           <Label className="text-xs">Tier <span className="text-destructive">*</span></Label>
//           <Select value={form.tier} onValueChange={v => onChange("tier", v)}>
//             <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
//             <SelectContent>
//               {TIER_OPTIONS.map(t => (
//                 <SelectItem key={t.value} value={t.value} className="text-sm">{t.label}</SelectItem>
//               ))}
//             </SelectContent>
//           </Select>
//         </div>
//       </div>

//       <div className="grid grid-cols-2 gap-3">
//         <div className="space-y-1.5">
//           <Label className="text-xs">Prix (TND) <span className="text-destructive">*</span></Label>
//           <Input type="number" step="0.01" min="0" value={form.price}
//             onChange={e => onChange("price", e.target.value)}
//             placeholder="49.99" className="h-8 text-sm font-mono" />
//         </div>
//         <div className="space-y-1.5">
//           <Label className="text-xs">Facturation <span className="text-destructive">*</span></Label>
//           <Select value={form.billingCycle} onValueChange={v => onChange("billingCycle", v)}>
//             <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
//             <SelectContent>
//               {BILLING_OPTIONS.map(b => (
//                 <SelectItem key={b.value} value={b.value} className="text-sm">{b.label}</SelectItem>
//               ))}
//             </SelectContent>
//           </Select>
//         </div>
//       </div>

//       <div>
//         <p className="text-xs font-medium text-muted-foreground mb-2">Spécifications</p>
//         <div className="grid grid-cols-3 gap-3">
//           {[
//             { field: "vcores", label: "vCPU", icon: <IconCpu className="size-3" />, ph: "4" },
//             { field: "ramGb", label: "RAM (Go)", icon: <IconServer className="size-3" />, ph: "8" },
//             { field: "storageGb", label: "SSD (Go)", icon: <IconDatabase className="size-3" />, ph: "100" },
//           ].map(({ field, label, icon, ph }) => (
//             <div key={field} className="space-y-1.5">
//               <Label className="text-xs flex items-center gap-1 text-muted-foreground">
//                 {icon} {label}
//               </Label>
//               <Input type="number" min="0"
//                 value={(form as any)[field]}
//                 onChange={e => onChange(field as keyof PlanFormData, e.target.value)}
//                 placeholder={ph} className="h-8 text-sm" />
//             </div>
//           ))}
//         </div>
//       </div>

//       <div className="space-y-1.5">
//         <Label className="text-xs">Description</Label>
//         <Textarea value={form.description} onChange={e => onChange("description", e.target.value)}
//           placeholder="Idéal pour les projets en production…"
//           className="text-sm resize-none" rows={2} />
//       </div>

//       <div className="flex justify-end gap-2 pt-1">
//         <Button variant="outline" size="sm" className="h-8 text-xs"
//           onClick={onCancel} disabled={saving}>Annuler</Button>
//         <Button
//           size="sm"
//           className="h-8 text-xs gap-1.5 bg-[#0a7fcf] hover:bg-[#0869b0] text-white"
//           onClick={onSubmit}
//           disabled={saving || !form.name.trim() || !form.price.trim()}
//         >
//           {saving && <IconLoader2 className="size-3.5 animate-spin" />}
//           {isEditing ? "Enregistrer" : "Créer le plan"}
//         </Button>
//       </div>
//     </div>
//   )
// }

// // ── Vue client ────────────────────────────────────────────────────────────────

// function ClientView({ service, plans, loading }: {
//   service: CloudServiceDTO; plans: PlanDTO[]; loading: boolean
// }) {
//   const router = useRouter()
//   const [selected, setSelected] = React.useState<number | null>(null)
//   const activePlans = plans.filter(p => p.isActive)

//   const handleDeploy = () => {
//     if (!selected) return
//     const existing = (() => {
//       try { return JSON.parse(sessionStorage.getItem("deploy_draft") ?? "{}") }
//       catch { return {} }
//     })()
//     sessionStorage.setItem("deploy_draft", JSON.stringify({
//       ...existing,
//       serviceId: service.id,
//       planId: selected,
//       category:  service.category,  // ← indispensable pour le routage VM/stockage

//     }))
//     router.push("/dashboard/services/deploy/configuration")
//   }

//   return (
//     <div className="p-6 space-y-4">
//       <p className="text-xs text-muted-foreground leading-relaxed bg-muted/30 rounded-lg px-3 py-2.5 border border-border/40">
//         Vous payez uniquement ce que vous consommez. Aucun engagement, résiliation immédiate.
//       </p>

//       {loading ? (
//         <div className="space-y-2">
//           {[1, 2, 3].map(i => (
//             <div key={i} className="h-16 rounded-lg border border-border/60 bg-muted/20 animate-pulse" />
//           ))}
//         </div>
//       ) : activePlans.length === 0 ? (
//         <p className="py-8 text-center text-sm text-muted-foreground">
//           Aucune offre disponible pour ce service.
//         </p>
//       ) : (
//         <div className="space-y-2">
//           {activePlans.map(plan => {
//             const isSelected = selected === plan.id
//             const cycle = cycleLabel[plan.billingCycle] ?? ""
//             const priceStr = plan.price === 0 ? "Gratuit" : `${plan.price.toFixed(2)} TND${cycle}`
//             const tierLabel = TIER_OPTIONS.find(t => t.value === plan.tier)?.label ?? plan.tier
//             const specs = [
//               plan.vcores ? `${plan.vcores} vCPU` : "",
//               plan.ramGb ? `${plan.ramGb} Go RAM` : "",
//               plan.storageGb ? `${plan.storageGb} Go` : "",
//             ].filter(Boolean)
//             const specsDisplay = specs.length > 0 ? specs.join(" · ") : ""

//             return (
//               <div key={plan.id}
//                 className={cn(
//                   "rounded-lg border px-4 py-3 cursor-pointer transition-all select-none",
//                   isSelected
//                     ? "border-[#0a7fcf]/40 bg-[#0a7fcf]/5"
//                     : "border-border/60 hover:bg-muted/10")}
//                 onClick={() => setSelected(plan.id)}
//               >
//                 <div className="flex items-center gap-3">
//                   <div className={cn(
//                     "size-4 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-all",
//                     isSelected
//                       ? "border-[#0a7fcf] bg-[#0a7fcf]"
//                       : "border-border")}>
//                     {isSelected && <div className="size-1.5 rounded-full bg-white" />}
//                   </div>
//                   <div className="flex-1 min-w-0">
//                     <div className="flex items-center gap-2 flex-wrap">
//                       <p className="text-sm font-medium">{plan.name}</p>
//                       <Badge variant="outline" className="text-[10px] h-4 px-1.5">{tierLabel}</Badge>
//                     </div>
//                     {specsDisplay && (
//                       <p className="text-[11px] text-muted-foreground mt-0.5 truncate">{specsDisplay}</p>
//                     )}
//                   </div>
//                   <p className="font-mono text-sm font-semibold tabular-nums flex-shrink-0">{priceStr}</p>
//                   <IconChevronRight className={cn(
//                     "size-4 flex-shrink-0",
//                     isSelected ? "text-primary" : "text-muted-foreground/40"
//                   )} />
//                 </div>
//                 {isSelected && plan.description && (
//                   <div className="mt-3 ml-7 pt-3 border-t border-border/40">
//                     <p className="text-xs text-muted-foreground">{plan.description}</p>
//                   </div>
//                 )}
//               </div>
//             )
//           })}
//         </div>
//       )}

//       <div className="flex justify-end pt-1 ">
//         <Button
//           size="sm"
//           className="h-8 text-xs gap-1.5 bg-[#0a7fcf] hover:bg-[#0869b0] text-white"
//           disabled={!selected}
//           onClick={handleDeploy}
//         >
//           Déployer{selected ? ` ${activePlans.find(p => p.id === selected)?.name}` : " un plan"}
//         </Button>
//       </div>
//     </div>
//   )
// }
"use client"

import * as React from "react"
import {
  IconCheck, IconX, IconPencil, IconTrash, IconPlus,
  IconChevronRight, IconCpu, IconDatabase, IconServer,
  IconLoader2, IconAlertCircle,
} from "@tabler/icons-react"
import {
  Dialog, DialogContent, DialogTitle, DialogDescription,
  DialogClose,
} from "@/components/ui/dialog"
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import { Separator } from "@/components/ui/separator"
import {
  Select, SelectContent, SelectItem,
  SelectTrigger, SelectValue,
} from "@/components/ui/select"
import { cn } from "@/lib/utils"
import { apiFetch } from "@/lib/apiClient"
import type {
  ServiceCategory, ServiceStatus, PlanTier, BillingCycle,
  CloudServiceRequest, CloudServiceDTO, PlanDTO, PlanRequest,
} from "@/lib/types"
import { useRouter } from "next/navigation"
import {
  TIER_OPTIONS, BILLING_OPTIONS, STATUS_OPTIONS, CYCLE_SUFFIX,
} from "@/lib/constants"
import { isStorageCategory } from "@/lib/types"
const cycleLabel = CYCLE_SUFFIX

// ─── CATEGORY_OPTIONS local — complet avec les nouveaux types stockage ────────

const CATEGORY_OPTIONS: { value: ServiceCategory; label: string }[] = [
  { value: "CALCUL", label: "Calcul" },
  { value: "HEBERGEMENT", label: "Hébergement" },
  { value: "STOCKAGE", label: "Stockage" },
  { value: "BASE_DONNEES", label: "Base de données" },
  { value: "RESEAU", label: "Réseau" },
  { value: "EMAIL", label: "Email" },
  { value: "IA", label: "Intelligence Artificielle" },
  { value: "SECURITE", label: "Sécurité" },
  { value: "IAM", label: "Gestion d'accès" },
  { value: "OBJECT_STORAGE", label: "Object Storage" },
  { value: "BLOCK_STORAGE", label: "Block Storage" },
  { value: "FILE_STORAGE", label: "File Storage" },
]

// ─── Types locaux ─────────────────────────────────────────────────────────────

type ServiceFormData = {
  name: string
  description: string
  icon: string
  category: ServiceCategory
  status: ServiceStatus
}

type PlanFormData = {
  name: string
  description: string
  tier: PlanTier
  price: string
  billingCycle: BillingCycle
  vcores: string
  ramGb: string
  storageGb: string
}

const EMPTY_SERVICE: ServiceFormData = {
  name: "",
  description: "",
  icon: "🖥️",
  category: "CALCUL",
  status: "ACTIF",
}

const EMPTY_PLAN: PlanFormData = {
  name: "",
  description: "",
  tier: "STARTER",
  price: "",
  billingCycle: "MENSUEL",
  vcores: "",
  ramGb: "",
  storageGb: "",
}

// ─── API calls ────────────────────────────────────────────────────────────────

async function apiCreateService(data: CloudServiceRequest): Promise<CloudServiceDTO> {
  return apiFetch<CloudServiceDTO>("/api/services", {
    method: "POST",
    body: JSON.stringify(data),
  })
}

async function apiUpdateService(id: number, data: CloudServiceRequest): Promise<CloudServiceDTO> {
  return apiFetch<CloudServiceDTO>(`/api/services/${id}`, {
    method: "PUT",
    body: JSON.stringify(data),
  })
}

async function apiCreatePlan(data: PlanRequest): Promise<PlanDTO> {
  return apiFetch<PlanDTO>("/api/plans", { method: "POST", body: JSON.stringify(data) })
}

async function apiUpdatePlan(id: number, data: PlanRequest): Promise<PlanDTO> {
  return apiFetch<PlanDTO>(`/api/plans/${id}`, {
    method: "PUT",
    body: JSON.stringify(data),
  })
}

async function apiDeletePlan(id: number): Promise<void> {
  return apiFetch<void>(`/api/plans/${id}`, { method: "DELETE" })
}

async function apiTogglePlan(id: number): Promise<PlanDTO> {
  return apiFetch<PlanDTO>(`/api/plans/${id}/toggle`, { method: "PATCH" })
}

async function apiGetPlansByService(serviceId: number): Promise<PlanDTO[]> {
  return apiFetch<PlanDTO[]>(`/api/plans/service/${serviceId}`)
}

// ─── Props ────────────────────────────────────────────────────────────────────

export type DialogMode = "view" | "edit" | "create"

interface ServiceDialogProps {
  service: CloudServiceDTO | null
  mode?: DialogMode
  open: boolean
  onClose: () => void
  isAdmin?: boolean
  onServiceSaved?: () => void
}

// ══════════════════════════════════════════════════════════════════════════════
// COMPOSANT PRINCIPAL
// ══════════════════════════════════════════════════════════════════════════════

export function ServiceDialog({
  service, mode = "view", open, onClose, isAdmin = false, onServiceSaved,
}: ServiceDialogProps) {

  const [plans, setPlans] = React.useState<PlanDTO[]>([])
  const [plansLoading, setPlansLoading] = React.useState(false)
  const [plansError, setPlansError] = React.useState<string | null>(null)

  const [planForm, setPlanForm] = React.useState<PlanFormData | null>(null)
  const [editingPlan, setEditingPlan] = React.useState<PlanDTO | null>(null)
  const [deleteTarget, setDeleteTarget] = React.useState<PlanDTO | null>(null)
  const [planSaving, setPlanSaving] = React.useState(false)
  const [planDeleting, setPlanDeleting] = React.useState(false)
  const [planError, setPlanError] = React.useState<string | null>(null)

  const [serviceForm, setServiceForm] = React.useState<ServiceFormData>(EMPTY_SERVICE)
  const [serviceSaving, setServiceSaving] = React.useState(false)
  const [serviceError, setServiceError] = React.useState<string | null>(null)

  React.useEffect(() => {
    if (!open) return

    setPlanForm(null)
    setEditingPlan(null)
    setPlanError(null)
    setServiceError(null)

    if (mode === "edit" && service) {
      setServiceForm({
        name: service.name,
        description: service.description ?? "",
        icon: service.icon ?? "🖥️",
        category: service.category,
        status: service.status,
      })
    } else if (mode === "create") {
      setServiceForm({ ...EMPTY_SERVICE })
    }

    if (service && mode !== "create") {
      setPlansLoading(true)
      setPlansError(null)
      apiGetPlansByService(service.id)
        .then(setPlans)
        .catch(e => setPlansError(e.message ?? "Impossible de charger les plans."))
        .finally(() => setPlansLoading(false))
    } else {
      setPlans([])
    }
  }, [open, mode, service])

  // ─── Handlers plan ────────────────────────────────────────────────────────

  function openAddPlan() {
    setEditingPlan(null)
    setPlanForm({ ...EMPTY_PLAN })
    setPlanError(null)
  }

  function closePlanForm() {
    setPlanForm(null)
    setEditingPlan(null)
    setPlanError(null)
  }

  function openEditPlan(plan: PlanDTO) {
    setEditingPlan(plan)
    setPlanForm({
      name: plan.name,
      description: plan.description ?? "",
      tier: plan.tier,
      price: plan.price.toString(),
      billingCycle: plan.billingCycle,
      vcores: plan.vcores?.toString() ?? "",
      ramGb: plan.ramGb?.toString() ?? "",
      storageGb: plan.storageGb?.toString() ?? "",
    })
    setPlanError(null)
  }

  async function submitPlan() {
    if (!planForm || !service?.id) return
    setPlanSaving(true)
    try {
      const requestBody: PlanRequest = {
        serviceId: service.id,
        name: planForm.name,
        description: planForm.description || undefined,
        tier: planForm.tier,
        price: parseFloat(planForm.price) || 0,
        billingCycle: planForm.billingCycle,
        vcores: planForm.vcores ? parseInt(planForm.vcores, 10) : undefined,
        ramGb: planForm.ramGb ? parseInt(planForm.ramGb, 10) : undefined,
        storageGb: planForm.storageGb ? parseInt(planForm.storageGb, 10) : undefined,
      }

      if (editingPlan) {
        const updated = await apiUpdatePlan(editingPlan.id, requestBody)
        setPlans(prev => prev.map(p => p.id === updated.id ? updated : p))
      } else {
        const created = await apiCreatePlan(requestBody)
        setPlans(prev => [...prev, created])
      }
      closePlanForm()
      onServiceSaved?.()
    } catch (err: any) {
      setPlanError(err?.message ?? "Une erreur est survenue.")
    } finally {
      setPlanSaving(false)
    }
  }

  async function confirmDeletePlan() {
    if (!deleteTarget) return
    setPlanDeleting(true)
    try {
      await apiDeletePlan(deleteTarget.id)
      setPlans(prev => prev.filter(p => p.id !== deleteTarget.id))
      onServiceSaved?.()
    } catch (err: any) {
      setPlanError(err?.message ?? "Impossible de supprimer ce plan.")
    } finally {
      setPlanDeleting(false)
      setDeleteTarget(null)
    }
  }

  async function handleTogglePlan(plan: PlanDTO) {
    try {
      const updated = await apiTogglePlan(plan.id)
      setPlans(prev => prev.map(p => p.id === updated.id ? updated : p))
      onServiceSaved?.()
    } catch (err: any) {
      setPlanError(err?.message ?? "Impossible de modifier le plan.")
    }
  }

  // ─── Handlers service ─────────────────────────────────────────────────────

  async function submitService() {
    if (!serviceForm.name.trim()) return
    setServiceSaving(true)
    setServiceError(null)
    try {
      const payload: CloudServiceRequest = {
        name: serviceForm.name.trim(),
        description: serviceForm.description || undefined,
        icon: serviceForm.icon || "🖥️",
        category: serviceForm.category,
        status: serviceForm.status,
      }
      if (mode === "create") {
        await apiCreateService(payload)
      } else if (mode === "edit" && service) {
        await apiUpdateService(service.id, payload)
      }
      onServiceSaved?.()
      onClose()
    } catch (err: any) {
      try {
        const parsed = JSON.parse(err.message)
        setServiceError(parsed.message ?? err.message)
      } catch {
        setServiceError(err?.message ?? "Une erreur est survenue.")
      }
    } finally {
      setServiceSaving(false)
    }
  }

  const dialogTitle =
    mode === "create" ? "Nouveau service" :
      mode === "edit" ? `Modifier — ${service?.name ?? ""}` :
        (service?.name ?? "")

  const dialogDesc =
    mode === "create" ? "Renseignez les informations du nouveau service cloud." :
      (service?.description ?? "")

  return (
    <>
      <Dialog open={open} onOpenChange={onClose}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto p-0 gap-0">

          <div className="flex items-start gap-4 p-6 pb-4 border-b border-border/60 relative">
            <div className="flex-1 min-w-0 pr-16">
              <DialogTitle className="text-base font-semibold leading-tight">
                {dialogTitle}
              </DialogTitle>
              {dialogDesc && (
                <DialogDescription className="text-xs mt-0.5 line-clamp-2">
                  {dialogDesc}
                </DialogDescription>
              )}
            </div>

            {service && mode === "view" && (
              <Badge variant="outline" className="text-[10px] h-5 px-1.5 flex-shrink-0 mt-0.5 mr-8">
                {CATEGORY_OPTIONS.find(c => c.value === service.category)?.label ?? service.category}
              </Badge>
            )}

            <DialogClose className="absolute right-4 top-4 opacity-70 hover:opacity-100 transition-opacity">
              <IconX className="size-4" />
            </DialogClose>
          </div>

          {/* ── Formulaire create / edit ── */}
          {(mode === "create" || mode === "edit") && (
            <div className="p-6 space-y-5">
              <ServiceForm
                form={serviceForm}
                onChange={(field, value) =>
                  setServiceForm(prev => ({ ...prev, [field]: value }))
                }
                error={serviceError}
              />
              <div className="flex justify-end gap-2 border-t border-border/40 pt-4">
                <Button variant="outline" size="sm" className="h-8 text-xs"
                  onClick={onClose} disabled={serviceSaving}>
                  Annuler
                </Button>
                <Button size="sm"
                  className="h-8 text-xs gap-1.5 bg-[#0a7fcf] hover:bg-[#0869b0] text-white"
                  onClick={submitService}
                  disabled={serviceSaving || !serviceForm.name.trim()}>
                  {serviceSaving
                    ? <IconLoader2 className="size-3.5 animate-spin" />
                    : <IconCheck className="size-3.5" />}
                  {mode === "create" ? "Créer le service" : "Enregistrer"}
                </Button>
              </div>
            </div>
          )}

          {/* ── Vue admin : plans ── */}
          {mode === "view" && isAdmin && (
            <AdminPlansView
              plans={plans}
              loading={plansLoading}
              error={plansError ?? planError}
              planForm={planForm}
              editingPlan={editingPlan}
              planSaving={planSaving}
              onAddPlan={openAddPlan}
              onEditPlan={openEditPlan}
              onDeletePlan={setDeleteTarget}
              onTogglePlan={handleTogglePlan}
              onSubmitPlan={submitPlan}
              onCancelPlan={closePlanForm}
              setPlanForm={setPlanForm}
              isStorage={isStorageCategory(service?.category)}

            />
          )}

          {/* ── Vue client ── */}
          {mode === "view" && !isAdmin && service && (
            <ClientView service={service} plans={plans} loading={plansLoading} />
          )}

        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer ce plan ?</AlertDialogTitle>
            <AlertDialogDescription>
              Le plan <strong>{deleteTarget?.name}</strong> sera définitivement supprimé.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={planDeleting}>Annuler</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive hover:bg-destructive/90 text-destructive-foreground gap-1.5"
              onClick={confirmDeletePlan}
              disabled={planDeleting}
            >
              {planDeleting && <IconLoader2 className="size-3.5 animate-spin" />}
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}

// ── ServiceForm ───────────────────────────────────────────────────────────────

function ServiceForm({
  form, onChange, error,
}: {
  form: ServiceFormData
  onChange: (field: keyof ServiceFormData, value: string) => void
  error: string | null
}) {
  return (
    <div className="space-y-4">
      {error && (
        <div className="flex items-center gap-2 rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2.5 text-sm text-destructive">
          <IconAlertCircle className="size-4 flex-shrink-0" />
          {error}
        </div>
      )}

      <div className="grid grid-cols-[64px_1fr] gap-3">
        <div className="space-y-1.5">
          <Label className="text-xs">Icône</Label>
          <Input
            value={form.icon}
            onChange={e => onChange("icon", e.target.value)}
            className="h-9 text-xl text-center"
            maxLength={2}
          />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">
            Nom <span className="text-destructive">*</span>
          </Label>
          <Input
            value={form.name}
            onChange={e => onChange("name", e.target.value)}
            placeholder="ex: Machines Virtuelles"
            className="h-9 text-sm"
            autoFocus
          />
        </div>
      </div>

      <div className="space-y-1.5">
        <Label className="text-xs">Description</Label>
        <Textarea
          value={form.description}
          onChange={e => onChange("description", e.target.value)}
          className="text-sm resize-none"
          rows={3}
          placeholder="Description courte du service…"
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label className="text-xs">Catégorie <span className="text-destructive">*</span></Label>
          <Select
            value={form.category}
            onValueChange={v => onChange("category", v as ServiceCategory)}
          >
            <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
            <SelectContent>
              {CATEGORY_OPTIONS.map(c => (
                <SelectItem key={c.value} value={c.value} className="text-sm">
                  {c.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">Statut <span className="text-destructive">*</span></Label>
          <Select
            value={form.status}
            onValueChange={v => onChange("status", v as ServiceStatus)}
          >
            <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
            <SelectContent>
              {STATUS_OPTIONS.map(s => (
                <SelectItem key={s.value} value={s.value} className="text-sm">
                  {s.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
    </div>
  )
}

// ── AdminPlansView ────────────────────────────────────────────────────────────

interface AdminPlansViewProps {
  plans: PlanDTO[]
  loading: boolean
  error: string | null
  planForm: PlanFormData | null
  editingPlan: PlanDTO | null
  planSaving: boolean
  onAddPlan: () => void
  onEditPlan: (p: PlanDTO) => void
  onDeletePlan: (p: PlanDTO) => void
  onTogglePlan: (p: PlanDTO) => void
  onSubmitPlan: () => void
  onCancelPlan: () => void
  setPlanForm: React.Dispatch<React.SetStateAction<PlanFormData | null>>
  isStorage?: boolean
}

function AdminPlansView({
  plans, loading, error, planForm, editingPlan, planSaving,
  onAddPlan, onEditPlan, onDeletePlan, onTogglePlan,
  onSubmitPlan, onCancelPlan, setPlanForm, isStorage
}: AdminPlansViewProps) {
  return (
    <div className="p-6 pt-4 space-y-3">
      {error && !planForm && (
        <div className="flex items-center gap-2 rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2.5 text-sm text-destructive">
          <IconAlertCircle className="size-4 flex-shrink-0" />{error}
        </div>
      )}

      {planForm ? (
        <PlanForm
          form={planForm}
          isEditing={!!editingPlan}
          saving={planSaving}
          error={error}
          isStorage={isStorage}   // ← ajouter

          onChange={(field, value) =>
            setPlanForm(prev => prev ? { ...prev, [field]: value } : prev)
          }
          onSubmit={onSubmitPlan}
          onCancel={onCancelPlan}
        />
      ) : (
        <>
          <div className="flex items-center justify-between">
            <p className="text-xs font-medium text-muted-foreground">
              {loading ? "Chargement…" : `${plans.length} plan(s) configuré(s)`}
            </p>
            <Button
              size="sm"
              className="h-7 text-xs gap-1.5 bg-[#0a7fcf] hover:bg-[#0869b0] text-white"
              onClick={onAddPlan}
            >
              <IconPlus className="size-3.5" /> Ajouter un plan
            </Button>
          </div>

          {loading ? (
            <div className="space-y-2">
              {[1, 2, 3].map(i => (
                <div key={i} className="h-14 rounded-lg border border-border/60 bg-muted/20 animate-pulse" />
              ))}
            </div>
          ) : plans.length === 0 ? (
            <div className="rounded-lg border border-dashed border-border/60 py-10 text-center">
              <p className="text-sm text-muted-foreground">Aucun plan pour ce service.</p>
              <Button variant="link" size="sm" className="mt-1 text-xs" onClick={onAddPlan}>
                Créer le premier plan →
              </Button>
            </div>
          ) : (
            <div className="space-y-2">
              {plans.map(plan => (
                <PlanRow
                  key={plan.id}
                  plan={plan}
                  onEdit={() => onEditPlan(plan)}
                  onDelete={() => onDeletePlan(plan)}
                  onToggle={() => onTogglePlan(plan)}
                />
              ))}
            </div>
          )}
        </>
      )}
    </div>
  )
}

// ── PlanRow ───────────────────────────────────────────────────────────────────

function PlanRow({ plan, onEdit, onDelete, onToggle }: {
  plan: PlanDTO
  onEdit: () => void
  onDelete: () => void
  onToggle: () => void
}) {
  const tierLabel = TIER_OPTIONS.find(t => t.value === plan.tier)?.label ?? plan.tier
  const cycle = cycleLabel[plan.billingCycle] ?? ""
  const priceStr = `${plan.price.toFixed(2)} TND${cycle}`
  const specs = [
    plan.vcores ? `${plan.vcores} vCPU` : "",
    plan.ramGb ? `${plan.ramGb} Go RAM` : "",
    plan.storageGb ? `${plan.storageGb} Go` : "",
  ].filter(Boolean)
  const specsDisplay = specs.join(" · ")

  return (
    <div className="group flex items-center gap-3 rounded-lg border border-border/60 bg-muted/20 px-3 py-2.5 transition-colors hover:bg-muted/40">
      <div className="flex flex-col items-start gap-0.5 flex-shrink-0">
        <Badge variant="outline" className="text-[10px] h-5 px-1.5 font-medium">{tierLabel}</Badge>
        {!plan.isActive && <span className="text-[9px] text-muted-foreground">inactif</span>}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium leading-tight">{plan.name}</p>
        {specsDisplay && (
          <p className="text-[11px] text-muted-foreground truncate">{specsDisplay}</p>
        )}
      </div>
      <span className="text-sm font-mono font-semibold tabular-nums text-right flex-shrink-0">
        {priceStr}
      </span>
      <Switch
        checked={plan.isActive ?? false}
        onCheckedChange={onToggle}
        className="flex-shrink-0 data-[state=checked]:bg-[#0a7fcf] data-[state=checked]:border-[#0a7fcf]"
      />
      <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
        <Button size="icon" variant="ghost"
          className="size-7 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted"
          onClick={onEdit}>
          <IconPencil className="size-3.5" />
        </Button>
        <Button size="icon" variant="ghost"
          className="size-7 rounded-md text-muted-foreground hover:text-destructive hover:bg-destructive/10"
          onClick={onDelete}>
          <IconTrash className="size-3.5" />
        </Button>
      </div>
    </div>
  )
}

// ── PlanForm ──────────────────────────────────────────────────────────────────

function PlanForm({ form, isEditing, saving, error, isStorage = false, onChange, onSubmit, onCancel }: {
  form: PlanFormData
  isEditing: boolean
  saving: boolean
  error: string | null
  isStorage?: boolean        // ← ajouter

  onChange: (field: keyof PlanFormData, value: string) => void
  onSubmit: () => void
  onCancel: () => void
}) {
  const specFields = [
    ...(!isStorage ? [
      { field: "vcores", label: "vCPU", icon: <IconCpu className="size-3" />, ph: "4" },
      { field: "ramGb", label: "RAM (Go)", icon: <IconServer className="size-3" />, ph: "8" },
    ] : []),
    { field: "storageGb", label: "Capacité (Go)", icon: <IconDatabase className="size-3" />, ph: "100" },
  ]

  return (
    <div className="rounded-lg border border-border/60 bg-muted/10 p-4 space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold">{isEditing ? "Modifier le plan" : "Nouveau plan"}</p>
        <Button variant="ghost" size="icon" className="size-6 text-muted-foreground"
          onClick={onCancel} disabled={saving}>
          <IconX className="size-3.5" />
        </Button>
      </div>
      <Separator />

      {error && (
        <div className="flex items-center gap-2 rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
          <IconAlertCircle className="size-4 flex-shrink-0" />{error}
        </div>
      )}

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label className="text-xs">Nom <span className="text-destructive">*</span></Label>
          <Input
            value={form.name}
            onChange={e => onChange("name", e.target.value)}
            placeholder="Essentiel M"
            className="h-8 text-sm"
            autoFocus
          />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">Tier <span className="text-destructive">*</span></Label>
          <Select value={form.tier} onValueChange={v => onChange("tier", v)}>
            <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
            <SelectContent>
              {TIER_OPTIONS.map(t => (
                <SelectItem key={t.value} value={t.value} className="text-sm">{t.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label className="text-xs">Prix (TND) <span className="text-destructive">*</span></Label>
          <Input
            type="number" step="0.01" min="0"
            value={form.price}
            onChange={e => onChange("price", e.target.value)}
            placeholder="49.99"
            className="h-8 text-sm font-mono"
          />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">Facturation <span className="text-destructive">*</span></Label>
          <Select value={form.billingCycle} onValueChange={v => onChange("billingCycle", v)}>
            <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
            <SelectContent>
              {BILLING_OPTIONS.map(b => (
                <SelectItem key={b.value} value={b.value} className="text-sm">{b.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
      <div>
        <p className="text-xs font-medium text-muted-foreground mb-2">Spécifications</p>
        <div className={`grid grid-cols-${specFields.length} gap-3`}>
          {specFields.map(({ field, label, icon, ph }) => (
            <div key={field} className="space-y-1.5">
              <Label className="text-xs flex items-center gap-1 text-muted-foreground">
                {icon} {label}
              </Label>
              <Input
                type="number" min="0"
                value={(form as any)[field]}
                onChange={e => onChange(field as keyof PlanFormData, e.target.value)}
                placeholder={ph}
                className="h-8 text-sm"
              />
            </div>
          ))}
        </div>
      </div>

      <div className="space-y-1.5">
        <Label className="text-xs">Description</Label>
        <Textarea
          value={form.description}
          onChange={e => onChange("description", e.target.value)}
          placeholder="Idéal pour les projets en production…"
          className="text-sm resize-none"
          rows={2}
        />
      </div>

      <div className="flex justify-end gap-2 pt-1">
        <Button variant="outline" size="sm" className="h-8 text-xs"
          onClick={onCancel} disabled={saving}>
          Annuler
        </Button>
        <Button
          size="sm"
          className="h-8 text-xs gap-1.5 bg-[#0a7fcf] hover:bg-[#0869b0] text-white"
          onClick={onSubmit}
          disabled={saving || !form.name.trim() || !form.price.trim()}
        >
          {saving && <IconLoader2 className="size-3.5 animate-spin" />}
          {isEditing ? "Enregistrer" : "Créer le plan"}
        </Button>
      </div>
    </div>
  )
}

// ── ClientView ────────────────────────────────────────────────────────────────

function ClientView({ service, plans, loading }: {
  service: CloudServiceDTO
  plans: PlanDTO[]
  loading: boolean
}) {
  const router = useRouter()
  const [selected, setSelected] = React.useState<number | null>(null)
  const activePlans = plans.filter(p => p.isActive)

  const handleDeploy = () => {
    if (!selected) return
    const existing = (() => {
      try { return JSON.parse(sessionStorage.getItem("deploy_draft") ?? "{}") }
      catch { return {} }
    })()
    sessionStorage.setItem("deploy_draft", JSON.stringify({
      ...existing,
      serviceId: service.id,
      planId: selected,
      category: service.category,  // ← indispensable pour le routage VM/stockage
    }))
    router.push("/dashboard/services/deploy/configuration")
  }

  return (
    <div className="p-6 space-y-4">
      <p className="text-xs text-muted-foreground leading-relaxed bg-muted/30 rounded-lg px-3 py-2.5 border border-border/40">
        Vous payez uniquement ce que vous consommez. Aucun engagement, résiliation immédiate.
      </p>

      {loading ? (
        <div className="space-y-2">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-16 rounded-lg border border-border/60 bg-muted/20 animate-pulse" />
          ))}
        </div>
      ) : activePlans.length === 0 ? (
        <p className="py-8 text-center text-sm text-muted-foreground">
          Aucune offre disponible pour ce service.
        </p>
      ) : (
        <div className="space-y-2">
          {activePlans.map(plan => {
            const isSelected = selected === plan.id
            const cycle = cycleLabel[plan.billingCycle] ?? ""
            const priceStr = `${plan.price.toFixed(2)} TND${cycle}`
            const tierLabel = TIER_OPTIONS.find(t => t.value === plan.tier)?.label ?? plan.tier
            const specs = [
              plan.vcores ? `${plan.vcores} vCPU` : "",
              plan.ramGb ? `${plan.ramGb} Go RAM` : "",
              plan.storageGb ? `${plan.storageGb} Go` : "",
            ].filter(Boolean)
            const specsDisplay = specs.join(" · ")

            return (
              <div
                key={plan.id}
                className={cn(
                  "rounded-lg border px-4 py-3 cursor-pointer transition-all select-none",
                  isSelected
                    ? "border-[#0a7fcf]/40 bg-[#0a7fcf]/5"
                    : "border-border/60 hover:bg-muted/10"
                )}
                onClick={() => setSelected(plan.id)}
              >
                <div className="flex items-center gap-3">
                  <div className={cn(
                    "size-4 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-all",
                    isSelected ? "border-[#0a7fcf] bg-[#0a7fcf]" : "border-border"
                  )}>
                    {isSelected && <div className="size-1.5 rounded-full bg-white" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-sm font-medium">{plan.name}</p>
                      <Badge variant="outline" className="text-[10px] h-4 px-1.5">{tierLabel}</Badge>
                    </div>
                    {specsDisplay && (
                      <p className="text-[11px] text-muted-foreground mt-0.5 truncate">{specsDisplay}</p>
                    )}
                  </div>
                  <p className="font-mono text-sm font-semibold tabular-nums flex-shrink-0">{priceStr}</p>
                  <IconChevronRight className={cn(
                    "size-4 flex-shrink-0",
                    isSelected ? "text-primary" : "text-muted-foreground/40"
                  )} />
                </div>
                {isSelected && plan.description && (
                  <div className="mt-3 ml-7 pt-3 border-t border-border/40">
                    <p className="text-xs text-muted-foreground">{plan.description}</p>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      <div className="flex justify-end pt-1">
        <Button
          size="sm"
          className="h-8 text-xs gap-1.5 bg-[#0a7fcf] hover:bg-[#0869b0] text-white"
          disabled={!selected}
          onClick={handleDeploy}
        >
          Déployer{selected ? ` ${activePlans.find(p => p.id === selected)?.name}` : " un plan"}
        </Button>
      </div>
    </div>
  )
}