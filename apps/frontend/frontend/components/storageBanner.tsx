// app/features/services/components/StorageBanner.tsx
"use client"

import { useState } from "react"
import { STORAGE_META, STORAGE_SIZES, StorageType } from "@/lib/types"
import { StorageDialog } from "@/components/storageDialog"
import { cn } from "@/lib/utils"

const COLOR_MAP = {
  blue:  { badge: "bg-blue-50  text-blue-800  border-blue-200",  ring: "hover:border-blue-300",  dot: "bg-blue-500"  },
  amber: { badge: "bg-amber-50 text-amber-800 border-amber-200", ring: "hover:border-amber-300", dot: "bg-amber-500" },
  teal:  { badge: "bg-teal-50  text-teal-800  border-teal-200",  ring: "hover:border-teal-300",  dot: "bg-teal-500"  },
}

const ICONS: Record<string, string> = {
  "ti-bucket":        "🪣",
  "ti-device-floppy": "💿",
  "ti-folder":        "📁",
}

export function StorageBanner() {
  const [selected, setSelected] = useState<StorageType | null>(null)
  const types = Object.keys(STORAGE_META) as StorageType[]

  return (
    <>
      {/* Bandeau principal */}
      <div className="border border-border rounded-2xl overflow-hidden bg-card">
        {/* Header bandeau */}
        <div className="flex items-center gap-3 px-5 py-3.5 border-b border-border bg-muted/20">
          <span className="text-base">💾</span>
          <div className="flex-1 min-w-0">
            <p className="text-[13px] font-semibold text-foreground">Stockage Cloud</p>
            <p className="text-[11px] text-muted-foreground">
              OpenShift Data Foundation · Ceph · NooBaa
            </p>
          </div>
          <span className="text-[10px] font-medium px-2 py-0.5 rounded-full border border-border bg-background text-muted-foreground uppercase tracking-wide">
            ODF
          </span>
        </div>

        {/* 3 colonnes */}
        <div className="grid grid-cols-3 divide-x divide-border">
          {types.map((type) => {
            const meta = STORAGE_META[type]
            const colors = COLOR_MAP[meta.color]

            return (
              <button
                key={type}
                onClick={() => setSelected(type)}
                className={cn(
                  "text-left p-5 transition-all group",
                  "hover:bg-muted/30",
                  colors.ring
                )}
              >
                {/* Icône + label */}
                <div className="flex items-start justify-between mb-3">
                  <span className="text-xl">{ICONS[meta.icon]}</span>
                  <span className={cn(
                    "text-[10px] font-medium px-2 py-0.5 rounded-full border",
                    colors.badge
                  )}>
                    {meta.prixParGo} TND/Go/mois
                  </span>
                </div>

                <p className="text-[13px] font-semibold text-foreground mb-0.5">
                  {meta.label}
                </p>
                <p className="text-[11px] text-muted-foreground mb-3">
                  {meta.tech}
                </p>

                {/* Tags cas d'usage */}
                <div className="flex flex-wrap gap-1 mb-3">
                  {meta.useCases.map(u => (
                    <span key={u} className="text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground border border-border">
                      {u}
                    </span>
                  ))}
                </div>

                <p className="text-[11px] text-muted-foreground">
                  {meta.accessMode}
                </p>

                {/* CTA */}
                <div className={cn(
                  "mt-4 text-[12px] font-medium flex items-center gap-1 transition-colors",
                  "text-muted-foreground group-hover:text-foreground"
                )}>
                  Configurer
                  <span className="opacity-0 group-hover:opacity-100 transition-opacity">→</span>
                </div>
              </button>
            )
          })}
        </div>

        {/* Comparatif technique inline */}
        <div className="border-t border-border px-5 py-3 bg-muted/10">
          <div className="grid grid-cols-4 gap-4 text-[11px]">
            <div className="text-muted-foreground font-medium">Critère</div>
            {types.map(t => (
              <div key={t} className="font-medium text-foreground">
                {ICONS[STORAGE_META[t].icon]} {STORAGE_META[t].label}
              </div>
            ))}
            {[
              ["Protocole",      "S3 / HTTP",      "iSCSI / RBD",    "NFS / CephFS"],
              ["Multi-pods",     "✅ Oui",          "❌ Non",          "✅ Oui"],
              ["Performance",   "Moyenne",         "Haute",           "Moyenne"],
              ["StorageClass",  "noobaa.io",       "ceph-rbd",       "cephfs"],
            ].map(([label, ...vals]) => (
              <>
                <div key={label} className="text-muted-foreground col-span-1">{label}</div>
                {vals.map((v, i) => (
                  <div key={i} className="text-foreground">{v}</div>
                ))}
              </>
            ))}
          </div>
        </div>
      </div>

      {/* Dialog de configuration */}
      {selected && (
        <StorageDialog
          type={selected}
          onClose={() => setSelected(null)}
        />
      )}
    </>
  )
}