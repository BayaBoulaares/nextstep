// features/offres/components/OffreForm.tsx
"use client"

import { useState } from "react"
import { Button }   from "@/components/ui/button"
import { Input }    from "@/components/ui/input"
import { Label }    from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Switch }   from "@/components/ui/switch"
import {
  Select, SelectContent, SelectItem,
  SelectTrigger, SelectValue,
} from "@/components/ui/select"
import type { TypeOffre, CreateOffrePayload } from "../types"

export type OffreFormValues = CreateOffrePayload

interface OffreFormProps {
  onSubmit:       (values: OffreFormValues) => Promise<void>
  onCancel:       () => void
  defaultValues?: Partial<OffreFormValues>
  submitLabel?:   string
}

const TYPE_OPTIONS: { value: TypeOffre; label: string; description: string }[] = [
  { value: "STANDARD",    label: "Standard",    description: "Offre standard classique" },
  { value: "PREMIUM",     label: "Premium",     description: "Offre premium avec services exclusifs" },
  { value: "ENTREPRISE",  label: "Entreprise",  description: "Offre sur-mesure pour les entreprises" },
]

export function OffreForm({
  onSubmit,
  onCancel,
  defaultValues,
  submitLabel = "Enregistrer",
}: OffreFormProps) {
  const today = new Date().toISOString().split("T")[0]

  const [form, setForm] = useState<OffreFormValues>({
    titre:        defaultValues?.titre        ?? "",
    description:  defaultValues?.description  ?? null,
    prix:         defaultValues?.prix         ?? 0,
    type:         defaultValues?.type         ?? "STANDARD",
    dateDebut:    defaultValues?.dateDebut    ?? today,
    dateFin:      defaultValues?.dateFin      ?? today,
    actif:        defaultValues?.actif        ?? true,
    imageUrl:     defaultValues?.imageUrl     ?? null,
    serviceIds:   defaultValues?.serviceIds   ?? [],
  })

  const [submitting, setSubmitting] = useState(false)
  const [error, setError]           = useState<string | null>(null)

  const set = <K extends keyof OffreFormValues>(key: K, val: OffreFormValues[K]) =>
    setForm((prev) => ({ ...prev, [key]: val }))

  const validate = (): string | null => {
    if (!form.titre.trim())              return "Le titre est obligatoire."
    if (form.titre.length > 200)         return "Le titre ne peut pas dépasser 200 caractères."
    if (!form.prix || form.prix <= 0)    return "Le prix doit être supérieur à 0."
    if (!form.dateDebut)                 return "La date de début est obligatoire."
    if (!form.dateFin)                   return "La date de fin est obligatoire."
    if (form.dateFin < form.dateDebut)   return "La date de fin doit être après la date de début."
    if (form.imageUrl && form.imageUrl.length > 500)
      return "L'URL de l'image ne peut pas dépasser 500 caractères."
    return null
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const validationError = validate()
    if (validationError) { setError(validationError); return }

    setSubmitting(true)
    setError(null)
    try {
      await onSubmit(form)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Une erreur est survenue.")
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-5 pt-1">

      {/* Erreur globale API */}
      {error && (
        <div role="alert" className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">
          {error}
        </div>
      )}

      {/* Titre */}
      <div className="space-y-1.5">
        <Label htmlFor="titre">Titre <span className="text-red-500">*</span></Label>
        <Input
          id="titre"
          value={form.titre}
          onChange={(e) => set("titre", e.target.value)}
          maxLength={200}
          disabled={submitting}
          placeholder="Ex : Pack Premium Été 2024"
        />
        <p className="text-xs text-muted-foreground text-right">{form.titre.length}/200</p>
      </div>

      {/* Type */}
      <div className="space-y-1.5">
        <Label>Type d'offre <span className="text-red-500">*</span></Label>
        <Select
          value={form.type}
          onValueChange={(v) => set("type", v as TypeOffre)}
          disabled={submitting}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {TYPE_OPTIONS.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                <div className="flex flex-col">
                  <span className="font-medium">{opt.label}</span>
                  <span className="text-xs text-muted-foreground">{opt.description}</span>
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Description */}
      <div className="space-y-1.5">
        <Label htmlFor="description">Description</Label>
        <Textarea
          id="description"
          value={form.description ?? ""}
          onChange={(e) => set("description", e.target.value || null)}
          rows={4}
          disabled={submitting}
          placeholder="Décrivez l'offre en détail..."
        />
      </div>

      {/* Prix */}
      <div className="space-y-1.5">
        <Label htmlFor="prix">Prix (€) <span className="text-red-500">*</span></Label>
        <Input
          id="prix"
          type="number"
          min={0.01}
          step={0.01}
          value={form.prix === 0 ? "" : form.prix}
          onChange={(e) => set("prix", parseFloat(e.target.value) || 0)}
          disabled={submitting}
          placeholder="0.00"
        />
      </div>

      {/* Dates */}
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label htmlFor="dateDebut">Date de début <span className="text-red-500">*</span></Label>
          <Input
            id="dateDebut"
            type="date"
            value={form.dateDebut}
            onChange={(e) => set("dateDebut", e.target.value)}
            disabled={submitting}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="dateFin">Date de fin <span className="text-red-500">*</span></Label>
          <Input
            id="dateFin"
            type="date"
            value={form.dateFin}
            min={form.dateDebut}
            onChange={(e) => set("dateFin", e.target.value)}
            disabled={submitting}
          />
        </div>
      </div>

      {/* Image URL */}
      <div className="space-y-1.5">
        <Label htmlFor="imageUrl">URL de l'image</Label>
        <Input
          id="imageUrl"
          type="url"
          value={form.imageUrl ?? ""}
          onChange={(e) => set("imageUrl", e.target.value || null)}
          disabled={submitting}
          placeholder="https://exemple.com/image.jpg"
          maxLength={500}
        />
      </div>

      {/* Actif toggle */}
      <div className="flex items-center gap-3 py-1">
        <Switch
          id="actif"
          checked={form.actif}
          onCheckedChange={(v) => set("actif", v)}
          disabled={submitting}
        />
        <Label htmlFor="actif" className="cursor-pointer">
          Offre active
        </Label>
      </div>

      {/* Note informative */}
      <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg text-sm text-blue-800">
        💡 Les services associés à cette offre peuvent être gérés après sa création.
      </div>

      {/* Actions */}
      <div className="flex gap-3 pt-2">
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
          disabled={submitting}
          className="flex-1"
        >
          Annuler
        </Button>
        <Button
          type="submit"
          disabled={submitting}
          className="flex-1"
          aria-busy={submitting}
        >
          {submitting ? "Enregistrement..." : submitLabel}
        </Button>
      </div>
    </form>
  )
}