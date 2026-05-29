// components/hosting/NginxLogsPanel.tsx
"use client"

import * as React from "react"
import { Terminal, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { apiFetch } from "@/lib/apiClient"

export function NginxLogsPanel() {
  const [logs,    setLogs]    = React.useState<string[]>([])
  const [open,    setOpen]    = React.useState(false)
  const [active,  setActive]  = React.useState(false)
  const bottomRef             = React.useRef<HTMLDivElement>(null)
  const esRef                 = React.useRef<EventSource | null>(null)

  const startStream = async () => {
    // Récupérer le token depuis la session Next-Auth
    const res  = await fetch("/api/auth/session")
    const sess = await res.json()
    const token = sess?.accessToken

    const url = `${process.env.NEXT_PUBLIC_API_URL}/api/hosting/nginx/logs?tailLines=200`
    const es  = new EventSource(url + `&token=${token}`)

    es.addEventListener("log", (e) => {
      setLogs(prev => [...prev.slice(-500), e.data]) // garder 500 lignes max
    })

    es.onerror = () => {
      setActive(false)
      es.close()
    }

    esRef.current = es
    setActive(true)
    setOpen(true)
  }

  const stopStream = () => {
    esRef.current?.close()
    setActive(false)
  }

  // Auto-scroll
  React.useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [logs])

  // Cleanup
  React.useEffect(() => () => esRef.current?.close(), [])

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        className="h-9 text-[13px] gap-1.5"
        onClick={active ? stopStream : startStream}
      >
        <Terminal className="w-4 h-4" />
        {active ? "Arrêter les logs" : "Voir les logs"}
      </Button>

      {open && (
        <div className="border border-border rounded-xl overflow-hidden mt-4">
          <div className="flex items-center justify-between px-4 py-2 bg-zinc-900 border-b border-zinc-700">
            <span className="text-[11px] font-mono text-zinc-400 flex items-center gap-2">
              <Terminal className="w-3.5 h-3.5" />
              Logs nginx — temps réel
              {active && (
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              )}
            </span>
            <button onClick={() => { stopStream(); setOpen(false); setLogs([]) }}>
              <X className="w-3.5 h-3.5 text-zinc-500 hover:text-zinc-300" />
            </button>
          </div>
          <div className="bg-zinc-950 h-64 overflow-y-auto p-3 font-mono text-[11px] text-zinc-300 space-y-0.5">
            {logs.length === 0 ? (
              <p className="text-zinc-600">En attente de logs…</p>
            ) : (
              logs.map((line, i) => (
                <div key={i} className={
                  line.includes(" 5") ? "text-red-400" :
                  line.includes(" 4") ? "text-amber-400" :
                  "text-zinc-300"
                }>
                  {line}
                </div>
              ))
            )}
            <div ref={bottomRef} />
          </div>
        </div>
      )}
    </>
  )
}