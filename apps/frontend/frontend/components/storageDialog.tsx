// app/features/services/components/StorageDialog.tsx
"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import {
  Dialog, DialogContent, DialogHeader,
  DialogTitle, DialogDescription,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Loader2 } from "lucide-react"
import { cn } from "@/lib/utils"
import { STORAGE_META, STORAGE_SIZES, StorageType } from "@/lib/types"
import { useStorageProvision } from "@/lib/hooks/useStorage"

interface StorageDialogProps {
  type: StorageType
  onClose: () => void
}

const COLOR_ACTIVE: Record<"blue" | "amber" | "teal", string> = {
  blue:  "border-blue-500  bg-blue-50  text-blue-800",
  amber: "border-amber-500 bg-amber-50 text-amber-800",
  teal:  "border-teal-500  bg-teal-50  text-teal-800",
}

const ICONS: Record<string, string> = {
  "ti-bucket":        "🪣",
  "ti-device-floppy": "💿",
  "ti-folder":        "📁",
}

export function StorageDialog({ type, onClose }: StorageDialogProps) {
  const meta                        = STORAGE_META[type]
  const { provision, loading, error } = useStorageProvision()
  const router                      = useRouter()

  const [capacite, setCapacite]     = useState<number>(50)
  const [success, setSuccess]       = useState(false)
  const [storageId, setStorageId]   = useState<number | null>(null)

  const prix = (capacite * meta.prixParGo).toFixed(2)
  const activeColor = COLOR_ACTIVE[meta.color]

  const handleProvision = async () => {
    try {
      const res = await provision({
        type,
        capaciteGo: capacite,
        planId: meta.planId,
      })
      setStorageId(res.id)
      setSuccess(true)
    } catch {
      // erreur gérée par le hook
    }
  }

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-[16px]">
            <span>{ICONS[meta.icon]}</span>
            {meta.label}
          </DialogTitle>
          <DialogDescription className="text-[12px]">
            {meta.tech} · {meta.accessMode}
          </DialogDescription>
        </DialogHeader>

        {success ? (
          /* ── État succès ── */
          <div className="py-6 text-center space-y-4">
            <div className="text-4xl">✅</div>
            <div>
              <p className="text-[14px] font-medium text-foreground">
                {meta.label} provisionné !
              </p>
              <p className="text-[12px] text-muted-foreground mt-1">
                En cours de démarrage dans OpenShift…
              </p>
            </div>
            <div className="flex gap-2 justify-center">
              <Button
                variant="outline"
                size="sm"
                className="text-[12px]"
                onClick={onClose}
              >
                Fermer
              </Button>
              <Button
                size="sm"
                className="text-[12px]"
                onClick={() => router.push(`/dashboard/storage/${storageId}`)}
              >
                Voir le détail →
              </Button>
            </div>
          </div>
        ) : (
          /* ── Formulaire ── */
          <div className="space-y-5 py-2">

            {/* Sélecteur capacité */}
            <div>
              <p className="text-[12px] font-medium text-foreground mb-2">
                Capacité
              </p>
              <div className="grid grid-cols-3 gap-2">
                {STORAGE_SIZES.map(size => (
                  <button
                    key={size}
                    onClick={() => setCapacite(size)}
                    className={cn(
                      "py-2 px-3 rounded-lg text-[12px] font-medium border transition-all",
                      capacite === size
                        ? activeColor
                        : "border-border text-muted-foreground hover:border-foreground/40 hover:text-foreground"
                    )}
                  >
                    {size >= 1000 ? `${size / 1000} To` : `${size} Go`}
                  </button>
                ))}
              </div>
            </div>

            {/* Prix estimé */}
            <div className="flex items-center justify-between rounded-xl bg-muted/30 px-4 py-3 border border-border">
              <div>
                <p className="text-[11px] text-muted-foreground">Estimation mensuelle</p>
                <p className="text-[10px] text-muted-foreground mt-0.5">
                  {capacite >= 1000 ? `${capacite / 1000} To` : `${capacite} Go`}
                  {" × "}
                  {meta.prixParGo} TND/Go
                </p>
              </div>
              <p className="text-[20px] font-semibold text-foreground tabular-nums">
                {prix} TND
              </p>
            </div>

            {/* Infos techniques */}
            <div className="rounded-xl border border-border bg-card px-4 py-3 space-y-1.5">
              <p className="text-[11px] font-medium text-foreground mb-2">Détails techniques</p>
              {[
                ["StorageClass", meta.storageClass],
                ["Access mode",  meta.accessMode],
                ["Provisioner",  meta.tech],
              ].map(([k, v]) => (
                <div key={k} className="flex justify-between text-[11px]">
                  <span className="text-muted-foreground">{k}</span>
                  <span className="font-mono text-foreground text-[10px]">{v}</span>
                </div>
              ))}
            </div>

            {/* Erreur */}
            {error && (
              <p className="text-[12px] text-red-600 bg-red-50 border border-red-200 px-3 py-2 rounded-lg">
                {error}
              </p>
            )}

            {/* Actions */}
            <div className="flex gap-2 pt-1">
              <Button
                variant="outline"
                size="sm"
                className="text-[12px] flex-1"
                onClick={onClose}
                disabled={loading}
              >
                Annuler
              </Button>
              <Button
                size="sm"
                className="text-[12px] flex-1"
                onClick={handleProvision}
                disabled={loading}
              >
                {loading
                  ? <><Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />Provisioning…</>
                  : `Commander ${capacite >= 1000 ? `${capacite / 1000} To` : `${capacite} Go`}`
                }
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}