import type { ServiceCategory, PlanTier, BillingCycle, ServiceStatus } from "./types"
import { CATEGORY_LABELS, CATEGORY_INSTANCE_TYPE } from "./types"

export const CATEGORY_OPTIONS: { value: ServiceCategory; label: string; instanceType: string | null }[] =
  (Object.keys(CATEGORY_LABELS) as ServiceCategory[]).map(c => ({
    value:        c,
    label:        CATEGORY_LABELS[c],
    instanceType: CATEGORY_INSTANCE_TYPE[c],
  }))

export const TIER_OPTIONS: { value: PlanTier; label: string; description: string }[] = [
  { value: "STARTER",    label: "Starter",    description: "Petit client / test"  },
  { value: "BUSINESS",   label: "Business",   description: "Client standard"      },
  { value: "ENTERPRISE", label: "Enterprise", description: "Gros client"          },
]

export const BILLING_OPTIONS: { value: BillingCycle; label: string; suffix: string }[] = [
  { value: "HORAIRE", label: "À l'heure", suffix: "/h"    },
  { value: "MENSUEL", label: "Mensuel",   suffix: "/mois" },
  { value: "ANNUEL",  label: "Annuel",    suffix: "/an"   },
]

export const STATUS_OPTIONS: { value: ServiceStatus; label: string }[] = [
  { value: "ACTIF",       label: "Actif"       },
  { value: "INACTIF",     label: "Inactif"     },
  { value: "MAINTENANCE", label: "Maintenance" },
]

export const CYCLE_SUFFIX: Record<BillingCycle, string> = {
  HORAIRE: "/h",
  MENSUEL: "/mois",
  ANNUEL:  "/an",
}