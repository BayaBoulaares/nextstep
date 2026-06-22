// @/components/CopyButton.tsx
"use client"

import { Check, Copy } from "lucide-react"
import React from "react"

export function CopyButton({ value }: { value: string }) {
    const [copied, setCopied] = React.useState(false)
    return (
        <button
            onClick={() => {
                navigator.clipboard.writeText(value)
                setCopied(true)
                setTimeout(() => setCopied(false), 2000)
            }}
            className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
        >
            {copied
                ? <Check className="w-4 h-4 text-emerald-500" />
                : <Copy className="w-4 h-4" />}
        </button>
    )
}