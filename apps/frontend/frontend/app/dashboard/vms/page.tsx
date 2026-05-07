"use client"

import * as React from "react"
import { SidebarInset, SidebarTrigger } from "@/components/ui/sidebar"
import { Separator } from "@/components/ui/separator"
import { Button } from "@/components/ui/button"
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import {
  Loader2, Play, Square, Trash2, Monitor, RefreshCw,
  Cpu, MemoryStick, Copy, Check, KeyRound, RotateCcw,
  Camera, Network, Terminal, X
} from "lucide-react"
import {
  getMyVms, startVm, stopVm, rebootVm, deleteVm, getVncUrl,
  getVmCredentials, getVmNetwork, exposeVmSsh, unexposeVmSsh,
  type VmDTO, type VmNetworkInfo
} from "@/lib/services/vms.api"
import { cn } from "@/lib/utils"
import { VncConsole } from "@/components/vms/VncConsole"
import { PasswordDialog } from "@/components/vms/PasswordDialog"

const STATUS_STYLE: Record<string, string> = {
  Running:          "bg-emerald-50 text-emerald-700 border-emerald-200",
  Stopped:          "bg-zinc-50 text-zinc-500 border-zinc-200",
  ImagePullBackOff: "bg-red-50 text-red-600 border-red-200",
  Provisioning:     "bg-amber-50 text-amber-700 border-amber-200",
}

type CredState = {
  login:    string
  password: string
  visible:  boolean
  loading:  boolean
}

type NetState = {
  info:    VmNetworkInfo | null
  visible: boolean
  loading: boolean
}

export default function VmsPage() {
  const [vms,           setVms]           = React.useState<VmDTO[]>([])
  const [loading,       setLoading]       = React.useState(true)
  const [error,         setError]         = React.useState<string | null>(null)
  const [activeVnc,     setActiveVnc]     = React.useState<string | null>(null)
  const [vncData,       setVncData]       = React.useState<{ url: string; token: string } | null>(null)
  const [actionLoading, setActionLoading] = React.useState<string | null>(null)
  const [passwordInfo,  setPasswordInfo]  = React.useState<{ vmName: string; password: string } | null>(null)
  const [credentials,   setCredentials]   = React.useState<Record<string, CredState>>({})
  const [networks,      setNetworks]      = React.useState<Record<string, NetState>>({})
  const [copied,        setCopied]        = React.useState<string | null>(null)

  // ✅ State pour la confirmation de suppression (remplace window.confirm)
  const [deleteTarget,  setDeleteTarget]  = React.useState<string | null>(null)
  const [deleteLoading, setDeleteLoading] = React.useState(false)

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

  // ✅ Confirmation suppression via AlertDialog
  const confirmDelete = async () => {
    if (!deleteTarget) return
    setDeleteLoading(true)
    try {
      await deleteVm(deleteTarget)
      await load()
    } catch (e: any) {
      alert(e.message)
    } finally {
      setDeleteLoading(false)
      setDeleteTarget(null)
    }
  }

  const handleCredentials = async (vmName: string) => {
    const existing = credentials[vmName]
    if (existing && !existing.loading) {
      setCredentials(prev => ({ ...prev, [vmName]: { ...prev[vmName], visible: !prev[vmName].visible } }))
      return
    }
    setCredentials(prev => ({ ...prev, [vmName]: { login: "", password: "", visible: false, loading: true } }))
    try {
      const data = await getVmCredentials(vmName)
      setCredentials(prev => ({ ...prev, [vmName]: { ...data, visible: true, loading: false } }))
    } catch {
      setCredentials(prev => ({ ...prev, [vmName]: { login: "ubuntu", password: "non-disponible", visible: true, loading: false } }))
    }
  }

  const handleNetwork = async (vmName: string) => {
    const existing = networks[vmName]
    if (existing?.info && !existing.loading) {
      setNetworks(prev => ({ ...prev, [vmName]: { ...prev[vmName], visible: !prev[vmName].visible } }))
      return
    }
    setNetworks(prev => ({ ...prev, [vmName]: { info: null, visible: false, loading: true } }))
    try {
      let services = await getVmNetwork(vmName)
      let info: VmNetworkInfo
      if (services.length > 0) {
        info = services[0]
      } else {
        info = await exposeVmSsh(vmName)
      }
      setNetworks(prev => ({ ...prev, [vmName]: { info, visible: true, loading: false } }))
    } catch (e: any) {
      setNetworks(prev => ({ ...prev, [vmName]: { info: null, visible: false, loading: false } }))
      alert("Erreur réseau : " + e.message)
    }
  }

  const handleRemoveNetwork = async (vmName: string) => {
    try {
      await unexposeVmSsh(vmName)
      setNetworks(prev => ({ ...prev, [vmName]: { info: null, visible: false, loading: false } }))
    } catch (e: any) {
      alert("Erreur suppression SSH : " + e.message)
    }
  }

  const copyText = (text: string, key: string) => {
    navigator.clipboard.writeText(text)
    setCopied(key)
    setTimeout(() => setCopied(null), 2000)
  }

  const getOsLabel = (osImage?: string) => {
    if (!osImage) return null
    if (osImage.includes("ubuntu:24")) return "Ubuntu 24.04"
    if (osImage.includes("ubuntu:22")) return "Ubuntu 22.04"
    if (osImage.includes("debian"))    return "Debian 12"
    if (osImage.includes("rocky"))     return "Rocky Linux 9"
    if (osImage.includes("fedora"))    return "Fedora"
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

      {/* ✅ AlertDialog de confirmation suppression */}
      <AlertDialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer cette VM ?</AlertDialogTitle>
            <AlertDialogDescription>
              La VM <strong>{deleteTarget}</strong> sera définitivement supprimée.
              Cette action est irréversible.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteLoading}>Annuler</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive hover:bg-destructive/90 text-destructive-foreground gap-1.5"
              onClick={confirmDelete}
              disabled={deleteLoading}
            >
              {deleteLoading && <Loader2 className="size-3.5 animate-spin" />}
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

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
          const net  = networks[vm.name]

          return (
            <div key={vm.name} className="border border-border rounded-2xl overflow-hidden">

              {/* ── Header VM ── */}
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

                {/* ── Boutons d'action ── */}
                <div className="flex items-center gap-2 shrink-0 flex-wrap justify-end">

                  <Button
                    size="sm"
                    variant={activeVnc === vm.name ? "default" : "outline"}
                    className="h-8 gap-1.5 text-[12px]"
                    onClick={() => handleVnc(vm)}
                    disabled={vm.status !== "Running"}
                    title="Console VNC"
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
                    title="Voir login/mot de passe"
                  >
                    {cred?.loading
                      ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      : <KeyRound className="w-3.5 h-3.5" />}
                    Accès
                  </Button>

                  <Button
                    size="sm"
                    variant={net?.visible ? "default" : "outline"}
                    className="h-8 gap-1.5 text-[12px]"
                    onClick={() => handleNetwork(vm.name)}
                    disabled={net?.loading || vm.status !== "Running"}
                    title="Exposer SSH via NodePort"
                  >
                    {net?.loading
                      ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      : <Network className="w-3.5 h-3.5" />}
                    SSH
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
                    title="Redémarrer la VM"
                  >
                    {actionLoading === vm.name
                      ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      : <RotateCcw className="w-3.5 h-3.5" />}
                    Reboot
                  </Button>

                  <Button
                    size="sm" variant="outline"
                    className="h-8 gap-1.5 text-[12px] opacity-40 cursor-not-allowed"
                    disabled={true}
                    title="Nécessite un stockage persistant (DataVolume)"
                  >
                    <Camera className="w-3.5 h-3.5" />
                    Snapshot
                  </Button>

                  {/* ✅ Supprimer — ouvre AlertDialog au lieu de window.confirm */}
                  <Button
                    size="sm" variant="outline"
                    className="h-8 w-8 p-0 text-red-600 hover:text-red-700"
                    onClick={() => setDeleteTarget(vm.name)}
                    disabled={actionLoading === vm.name}
                    title="Supprimer la VM"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </div>

              {/* ── Panel Credentials ── */}
              {cred?.visible && (
                <div className="border-t border-border px-6 py-3 bg-muted/20 flex items-center gap-6 text-[12px]">
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
                    onClick={() => copyText(cred.password, `cred-${vm.name}`)}
                    title="Copier le mot de passe"
                  >
                    {copied === `cred-${vm.name}`
                      ? <Check className="w-3 h-3 text-emerald-600" />
                      : <Copy className="w-3 h-3" />}
                  </Button>
                </div>
              )}

              {/* ── Panel Réseau SSH ── */}
              {net?.visible && net.info && (
                <div className="border-t border-border px-6 py-4 bg-blue-50/30 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-[12px] font-medium">
                      <Network className="w-3.5 h-3.5 text-blue-600" />
                      <span>Accès SSH externe</span>
                      <span className="text-[10px] bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded-full">
                        NodePort {net.info.nodePort}
                      </span>
                    </div>
                    <Button
                      size="sm" variant="ghost"
                      className="h-6 w-6 p-0 text-muted-foreground hover:text-red-600"
                      onClick={() => handleRemoveNetwork(vm.name)}
                      title="Supprimer l'exposition SSH"
                    >
                      <X className="w-3.5 h-3.5" />
                    </Button>
                  </div>

                  <div className="grid grid-cols-3 gap-3 text-[12px]">
                    <div className="bg-white border border-border rounded-lg px-3 py-2">
                      <p className="text-muted-foreground text-[10px] mb-1">IP Node</p>
                      <code className="font-mono font-medium">{net.info.nodeIp}</code>
                    </div>
                    <div className="bg-white border border-border rounded-lg px-3 py-2">
                      <p className="text-muted-foreground text-[10px] mb-1">Port SSH</p>
                      <code className="font-mono font-medium">{net.info.nodePort}</code>
                    </div>
                    <div className="bg-white border border-border rounded-lg px-3 py-2">
                      <p className="text-muted-foreground text-[10px] mb-1">Type</p>
                      <code className="font-mono font-medium">{net.info.type}</code>
                    </div>
                  </div>

                  <div className="bg-zinc-900 rounded-lg px-4 py-3 flex items-center gap-3">
                    <Terminal className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
                    <code className="text-[12px] text-emerald-400 font-mono flex-1 break-all">
                      {net.info.sshCommand}
                    </code>
                    <Button
                      size="sm" variant="ghost"
                      className="h-6 w-6 p-0 text-zinc-400 hover:text-white shrink-0"
                      onClick={() => copyText(net.info!.sshCommand, `ssh-${vm.name}`)}
                      title="Copier la commande SSH"
                    >
                      {copied === `ssh-${vm.name}`
                        ? <Check className="w-3 h-3 text-emerald-400" />
                        : <Copy className="w-3 h-3" />}
                    </Button>
                  </div>

                  <p className="text-[11px] text-muted-foreground">
                    ⚠️ Accessible uniquement depuis le réseau VPN NextStep
                  </p>
                </div>
              )}

              {/* ── Console VNC ── */}
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