export type Plan = {
  name: string;
  specs: string;
  price: string;
  badge?: string;
  color: "blue" | "green" | "orange" | "purple";
};

export type Service = {
  id: string;
  icon: string;
  title: string;
  description: string;
  plans?: Plan[];
};

export type ServiceCategory = {
  id: string;
  icon: string;
  label: string;
  count: number;
  services: Service[];
};

export type CloudType = {
  id: string;
  slug: string;
  label: string;
  icon: string;
  tagline: string;
  description: string;
  tags: string[];
  tagColor: "blue" | "cyan" | "orange";
  categories: ServiceCategory[];
};

export const clouds: CloudType[] = [
  {
    id: "prive",
    slug: "prive",
    label: "Cloud Privé",
    icon: "🔒",
    tagline: "Infrastructure dédiée et isolée. Contrôle total de vos données avec une sécurité maximale.",
    description:
      "Infrastructure dédiée et sécurisée pour les entreprises qui exigent le plus haut niveau de contrôle et de conformité.",
    tags: ["Haute sécurité", "Dédié", "Conformité"],
    tagColor: "blue",
    categories: [
      {
        id: "storage",
        icon: "🗄️",
        label: "Storage",
        count: 4,
        services: [
          {
            id: "block-storage",
            icon: "💾",
            title: "Block Storage",
            description: "Volumes persistants haute performance pour vos VMs",
            plans: [
              { name: "SSD 500 Go", specs: "500 Go SSD NVMe", price: "49€/mois", color: "blue" },
              { name: "SSD 2 To", specs: "2 To SSD NVMe", price: "149€/mois", badge: "RECOMMANDÉ", color: "green" },
              { name: "SSD 10 To", specs: "10 To SSD NVMe", price: "599€/mois", color: "orange" },
              { name: "Custom", specs: "Configuration sur mesure", price: "Sur devis", badge: "SUR MESURE", color: "purple" },
            ],
          },
          {
            id: "object-storage",
            icon: "🪣",
            title: "Object Storage",
            description: "Stockage d'objets S3-compatible illimité",
            plans: [
              { name: "Starter", specs: "1 To, bande passante 1 Gbps", price: "19€/mois", color: "blue" },
              { name: "Business", specs: "10 To, bande passante 10 Gbps", price: "99€/mois", badge: "RECOMMANDÉ", color: "green" },
              { name: "Custom", specs: "Capacité illimitée sur mesure", price: "Sur devis", badge: "SUR MESURE", color: "purple" },
            ],
          },
          {
            id: "nas-partage",
            icon: "📁",
            title: "NAS Partagé",
            description: "Système de fichiers distribué NFS/SMB",
            plans: [
              { name: "NAS S", specs: "2 To, NFS/SMB, 1 Gbps", price: "39€/mois", color: "blue" },
              { name: "NAS M", specs: "10 To, NFS/SMB, 10 Gbps", price: "149€/mois", badge: "RECOMMANDÉ", color: "green" },
            ],
          },
          {
            id: "backup-dr",
            icon: "🔄",
            title: "Backup & DR",
            description: "Sauvegarde automatisée et reprise après sinistre",
            plans: [
              { name: "Basic", specs: "Rétention 30 jours, 500 Go", price: "29€/mois", color: "blue" },
              { name: "Pro", specs: "Rétention 1 an, illimité", price: "129€/mois", badge: "RECOMMANDÉ", color: "green" },
              { name: "Custom", specs: "SLA personnalisé", price: "Sur devis", badge: "SUR MESURE", color: "purple" },
            ],
          },
        ],
      },
      {
        id: "compute",
        icon: "⚙️",
        label: "Compute",
        count: 4,
        services: [
          {
            id: "machines-virtuelles",
            icon: "🖥️",
            title: "Machines Virtuelles",
            description: "VMs dédiées sur hyperviseur VMware/KVM",
            plans: [
              { name: "vCore S", specs: "4 vCPU, 8 Go RAM, 100 Go SSD — Dev/Test", price: "89€/mois", color: "blue" },
              { name: "vCore M", specs: "16 vCPU, 64 Go RAM, 500 Go NVMe", price: "349€/mois", badge: "RECOMMANDÉ", color: "green" },
              { name: "vCore L", specs: "64 vCPU, 256 Go RAM, 2 To NVMe, réseau 25Gbps", price: "1299€/mois", color: "orange" },
              { name: "Custom", specs: "Configuration sur mesure, ressources garanties", price: "Sur devis", badge: "SUR MESURE", color: "purple" },
            ],
          },
          {
            id: "bare-metal",
            icon: "🔩",
            title: "Bare Metal",
            description: "Serveurs physiques dédiés sans virtualisation",
            plans: [
              { name: "Entry", specs: "Intel Xeon E, 64 Go RAM, 2×1 To NVMe", price: "299€/mois", color: "blue" },
              { name: "Standard", specs: "Intel Xeon Silver, 256 Go RAM, 4×2 To NVMe", price: "799€/mois", badge: "RECOMMANDÉ", color: "green" },
              { name: "High-End", specs: "Dual Xeon Gold, 1 To RAM, réseau 100Gbps", price: "2499€/mois", color: "orange" },
            ],
          },
          {
            id: "kubernetes-prive",
            icon: "☸️",
            title: "Kubernetes Privé",
            description: "Orchestration de conteneurs en environnement isolé",
            plans: [
              { name: "Dev", specs: "3 nœuds, 8 vCPU / nœud", price: "199€/mois", color: "blue" },
              { name: "Prod", specs: "5 nœuds, 32 vCPU / nœud, HA", price: "899€/mois", badge: "RECOMMANDÉ", color: "green" },
              { name: "Custom", specs: "Topologie sur mesure", price: "Sur devis", badge: "SUR MESURE", color: "purple" },
            ],
          },
          {
            id: "hpc-gpu",
            icon: "🧮",
            title: "HPC / GPU",
            description: "Calcul haute performance et accélération GPU",
            plans: [
              { name: "GPU S", specs: "1× NVIDIA A100, 40 Go VRAM", price: "799€/mois", color: "blue" },
              { name: "GPU M", specs: "4× NVIDIA A100, 160 Go VRAM", price: "2999€/mois", badge: "RECOMMANDÉ", color: "green" },
              { name: "Custom", specs: "Cluster HPC sur mesure", price: "Sur devis", badge: "SUR MESURE", color: "purple" },
            ],
          },
        ],
      },
    ],
  },
  {
    id: "public",
    slug: "public",
    label: "Cloud Public",
    icon: "🌐",
    tagline: "Scalabilité illimitée à la demande. Paiement à l'usage sur une infrastructure mutualisée.",
    description:
      "Scalabilité illimitée à la demande. Paiement à l'usage sur une infrastructure mutualisée mondiale.",
    tags: ["Scalable", "Pay-as-you-go", "Global"],
    tagColor: "cyan",
    categories: [
      {
        id: "compute",
        icon: "⚙️",
        label: "Compute",
        count: 3,
        services: [
          {
            id: "instances",
            icon: "🖥️",
            title: "Instances Cloud",
            description: "Démarrez en quelques secondes, payez à la seconde",
            plans: [
              { name: "Nano", specs: "1 vCPU, 1 Go RAM, 20 Go SSD", price: "5€/mois", color: "blue" },
              { name: "Standard", specs: "4 vCPU, 8 Go RAM, 80 Go SSD", price: "29€/mois", badge: "RECOMMANDÉ", color: "green" },
              { name: "Pro", specs: "16 vCPU, 32 Go RAM, 320 Go SSD", price: "99€/mois", color: "orange" },
            ],
          },
          {
            id: "functions",
            icon: "⚡",
            title: "Functions",
            description: "Exécution serverless, facturation à l'invocation",
            plans: [
              { name: "Free", specs: "1M invocations/mois incluses", price: "0€/mois", color: "blue" },
              { name: "Pro", specs: "Illimité, SLA 99.9%", price: "19€/mois", badge: "RECOMMANDÉ", color: "green" },
            ],
          },
          {
            id: "kubernetes",
            icon: "☸️",
            title: "Kubernetes Managé",
            description: "Clusters K8s entièrement gérés et auto-scalés",
            plans: [
              { name: "Starter", specs: "2 nœuds workers, auto-scale", price: "49€/mois", color: "blue" },
              { name: "Production", specs: "5+ nœuds, HA, monitoring inclus", price: "199€/mois", badge: "RECOMMANDÉ", color: "green" },
            ],
          },
        ],
      },
    ],
  },
  {
    id: "hybride",
    slug: "hybride",
    label: "Cloud Hybride",
    icon: "⚡",
    tagline: "Le meilleur des deux mondes. Connectez votre infrastructure privée au cloud public.",
    description:
      "Connectez votre infrastructure privée au cloud public pour une flexibilité et une optimisation maximales.",
    tags: ["Flexibilité", "Optimisé", "Multi-cloud"],
    tagColor: "orange",
    categories: [
      {
        id: "connectivity",
        icon: "🔗",
        label: "Connectivity",
        count: 2,
        services: [
          {
            id: "vpn-site",
            icon: "🔐",
            title: "VPN Site-à-Site",
            description: "Tunnel chiffré entre votre datacenter et le cloud",
            plans: [
              { name: "Basic", specs: "1 Gbps, 2 sites", price: "99€/mois", color: "blue" },
              { name: "Advanced", specs: "10 Gbps, sites illimités", price: "399€/mois", badge: "RECOMMANDÉ", color: "green" },
              { name: "Custom", specs: "Topologie réseau sur mesure", price: "Sur devis", badge: "SUR MESURE", color: "purple" },
            ],
          },
          {
            id: "direct-connect",
            icon: "🌉",
            title: "Direct Connect",
            description: "Connexion privée dédiée haute performance",
            plans: [
              { name: "1 Gbps", specs: "Lien dédié 1 Gbps, latence < 1ms", price: "299€/mois", color: "blue" },
              { name: "10 Gbps", specs: "Lien dédié 10 Gbps, SLA 99.99%", price: "999€/mois", badge: "RECOMMANDÉ", color: "green" },
            ],
          },
        ],
      },
      {
        id: "orchestration",
        icon: "🔀",
        label: "Orchestration",
        count: 2,
        services: [
          {
            id: "hybrid-manager",
            icon: "🎛️",
            title: "Hybrid Manager",
            description: "Console unifiée pour gérer privé et public",
            plans: [
              { name: "Starter", specs: "Jusqu'à 50 ressources gérées", price: "149€/mois", color: "blue" },
              { name: "Enterprise", specs: "Ressources illimitées, RBAC avancé", price: "599€/mois", badge: "RECOMMANDÉ", color: "green" },
            ],
          },
          {
            id: "policy-engine",
            icon: "📋",
            title: "Policy Engine",
            description: "Automatisation et gouvernance multi-cloud",
            plans: [
              { name: "Basic", specs: "10 politiques actives", price: "79€/mois", color: "blue" },
              { name: "Pro", specs: "Politiques illimitées + audit log", price: "249€/mois", badge: "RECOMMANDÉ", color: "green" },
            ],
          },
        ],
      },
    ],
  },
];