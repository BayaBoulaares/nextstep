"use client"

import { useForm } from "react-hook-form"
import {
  Form, FormControl, FormField, FormItem, FormLabel, FormMessage,
} from "@/components/ui/form"
import { Input }    from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Button }   from "@/components/ui/button"
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select"
import type { CloudServiceRequest, CloudType, ServiceCategory, ServiceStatus } from "@/lib/types"

// ── Constantes alignées sur les enums Java ────────────────────────────────────

const CLOUD_TYPE_OPTIONS: { value: CloudType; label: string }[] = [
  { value: "PRIVÉ",   label: "Cloud Privé"   },
  { value: "PUBLIC",  label: "Cloud Public"  },
  { value: "HYBRIDE", label: "Cloud Hybride" },
]

const CATEGORY_OPTIONS: { value: ServiceCategory; label: string }[] = [
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

const STATUS_OPTIONS: { value: ServiceStatus; label: string }[] = [
  { value: "ACTIF",       label: "Actif"       },
  { value: "INACTIF",     label: "Inactif"     },
  { value: "MAINTENANCE", label: "Maintenance" },
]

// ── Type du formulaire ────────────────────────────────────────────────────────

export interface ServiceFormValues {
  name:        string
  description: string
  icon:        string
  cloudType:   CloudType | ""
  category:    ServiceCategory | ""
  status:      ServiceStatus | ""
}

// ── Validation manuelle ───────────────────────────────────────────────────────

type FormErrors = Partial<Record<keyof ServiceFormValues, string>>

function validate(values: ServiceFormValues): FormErrors {
  const errors: FormErrors = {}
  if (!values.name.trim())   errors.name      = "Le nom est obligatoire"
  if (!values.cloudType)     errors.cloudType = "Le type de cloud est obligatoire"
  if (!values.category)      errors.category  = "La catégorie est obligatoire"
  if (!values.status)        errors.status    = "Le statut est obligatoire"
  return errors
}

// ── Props ─────────────────────────────────────────────────────────────────────

interface ServiceFormProps {
  onSubmit:       (payload: CloudServiceRequest) => Promise<void> | void
  onCancel:       () => void
  defaultValues?: Partial<ServiceFormValues>
  submitLabel?:   string
  isLoading?:     boolean
}

// ── Composant ─────────────────────────────────────────────────────────────────

export function ServiceForm({
  onSubmit,
  onCancel,
  defaultValues,
  submitLabel = "Enregistrer",
  isLoading = false,
}: ServiceFormProps) {

  const form = useForm<ServiceFormValues>({
    defaultValues: {
      name:        "",
      description: "",
      icon:        "🖥️",
      cloudType:   "",
      category:    "",
      status:      "ACTIF",   // ✅ pré-sélectionné par défaut
      ...defaultValues,
    },
  })

  const handleSubmit = form.handleSubmit((values) => {
    const errors = validate(values)
    if (Object.keys(errors).length > 0) {
      Object.entries(errors).forEach(([field, message]) =>
        form.setError(field as keyof ServiceFormValues, { message })
      )
      return
    }

    // ✅ Payload exact attendu par CloudServiceRequest.java :
    //    @NotBlank name, @NotNull cloudType / category / status
    const payload: CloudServiceRequest = {
      name:        values.name.trim(),
      description: values.description.trim() || undefined,
      icon:        values.icon.trim()         || undefined,
      cloudType:   values.cloudType           as CloudType,
      category:    values.category            as ServiceCategory,
      status:      values.status              as ServiceStatus,
    }

    // 🔍 DEBUG — vérifiez la console pour confirmer que name + status sont présents
    console.log("▶ ServiceForm payload →", JSON.stringify(payload, null, 2))

    return onSubmit(payload)
  })

  return (
    <Form {...form}>
      <form onSubmit={handleSubmit} className="space-y-4">

        {/* Icône + Nom */}
        <div className="grid grid-cols-[72px_1fr] gap-3">
          <FormField
            control={form.control}
            name="icon"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Icône</FormLabel>
                <FormControl>
                  <Input
                    {...field}
                    className="text-xl text-center"
                    maxLength={2}
                    placeholder="🖥️"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>
                  Nom du service <span className="text-destructive">*</span>
                </FormLabel>
                <FormControl>
                  {/*
                    ✅ Binding explicite (value + onChange) pour s'assurer que
                    react-hook-form capte bien la valeur tapée, même dans un Dialog.
                  */}
                  <Input
                    placeholder="ex : Machines Virtuelles"
                    value={field.value}
                    onChange={field.onChange}
                    onBlur={field.onBlur}
                    name={field.name}
                    ref={field.ref}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        {/* Description */}
        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Description</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="Décrivez brièvement ce service cloud…"
                  className="resize-none min-h-[80px]"
                  value={field.value}
                  onChange={field.onChange}
                  onBlur={field.onBlur}
                  name={field.name}
                  ref={field.ref}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Type cloud + Catégorie + Statut */}
        <div className="grid grid-cols-3 gap-3">

          <FormField
            control={form.control}
            name="cloudType"
            render={({ field }) => (
              <FormItem>
                <FormLabel>
                  Type cloud <span className="text-destructive">*</span>
                </FormLabel>
                {/*
                  ✅ value= (pas defaultValue=) pour un Select contrôlé.
                  defaultValue ne se met pas à jour si le formulaire est réinitialisé
                  (cas edit → create dans le même Dialog).
                */}
                <Select
                  value={field.value || ""}
                  onValueChange={(v) => field.onChange(v as CloudType)}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Choisir…" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {CLOUD_TYPE_OPTIONS.map(o => (
                      <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="category"
            render={({ field }) => (
              <FormItem>
                <FormLabel>
                  Catégorie <span className="text-destructive">*</span>
                </FormLabel>
                <Select
                  value={field.value || ""}
                  onValueChange={(v) => field.onChange(v as ServiceCategory)}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Choisir…" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {CATEGORY_OPTIONS.map(o => (
                      <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="status"
            render={({ field }) => (
              <FormItem>
                <FormLabel>
                  Statut <span className="text-destructive">*</span>
                </FormLabel>
                <Select
                  value={field.value || ""}
                  onValueChange={(v) => field.onChange(v as ServiceStatus)}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Choisir…" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {STATUS_OPTIONS.map(o => (
                      <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

        </div>

        {/* Actions */}
        <div className="flex justify-end gap-3 pt-2">
          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
            disabled={isLoading}
          >
            Annuler
          </Button>
          <Button type="submit" disabled={isLoading}>
            {isLoading ? "Enregistrement…" : submitLabel}
          </Button>
        </div>

      </form>
    </Form>
  )
}