// app/features/services/components/RegistryKnativeCatalogCards.tsx
"use client"

import * as React from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Check } from "lucide-react"
import { INTERNAL_REGISTRY_FEATURES } from "@/lib/types"

// ── Carte Internal Registry ───────────────────────────────────────────────────
export function RegistryCatalogCard() {
  return (
    <div className="border border-border rounded-2xl overflow-hidden bg-card hover:border-foreground/20 hover:shadow-sm transition-all">

      <div className="px-5 pt-5 pb-4 flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-200 flex items-center justify-center text-xl shrink-0">
            🔵
          </div>
          <div>
            <p className="text-[13px] font-semibold text-foreground">Image Registry</p>
            <p className="text-[11px] text-muted-foreground mt-0.5">DevOps · Internal OpenShift</p>
          </div>
        </div>
        <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-green-50 text-green-700 border border-green-200 shrink-0">
          Actif
        </span>
      </div>

      <div className="px-5 pb-4">
        <p className="text-[12px] text-muted-foreground leading-relaxed">
          Registre d'images <strong>privé par défaut</strong> — inclus dans votre cluster OpenShift.
          Isolation totale via namespace dédié. ServiceAccount + pull secret auto-générés.
        </p>
      </div>

      {/* Badge Privé */}
      <div className="px-5 pb-4">
        <span className="inline-flex items-center gap-1.5 text-[11px] font-medium px-2.5 py-1 rounded-full bg-green-50 text-green-700 border border-green-200">
          <Check className="w-3 h-3" /> Privé — aucun plan payant requis
        </span>
      </div>

      <div className="px-5 pb-5 space-y-1">
        {INTERNAL_REGISTRY_FEATURES.slice(0, 4).map(f => (
          <p key={f} className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
            <span className="text-green-600 shrink-0">✓</span> {f}
          </p>
        ))}
      </div>

      <div className="px-5 pb-5">
        <Link href="/dashboard/services/registry">
          <Button className="w-full h-8 text-[12px] font-medium">
            Créer un registre →
          </Button>
        </Link>
      </div>
    </div>
  )
}

// ── Carte Knative Serving ─────────────────────────────────────────────────────
export function KnativeServingCatalogCard() {
  return (
    <div className="border border-border rounded-2xl overflow-hidden bg-card hover:border-foreground/20 hover:shadow-sm transition-all">

      <div className="px-5 pt-5 pb-4 flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-muted flex items-center justify-center text-xl shrink-0">⚡</div>
          <div>
            <p className="text-[13px] font-semibold text-foreground">Knative Serving</p>
            <p className="text-[11px] text-muted-foreground mt-0.5">PaaS · Serverless</p>
          </div>
        </div>
        <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-green-50 text-green-700 border border-green-200 shrink-0">
          Actif
        </span>
      </div>

      <div className="px-5 pb-4">
        <p className="text-[12px] text-muted-foreground leading-relaxed">
          Déploiements HTTP avec auto-scaling to zero. Coût nul quand inactif. URL publique générée automatiquement.
        </p>
      </div>

      <div className="px-5 pb-4">
        <div className="flex items-center gap-1.5 bg-blue-50 border border-blue-200 rounded-lg px-3 py-2 text-[11px] text-blue-700">
          💤 Scale to zero — redémarre en &lt; 1s
        </div>
      </div>

      <div className="px-5 pb-5 space-y-1">
        {["Auto-scaling KPA (0 → N replicas)", "URL publique auto-générée", "minScale / maxScale configurables"].map(f => (
          <p key={f} className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
            <span className="text-green-600 shrink-0">✓</span> {f}
          </p>
        ))}
      </div>

      <div className="px-5 pb-5">
        <Link href="/dashboard/services/serverless">
          <Button className="w-full h-8 text-[12px] font-medium">Déployer →</Button>
        </Link>
      </div>
    </div>
  )
}

// ── Carte Knative Functions ───────────────────────────────────────────────────
export function KnativeFunctionsCatalogCard() {
  return (
    <div className="border border-border rounded-2xl overflow-hidden bg-card hover:border-foreground/20 hover:shadow-sm transition-all">

      <div className="px-5 pt-5 pb-4 flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-muted flex items-center justify-center text-xl shrink-0">λ</div>
          <div>
            <p className="text-[13px] font-semibold text-foreground">Knative Functions</p>
            <p className="text-[11px] text-muted-foreground mt-0.5">PaaS · FaaS</p>
          </div>
        </div>
        <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-green-50 text-green-700 border border-green-200 shrink-0">
          Actif
        </span>
      </div>

      <div className="px-5 pb-4">
        <p className="text-[12px] text-muted-foreground leading-relaxed">
          Fonctions event-driven FaaS. Kafka, cron, events Kubernetes ou SinkBinding. Scale to zero entre invocations.
        </p>
      </div>

      <div className="px-5 pb-4 flex flex-wrap gap-1.5">
        {[{ icon: "⏰", label: "Cron" }, { icon: "📨", label: "Kafka" }, { icon: "⚙️", label: "K8s events" }, { icon: "🔗", label: "SinkBinding" }].map(s => (
          <span key={s.label} className="flex items-center gap-1 text-[10px] font-medium px-2 py-1 rounded-lg bg-muted/60 text-muted-foreground">
            {s.icon} {s.label}
          </span>
        ))}
      </div>

      <div className="px-5 pb-5 space-y-1">
        {["Scale to zero entre invocations", "Node, Python, Go, Quarkus", "CloudEvents standard"].map(f => (
          <p key={f} className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
            <span className="text-green-600 shrink-0">✓</span> {f}
          </p>
        ))}
      </div>

      <div className="px-5 pb-5">
        <Link href="/dashboard/services/serverless">
          <Button className="w-full h-8 text-[12px] font-medium">Créer une fonction →</Button>
        </Link>
      </div>
    </div>
  )
}