"use client"

import * as React from "react"
import { X, Loader2 } from "lucide-react"
import { Button }   from "@/components/ui/button"
import { Input }    from "@/components/ui/input"
import { Label }    from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Select, SelectContent, SelectItem,
  SelectTrigger, SelectValue,
} from "@/components/ui/select"
// ✅ Tout importé depuis @/lib/types — jamais depuis admin.api
import { adminCreateService, adminUpdateService } from "@/lib/services/admin.api"
import type {
  CloudServiceDTO,
  CloudServiceRequest,
  CloudType,
  ServiceCategory,
  ServiceStatus,
} from "@/lib/types"

interface Props {
  service?: CloudServiceDTO
  onClose:  () => void
  onSaved:  (s: CloudServiceDTO) => void
}

// ✅ CloudType.java : PRIVÉ | PUBLIC | HYBRIDE
const CLOUD_TYPES: { value: CloudType; label: string }[] = [
  { value: "PRIVÉ",   label: "Cloud Privé"   },
  { value: "PUBLIC",  label: "Cloud Public"  },
  { value: "HYBRIDE", label: "Cloud Hybride" },
]

// ✅ ServiceCategory.java
const CATEGORIES: { value: ServiceCategory; label: string }[] = [
  { value: "CALCUL",       label: "Calcul"                    },
  { value: "HEBERGEMENT",  label: "Hébergement"               },
  { value: "STOCKAGE",     label: "Stockage"                  },
  { value: "BASE_DONNEES", label: "Base de données"           },
  { value: "RESEAU",       label: "Réseau"                    },
  { value: "EMAIL",        label: "Email"                     },
  { value: "IA",           label: "Intelligence Artificielle" },
  { value: "SECURITE",     label: "Sécurité"                  },
  { value: "IAM",          label: "Gestion d'accès"           },
]

// ✅ ServiceStatus.java : ACTIF | INACTIF | MAINTENANCE
const STATUSES: { value: ServiceStatus; label: string }[] = [
  { value: "ACTIF",       label: "Actif"       },
  { value: "INACTIF",     label: "Inactif"     },
  { value: "MAINTENANCE", label: "Maintenance" },
]

export function ServiceFormModal({ service, onClose, onSaved }: Props) {
  const isEdit = Boolean(service)

  // ✅ CloudServiceRequest.java :
  //    @NotBlank name  ← (pas "title")
  //    @NotNull  cloudType, category, status
  const [form, setForm] = React.useState<CloudServiceRequest>({
    name:        service?.name        ?? "",
    description: service?.description ?? "",
    icon:        service?.icon        ?? "🖥️",
    cloudType:   service?.cloudType   ?? "PRIVÉ",
    category:    service?.category    ?? "CALCUL",
    status:      service?.status      ?? "ACTIF",   // ✅ @NotNull — obligatoire
  })
  const [loading, setLoading] = React.useState(false)
  const [error,   setError]   = React.useState<string | null>(null)

  const set = <K extends keyof CloudServiceRequest>(k: K) =>
    (v: CloudServiceRequest[K]) => setForm(p => ({ ...p, [k]: v }))

  const handleSubmit = async () => {
    // Validation frontend avant d'envoyer au backend
    if (!form.name.trim()) { setError("Le nom est obligatoire."); return }
    if (!form.status)      { setError("Le statut est obligatoire."); return }

    setLoading(true); setError(null)
    try {
      const saved = isEdit
        ? await adminUpdateService(service!.id, form)
        : await adminCreateService(form)
      onSaved(saved)
    } catch (e: any) {
      // Affiche le message Spring Boot @Valid si dispo
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
      <div className="relative z-10 bg-background border border-border rounded-2xl shadow-xl w-full max-w-md overflow-hidden">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <h2 className="text-[14px] font-semibold">
            {isEdit ? "Modifier le service" : "Nouveau service"}
          </h2>
          <button onClick={onClose} className="w-7 h-7 flex items-center justify-center rounded-lg bg-muted hover:bg-muted/80 transition-colors">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="px-6 py-5 space-y-4">

          {/* Icône + Nom */}
          <div className="grid grid-cols-[64px_1fr] gap-3">
            <div className="space-y-1.5">
              <Label className="text-[12px]">Icône</Label>
              <Input
                value={form.icon ?? ""}
                onChange={e => set("icon")(e.target.value)}
                className="h-9 text-[20px] text-center"
                maxLength={2}
              />
            </div>
            <div className="space-y-1.5">
              {/* ✅ label "Nom" (était "Titre"), champ name dans CloudServiceRequest */}
              <Label className="text-[12px]">Nom <span className="text-destructive">*</span></Label>
              <Input
                value={form.name}
                onChange={e => set("name")(e.target.value)}
                className="h-9 text-[13px]"
                placeholder="ex : Machines Virtuelles"
                autoFocus
              />
            </div>
          </div>

          {/* Description */}
          <div className="space-y-1.5">
            <Label className="text-[12px]">Description</Label>
            <Textarea
              value={form.description ?? ""}
              onChange={e => set("description")(e.target.value)}
              className="text-[13px] resize-none min-h-[68px]"
              placeholder="Description courte du service…"
            />
          </div>

          {/* Type cloud + Catégorie + Statut */}
          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1.5">
              <Label className="text-[12px]">Type cloud <span className="text-destructive">*</span></Label>
              <Select value={form.cloudType} onValueChange={v => set("cloudType")(v as CloudType)}>
                <SelectTrigger className="h-9 text-[12px]"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {CLOUD_TYPES.map(t => (
                    <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-[12px]">Catégorie <span className="text-destructive">*</span></Label>
              <Select value={form.category} onValueChange={v => set("category")(v as ServiceCategory)}>
                <SelectTrigger className="h-9 text-[12px]"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map(c => (
                    <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* ✅ Champ STATUT — manquait entièrement dans l'ancienne version */}
            <div className="space-y-1.5">
              <Label className="text-[12px]">Statut <span className="text-destructive">*</span></Label>
              <Select value={form.status} onValueChange={v => set("status")(v as ServiceStatus)}>
                <SelectTrigger className="h-9 text-[12px]"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {STATUSES.map(s => (
                    <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {error && (
            <p className="text-[12px] text-destructive bg-destructive/5 border border-destructive/20 rounded-lg px-3 py-2 leading-relaxed">
              {error}
            </p>
          )}
        </div>

        {/* Actions */}
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