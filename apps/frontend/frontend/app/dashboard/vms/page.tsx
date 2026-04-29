// // app/(dashboard)/vms/page.tsx
// "use client"

// import * as React from "react"
// import { SidebarInset, SidebarTrigger } from "@/components/ui/sidebar"
// import { Separator } from "@/components/ui/separator"
// import { Button } from "@/components/ui/button"
// import {
//   Loader2, Play, Square, Trash2, Monitor, RefreshCw,
//   Cpu, MemoryStick, HardDrive, Copy, Check
// } from "lucide-react"
// import {
//   getMyVms, startVm, stopVm, deleteVm, getVncUrl, type VmDTO
// } from "@/lib/services/vms.api"
// import { cn } from "@/lib/utils"
// import { VncConsole } from "@/components/vms/VncConsole"

// const STATUS_STYLE: Record<string, string> = {
//   Running:          "bg-emerald-50 text-emerald-700 border-emerald-200",
//   Stopped:          "bg-zinc-50 text-zinc-500 border-zinc-200",
//   ImagePullBackOff: "bg-red-50 text-red-600 border-red-200",
//   Provisioning:     "bg-amber-50 text-amber-700 border-amber-200",
// }


// // ✅ Dialog mot de passe après création
// function PasswordDialog({ vmName, password, onClose }: {
//   vmName: string, password: string, onClose: () => void
// }) {
//   const [copied, setCopied] = React.useState(false)

//   const copy = () => {
//     navigator.clipboard.writeText(password)
//     setCopied(true)
//     setTimeout(() => setCopied(false), 2000)
//   }

//   return (
//     <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
//       <div className="bg-card border border-border rounded-2xl p-6 w-full max-w-md shadow-xl">
//         <h2 className="text-[15px] font-semibold mb-1">VM créée avec succès ✅</h2>
//         <p className="text-[13px] text-muted-foreground mb-4">
//           Notez ce mot de passe — il ne sera plus affiché.
//         </p>
//         <div className="bg-muted rounded-lg px-4 py-3 flex items-center justify-between gap-3 mb-4">
//           <div className="text-[13px]">
//             <span className="text-muted-foreground">VM : </span>
//             <span className="font-mono font-medium">{vmName}</span>
//             <br />
//             <span className="text-muted-foreground">Login : </span>
//             <span className="font-mono">ubuntu</span>
//             <br />
//             <span className="text-muted-foreground">Mot de passe : </span>
//             <span className="font-mono font-semibold">{password}</span>
//           </div>
//           <Button size="sm" variant="outline" className="h-8 w-8 p-0 shrink-0" onClick={copy}>
//             {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
//           </Button>
//         </div>
//         <Button className="w-full h-9 text-[13px]" onClick={onClose}>
//           J'ai noté le mot de passe
//         </Button>
//       </div>
//     </div>
//   )
// }

// export default function VmsPage() {
//   const [vms,          setVms]          = React.useState<VmDTO[]>([])
//   const [loading,      setLoading]      = React.useState(true)
//   const [error,        setError]        = React.useState<string | null>(null)
//   const [activeVnc,    setActiveVnc]    = React.useState<string | null>(null)
//   const [vncData,      setVncData]      = React.useState<{ url: string; token: string } | null>(null)
//   const [actionLoading,setActionLoading]= React.useState<string | null>(null)
//   // ✅ State pour le dialog password
//   const [passwordInfo, setPasswordInfo] = React.useState<{ vmName: string; password: string } | null>(null)

//   const load = React.useCallback(async () => {
//     setLoading(true)
//     setError(null)
//     try {
//       const data = await getMyVms()
//       setVms(data)
//     } catch (e: any) {
//       setError(e.message)
//     } finally {
//       setLoading(false)
//     }
//   }, [])

//   React.useEffect(() => { load() }, [load])

//   const handleVnc = async (vm: VmDTO) => {
//     if (activeVnc === vm.name) { setActiveVnc(null); setVncData(null); return }
//     try {
//       const data = await getVncUrl(vm.name)
//       setVncData(data)
//       setActiveVnc(vm.name)
//     } catch (e: any) {
//       alert("Impossible d'ouvrir la console VNC : " + e.message)
//     }
//   }

//   const handleAction = async (action: () => Promise<void>, vmName: string) => {
//     setActionLoading(vmName)
//     try { await action(); await load() }
//     catch (e: any) { alert(e.message) }
//     finally { setActionLoading(null) }
//   }

//   // ✅ Extraire le nom de l'OS depuis l'image
//   const getOsLabel = (osImage?: string) => {
//     if (!osImage) return null
//     if (osImage.includes("ubuntu:24")) return "Ubuntu 24.04"
//     if (osImage.includes("ubuntu:22")) return "Ubuntu 22.04"
//     if (osImage.includes("debian"))    return "Debian 12"
//     if (osImage.includes("rocky"))     return "Rocky Linux 9"
//     if (osImage.includes("fedora"))    return "Fedora"
//     return osImage.split("/").pop()
//   }

//   return (
//     <SidebarInset>
//       {/* ✅ Dialog password */}
//       {passwordInfo && (
//         <PasswordDialog
//           vmName={passwordInfo.vmName}
//           password={passwordInfo.password}
//           onClose={() => setPasswordInfo(null)}
//         />
//       )}

//       <header className="flex h-14 items-center gap-3 border-b border-border/60 px-5 bg-background/95 backdrop-blur sticky top-0 z-10">
//         <SidebarTrigger className="-ml-1 size-8 text-muted-foreground hover:text-foreground hover:bg-muted rounded-md transition-colors" />
//         <Separator orientation="vertical" className="h-4 opacity-40" />
//         <nav className="flex items-center gap-1.5 text-[13px]">
//           <span className="text-muted-foreground">Dashboard</span>
//           <span className="text-muted-foreground/30">/</span>
//           <span className="font-medium">Mes VMs</span>
//         </nav>
//         <Button size="sm" variant="outline" className="ml-auto h-8 gap-1.5 text-[12px]" onClick={load}>
//           <RefreshCw className="w-3.5 h-3.5" /> Actualiser
//         </Button>
//       </header>

//       <div className="p-6 max-w-5xl mx-auto w-full space-y-6">
//         <div>
//           <h1 className="text-xl font-semibold tracking-tight">Mes machines virtuelles</h1>
//           <p className="text-[13px] text-muted-foreground mt-1">
//             Gérez et accédez à vos VMs via la console VNC.
//           </p>
//         </div>

//         {loading && (
//           <div className="flex items-center justify-center py-16">
//             <Loader2 className="size-4 animate-spin text-muted-foreground" />
//           </div>
//         )}

//         {error && (
//           <div className="border border-red-200 bg-red-50 rounded-xl px-5 py-4 text-[13px] text-red-600">
//             {error}
//           </div>
//         )}

//         {!loading && !error && vms.length === 0 && (
//           <div className="text-center py-16 text-[13px] text-muted-foreground">
//             Aucune VM déployée.
//           </div>
//         )}

//         {!loading && vms.map(vm => (
//           <div key={vm.name} className="border border-border rounded-2xl overflow-hidden">
//             <div className="flex items-center gap-4 px-6 py-4 bg-card">
//               <div className="flex-1 min-w-0">
//                 <div className="flex items-center gap-3">
//                   <p className="text-[14px] font-semibold font-mono">{vm.name}</p>
//                   <span className={cn(
//                     "text-[10px] font-medium px-2 py-0.5 rounded-full border",
//                     STATUS_STYLE[vm.status] ?? "bg-muted text-muted-foreground border-border"
//                   )}>
//                     {vm.status}
//                   </span>
//                   {/* ✅ OS label */}
//                   {vm.osImage && (
//                     <span className="text-[10px] text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
//                       {getOsLabel(vm.osImage)}
//                     </span>
//                   )}
//                 </div>

//                 {/* ✅ Infos détaillées */}
//                 <div className="flex items-center gap-4 mt-1 text-[11px] text-muted-foreground flex-wrap">
//                   <span>Namespace : {vm.namespace}</span>
//                   {vm.ip      && <span>IP : {vm.ip}</span>}
//                   {vm.cpuCores && (
//                     <span className="flex items-center gap-1">
//                       <Cpu className="w-3 h-3" />{vm.cpuCores} vCPU
//                     </span>
//                   )}
//                   {vm.ramGb && (
//                     <span className="flex items-center gap-1">
//                       <MemoryStick className="w-3 h-3" />{vm.ramGb}
//                     </span>
//                   )}
//                   {vm.createdAt && (
//                     <span>Créée : {new Date(vm.createdAt).toLocaleDateString("fr-FR")}</span>
//                   )}
//                 </div>
//               </div>

//               <div className="flex items-center gap-2 shrink-0">
//                 {/* Console VNC */}
//                 <Button
//                   size="sm"
//                   variant={activeVnc === vm.name ? "default" : "outline"}
//                   className="h-8 gap-1.5 text-[12px]"
//                   onClick={() => handleVnc(vm)}
//                   disabled={vm.status !== "Running"}
//                 >
//                   <Monitor className="w-3.5 h-3.5" />
//                   {activeVnc === vm.name ? "Fermer" : "Console"}
//                 </Button>

//                 {/* Start / Stop */}
//                 {vm.status === "Stopped" ? (
//                   <Button
//                     size="sm" variant="outline"
//                     className="h-8 gap-1.5 text-[12px]"
//                     onClick={() => handleAction(() => startVm(vm.name), vm.name)}
//                     disabled={actionLoading === vm.name}
//                   >
//                     {actionLoading === vm.name
//                       ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
//                       : <Play className="w-3.5 h-3.5" />}
//                     Démarrer
//                   </Button>
//                 ) : (
//                   <Button
//                     size="sm" variant="outline"
//                     className="h-8 gap-1.5 text-[12px]"
//                     onClick={() => handleAction(() => stopVm(vm.name), vm.name)}
//                     disabled={actionLoading === vm.name || vm.status !== "Running"}
//                   >
//                     {actionLoading === vm.name
//                       ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
//                       : <Square className="w-3.5 h-3.5" />}
//                     Arrêter
//                   </Button>
//                 )}

//                 {/* Supprimer */}
//                 <Button
//                   size="sm" variant="outline"
//                   className="h-8 gap-1.5 text-[12px] text-red-600 hover:text-red-700"
//                   onClick={() => {
//                     if (confirm(`Supprimer la VM "${vm.name}" ?`))
//                       handleAction(() => deleteVm(vm.name), vm.name)
//                   }}
//                   disabled={actionLoading === vm.name}
//                 >
//                   <Trash2 className="w-3.5 h-3.5" />
//                 </Button>
//               </div>
//             </div>

//             {/* Console VNC inline */}
//             {activeVnc === vm.name && vncData && (
//               <div className="border-t border-border">
//                 <VncConsole
//                   apiUrl={vncData.url}
//                   token={vncData.token}
//                   vmName={vm.name}
//                 />
//               </div>
//             )}
//           </div>
//         ))}
//       </div>
//     </SidebarInset>
//   )
// }
"use client"

import * as React from "react"
import { SidebarInset, SidebarTrigger } from "@/components/ui/sidebar"
import { Separator } from "@/components/ui/separator"
import { Button } from "@/components/ui/button"
import {
  Loader2, Play, Square, Trash2, Monitor, RefreshCw,
  Cpu, MemoryStick, Copy, Check, KeyRound,
  Camera
} from "lucide-react"
import {
  getMyVms, startVm, stopVm, deleteVm, getVncUrl,
  getVmCredentials, type VmDTO
} from "@/lib/services/vms.api"
import { cn } from "@/lib/utils"
import { VncConsole } from "@/components/vms/VncConsole"
import { RotateCcw } from "lucide-react"
import { rebootVm } from "@/lib/services/vms.api"
const STATUS_STYLE: Record<string, string> = {
  Running: "bg-emerald-50 text-emerald-700 border-emerald-200",
  Stopped: "bg-zinc-50 text-zinc-500 border-zinc-200",
  ImagePullBackOff: "bg-red-50 text-red-600 border-red-200",
  Provisioning: "bg-amber-50 text-amber-700 border-amber-200",
}

type CredState = {
  login: string
  password: string
  visible: boolean
  loading: boolean
}

function PasswordDialog({ vmName, password, onClose }: {
  vmName: string; password: string; onClose: () => void
}) {
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
          Notez ce mot de passe — vous pouvez le retrouver via le bouton "Accès".
        </p>
        <div className="bg-muted rounded-lg px-4 py-3 flex items-center justify-between gap-3 mb-4">
          <div className="text-[13px] space-y-1">
            <div><span className="text-muted-foreground">VM : </span>
              <span className="font-mono font-medium">{vmName}</span></div>
            <div><span className="text-muted-foreground">Login : </span>
              <span className="font-mono">ubuntu</span></div>
            <div><span className="text-muted-foreground">Mot de passe : </span>
              <span className="font-mono font-semibold">{password}</span></div>
          </div>
          <Button size="sm" variant="outline" className="h-8 w-8 p-0 shrink-0" onClick={copy}>
            {copied
              ? <Check className="w-3.5 h-3.5 text-emerald-600" />
              : <Copy className="w-3.5 h-3.5" />}
          </Button>
        </div>
        <Button className="w-full h-9 text-[13px]" onClick={onClose}>Fermer</Button>
      </div>
    </div>
  )
}

export default function VmsPage() {
  const [vms, setVms] = React.useState<VmDTO[]>([])
  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState<string | null>(null)
  const [activeVnc, setActiveVnc] = React.useState<string | null>(null)
  const [vncData, setVncData] = React.useState<{ url: string; token: string } | null>(null)
  const [actionLoading, setActionLoading] = React.useState<string | null>(null)
  const [passwordInfo, setPasswordInfo] = React.useState<{ vmName: string; password: string } | null>(null)

  // ✅ Fix — générique correctement fermé
  const [credentials, setCredentials] = React.useState<Record<string, CredState>>({})

  const load = React.useCallback(async () => {
    setLoading(true); setError(null)
    try { setVms(await getMyVms()) }
    catch (e: any) { setError(e.message) }
    finally { setLoading(false) }
  }, [])

  React.useEffect(() => { load() }, [load])

  const handleVnc = async (vm: VmDTO) => {
    if (activeVnc === vm.name) { setActiveVnc(null); setVncData(null); return }
    try {
      const data = await getVncUrl(vm.name)
      setVncData(data); setActiveVnc(vm.name)
    } catch (e: any) { alert("Impossible d'ouvrir la console VNC : " + e.message) }
  }

  const handleAction = async (action: () => Promise<void>, vmName: string) => {
    setActionLoading(vmName)
    try { await action(); await load() }
    catch (e: any) { alert(e.message) }
    finally { setActionLoading(null) }
  }

  const handleCredentials = async (vmName: string) => {
    const existing = credentials[vmName]

    if (existing && !existing.loading) {
      setCredentials(prev => ({
        ...prev,
        [vmName]: { ...prev[vmName], visible: !prev[vmName].visible }
      }))
      return
    }

    setCredentials(prev => ({
      ...prev,
      [vmName]: { login: "", password: "", visible: false, loading: true }
    }))

    try {
      const data = await getVmCredentials(vmName)
      setCredentials(prev => ({
        ...prev,
        [vmName]: { ...data, visible: true, loading: false }
      }))
    } catch (e: any) {
      setCredentials(prev => {
        const next = { ...prev }
        delete next[vmName]
        return next
      })
      alert("Credentials non disponibles : " + e.message)
    }
  }

  const getOsLabel = (osImage?: string) => {
    if (!osImage) return null
    if (osImage.includes("ubuntu:24")) return "Ubuntu 24.04"
    if (osImage.includes("ubuntu:22")) return "Ubuntu 22.04"
    if (osImage.includes("debian")) return "Debian 12"
    if (osImage.includes("rocky")) return "Rocky Linux 9"
    if (osImage.includes("fedora")) return "Fedora"
    return osImage.split("/").pop()
  }

  return (
    <SidebarInset>
      {passwordInfo && (
        <PasswordDialog
          vmName={passwordInfo.vmName}
          password={passwordInfo.password}
          onClose={() => setPasswordInfo(null)}
        />
      )}

      <header className="flex h-14 items-center gap-3 border-b border-border/60 px-5 bg-background/95 backdrop-blur sticky top-0 z-10">
        <SidebarTrigger className="-ml-1 size-8 text-muted-foreground hover:text-foreground hover:bg-muted rounded-md transition-colors" />
        <Separator orientation="vertical" className="h-4 opacity-40" />
        <nav className="flex items-center gap-1.5 text-[13px]">
          <span className="text-muted-foreground">Dashboard</span>
          <span className="text-muted-foreground/30">/</span>
          <span className="font-medium">Mes VMs</span>
        </nav>
        <Button size="sm" variant="outline" className="ml-auto h-8 gap-1.5 text-[12px]" onClick={load}>
          <RefreshCw className="w-3.5 h-3.5" /> Actualiser
        </Button>
      </header>

      <div className="p-6 max-w-5xl mx-auto w-full space-y-6">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Mes machines virtuelles</h1>
          <p className="text-[13px] text-muted-foreground mt-1">
            Gérez et accédez à vos VMs via la console VNC.
          </p>
        </div>

        {loading && (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="size-4 animate-spin text-muted-foreground" />
          </div>
        )}

        {error && (
          <div className="border border-red-200 bg-red-50 rounded-xl px-5 py-4 text-[13px] text-red-600">
            {error}
          </div>
        )}

        {!loading && !error && vms.length === 0 && (
          <div className="text-center py-16 text-[13px] text-muted-foreground">
            Aucune VM déployée.
          </div>
        )}

        {!loading && vms.map(vm => {
          const cred = credentials[vm.name]
          return (
            <div key={vm.name} className="border border-border rounded-2xl overflow-hidden">

              <div className="flex items-center gap-4 px-6 py-4 bg-card">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 flex-wrap">
                    <p className="text-[14px] font-semibold font-mono">{vm.name}</p>
                    <span className={cn(
                      "text-[10px] font-medium px-2 py-0.5 rounded-full border",
                      STATUS_STYLE[vm.status] ?? "bg-muted text-muted-foreground border-border"
                    )}>
                      {vm.status}
                    </span>
                    {vm.osImage && (
                      <span className="text-[10px] text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
                        {getOsLabel(vm.osImage)}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-4 mt-1 text-[11px] text-muted-foreground flex-wrap">
                    <span>Namespace : {vm.namespace}</span>
                    {vm.ip && <span>IP : {vm.ip}</span>}
                    {vm.cpuCores && (
                      <span className="flex items-center gap-1">
                        <Cpu className="w-3 h-3" />{vm.cpuCores} vCPU
                      </span>
                    )}
                    {vm.ramGb && (
                      <span className="flex items-center gap-1">
                        <MemoryStick className="w-3 h-3" />{vm.ramGb}
                      </span>
                    )}
                    {vm.createdAt && (
                      <span>Créée : {new Date(vm.createdAt).toLocaleDateString("fr-FR")}</span>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <Button
                    size="sm"
                    variant={activeVnc === vm.name ? "default" : "outline"}
                    className="h-8 gap-1.5 text-[12px]"
                    onClick={() => handleVnc(vm)}
                    disabled={vm.status !== "Running"}
                  >
                    <Monitor className="w-3.5 h-3.5" />
                    {activeVnc === vm.name ? "Fermer" : "Console"}
                  </Button>

                  <Button
                    size="sm"
                    variant={cred?.visible ? "default" : "outline"}
                    className="h-8 gap-1.5 text-[12px]"
                    onClick={() => handleCredentials(vm.name)}
                    disabled={cred?.loading}
                  >
                    {cred?.loading
                      ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      : <KeyRound className="w-3.5 h-3.5" />}
                    Accès
                  </Button>

                  {vm.status === "Stopped" ? (
                    <Button
                      size="sm" variant="outline"
                      className="h-8 gap-1.5 text-[12px]"
                      onClick={() => handleAction(() => startVm(vm.name), vm.name)}
                      disabled={actionLoading === vm.name}
                    >
                      {actionLoading === vm.name
                        ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        : <Play className="w-3.5 h-3.5" />}
                      Démarrer
                    </Button>
                  ) : (
                    <Button
                      size="sm" variant="outline"
                      className="h-8 gap-1.5 text-[12px]"
                      onClick={() => handleAction(() => stopVm(vm.name), vm.name)}
                      disabled={actionLoading === vm.name || vm.status !== "Running"}
                    >
                      {actionLoading === vm.name
                        ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        : <Square className="w-3.5 h-3.5" />}
                      Arrêter
                    </Button>

                  )}
                  <Button
                    size="sm" variant="outline"
                    className="h-8 gap-1.5 text-[12px]"
                    onClick={() => handleAction(() => rebootVm(vm.name), vm.name)}
                    disabled={actionLoading === vm.name || vm.status !== "Running"}
                  >
                    {actionLoading === vm.name
                      ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      : <RotateCcw className="w-3.5 h-3.5" />}
                    Redémarrer
                  </Button>
                  <Button
                    size="sm" variant="outline"
                    className="h-8 gap-1.5 text-[12px] opacity-50"
                    disabled={true}
                    title="Nécessite un stockage persistant (DataVolume)"
                  >
                    <Camera className="w-3.5 h-3.5" />
                    Snapshot
                  </Button>
                  <Button
                    size="sm" variant="outline"
                    className="h-8 gap-1.5 text-[12px] text-red-600 hover:text-red-700"
                    onClick={() => {
                      if (confirm(`Supprimer la VM "${vm.name}" ?`))
                        handleAction(() => deleteVm(vm.name), vm.name)
                    }}
                    disabled={actionLoading === vm.name}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </div>

              {/* Panel credentials */}
              {cred?.visible && (
                <div className="border-t border-border px-6 py-3 bg-muted/30 flex items-center gap-6 text-[12px]">
                  <KeyRound className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                  <div className="flex items-center gap-2">
                    <span className="text-muted-foreground">Login :</span>
                    <code className="font-mono font-medium">{cred.login}</code>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-muted-foreground">Mot de passe :</span>
                    <code className="font-mono font-medium">{cred.password}</code>
                  </div>
                  <Button
                    size="sm" variant="ghost"
                    className="h-6 w-6 p-0 ml-auto"
                    onClick={() => navigator.clipboard.writeText(cred.password)}
                    title="Copier le mot de passe"
                  >
                    <Copy className="w-3 h-3" />
                  </Button>
                </div>
              )}

              {/* Console VNC */}
              {activeVnc === vm.name && vncData && (
                <div className="border-t border-border">
                  <VncConsole
                    apiUrl={vncData.url}
                    token={vncData.token}
                    vmName={vm.name}
                  />
                </div>
              )}
            </div>
          )
        })}
      </div>
    </SidebarInset>
  )
}