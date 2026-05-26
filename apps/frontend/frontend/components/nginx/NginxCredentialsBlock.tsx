// components/nginx/NginxCredentialsBlock.tsx
"use client"

import * as React from "react"
import { Copy, ExternalLink, CheckCircle2, Globe, Server, Cpu, HardDrive } from "lucide-react"
import { cn } from "@/lib/utils"
import type { NginxDeploymentResult } from "@/lib/types"

interface NginxCredentialsBlockProps {
  result: NginxDeploymentResult
}

export function NginxCredentialsBlock({ result }: NginxCredentialsBlockProps) {
  const [copied, setCopied] = React.useState<string | null>(null)

  const copy = (value: string, key: string) => {
    navigator.clipboard.writeText(value).then(() => {
      setCopied(key)
      setTimeout(() => setCopied(null), 2000)
    })
  }

  const planConfig: Record<string, { workers: string; rate: string; replicas: string; color: string }> = {
    STARTER:    { workers: "1",  rate: "10 req/s",  replicas: "1", color: "text-emerald-600" },
    BUSINESS:   { workers: "2",  rate: "50 req/s",  replicas: "1", color: "text-blue-600"    },
    ENTERPRISE: { workers: "4",  rate: "200 req/s", replicas: "2", color: "text-violet-600"  },
  }
  const config = planConfig[result.plan] ?? planConfig.STARTER

  return (
    <div className="w-full max-w-md space-y-3 mt-4">

      {/* URL publique */}
      <div className="border border-emerald-200 bg-emerald-50 rounded-2xl overflow-hidden">
        <div className="px-5 py-3 border-b border-emerald-200/60 bg-emerald-100/50">
          <div className="flex items-center gap-2">
            <Globe className="w-4 h-4 text-emerald-600" />
            <p className="text-[13px] font-semibold text-emerald-800">
              Votre site est en ligne
            </p>
          </div>
          <p className="text-[11px] text-emerald-600 mt-0.5">
            Accédez à votre hébergement nginx depuis cette URL
          </p>
        </div>
        <div className="px-5 py-4 bg-white">
          <div className="flex items-center gap-2">
            <code className="text-[12px] font-mono text-emerald-700 flex-1 truncate bg-emerald-50 px-3 py-2 rounded-lg border border-emerald-100">
              {result.publicUrl ?? "—"}
            </code>
            <button
              onClick={() => result.publicUrl && copy(result.publicUrl, "url")}
              className="p-2 rounded-lg hover:bg-emerald-50 text-emerald-600 transition-colors shrink-0"
            >
              <Copy className={cn("w-4 h-4", copied === "url" && "text-emerald-500")} />
            </button>
            {result.publicUrl && (
              <a
                href={result.publicUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="p-2 rounded-lg hover:bg-emerald-50 text-emerald-600 transition-colors shrink-0"
              >
                <ExternalLink className="w-4 h-4" />
              </a>
            )}
          </div>
        </div>
      </div>

      {/* Détails du déploiement */}
      <div className="border border-border rounded-2xl overflow-hidden bg-card">
        <div className="px-5 py-3 border-b border-border/60 bg-muted/20">
          <div className="flex items-center gap-2">
            <Server className="w-4 h-4 text-muted-foreground" />
            <p className="text-[13px] font-semibold">
              Détails du déploiement
            </p>
          </div>
        </div>
        <div className="divide-y divide-border">
          {[
            { label: "Namespace",  value: result.namespace,           key: "ns"  },
            { label: "App name",   value: result.appName,             key: "app" },
            { label: "Plan",       value: result.plan,                key: "plan" },
            { label: "Statut",     value: result.status,              key: "status" },
          ].map(row => (
            <div key={row.key} className="flex items-center gap-3 px-5 py-3">
              <span className="text-[12px] text-muted-foreground w-24 shrink-0">{row.label}</span>
              <span className="text-[12px] font-mono flex-1 truncate">{row.value}</span>
              <button
                onClick={() => copy(row.value, row.key)}
                className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors shrink-0"
              >
                <Copy className={cn("w-3.5 h-3.5", copied === row.key && "text-emerald-500")} />
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Config nginx active */}
      <div className="border border-border rounded-2xl overflow-hidden bg-card">
        <div className="px-5 py-3 border-b border-border/60 bg-muted/20">
          <p className="text-[13px] font-semibold">Configuration nginx active</p>
          <p className="text-[11px] text-muted-foreground mt-0.5">Selon votre plan {result.plan}</p>
        </div>
        <div className="grid grid-cols-3 divide-x divide-border">
          {[
            { icon: <Cpu className="w-3.5 h-3.5" />,      label: "Workers",  value: config.workers  },
            { icon: <Server className="w-3.5 h-3.5" />,   label: "Rate",     value: config.rate     },
            { icon: <HardDrive className="w-3.5 h-3.5" />,label: "Replicas", value: config.replicas },
          ].map((item, i) => (
            <div key={i} className="flex flex-col items-center py-3 px-2 gap-1">
              <span className="text-muted-foreground">{item.icon}</span>
              <span className={cn("text-[13px] font-semibold", config.color)}>{item.value}</span>
              <span className="text-[10px] text-muted-foreground uppercase tracking-wide">{item.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Instructions */}
      <div className="rounded-xl bg-muted/40 border border-border/60 px-4 py-3 space-y-1.5">
        <p className="text-[12px] font-medium">Prochaines étapes</p>
        <ol className="space-y-1">
          {[
            "Uploadez vos fichiers HTML/CSS/JS via la console",
            "Pointez votre nom de domaine vers l'URL ci-dessus",
            "Activez votre certificat SSL depuis les paramètres",
          ].map((step, i) => (
            <li key={i} className="flex items-start gap-2 text-[11px] text-muted-foreground">
              <CheckCircle2 className="w-3 h-3 mt-0.5 text-emerald-500 shrink-0" />
              {step}
            </li>
          ))}
        </ol>
      </div>
    </div>
  )
}
