"use client"

import * as React from "react"
import { X, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input }  from "@/components/ui/input"
import { Label }  from "@/components/ui/label"
import {
  Select, SelectContent, SelectItem,
  SelectTrigger, SelectValue,
} from "@/components/ui/select"
import { adminCreatePlan, adminUpdatePlan } from "@/lib/services/admin.api"
// ✅ Tout depuis @/lib/types
import type { PlanDTO, PlanRequest, PlanTier, BillingCycle } from "@/lib/types"

interface Props {
  serviceId: number
  plan?:     PlanDTO
  onClose:   () => void
  onSaved:   (p: PlanDTO) => void
}

// ✅ PlanTier.java
const PLAN_TIERS: { value: PlanTier; label: string }[] = [
  { value: "DEMARRAGE",     label: "Démarrage"     },
  { value: "AVANTAGE",      label: "Avantage"      },
  { value: "ESSENTIEL",     label: "Essentiel"     },
  { value: "CONFORT",       label: "Confort"       },
  { value: "ELITE",         label: "Élite"         },
  { value: "PROFESSIONNEL", label: "Professionnel" },
  { value: "ENTREPRISE",    label: "Entreprise"    },
]

// ✅ BillingCycle.java
const BILLING_CYCLES: { value: BillingCycle; label: string }[] = [
  { value: "HORAIRE",  label: "Horaire"  },
  { value: "MENSUEL",  label: "Mensuel"  },
  { value: "ANNUEL",   label: "Annuel"   },
]

// Badges marketing — champ optionnel String dans PlanRequest.java
const BADGES = ["", "RECOMMANDÉ", "POPULAIRE", "NOUVEAU", "SUR MESURE"]

export function PlanFormModal({ serviceId, plan, onClose, onSaved }: Props) {
  const isEdit = Boolean(plan)

  // ✅ PlanRequest.java :
  //    @NotBlank name
  //    @NotNull  tier, price, billingCycle, serviceId
  //    ❌ PAS de champ "specs"  (inexistant dans PlanRequest.java)
  //    ❌ PAS de champ "active" (géré uniquement via PATCH /plans/:id/toggle)
  const [form, setForm] = React.useState<PlanRequest>({
    name:         plan?.name         ?? "",
    description:  plan?.description  ?? "",
    tier:         plan?.tier         ?? "ESSENTIEL",
    price:        plan?.price        ?? 0,
    billingCycle: plan?.billingCycle  ?? "MENSUEL",
    serviceId,
    vcores:       plan?.vcores       ?? undefined,
    ramGb:        plan?.ramGb        ?? undefined,
    storageGb:    plan?.storageGb    ?? undefined,
    badge:        plan?.badge        ?? "",
    isPopular:    plan?.isPopular    ?? false,
  })
  const [loading, setLoading] = React.useState(false)
  const [error,   setError]   = React.useState<string | null>(null)

  const set = <K extends keyof PlanRequest>(k: K) =>
    (v: PlanRequest[K]) => setForm(p => ({ ...p, [k]: v }))

  const handleSubmit = async () => {
    if (!form.name.trim()) { setError("Le nom est obligatoire."); return }
    if (form.price < 0)    { setError("Le prix ne peut pas être négatif."); return }

    // Nettoie le badge vide avant envoi
    const payload: PlanRequest = {
      ...form,
      badge: form.badge?.trim() || undefined,
    }

    setLoading(true); setError(null)
    try {
      const saved = isEdit
        ? await adminUpdatePlan(plan!.id, payload)
        : await adminCreatePlan(payload)
      onSaved(saved)
    } catch (e: any) {
      try { setError(JSON.parse(e.message)?.message ?? e.message) }
      catch { setError(e.message ?? "Une erreur est survenue.") }
    } finally {
      setLoading(false)
    }
  }

  React.useEffect(() => {
    const h = (e: KeyboardEvent) => e.key === "Escape" && onClose()
    window.addEventListener("keydown", h)
    return () => window.removeEventListener("keydown", h)
  }, [onClose])

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/20 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-10 bg-background border border-border rounded-2xl shadow-xl w-full max-w-sm overflow-hidden">

        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <h2 className="text-[14px] font-semibold">
            {isEdit ? "Modifier le plan" : "Nouveau plan"}
          </h2>
          <button onClick={onClose} className="w-7 h-7 flex items-center justify-center rounded-lg bg-muted hover:bg-muted/80 transition-colors">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="px-6 py-5 space-y-4">

          {/* Nom */}
          <div className="space-y-1.5">
            <Label className="text-[12px]">Nom <span className="text-destructive">*</span></Label>
            <Input
              value={form.name}
              onChange={e => set("name")(e.target.value)}
              className="h-9 text-[13px]"
              placeholder="ex : vCore M"
              autoFocus
            />
          </div>

          {/* Description */}
          <div className="space-y-1.5">
            <Label className="text-[12px]">Description</Label>
            <Input
              value={form.description ?? ""}
              onChange={e => set("description")(e.target.value)}
              className="h-9 text-[13px]"
              placeholder="ex : Idéal pour les PME"
            />
          </div>

          {/* Tier + BillingCycle */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-[12px]">Niveau <span className="text-destructive">*</span></Label>
              <Select value={form.tier} onValueChange={v => set("tier")(v as PlanTier)}>
                <SelectTrigger className="h-9 text-[13px]"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {PLAN_TIERS.map(t => (
                    <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              {/* ✅ billingCycle — @NotNull dans PlanRequest.java */}
              <Label className="text-[12px]">Cycle <span className="text-destructive">*</span></Label>
              <Select value={form.billingCycle} onValueChange={v => set("billingCycle")(v as BillingCycle)}>
                <SelectTrigger className="h-9 text-[13px]"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {BILLING_CYCLES.map(c => (
                    <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Prix */}
          <div className="space-y-1.5">
            <Label className="text-[12px]">Prix <span className="text-destructive">*</span></Label>
            <div className="relative">
              <Input
                type="number" min={0} step={0.01}
                value={form.price}
                onChange={e => set("price")(Number(e.target.value))}
                className="h-9 text-[13px] pr-10"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[12px] text-muted-foreground">€</span>
            </div>
          </div>

          {/* ✅ Specs via vcores / ramGb / storageGb (pas un champ "specs" texte libre) */}
          <div className="grid grid-cols-3 gap-2">
            <div className="space-y-1.5">
              <Label className="text-[12px]">vCPU</Label>
              <Input
                type="number" min={0}
                value={form.vcores ?? ""}
                onChange={e => set("vcores")(e.target.value ? Number(e.target.value) : undefined)}
                className="h-9 text-[13px]"
                placeholder="4"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-[12px]">RAM (Go)</Label>
              <Input
                type="number" min={0}
                value={form.ramGb ?? ""}
                onChange={e => set("ramGb")(e.target.value ? Number(e.target.value) : undefined)}
                className="h-9 text-[13px]"
                placeholder="16"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-[12px]">Stockage (Go)</Label>
              <Input
                type="number" min={0}
                value={form.storageGb ?? ""}
                onChange={e => set("storageGb")(e.target.value ? Number(e.target.value) : undefined)}
                className="h-9 text-[13px]"
                placeholder="200"
              />
            </div>
          </div>

          {/* Badge */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-[12px]">Badge <span className="text-muted-foreground">(optionnel)</span></Label>
              <Select value={form.badge ?? ""} onValueChange={v => set("badge")(v)}>
                <SelectTrigger className="h-9 text-[13px]">
                  <SelectValue placeholder="Aucun" />
                </SelectTrigger>
                <SelectContent>
                  {BADGES.map(b => (
                    <SelectItem key={b} value={b}>{b || "— Aucun —"}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col justify-end space-y-1.5">
              <Label className="text-[12px]">Mise en avant</Label>
              <div className="flex items-center gap-2 h-9">
                <input
                  type="checkbox"
                  id="isPopular"
                  checked={form.isPopular ?? false}
                  onChange={e => set("isPopular")(e.target.checked)}
                  className="w-4 h-4 accent-foreground"
                />
                <label htmlFor="isPopular" className="text-[12px] text-muted-foreground cursor-pointer">
                  Populaire
                </label>
              </div>
            </div>
          </div>

          {/* Note : isActive géré via toggle uniquement */}
          <p className="text-[11px] text-muted-foreground/60 border border-border/50 rounded-lg px-3 py-2">
            ℹ️ L'activation/désactivation du plan se gère via le bouton ON/OFF dans la liste.
          </p>

          {error && (
            <p className="text-[12px] text-destructive bg-destructive/5 border border-destructive/20 rounded-lg px-3 py-2 leading-relaxed">
              {error}
            </p>
          )}
        </div>

        <div className="flex gap-2 px-6 pb-5">
          <Button variant="outline" className="flex-1 h-9 text-[12px]" onClick={onClose} disabled={loading}>
            Annuler
          </Button>
          <Button
            className="flex-1 h-9 text-[12px]"
            onClick={handleSubmit}
            disabled={loading || !form.name.trim()}
          >
            {loading
              ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
              : isEdit ? "Enregistrer" : "Créer"
            }
          </Button>
        </div>

      </div>
    </div>
  )
}