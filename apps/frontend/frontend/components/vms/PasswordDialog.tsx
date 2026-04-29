// components/vms/PasswordDialog.tsx
"use client"

import * as React from "react"
import { Button } from "@/components/ui/button"
import { Copy, Check } from "lucide-react"

interface Props {
  vmName:   string
  password: string
  onClose:  () => void
}

export function PasswordDialog({ vmName, password, onClose }: Props) {
  const [copied, setCopied] = React.useState(false)

  const copy = () => {
    navigator.clipboard.writeText(password)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-card border border-border rounded-2xl p-6 w-full max-w-md shadow-xl">
        <h2 className="text-[15px] font-semibold mb-1">VM créée avec succès ✅</h2>
        <p className="text-[13px] text-muted-foreground mb-4">
          Notez ce mot de passe — retrouvable via le bouton "Accès" dans Mes VMs.
        </p>
        <div className="bg-muted rounded-lg px-4 py-3 flex items-center justify-between gap-3 mb-4">
          <div className="text-[13px] space-y-1">
            <div>
              <span className="text-muted-foreground">VM : </span>
              <span className="font-mono font-medium">{vmName}</span>
            </div>
            <div>
              <span className="text-muted-foreground">Login : </span>
              <span className="font-mono">ubuntu</span>
            </div>
            <div>
              <span className="text-muted-foreground">Mot de passe : </span>
              <span className="font-mono font-semibold">{password}</span>
            </div>
          </div>
          <Button
            size="sm" variant="outline"
            className="h-8 w-8 p-0 shrink-0"
            onClick={copy}
          >
            {copied
              ? <Check className="w-3.5 h-3.5 text-emerald-600" />
              : <Copy className="w-3.5 h-3.5" />}
          </Button>
        </div>
        <Button className="w-full h-9 text-[13px]" onClick={onClose}>
          Fermer
        </Button>
      </div>
    </div>
  )
}