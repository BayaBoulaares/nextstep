"use client"

import * as React from "react"
import { Loader2 } from "lucide-react"

interface Props {
  apiUrl:  string
  token:   string
  vmName:  string
}

export function VncConsole({ apiUrl, token, vmName }: Props) {
  const containerRef = React.useRef<HTMLDivElement>(null)
  const [status, setStatus] = React.useState<"loading" | "connected" | "error">("loading")
  const [errorMsg, setErrorMsg] = React.useState<string>("")

  React.useEffect(() => {
    if (!containerRef.current) return

    // noVNC est chargé via CDN dans un iframe pour éviter les problèmes de bundling
    // L'iframe pointe vers une page HTML qui initialise noVNC avec les paramètres VNC
    const vncPageUrl = `/api/vnc-proxy?url=${encodeURIComponent(apiUrl)}&token=${encodeURIComponent(token)}&vm=${encodeURIComponent(vmName)}`

    const iframe = document.createElement("iframe")
    iframe.src = vncPageUrl
    iframe.style.width  = "100%"
    iframe.style.height = "500px"
    iframe.style.border = "none"
    iframe.onload = () => setStatus("connected")
    iframe.onerror = () => {
      setStatus("error")
      setErrorMsg("Impossible de charger la console VNC")
    }

    containerRef.current.appendChild(iframe)
    return () => { iframe.remove() }
  }, [apiUrl, token, vmName])

  return (
    <div className="bg-black min-h-[500px] relative">
      {status === "loading" && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-white">
          <Loader2 className="w-6 h-6 animate-spin" />
          <p className="text-[13px] text-zinc-400">Connexion à la console VNC…</p>
        </div>
      )}
      {status === "error" && (
        <div className="absolute inset-0 flex items-center justify-center text-red-400 text-[13px]">
          {errorMsg}
        </div>
      )}
      <div ref={containerRef} className="w-full" />
    </div>
  )
}