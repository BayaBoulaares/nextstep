"use client"

import { Loader2 } from "lucide-react"
import { Button }  from "@/components/ui/button"

interface Props {
  title:     string
  message:   string
  loading?:  boolean
  onConfirm: () => void
  onCancel:  () => void
}

export function ConfirmDialog({ title, message, loading, onConfirm, onCancel }: Props) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/20 backdrop-blur-sm" onClick={onCancel} />
      <div className="relative z-10 bg-background border border-border rounded-2xl shadow-xl w-full max-w-sm p-6 space-y-4">
        <h2 className="text-[14px] font-semibold">{title}</h2>
        <p className="text-[13px] text-muted-foreground leading-relaxed">{message}</p>
        <div className="flex gap-2 pt-1">
          <Button variant="outline" className="flex-1 h-8 text-[12px]" onClick={onCancel} disabled={loading}>
            Annuler
          </Button>
          <Button
            variant="destructive"
            className="flex-1 h-8 text-[12px]"
            onClick={onConfirm}
            disabled={loading}
          >
            {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : "Supprimer"}
          </Button>
        </div>
      </div>
    </div>
  )
}