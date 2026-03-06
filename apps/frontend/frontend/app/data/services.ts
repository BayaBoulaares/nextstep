// ── Types ─────────────────────────────────────────────────────────────────────

export type ServiceStatus = "online" | "maintenance" | "error"

export type UserService = {
  id: string
  name: string
  type: string           // ex: "Cloud Privé · vCore M"
  region: string         // ex: "🇫🇷 Paris Zone A"
  icon: string
  status: ServiceStatus
  metrics: { label: string; value: string }[]
  price: string          // ex: "349 €"
}

export type DeployStep = {
  id: number
  label: string
  description: string
  duration: string
  status: "done" | "active" | "pending"
}

export type OrderLine = {
  label: string
  price: string
  bold?: boolean
  highlight?: boolean
}

// ── Données mock ──────────────────────────────────────────────────────────────

export const userServices: UserService[] = [
  {
    id: "svc-1",
    name: "prod-backend-01",
    type: "Cloud Privé · vCore M",
    region: "🇫🇷 Paris Zone A",
    icon: "🖥️",
    status: "online",
    metrics: [
      { label: "CPU",  value: "12%" },
      { label: "RAM",  value: "18 Go" },
    ],
    price: "349 €",
  },
  {
    id: "svc-2",
    name: "prod-db-postgres-01",
    type: "Cloud Privé · SQL Managé M",
    region: "🇫🇷 Paris Zone A",
    icon: "💾",
    status: "online",
    metrics: [
      { label: "CPU",  value: "87%", warn: true } as any,
      { label: "RAM",  value: "48 Go" },
    ],
    price: "449 €",
  },
  {
    id: "svc-3",
    name: "storage-assets-prod",
    type: "Cloud Public · Object Storage S3 Standard",
    region: "🌍 Global",
    icon: "🪣",
    status: "online",
    metrics: [
      { label: "Utilisé", value: "2.4 To" },
      { label: "Dispo",   value: "98.1%" },
    ],
    price: "~51 €",
  },
  {
    id: "svc-4",
    name: "hybrid-direct-link-1G",
    type: "Cloud Hybride · Direct Link 1G · Paris → On-prem",
    region: "🇫🇷 Paris",
    icon: "🔗",
    status: "maintenance",
    metrics: [
      { label: "Bande passante", value: "340 Mb" },
      { label: "Latence",        value: "2.4ms" },
    ],
    price: "1499 €",
  },
]

export const deploySteps: DeployStep[] = [
  { id: 1, label: "Commande validée",      description: "Ressources allouées dans le datacenter Paris",  duration: "0s",   status: "done"    },
  { id: 2, label: "Création de la VM",     description: "Hyperviseur KVM — Allocation vCPU & RAM",       duration: "1s",   status: "active"  },
  { id: 3, label: "Installation de l'OS",  description: "Ubuntu 24.04 LTS — Image officielle",           duration: "~60s", status: "pending" },
  { id: 4, label: "Configuration réseau",  description: "VPC, IP privée, groupe de sécurité",            duration: "~20s", status: "pending" },
  { id: 5, label: "Activation des services", description: "Backup, Monitoring, SSH Keys",                duration: "~15s", status: "pending" },
]

export const orderLines: OrderLine[] = [
  { label: "Plan vCore M (16 vCPU · 64 Go)", price: "349,00 €" },
  { label: "Stockage additionnel NVMe (500 Go)", price: "+19,00 €" },
  { label: "Backup automatique",              price: "+19,00 €" },
  { label: "Monitoring & Alertes",            price: "+9,00 €"  },
  { label: "Sous-total HT",                   price: "396,00 €" },
  { label: "TVA (20%)",                        price: "+79,20 €" },
  { label: "Total TTC / mois",                 price: "475,20 €", bold: true },
]