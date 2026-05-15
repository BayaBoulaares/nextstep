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
  Camera, Network, Terminal, X, Eye, EyeOff,
  LayoutDashboard, Activity, Settings, ScrollText,
  Layers, ShieldAlert, Wifi, GitBranch,
  Plus, Pencil, Lock as LockIcon,
  HardDrive, Globe, CalendarClock, Info,
} from "lucide-react"
import {
  getMyVms, startVm, stopVm, rebootVm, deleteVm, getVncUrl,
  getVmCredentials, getVmNetwork, exposeVmSsh, unexposeVmSsh,
  getVmMetrics, getVmEvents, cloneVm,
  getVmConfig, updateVmConfig,
  setInterfaceLinkState, updateVmInterface, deleteVmInterface,
  listSnapshots, createSnapshot, deleteSnapshot, restoreSnapshot,
  type VmDTO, type VmNetworkInfo, type VmMetrics, type VmEvent,
  type VmCloneRequest, type VmCloneResult,
  type VmConfigDTO, type VmSnapshot,
} from "@/lib/services/vms.api"
import { cn } from "@/lib/utils"
import { VncConsole } from "@/components/vms/VncConsole"
import { PasswordDialog } from "@/components/vms/PasswordDialog"

// ─────────────────────────────────────────────
// Constantes
// ─────────────────────────────────────────────
const STATUS_STYLE: Record<string, string> = {
  Running:          "bg-emerald-50 text-emerald-700 border-emerald-200",
  Stopped:          "bg-zinc-50 text-zinc-500 border-zinc-200",
  ImagePullBackOff: "bg-red-50 text-red-600 border-red-200",
  Provisioning:     "bg-amber-50 text-amber-700 border-amber-200",
  ImportInProgress: "bg-blue-50 text-blue-700 border-blue-200",
}

type TabId = "overview"|"metrics"|"config"|"events"|"console"|"ssh"|"acces"|"snapshots"|"diag"
interface Tab { id: TabId; label: string; icon: React.ReactNode }

const TABS: Tab[] = [
  { id: "overview",  label: "Vue d'ensemble", icon: <LayoutDashboard className="w-3.5 h-3.5" /> },
  { id: "metrics",   label: "Métriques",      icon: <Activity        className="w-3.5 h-3.5" /> },
  { id: "config",    label: "Configuration",  icon: <Settings        className="w-3.5 h-3.5" /> },
  { id: "events",    label: "Événements",     icon: <ScrollText      className="w-3.5 h-3.5" /> },
  { id: "console",   label: "Console",        icon: <Monitor         className="w-3.5 h-3.5" /> },
  { id: "ssh",       label: "SSH",            icon: <Wifi            className="w-3.5 h-3.5" /> },
  { id: "acces",     label: "Accès",          icon: <KeyRound        className="w-3.5 h-3.5" /> },
  { id: "snapshots", label: "Instantanés",    icon: <Layers          className="w-3.5 h-3.5" /> },
  { id: "diag",      label: "Diagnostics",    icon: <ShieldAlert     className="w-3.5 h-3.5" /> },
]

type CredState = { login: string; password: string; visible: boolean; loading: boolean; pwVisible: boolean }
type NetState  = { info: VmNetworkInfo | null; visible: boolean; loading: boolean }

// ─────────────────────────────────────────────
// Helpers UI
// ─────────────────────────────────────────────
function ProgressBar({ value, color = "bg-zinc-700" }: { value: number; color?: string }) {
  return (
    <div className="h-1.5 w-full bg-zinc-100 rounded-full overflow-hidden mt-2">
      <div className={cn("h-full rounded-full transition-all", color)} style={{ width: `${Math.min(value, 100)}%` }} />
    </div>
  )
}

function InfoCard({ label, value, mono = true }: { label: string; value: React.ReactNode; mono?: boolean }) {
  return (
    <div className="bg-muted/40 border border-border/60 rounded-xl px-3 py-2.5">
      <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">{label}</p>
      <p className={cn("text-[13px] font-medium truncate", mono && "font-mono")}>{value ?? "—"}</p>
    </div>
  )
}

function getOsLabel(osImage?: string | null): string {
  if (!osImage) return "—"
  if (osImage.includes("noble")      || osImage.includes("ubuntu/24")  || osImage.includes("ubuntu:24"))  return "Ubuntu 24.04"
  if (osImage.includes("ubuntu-2404")|| osImage.includes("ubuntu2404"))                                    return "Ubuntu 24.04"
  if (osImage.includes("jammy")      || osImage.includes("ubuntu/22")  || osImage.includes("ubuntu:22"))  return "Ubuntu 22.04"
  if (osImage.includes("ubuntu-2204")|| osImage.includes("ubuntu2204"))                                    return "Ubuntu 22.04"
  if (osImage.includes("bookworm")   || osImage.includes("debian-12"))                                     return "Debian 12"
  if (osImage.includes("bullseye")   || osImage.includes("debian-11"))                                     return "Debian 11"
  if (osImage.includes("Rocky-9")    || osImage.includes("rocky"))                                         return "Rocky Linux 9"
  if (osImage.includes("fedora"))                                                                           return "Fedora"
  return osImage.split("/").pop()?.split("?")[0] ?? osImage
}

// ─────────────────────────────────────────────
// NetworkSection — composant autonome (hors VmDetailCard)
// ─────────────────────────────────────────────
function NetworkSection({ config, vmName, vmStatus, notify }: { config: VmConfigDTO | null; vmName: string; vmStatus: string; notify: (msg:string, type?:"info"|"warn"|"error")=>void }) {
  const [search,        setSearch]        = React.useState("")
  const [openMenu,      setOpenMenu]      = React.useState<string | null>(null)
  const [editModal,     setEditModal]     = React.useState<string | null>(null)
  const [editModel,     setEditModel]     = React.useState("virtio")
  const [deleteConfirm, setDeleteConfirm] = React.useState<string | null>(null)
  const [actionBusy,    setActionBusy]    = React.useState<string | null>(null)
  const [actionErr,     setActionErr]     = React.useState<string | null>(null)
  const [localNets,     setLocalNets]     = React.useState(config?.networks ?? [])

  React.useEffect(() => { setLocalNets(config?.networks ?? []) }, [config])

  const filtered = localNets.filter(n => n.name.toLowerCase().includes(search.toLowerCase()))

  const handleLinkDown = async (ifaceName: string, currentlyDown: boolean) => {
    setActionBusy(ifaceName); setActionErr(null)
    try {
      await setInterfaceLinkState(vmName, ifaceName, !currentlyDown)
      setLocalNets(prev => prev.map(n => n.name === ifaceName ? { ...n, linkDown: !currentlyDown } : n))
    } catch (e: any) { setActionErr(e.message) }
    finally { setActionBusy(null); setOpenMenu(null) }
  }

  const handleEditOpen = (ifaceName: string, currentModel: string) => {
    setEditModel(currentModel); setEditModal(ifaceName); setOpenMenu(null)
  }

  const handleEditSave = async () => {
    if (!editModal) return
    setActionBusy(editModal); setActionErr(null)
    try {
      await updateVmInterface(vmName, editModal, editModel)
      setLocalNets(prev => prev.map(n => n.name === editModal ? { ...n, model: editModel } : n))
      setEditModal(null)
    } catch (e: any) { setActionErr(e.message) }
    finally { setActionBusy(null) }
  }

  const handleDelete = async (ifaceName: string) => {
    setActionBusy(ifaceName); setActionErr(null)
    try {
      await deleteVmInterface(vmName, ifaceName)
      setLocalNets(prev => prev.filter(n => n.name !== ifaceName))
      setDeleteConfirm(null)
    } catch (e: any) { setActionErr(e.message); setDeleteConfirm(null) }
    finally { setActionBusy(null) }
  }

  return (
    <div className="space-y-3">

      {/* Modal édition */}
      {editModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="bg-card border border-border rounded-2xl shadow-2xl w-full max-w-sm mx-4 overflow-hidden">
            <div className="px-5 py-4 border-b border-border/60 flex items-center justify-between">
              <p className="text-[14px] font-semibold">Modifier l'interface</p>
              <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => setEditModal(null)}>
                <X className="w-4 h-4" />
              </Button>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label className="text-[11px] text-muted-foreground uppercase tracking-wider mb-1.5 block">Interface</label>
                <code className="text-[13px] font-mono font-medium">{editModal}</code>
              </div>
              <div>
                <label className="text-[11px] text-muted-foreground uppercase tracking-wider mb-1.5 block">Modèle</label>
                <select value={editModel} onChange={e => setEditModel(e.target.value)}
                  className="w-full h-9 rounded-lg border border-border bg-muted/40 px-3 text-[13px] focus:outline-none focus:ring-1 focus:ring-ring">
                  <option value="virtio">virtio</option>
                  <option value="e1000">e1000</option>
                  <option value="e1000e">e1000e</option>
                  <option value="rtl8139">rtl8139</option>
                </select>
              </div>
              {actionErr && <p className="text-[11px] text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{actionErr}</p>}
              <div className="flex gap-2">
                <Button variant="outline" className="flex-1 h-9 text-[12px]" onClick={() => setEditModal(null)} disabled={!!actionBusy}>Annuler</Button>
                <Button className="flex-1 h-9 text-[12px]" onClick={handleEditSave} disabled={!!actionBusy}>
                  {actionBusy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                  Enregistrer
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal suppression */}
      {deleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="bg-card border border-border rounded-2xl shadow-2xl w-full max-w-sm mx-4 overflow-hidden">
            <div className="px-5 py-4 border-b border-border/60">
              <p className="text-[14px] font-semibold">Supprimer l'interface ?</p>
              <p className="text-[12px] text-muted-foreground mt-1">La VM doit être arrêtée. Cette action est irréversible.</p>
            </div>
            <div className="px-5 py-3 bg-muted/20">
              <code className="text-[12px] font-mono font-medium">{deleteConfirm}</code>
            </div>
            {actionErr && <div className="px-5 py-2"><p className="text-[11px] text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{actionErr}</p></div>}
            <div className="flex gap-2 px-5 py-4">
              <Button variant="outline" className="flex-1 h-9 text-[12px]"
                onClick={() => { setDeleteConfirm(null); setActionErr(null) }} disabled={!!actionBusy}>Annuler</Button>
              <Button className="flex-1 h-9 text-[12px] bg-destructive hover:bg-destructive/90 text-destructive-foreground gap-1.5"
                onClick={() => handleDelete(deleteConfirm)} disabled={!!actionBusy}>
                {actionBusy ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Suppression…</> : <><Trash2 className="w-3.5 h-3.5" /> Supprimer</>}
              </Button>
            </div>
          </div>
        </div>
      )}

      <p className="text-[13px] font-medium">Interfaces réseau</p>
      {actionErr && !editModal && !deleteConfirm && (
        <p className="text-[11px] text-red-600 bg-red-50 border border-red-200 rounded-xl px-3 py-2">{actionErr}</p>
      )}

      {vmStatus !== "Stopped" && (
        <p className="text-[11px] text-amber-700 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2">
          ⚠ La VM doit être arrêtée pour modifier les interfaces réseau.
        </p>
      )}
      <Button size="sm" className="h-8 gap-1.5 text-[12px] bg-blue-600 hover:bg-blue-700 text-white"
        disabled={vmStatus !== "Stopped"}
        title={vmStatus !== "Stopped" ? "Arrêtez la VM avant d'ajouter une interface" : "Ajouter une interface réseau"}
        onClick={() => notify("Fonctionnalité bientôt disponible — nécessite un patch YAML KubeVirt.", "info")}>
        <Plus className="w-3.5 h-3.5" /> Ajouter une interface réseau
      </Button>

      <div className="flex items-center gap-2">
        <Button size="sm" variant="outline" className="h-8 gap-1.5 text-[12px]">
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4h18M6 8h12M9 12h6" />
          </svg>
          Filtre
          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </Button>
        <Button size="sm" variant="outline" className="h-8 gap-1.5 text-[12px]">
          Nom
          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </Button>
        <div className="flex-1 relative">
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Rechercher par nom..."
            className="w-full h-8 rounded-lg border border-border bg-muted/40 px-3 pr-8 text-[12px] focus:outline-none focus:ring-1 focus:ring-ring" />
          <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[11px] text-muted-foreground font-mono">/</span>
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-10 text-muted-foreground">
          <Network className="w-10 h-10 mx-auto mb-3 opacity-20" />
          <p className="text-[13px]">{search ? "Aucun résultat." : "Aucune définition d'interface réseau trouvée."}</p>
          {!search && <p className="text-[11px] mt-1 opacity-70">La VM utilise une interface et une configuration réseau par défaut.</p>}
        </div>
      ) : (
        <div className="border border-border/50 rounded-xl overflow-visible">
          <div className="grid grid-cols-[1fr_1fr_1.5fr_0.6fr_1fr_1.3fr_28px] bg-muted/40 border-b border-border/50 px-3 py-2 text-[10px] text-muted-foreground uppercase tracking-wider font-medium rounded-t-xl">
            {["Nom ↑","Modèle ↕","Réseau ↕","État ↕","Type ↕","Adresse... ↕",""].map((h,i) => (
              <span key={i} className={cn("flex items-center", i===0 && "text-blue-600 font-semibold")}>{h}</span>
            ))}
          </div>
          {filtered.map(n => {
            const isDown = (n as any).linkDown === true
            const busy   = actionBusy === n.name
            return (
              <div key={n.name}
                className="grid grid-cols-[1fr_1fr_1.5fr_0.6fr_1fr_1.3fr_28px] items-center px-3 py-3 border-b border-border/30 last:border-0 hover:bg-muted/20 text-[12px] relative">
                <span className="font-mono font-medium">{n.name}</span>
                <span className="font-mono">{n.model}</span>
                <span className="text-[11px]">{n.networkName === "Pod Networking" ? "Mise en réseau des pods" : n.networkName}</span>
                <span>
                  {busy ? <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
                  : isDown ? (
                    <svg viewBox="0 0 24 24" className="w-6 h-6" fill="none">
                      <circle cx="12" cy="12" r="11" fill="#f3f4f6"/>
                      <rect x="9" y="7" width="6" height="7" rx="1" fill="#9ca3af"/>
                      <rect x="10" y="6" width="1.5" height="2" rx="0.5" fill="#9ca3af"/>
                      <rect x="12.5" y="6" width="1.5" height="2" rx="0.5" fill="#9ca3af"/>
                      <path d="M12 14v3" stroke="#9ca3af" strokeWidth="1.5" strokeLinecap="round"/>
                    </svg>
                  ) : (
                    <svg viewBox="0 0 24 24" className="w-6 h-6" fill="none">
                      <circle cx="12" cy="12" r="11" fill="#e6f4ea"/>
                      <rect x="9" y="7" width="6" height="7" rx="1" fill="#1e7e34"/>
                      <rect x="10" y="6" width="1.5" height="2" rx="0.5" fill="#1e7e34"/>
                      <rect x="12.5" y="6" width="1.5" height="2" rx="0.5" fill="#1e7e34"/>
                      <path d="M12 14v3" stroke="#1e7e34" strokeWidth="1.5" strokeLinecap="round"/>
                      <circle cx="17" cy="7" r="4" fill="#1e7e34"/>
                      <path d="M17 5v4M15 7h4" stroke="white" strokeWidth="1.2" strokeLinecap="round"/>
                    </svg>
                  )}
                </span>
                <span className="capitalize">
                  {n.model==="masquerade"?"Masquerade":n.model==="bridge"?"Bridge":n.model}
                </span>
                <span className="font-mono text-[11px] text-muted-foreground truncate">
                  {n.macAddress !== "—" ? n.macAddress : "—"}
                </span>
                <div className="relative flex items-center justify-center">
                  <button className="w-6 h-6 rounded flex items-center justify-center hover:bg-muted text-muted-foreground hover:text-foreground"
                    onClick={e => { e.stopPropagation(); setOpenMenu(openMenu===n.name?null:n.name) }}
                    disabled={busy}>
                    <svg viewBox="0 0 24 24" className="w-4 h-4" fill="currentColor">
                      <circle cx="12" cy="5" r="1.5"/><circle cx="12" cy="12" r="1.5"/><circle cx="12" cy="19" r="1.5"/>
                    </svg>
                  </button>
                  {openMenu === n.name && (
                    <>
                      <div className="fixed inset-0 z-40" onClick={() => setOpenMenu(null)} />
                      <div className="absolute right-0 top-7 z-50 bg-card border border-border rounded-xl shadow-xl w-52 py-1 overflow-hidden">
                        <button className="w-full text-left px-4 py-2.5 text-[12px] hover:bg-muted/60 transition-colors"
                          onClick={() => handleLinkDown(n.name, isDown)}>
                          {isDown ? "Remettre le lien en ligne" : "Définir le lien vers le bas"}
                        </button>
                        <button className="w-full text-left px-4 py-2.5 text-[12px] hover:bg-muted/60 transition-colors"
                          onClick={() => handleEditOpen(n.name, n.model)}>Modifier</button>
                        <div className="h-px bg-border/50 my-1" />
                        <button className="w-full text-left px-4 py-2.5 text-[12px] text-red-600 hover:bg-red-50 transition-colors"
                          onClick={() => { setDeleteConfirm(n.name); setOpenMenu(null) }}>Supprimer</button>
                      </div>
                    </>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}


// ─────────────────────────────────────────────
// Notify — remplace alert() natif du browser
// ─────────────────────────────────────────────
interface NotifyItem { id: string; type: "info"|"warn"|"error"; msg: string }

function useNotify() {
  const [items, setItems] = React.useState<NotifyItem[]>([])
  const show = React.useCallback((msg: string, type: NotifyItem["type"] = "info") => {
    const id = Math.random().toString(36).slice(2)
    setItems(prev => [...prev, { id, type, msg }])
    setTimeout(() => setItems(prev => prev.filter(i => i.id !== id)),
      type === "error" ? 7000 : 4000)
  }, [])
  const dismiss = (id: string) => setItems(prev => prev.filter(i => i.id !== id))
  return { items, show, dismiss }
}

function NotifyContainer({ items, dismiss }: { items: NotifyItem[]; dismiss: (id:string)=>void }) {
  if (!items.length) return null
  const STYLE: Record<string, string> = {
    info:  "bg-blue-50 border-blue-200 text-blue-800",
    warn:  "bg-amber-50 border-amber-200 text-amber-800",
    error: "bg-red-50 border-red-200 text-red-800",
  }
  const ICON: Record<string, React.ReactNode> = {
    info:  <Info          className="w-4 h-4 flex-shrink-0 text-blue-600"  />,
    warn:  <ShieldAlert   className="w-4 h-4 flex-shrink-0 text-amber-600" />,
    error: <X             className="w-4 h-4 flex-shrink-0 text-red-600"   />,
  }
  return (
    <div className="fixed bottom-4 right-4 z-[200] flex flex-col gap-2 max-w-sm w-full pointer-events-none">
      {items.map(item => (
        <div key={item.id}
          className={cn(
            "flex items-start gap-3 px-4 py-3 rounded-xl border shadow-xl pointer-events-auto",
            STYLE[item.type]
          )}>
          {ICON[item.type]}
          <p className="flex-1 text-[12px] leading-relaxed">{item.msg}</p>
          <button onClick={() => dismiss(item.id)} className="opacity-50 hover:opacity-100 flex-shrink-0">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      ))}
    </div>
  )
}

// ─────────────────────────────────────────────
// CloneModal
// ─────────────────────────────────────────────
function CloneModal({ vm, onClose, onSuccess }: { vm: VmDTO; onClose: () => void; onSuccess: () => Promise<void> }) {
  const [cloneName,    setCloneName]    = React.useState("")
  const [cloneLoading, setCloneLoading] = React.useState(false)
  const [cloneError,   setCloneError]   = React.useState<string | null>(null)
  const [cloneResult,  setCloneResult]  = React.useState<VmCloneResult | null>(null)
  const [copied,       setCopied]       = React.useState(false)

  const nameRegex = /^[a-z0-9][a-z0-9\-]{1,30}[a-z0-9]$/

  const handleClone = async () => {
    const trimmed = cloneName.trim()
    if (!trimmed) { setCloneError("Le nom du clone est requis."); return }
    if (!nameRegex.test(trimmed)) { setCloneError("Nom invalide : minuscules, chiffres et tirets uniquement (3–32 caractères)."); return }
    setCloneLoading(true); setCloneError(null)
    try {
      const result = await cloneVm(vm.name, { cloneName: trimmed })
      setCloneResult(result); await onSuccess()
    } catch (e: any) {
      const msg: string = e.message ?? "Erreur inconnue"
      if (msg.includes("Succeeded")) setCloneError("Le DataVolume source n'est pas encore prêt. Réessayez dans quelques instants.")
      else if (msg.includes("CONFLICT") || msg.includes("existe déjà")) setCloneError(`Une VM nommée "${trimmed}" existe déjà.`)
      else setCloneError(msg)
    } finally { setCloneLoading(false) }
  }

  const copyPassword = () => {
    if (!cloneResult) return
    navigator.clipboard.writeText(cloneResult.password)
    setCopied(true); setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="bg-card border border-border rounded-2xl shadow-2xl w-full max-w-md mx-4 overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-border/60 bg-muted/20">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-violet-100 border border-violet-200 flex items-center justify-center">
              <GitBranch className="w-4 h-4 text-violet-600" />
            </div>
            <div>
              <p className="text-[14px] font-semibold">Cloner la VM</p>
              <p className="text-[11px] text-muted-foreground font-mono">{vm.name}</p>
            </div>
          </div>
          <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={onClose}><X className="w-4 h-4" /></Button>
        </div>
        <div className="p-5 space-y-4">
          {cloneResult ? (
            <div className="space-y-3">
              <div className="bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-3 text-[12px] text-emerald-700 flex items-start gap-2">
                <Check className="w-4 h-4 mt-0.5 flex-shrink-0" />
                <span>VM <code className="font-mono font-medium">{cloneResult.vmName}</code> clonée avec succès.</span>
              </div>
              <div className="bg-muted/40 border border-border/60 rounded-xl px-4 py-3 space-y-1.5">
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Mot de passe généré</p>
                <div className="flex items-center gap-2">
                  <code className="font-mono text-[14px] font-semibold flex-1">{cloneResult.password}</code>
                  <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={copyPassword}>
                    {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                  </Button>
                </div>
                <p className="text-[10px] text-muted-foreground">Conservez ce mot de passe — il ne sera plus affiché.</p>
              </div>
              <div className="bg-amber-50 border border-amber-200 rounded-xl px-3 py-2.5 text-[11px] text-amber-700">
                <p>⚠ La VM clone démarre à l'état <strong>Stopped</strong>.</p>
              </div>
              <Button className="w-full h-9 text-[13px]" onClick={onClose}>Fermer</Button>
            </div>
          ) : (
            <>
              <div className="bg-muted/30 border border-border/50 rounded-xl px-4 py-3 text-[12px] space-y-1.5">
                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-muted-foreground">VM source</span>
                  <code className="font-mono font-medium">{vm.name}</code>
                </div>
                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-muted-foreground">OS</span>
                  <span>{getOsLabel(vm.osImage)}</span>
                </div>
              </div>
              {vm.dataVolumePhase && vm.dataVolumePhase !== "Succeeded" && (
                <div className="bg-amber-50 border border-amber-200 rounded-xl px-3 py-2.5 text-[11px] text-amber-700 flex items-center gap-2">
                  <Loader2 className="w-3.5 h-3.5 animate-spin flex-shrink-0" />
                  DataVolume en phase <strong>{vm.dataVolumePhase}</strong> — clonage refusé.
                </div>
              )}
              <div className="space-y-1.5">
                <label className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
                  Nom du clone <span className="text-red-500">*</span>
                </label>
                <input type="text" placeholder={`${vm.name}-clone`} value={cloneName}
                  onChange={e => { setCloneName(e.target.value); setCloneError(null) }}
                  onKeyDown={e => e.key==="Enter" && !cloneLoading && handleClone()} autoFocus
                  className={cn("w-full h-9 rounded-lg border bg-muted/40 px-3 text-[13px] font-mono focus:outline-none focus:ring-1 focus:ring-ring transition-colors",
                    cloneError ? "border-red-300" : "border-border")} />
                <p className="text-[10px] text-muted-foreground">Minuscules, chiffres et tirets · 3–32 caractères</p>
              </div>
              {cloneError && (
                <div className="bg-red-50 border border-red-200 rounded-xl px-3 py-2.5 text-[11px] text-red-600 flex items-start gap-2">
                  <X className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />{cloneError}
                </div>
              )}
              <div className="flex gap-2 pt-1">
                <Button variant="outline" className="flex-1 h-9 text-[12px]" onClick={onClose} disabled={cloneLoading}>Annuler</Button>
                <Button className="flex-1 h-9 gap-1.5 text-[12px] bg-violet-600 hover:bg-violet-700 text-white"
                  onClick={handleClone} disabled={cloneLoading || !cloneName.trim()}>
                  {cloneLoading ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Clonage…</> : <><GitBranch className="w-3.5 h-3.5" /> Cloner</>}
                </Button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────
// VmDetailCard
// ─────────────────────────────────────────────
function VmDetailCard({ vm, onAction, actionLoading, onDeleteRequest, onRefresh, notify }: {
  vm: VmDTO; onAction: (fn: () => Promise<void>, name: string) => Promise<void>
  actionLoading: string | null; onDeleteRequest: (name: string) => void; onRefresh: () => Promise<void>
  notify: (msg: string, type?: "info"|"warn"|"error") => void
}) {
  const [activeTab,    setActiveTab]    = React.useState<TabId>("overview")
  const [vncData,      setVncData]      = React.useState<{ url: string; token: string } | null>(null)
  const [cred,         setCred]         = React.useState<CredState | null>(null)
  const [net,          setNet]          = React.useState<NetState>({ info: null, visible: false, loading: false })
  const [metrics,      setMetrics]      = React.useState<VmMetrics | null>(null)
  const [metricsLoad,  setMetricsLoad]  = React.useState(false)
  const [events,       setEvents]       = React.useState<VmEvent[]>([])
  const [eventsLoad,   setEventsLoad]   = React.useState(false)
  const [copied,       setCopied]       = React.useState<string | null>(null)
  const [showClone,    setShowClone]    = React.useState(false)
  const [snapCreating, setSnapCreating] = React.useState(false)

  const isRunning = vm.status === "Running"
  const isBusy    = actionLoading === vm.name

  const copyText = (text: string, key: string) => {
    navigator.clipboard.writeText(text); setCopied(key)
    setTimeout(() => setCopied(null), 2000)
  }

  const handleTabChange = async (tabId: TabId) => {
    setActiveTab(tabId)
    if (tabId==="console" && !vncData && isRunning) {
      try { const d = await getVncUrl(vm.name); setVncData(d) }
      catch (e: any) { notify("Impossible d'ouvrir la console VNC : " + e.message, "error") }
    }
    if (tabId==="acces" && !cred) {
      setCred({ login:"", password:"", visible:false, loading:true, pwVisible:false })
      try { const d = await getVmCredentials(vm.name); setCred({...d, visible:true, loading:false, pwVisible:false}) }
      catch { setCred({ login:"ubuntu", password:"non-disponible", visible:true, loading:false, pwVisible:false }) }
    }
    if (tabId==="ssh" && !net.info && !net.loading) {
      setNet({ info:null, visible:false, loading:true })
      try {
        const services = await getVmNetwork(vm.name)
        const info = services.length>0 ? services[0] : await exposeVmSsh(vm.name)
        setNet({ info, visible:true, loading:false })
      } catch (e: any) { setNet({ info:null, visible:false, loading:false }); notify("Erreur réseau : "+e.message, "error") }
    }
    if (tabId==="metrics" && !metrics && !metricsLoad) {
      setMetricsLoad(true)
      try { setMetrics(await getVmMetrics(vm.name)) } catch {}
      finally { setMetricsLoad(false) }
    }
    if (tabId==="events" && events.length===0 && !eventsLoad) {
      setEventsLoad(true)
      try { setEvents(await getVmEvents(vm.name)) } catch {}
      finally { setEventsLoad(false) }
    }
  }

  const handleQuickSnapshot = async () => {
    setSnapCreating(true)
    try { await createSnapshot(vm.name, undefined); await handleTabChange("snapshots") }
    catch (e: any) { notify("Snapshot échoué : "+e.message, "error") }
    finally { setSnapCreating(false) }
  }

  // ── PanelOverview ──
  const PanelOverview = () => (
    <div className="p-5 space-y-4">
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
        <InfoCard label="Nom"      value={vm.name} />
        <InfoCard label="Statut"   value={
          <span className={cn("px-2 py-0.5 rounded-full text-[11px] border font-medium",
            STATUS_STYLE[vm.status] ?? "bg-muted text-muted-foreground border-border")}>
            {vm.status}
          </span>
        } mono={false} />
        <InfoCard label="OS"       value={getOsLabel(vm.osImage)} mono={false} />
        <InfoCard label="Namespace" value={vm.namespace} />
        <InfoCard label="IP"       value={
          vm.ip
            ? <span className="flex items-center gap-1">{vm.ip}
                <button onClick={() => copyText(vm.ip!, "ip")} className="ml-1">
                  {copied==="ip" ? <Check className="w-3 h-3 text-emerald-500"/> : <Copy className="w-3 h-3 text-muted-foreground"/>}
                </button>
              </span>
            : <span className="text-muted-foreground/50 text-[12px]">Non assignée</span>
        } mono={false} />
        <InfoCard label="CPU | RAM" value={`${vm.cpuCores??"?"} vCPU | ${vm.ramGb??""}`} />
        <InfoCard label="Nœud"     value={vm.node ?? "—"} />
        <InfoCard label="Créée le" value={vm.createdAt ? new Date(vm.createdAt).toLocaleDateString("fr-FR") : "—"} mono={false} />
        <InfoCard label="Machine"  value={vm.machineType ?? "—"} />
      </div>
      {vm.fqdn && (
        <div className="bg-muted/40 border border-border/60 rounded-xl px-3 py-2.5 text-[12px]">
          <span className="text-muted-foreground text-[10px] uppercase tracking-wider">FQDN interne : </span>
          <code className="font-mono">{vm.fqdn}</code>
        </div>
      )}
      {vm.availabilitySet && (
        <div className="bg-blue-50 border border-blue-100 rounded-xl px-3 py-2.5 text-[12px]">
          <span className="text-blue-600 font-medium">🔗 Availability Set : </span>
          <code className="font-mono text-blue-700">{vm.availabilitySet}</code>
        </div>
      )}
      {vm.dataVolumePhase === "ImportInProgress" && (
        <span className="text-[10px] text-blue-600 bg-blue-50 border border-blue-100 px-2 py-0.5 rounded-full flex items-center gap-1">
          <Loader2 className="w-3 h-3 animate-spin" /> Import en cours...
        </span>
      )}
    </div>
  )

  // ── PanelMetrics ──
  const PanelMetrics = () => {
    if (metricsLoad) return <div className="flex justify-center py-12"><Loader2 className="size-4 animate-spin text-muted-foreground"/></div>
    const m = metrics
    return (
      <div className="p-5 space-y-4">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {([
            { label:"CPU",     value: m?`${m.cpuPercent.toFixed(2)}%`:"—",  sub:"Demandé de 1",                        pct:m?.cpuPercent,  color:"bg-blue-500"   },
            { label:"Mémoire", value: m?`${m.memPercent.toFixed(1)}%`:"—",  sub:m?`${m.memUsedMiB} MiB / ${m.memTotalMiB} MiB`:"", pct:m?.memPercent,  color:"bg-amber-500"  },
            { label:"Disque",  value: m?`${m.diskPercent.toFixed(2)}%`:"—", sub:m?.diskUsed??"",                       pct:m?.diskPercent, color:"bg-emerald-500"},
            { label:"Réseau",  value: m?`${m.netBps} Bps`:"—",             sub:"Transfert total",                     pct:undefined,      color:""              },
          ] as const).map(({ label, value, sub, pct, color }) => (
            <div key={label} className="bg-muted/40 border border-border/60 rounded-xl px-3 py-3">
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">{label}</p>
              <p className="text-[20px] font-medium">{value}</p>
              <p className="text-[11px] text-muted-foreground">{sub}</p>
              {pct!==undefined && <ProgressBar value={pct} color={color} />}
            </div>
          ))}
        </div>
        {!m && (
          <p className="text-[11px] text-muted-foreground bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">
            ⚠ Endpoint <code className="font-mono">GET /api/vms/{"{name}"}/metrics</code> requis côté backend.
          </p>
        )}
      </div>
    )
  }

  // ── PanelConfig ──
  const PanelConfig = () => {
    type ConfigSection = "details"|"storage"|"network"|"scheduling"|"ssh"
    const [section,      setSection]      = React.useState<ConfigSection>("details")
    const [config,       setConfig]       = React.useState<VmConfigDTO | null>(null)
    const [configLoad,   setConfigLoad]   = React.useState(true)
    const [configErr,    setConfigErr]    = React.useState<string | null>(null)
    const [saving,       setSaving]       = React.useState(false)
    const [saveOk,       setSaveOk]       = React.useState(false)
    const [editDesc,     setEditDesc]     = React.useState(false)
    const [editCpu,      setEditCpu]      = React.useState(false)
    const [editHostname, setEditHostname] = React.useState(false)
    const [draftDesc,    setDraftDesc]    = React.useState("")
    const [draftCpu,     setDraftCpu]     = React.useState("")
    const [draftRam,     setDraftRam]     = React.useState("")
    const [draftHost,    setDraftHost]    = React.useState("")
    const [draftOpts,    setDraftOpts]    = React.useState({ headlessMode:false, guestLogAccess:true, deleteProtection:false })

    React.useEffect(() => {
      setConfigLoad(true); setConfigErr(null)
      getVmConfig(vm.name)
        .then(d => {
          setConfig(d)
          setDraftDesc(d.details.description ?? "")
          setDraftCpu(d.details.cpuCores ?? "1")
          setDraftRam(d.details.ram ?? "1Gi")
          setDraftHost(d.details.hostname ?? vm.name)
          setDraftOpts({ headlessMode:d.details.headlessMode, guestLogAccess:d.details.guestLogAccess, deleteProtection:d.details.deleteProtection })
        })
        .catch(e => setConfigErr(e.message))
        .finally(() => setConfigLoad(false))
    }, [])

    const saveDetails = async () => {
      setSaving(true)
      try {
        await updateVmConfig(vm.name, { description:draftDesc, cpuCores:draftCpu, ram:draftRam, hostname:draftHost, ...draftOpts })
        setSaveOk(true); setEditDesc(false); setEditCpu(false); setEditHostname(false)
        setTimeout(() => setSaveOk(false), 2000)
        const d = await getVmConfig(vm.name); setConfig(d)
      } catch (e: any) { notify("Erreur sauvegarde : "+e.message, "error") }
      finally { setSaving(false) }
    }

    const NAV: { id: ConfigSection; label: string; icon: React.ReactNode }[] = [
      { id:"details",    label:"Détails",      icon:<Info          className="w-3.5 h-3.5"/> },
      { id:"storage",    label:"Stockage",     icon:<HardDrive     className="w-3.5 h-3.5"/> },
      { id:"network",    label:"Réseau",       icon:<Globe         className="w-3.5 h-3.5"/> },
      { id:"scheduling", label:"Planification",icon:<CalendarClock className="w-3.5 h-3.5"/> },
      { id:"ssh",        label:"SSH",          icon:<LockIcon      className="w-3.5 h-3.5"/> },
    ]

    if (configLoad) return <div className="flex justify-center py-12"><Loader2 className="size-4 animate-spin text-muted-foreground"/></div>
    if (configErr)  return <div className="p-5"><p className="text-[12px] text-red-600 bg-red-50 border border-red-200 rounded-xl px-4 py-3">Erreur : {configErr}</p></div>

    return (
      <div className="flex min-h-[380px]">
        <nav className="w-36 border-r border-border/50 flex-shrink-0 py-2">
          {NAV.map(s => (
            <button key={s.id} onClick={() => setSection(s.id)}
              className={cn("w-full text-left flex items-center gap-2 px-4 py-2.5 text-[12px] transition-colors",
                section===s.id ? "text-foreground font-medium border-l-2 border-foreground bg-muted/30"
                               : "text-muted-foreground hover:text-foreground border-l-2 border-transparent")}>
              {s.icon}{s.label}
            </button>
          ))}
        </nav>

        <div className="flex-1 p-5 overflow-auto space-y-4">

          {/* DÉTAILS */}
          {section==="details" && (
            <>
              <div className="flex items-center justify-between mb-1">
                <p className="text-[13px] font-medium">Détails de la machine virtuelle</p>
                {saveOk && <span className="text-[11px] text-emerald-600 flex items-center gap-1"><Check className="w-3 h-3"/>Enregistré</span>}
              </div>
              <div className="border border-border/50 rounded-xl px-4 py-3 space-y-1.5">
                <div className="flex items-center justify-between">
                  <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">Description</p>
                  <Button size="sm" variant="ghost" className="h-6 w-6 p-0" onClick={() => setEditDesc(!editDesc)}><Pencil className="w-3 h-3"/></Button>
                </div>
                {editDesc
                  ? <input value={draftDesc} onChange={e=>setDraftDesc(e.target.value)} placeholder="Aucune"
                      className="w-full h-8 rounded-lg border border-border bg-muted/40 px-3 text-[12px] focus:outline-none focus:ring-1 focus:ring-ring"/>
                  : <p className="text-[13px]">{config?.details.description||"Aucune"}</p>}
              </div>
              <div className="border border-border/50 rounded-xl px-4 py-3 space-y-2">
                <div className="flex items-center justify-between">
                  <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">CPU | Mémoire</p>
                  <Button size="sm" variant="ghost" className="h-6 w-6 p-0" onClick={() => setEditCpu(!editCpu)}><Pencil className="w-3 h-3"/></Button>
                </div>
                {editCpu ? (
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-[10px] text-muted-foreground mb-1 block">vCPU</label>
                      <input type="number" min={1} max={16} value={draftCpu} onChange={e=>setDraftCpu(e.target.value)}
                        className="w-full h-8 rounded-lg border border-border bg-muted/40 px-3 text-[12px] font-mono focus:outline-none focus:ring-1 focus:ring-ring"/>
                    </div>
                    <div>
                      <label className="text-[10px] text-muted-foreground mb-1 block">RAM (ex: 2Gi)</label>
                      <input value={draftRam} onChange={e=>setDraftRam(e.target.value)}
                        className="w-full h-8 rounded-lg border border-border bg-muted/40 px-3 text-[12px] font-mono focus:outline-none focus:ring-1 focus:ring-ring"/>
                    </div>
                  </div>
                ) : <p className="text-[13px] font-mono">{config?.details.cpuCores} vCPU | {config?.details.ram}</p>}
              </div>
              <div className="flex justify-between items-center py-2.5 border-b border-border/40 text-[13px]">
                <span className="text-muted-foreground">Type de machine</span>
                <code className="font-mono text-[12px]">{config?.details.machineType ?? "pc-q35-rhel9.6.0"}</code>
              </div>
              <div className="border border-border/50 rounded-xl px-4 py-3 space-y-1.5">
                <div className="flex items-center justify-between">
                  <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">Nom d'hôte</p>
                  <Button size="sm" variant="ghost" className="h-6 w-6 p-0" onClick={() => setEditHostname(!editHostname)}><Pencil className="w-3 h-3"/></Button>
                </div>
                {editHostname
                  ? <input value={draftHost} onChange={e=>setDraftHost(e.target.value)}
                      className="w-full h-8 rounded-lg border border-border bg-muted/40 px-3 text-[12px] font-mono focus:outline-none focus:ring-1 focus:ring-ring"/>
                  : <p className="text-[13px] font-mono">{config?.details.hostname ?? vm.name}</p>}
              </div>
              <div className="border border-border/50 rounded-xl px-4 py-3 space-y-0">
                <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider mb-2">Options</p>
                {([
                  { label:"Mode sans tête",                     key:"headlessMode"     as const },
                  { label:"Accès au journal du système invité", key:"guestLogAccess"   as const },
                  { label:"Protection contre la suppression",   key:"deleteProtection" as const },
                ]).map(({ label, key }) => (
                  <div key={key} className="flex justify-between items-center py-2.5 border-b border-border/40 last:border-0 text-[13px]">
                    <span className="text-muted-foreground">{label}</span>
                    <button onClick={() => setDraftOpts(o => ({...o,[key]:!o[key]}))}
                      className={cn("relative w-9 h-5 rounded-full transition-colors", draftOpts[key]?"bg-blue-600":"bg-muted-foreground/30")}>
                      <span className={cn("absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform", draftOpts[key]&&"translate-x-4")}/>
                    </button>
                  </div>
                ))}
              </div>
              {(editDesc||editCpu||editHostname||
                draftOpts.headlessMode     !== (config?.details.headlessMode     ?? false)||
                draftOpts.guestLogAccess   !== (config?.details.guestLogAccess   ?? true) ||
                draftOpts.deleteProtection !== (config?.details.deleteProtection ?? false)
              ) && (
                <Button className="w-full h-9 gap-1.5 text-[12px]" onClick={saveDetails} disabled={saving}>
                  {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin"/> : <Check className="w-3.5 h-3.5"/>}
                  Enregistrer les modifications
                </Button>
              )}
            </>
          )}

          {/* STOCKAGE */}
          {section==="storage" && (
            <>
              <p className="text-[13px] font-medium">Disques</p>
              <p className="text-[11px] text-muted-foreground bg-amber-50 border border-amber-200 rounded-xl px-3 py-2">
                ⚠ L'ajout/suppression de disques nécessite l'arrêt de la VM.
              </p>
              {(!config?.disks || config.disks.length===0)
                ? <p className="text-[12px] text-muted-foreground text-center py-8">Aucun disque trouvé.</p>
                : (
                  <div className="border border-border/50 rounded-xl overflow-hidden">
                    <table className="w-full text-[12px]">
                      <thead>
                        <tr className="bg-muted/40 border-b border-border/50">
                          {["Nom","Source","Taille","Lecteur","Interface","Classe",""].map(h => (
                            <th key={h} className="text-left px-3 py-2 text-[10px] text-muted-foreground uppercase tracking-wider font-medium">{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {config.disks.map(disk => (
                          <tr key={disk.name} className="border-b border-border/30 last:border-0 hover:bg-muted/20">
                            <td className="px-3 py-2.5">
                              <div className="flex items-center gap-1.5">
                                <code className="font-mono font-medium">{disk.name}</code>
                                {disk.bootable && <span className="text-[9px] bg-blue-100 text-blue-700 border border-blue-200 px-1.5 py-0.5 rounded-full">bootable</span>}
                              </div>
                            </td>
                            <td className="px-3 py-2.5">
                              <span className={cn("text-[10px] px-1.5 py-0.5 rounded font-medium",
                                disk.source==="DataVolume"    ? "bg-blue-50 text-blue-700"
                              : disk.source==="CloudInit"     ? "bg-purple-50 text-purple-700"
                              : disk.source==="ContainerDisk" ? "bg-amber-50 text-amber-700"
                              : "bg-muted text-muted-foreground")}>
                                {disk.source==="CloudInit" ? "Autre" : disk.source}
                              </span>
                              {disk.sourceRef!=="-" && (
                                <p className="text-[10px] text-blue-600 mt-0.5 font-mono truncate max-w-[110px]">{disk.sourceRef}</p>
                              )}
                            </td>
                            <td className="px-3 py-2.5 font-mono">{disk.size}</td>
                            <td className="px-3 py-2.5">{disk.reader}</td>
                            <td className="px-3 py-2.5 font-mono">{disk.iface}</td>
                            <td className="px-3 py-2.5 font-mono text-[11px] text-muted-foreground">{disk.storageClass}</td>
                            <td className="px-3 py-2.5">
                              {!disk.bootable && (
                                <Button size="sm" variant="ghost" className="h-6 w-6 p-0 text-red-500 hover:text-red-600"
                                  onClick={() => notify("Détachement de disque — la VM doit être arrêtée.", "warn")}>
                                  <Trash2 className="w-3 h-3"/>
                                </Button>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )
              }
            </>
          )}

          {/* RÉSEAU — composant propre, zéro hooks conditionnels */}
          {section==="network" && <NetworkSection config={config} vmName={vm.name} vmStatus={vm.status} notify={notify} />}

          {/* PLANIFICATION */}
          {section==="scheduling" && (
            <>
              <p className="text-[13px] font-medium">Planification et besoins en ressources</p>
              <div className="grid grid-cols-2 gap-3">
                {([
                  { label:"Sélecteur de nœud",    value:config?.scheduling.nodeSelector       ?? "Aucun sélecteur",           editable:true  },
                  { label:"Ressources dédiées",   value:config?.scheduling.dedicatedResources ?? "Aucune ressource dédiée",   editable:false },
                  { label:"Tolérances",           value:config?.scheduling.tolerations        ?? "0 Règles de tolérance",     editable:true  },
                  { label:"Stratégie d'éviction", value:config?.scheduling.evictionStrategy   ?? "LiveMigrate",               editable:true  },
                  { label:"Règles d'affinité",    value:config?.scheduling.affinityRules      ?? "0 Règles d'affinité",       editable:true  },
                ]).map(({ label, value, editable }) => (
                  <div key={label} className="bg-muted/40 border border-border/50 rounded-xl px-3 py-2.5">
                    <div className="flex items-center justify-between mb-1">
                      <p className="text-[10px] text-muted-foreground uppercase tracking-wider">{label}</p>
                      {editable && (
                        <Button size="sm" variant="ghost" className="h-5 w-5 p-0 opacity-50 hover:opacity-100"
                          onClick={() => notify("Modification de \"" + label + "\" — nécessite un patch YAML KubeVirt.", "warn")}>
                          <Pencil className="w-2.5 h-2.5"/>
                        </Button>
                      )}
                    </div>
                    <p className="text-[13px] font-medium">{value}</p>
                  </div>
                ))}
              </div>
              <div className="flex justify-between items-center py-2.5 border-t border-border/40 text-[13px]">
                <span className="text-muted-foreground">Déplanificateur</span>
                <div className={cn("relative w-9 h-5 rounded-full cursor-default",
                  config?.scheduling.deschedulerEnabled ? "bg-blue-600" : "bg-muted-foreground/30")}>
                  <span className={cn("absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform",
                    config?.scheduling.deschedulerEnabled && "translate-x-4")}/>
                </div>
              </div>
            </>
          )}

          {/* SSH CONFIG */}
          {section==="ssh" && (
            <>
              <div className="flex items-center gap-2 mb-1">
                <p className="text-[13px] font-medium">Paramètres TLS</p>
                <span className="text-[10px] bg-muted border border-border px-2 py-0.5 rounded-full text-muted-foreground">Linux uniquement</span>
              </div>
              <div className="border border-border/50 rounded-xl px-4 py-3 space-y-3">
                <p className="text-[12px] font-medium">Accès SSH</p>
                <div>
                  <label className="text-[11px] text-muted-foreground mb-1.5 block">Type de service SSH</label>
                  <select className="w-full h-9 rounded-lg border border-border bg-muted/40 px-3 text-[13px] focus:outline-none focus:ring-1 focus:ring-ring"
                    defaultValue="none" onChange={() => notify("Modification du type SSH — endpoint backend requis.", "warn")}>
                    <option value="none">Aucun</option>
                    <option value="nodeport">NodePort</option>
                    <option value="loadbalancer">LoadBalancer</option>
                  </select>
                </div>
              </div>
              <div className="border border-border/50 rounded-xl px-4 py-3 space-y-2">
                <p className="text-[12px] font-medium">SSH en utilisant virtctl</p>
                <div className="bg-muted/30 rounded-lg px-3 py-2">
                  <p className="text-[12px] text-muted-foreground">Secret SSH non configuré</p>
                </div>
                <div className="bg-zinc-900 rounded-lg px-3 py-2.5 font-mono text-[11px] text-emerald-400">
                  virtctl ssh ubuntu@{vm.name} -n {vm.namespace}
                </div>
              </div>
              <div className="border border-border/50 rounded-xl px-4 py-3 space-y-2">
                <div className="flex items-center justify-between">
                  <p className="text-[12px] font-medium">Clé SSH publique</p>
                  <Button size="sm" variant="outline" className="h-7 gap-1 text-[11px]"
                    onClick={() => notify("Ajout de clé SSH — nécessite configuration cloud-init.", "warn")}>
                    <Plus className="w-3 h-3"/> Ajouter
                  </Button>
                </div>
                <p className="text-[12px] text-muted-foreground">Non disponible</p>
                <p className="text-[11px] text-muted-foreground bg-muted/30 rounded-lg px-3 py-2">
                  L'injection de clé SSH dynamique n'est pas activée sur cette machine virtuelle.
                </p>
              </div>
            </>
          )}
        </div>
      </div>
    )
  }

  // ── PanelEvents ──
  const PanelEvents = () => {
    const dotColor: Record<string,string> = { Normal:"bg-emerald-500", Warning:"bg-amber-500", Error:"bg-red-500" }
    if (eventsLoad) return <div className="flex justify-center py-12"><Loader2 className="size-4 animate-spin text-muted-foreground"/></div>
    return (
      <div className="p-5 space-y-1">
        {events.length===0 && (
          <p className="text-[12px] text-amber-700 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">
            ⚠ Endpoint <code className="font-mono">GET /api/vms/{"{name}"}/events</code> requis côté backend.<br/>
            <span className="text-muted-foreground">En attendant : <code>kubectl get events -n {vm.namespace}</code></span>
          </p>
        )}
        {events.map((ev,i) => (
          <div key={i} className="flex gap-3 py-2.5 border-b border-border/40 last:border-0">
            <div className={cn("w-2 h-2 rounded-full mt-1.5 flex-shrink-0", dotColor[ev.type] ?? "bg-zinc-400")}/>
            <div className="min-w-[56px] text-[11px] text-muted-foreground">{ev.lastTime}</div>
            <div>
              <p className="text-[12px] font-medium">{ev.message}</p>
              <p className="text-[11px] text-muted-foreground">{ev.reason}</p>
            </div>
            {ev.count>1 && <span className="ml-auto text-[10px] text-muted-foreground">×{ev.count}</span>}
          </div>
        ))}
      </div>
    )
  }

  // ── PanelConsole ──
  const PanelConsole = () => (
    <div className="p-5">
      {!isRunning
        ? <p className="text-[12px] text-muted-foreground">La VM doit être démarrée pour accéder à la console.</p>
        : !vncData
          ? <div className="flex justify-center py-12"><Loader2 className="size-4 animate-spin text-muted-foreground"/></div>
          : <VncConsole apiUrl={vncData.url} token={vncData.token} vmName={vm.name}/>}
    </div>
  )

  // ── PanelSsh ──
  const PanelSsh = () => {
    if (net.loading) return <div className="flex justify-center py-12"><Loader2 className="size-4 animate-spin text-muted-foreground"/></div>
    return (
      <div className="p-5 space-y-4">
        {!isRunning && (
          <p className="text-[12px] text-amber-700 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">
            La VM doit être en cours d'exécution pour exposer SSH.
          </p>
        )}
        {net.info ? (
          <>
            <div className="grid grid-cols-3 gap-2">
              <InfoCard label="IP Node"  value={net.info.nodeIp}/>
              <InfoCard label="Port SSH" value={String(net.info.nodePort)}/>
              <InfoCard label="Type"     value={net.info.type}/>
            </div>
            <div className="bg-zinc-900 rounded-xl px-4 py-3 flex items-center gap-3">
              <Terminal className="w-3.5 h-3.5 text-zinc-500 flex-shrink-0"/>
              <code className="text-[12px] text-emerald-400 font-mono flex-1 break-all">{net.info.sshCommand}</code>
              <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-zinc-400 hover:text-white"
                onClick={() => copyText(net.info!.sshCommand,"ssh")}>
                {copied==="ssh" ? <Check className="w-3 h-3 text-emerald-400"/> : <Copy className="w-3 h-3"/>}
              </Button>
            </div>
            <div className="flex justify-between items-center">
              <p className="text-[11px] text-muted-foreground flex items-center gap-1.5">
                <ShieldAlert className="w-3.5 h-3.5 text-amber-500 flex-shrink-0"/>
                Accessible uniquement depuis le réseau VPN NextStep
              </p>
              <Button size="sm" variant="outline" className="h-7 gap-1.5 text-[11px] text-red-600 hover:text-red-700"
                onClick={async () => {
                  try { await unexposeVmSsh(vm.name); setNet({info:null,visible:false,loading:false}) }
                  catch (e: any) { notify(e.message, "error") }
                }}>
                <X className="w-3 h-3"/> Supprimer
              </Button>
            </div>
          </>
        ) : isRunning && (
          <p className="text-[12px] text-muted-foreground">Aucune exposition SSH active. Rechargez l'onglet pour en créer une.</p>
        )}
      </div>
    )
  }

  // ── PanelAcces ──
  const PanelAcces = () => {
    if (!cred||cred.loading) return <div className="flex justify-center py-12"><Loader2 className="size-4 animate-spin text-muted-foreground"/></div>
    return (
      <div className="p-5 space-y-4">
        <div className="grid grid-cols-2 gap-2">
          <InfoCard label="Login" value={cred.login}/>
          <div className="bg-muted/40 border border-border/60 rounded-xl px-3 py-2.5">
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Mot de passe</p>
            <div className="flex items-center gap-2">
              <code className="font-mono text-[13px] font-medium flex-1">
                {cred.pwVisible ? cred.password : "••••••••••"}
              </code>
              <Button size="sm" variant="ghost" className="h-6 w-6 p-0"
                onClick={() => setCred(c => c?{...c,pwVisible:!c.pwVisible}:c)}>
                {cred.pwVisible ? <EyeOff className="w-3 h-3"/> : <Eye className="w-3 h-3"/>}
              </Button>
              <Button size="sm" variant="ghost" className="h-6 w-6 p-0"
                onClick={() => copyText(cred.password,"pw")}>
                {copied==="pw" ? <Check className="w-3 h-3 text-emerald-600"/> : <Copy className="w-3 h-3"/>}
              </Button>
            </div>
          </div>
        </div>
        <p className="text-[11px] text-muted-foreground">Stocké chiffré côté backend (<code className="font-mono">VmCredential</code>).</p>
      </div>
    )
  }

  // ── PanelSnapshots ──
  const PanelSnapshots = () => {
    const [snapshots,     setSnapshots]     = React.useState<VmSnapshot[]>([])
    const [loading,       setLoading]       = React.useState(false)
    const [creating,      setCreating]      = React.useState(false)
    const [newName,       setNewName]       = React.useState("")
    const [restoring,     setRestoring]     = React.useState<string|null>(null)
    const [deleting,      setDeleting]      = React.useState<string|null>(null)
    const [error,         setError]         = React.useState<string|null>(null)
    const [restoreTarget, setRestoreTarget] = React.useState<string|null>(null)
    const [deleteTarget,  setDeleteTarget]  = React.useState<string|null>(null)

    const loadSnaps = React.useCallback(async () => {
      setLoading(true); setError(null)
      try { setSnapshots(await listSnapshots(vm.name)) }
      catch (e: any) { setError(e.message) }
      finally { setLoading(false) }
    }, [])

    React.useEffect(() => { loadSnaps() }, [loadSnaps])

    const handleCreate = async () => {
      setCreating(true); setError(null)
      try { await createSnapshot(vm.name, newName.trim()||undefined); setNewName(""); await loadSnaps() }
      catch (e: any) { setError(e.message) }
      finally { setCreating(false) }
    }

    const confirmRestore = async () => {
      if (!restoreTarget) return
      setRestoring(restoreTarget); setError(null)
      try { await restoreSnapshot(vm.name, restoreTarget); await loadSnaps() }
      catch (e: any) { setError(e.message) }
      finally { setRestoring(null); setRestoreTarget(null) }
    }

    const handleDelete = async (snapName: string) => {
      setDeleting(snapName); setError(null); setDeleteTarget(null)
      try { await deleteSnapshot(vm.name, snapName); await loadSnaps() }
      catch (e: any) { setError(e.message) }
      finally { setDeleting(null) }
    }

    const phaseStyle: Record<string,string> = {
      Succeeded: "bg-emerald-50 text-emerald-700 border-emerald-200",
      InProgress: "bg-amber-50 text-amber-700 border-amber-200",
      Failed:     "bg-red-50 text-red-600 border-red-200",
    }

    return (
      <>
        <AlertDialog open={!!restoreTarget} onOpenChange={() => setRestoreTarget(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Restaurer depuis cet instantané ?</AlertDialogTitle>
              <AlertDialogDescription>
                La VM <strong>{vm.name}</strong> sera restaurée depuis <strong>{restoreTarget}</strong> et redémarrée.
                Toutes les modifications non sauvegardées seront perdues.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Annuler</AlertDialogCancel>
              <AlertDialogAction
                className="gap-1.5" style={{ backgroundColor:"#0a7fcf", borderColor:"#0a7fcf", color:"white" }}
                onClick={confirmRestore} disabled={!!restoring}>
                {restoring ? <Loader2 className="size-3.5 animate-spin"/> : <RotateCcw className="size-3.5"/>}
                Restaurer
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {deleteTarget && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
            <div className="bg-card border border-border rounded-2xl shadow-2xl w-full max-w-sm mx-4 overflow-hidden">
              <div className="px-5 py-4 border-b border-border/60">
                <p className="text-[14px] font-semibold">Supprimer l'instantané ?</p>
                <p className="text-[12px] text-muted-foreground mt-1">Cette action est irréversible.</p>
              </div>
              <div className="px-5 py-3 bg-muted/20"><code className="text-[12px] font-mono text-foreground">{deleteTarget}</code></div>
              <div className="flex gap-2 px-5 py-4">
                <Button variant="outline" className="flex-1 h-9 text-[12px]" onClick={() => setDeleteTarget(null)} disabled={deleting===deleteTarget}>Annuler</Button>
                <Button className="flex-1 h-9 text-[12px] bg-destructive hover:bg-destructive/90 text-destructive-foreground gap-1.5"
                  onClick={() => handleDelete(deleteTarget)} disabled={deleting===deleteTarget}>
                  {deleting===deleteTarget ? <><Loader2 className="w-3.5 h-3.5 animate-spin"/> Suppression…</> : <><Trash2 className="w-3.5 h-3.5"/> Supprimer</>}
                </Button>
              </div>
            </div>
          </div>
        )}

        <div className="p-5 space-y-4">
          <div className="flex gap-2">
            <input type="text" placeholder="Nom de l'instantané (optionnel)" value={newName}
              onChange={e=>setNewName(e.target.value)}
              className="flex-1 h-8 rounded-lg border border-border bg-muted/40 px-3 text-[12px] font-mono focus:outline-none focus:ring-1 focus:ring-ring"/>
            <Button size="sm" variant="outline" className="h-8 gap-1.5 text-[12px]" onClick={handleCreate} disabled={creating||!isRunning}>
              {creating ? <Loader2 className="w-3 h-3 animate-spin"/> : <Camera className="w-3 h-3"/>} Snapshot
            </Button>
            <Button size="sm" variant="ghost" className="h-8 w-8 p-0" onClick={loadSnaps} disabled={loading}>
              <RefreshCw className={cn("w-3 h-3", loading&&"animate-spin")}/>
            </Button>
          </div>
          {!isRunning && (
            <p className="text-[11px] text-amber-700 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2">
              La VM doit être en cours d'exécution pour créer un instantané.
            </p>
          )}
          {error && <p className="text-[11px] text-red-600 bg-red-50 border border-red-200 rounded-xl px-3 py-2">{error}</p>}
          {loading && <div className="flex justify-center py-8"><Loader2 className="size-4 animate-spin text-muted-foreground"/></div>}
          {!loading && snapshots.length===0 && (
            <div className="text-center py-10 text-muted-foreground">
              <Camera className="w-8 h-8 mx-auto mb-3 opacity-20"/>
              <p className="text-[13px]">Aucun instantané disponible.</p>
              <p className="text-[11px] mt-1 opacity-60">Nécessite une VM avec DataVolume (stockage persistant NFS).</p>
            </div>
          )}
          {!loading && snapshots.map(snap => (
            <div key={snap.name} className="flex items-center gap-3 px-4 py-3 bg-muted/30 border border-border/50 rounded-xl">
              <Camera className="w-4 h-4 text-muted-foreground flex-shrink-0"/>
              <div className="flex-1 min-w-0">
                <p className="text-[13px] font-mono font-medium truncate">{snap.name}</p>
                <p className="text-[11px] text-muted-foreground">
                  {snap.createdAt ? new Date(snap.createdAt).toLocaleString("fr-FR") : "—"}
                </p>
              </div>
              <span className={cn("text-[10px] font-medium px-2 py-0.5 rounded-full border flex-shrink-0",
                phaseStyle[snap.phase] ?? "bg-muted text-muted-foreground border-border")}>
                {snap.readyToUse ? "✓ Prêt" : snap.phase}
              </span>
              <Button size="sm" variant="outline" className="h-7 gap-1 text-[11px] flex-shrink-0"
                onClick={() => setRestoreTarget(snap.name)} disabled={restoring===snap.name||!snap.readyToUse}>
                {restoring===snap.name ? <Loader2 className="w-3 h-3 animate-spin"/> : <RotateCcw className="w-3 h-3"/>} Restaurer
              </Button>
              <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-red-500 hover:text-red-600 flex-shrink-0"
                onClick={() => setDeleteTarget(snap.name)} disabled={deleting===snap.name}>
                {deleting===snap.name ? <Loader2 className="w-3 h-3 animate-spin"/> : <Trash2 className="w-3 h-3"/>}
              </Button>
            </div>
          ))}
        </div>
      </>
    )
  }

  // ── PanelDiag ──
  const PanelDiag = () => (
    <div className="p-5 space-y-2">
      {([
        { label:"VMI prête",               ok:true,       detail:"VirtualMachineInstance active"       },
        { label:"Pod virt-launcher actif", ok:isRunning,  detail:`virt-launcher-${vm.name}`           },
        { label:"Interface réseau",        ok:!!vm.ip,    detail:vm.ip ?? "IP non assignée"           },
        { label:"Agent invité (QEMU)",     ok:false,      detail:"Non installé — requis pour métriques OS" },
        { label:"Stockage rootdisk",       ok:true,       detail:"Dynamique / virtio"                 },
        { label:"Stockage cloudinit",      ok:true,       detail:"Dynamique / virtio"                 },
      ]).map(({ label, ok, detail }) => (
        <div key={label} className="flex items-center justify-between py-2.5 px-3 bg-muted/30 border border-border/50 rounded-xl text-[13px]">
          <div>
            <p className="font-medium">{label}</p>
            <p className="text-[11px] text-muted-foreground">{detail}</p>
          </div>
          <span className={cn("text-[11px] font-medium flex items-center gap-1", ok?"text-emerald-600":"text-amber-600")}>
            {ok ? <Check className="w-3 h-3"/> : <ShieldAlert className="w-3 h-3"/>}
            {ok ? "OK" : "Attention"}
          </span>
        </div>
      ))}
    </div>
  )

  const PANELS: Record<TabId, React.ReactNode> = {
    overview:  <PanelOverview/>,
    metrics:   <PanelMetrics/>,
    config:    <PanelConfig/>,
    events:    <PanelEvents/>,
    console:   <PanelConsole/>,
    ssh:       <PanelSsh/>,
    acces:     <PanelAcces/>,
    snapshots: <PanelSnapshots/>,
    diag:      <PanelDiag/>,
  }

  return (
    <>
      {showClone && <CloneModal vm={vm} onClose={() => setShowClone(false)} onSuccess={onRefresh}/>}
      <div className="border border-border rounded-2xl overflow-hidden">
        {/* Header */}
        <div className="px-5 py-3.5 bg-card border-b border-border/60">
          <div className="flex items-center gap-3 flex-wrap mb-1.5">
            <p className="text-[14px] font-semibold font-mono">{vm.name}</p>
            <span className={cn("text-[10px] font-medium px-2 py-0.5 rounded-full border",
              STATUS_STYLE[vm.status] ?? "bg-muted text-muted-foreground border-border")}>
              {vm.status}
            </span>
            {vm.osImage && <span className="text-[10px] text-muted-foreground bg-muted px-2 py-0.5 rounded-full">{getOsLabel(vm.osImage)}</span>}
            {vm.availabilitySet && (
              <span className="text-[10px] text-blue-600 bg-blue-50 border border-blue-100 px-2 py-0.5 rounded-full">🔗 {vm.availabilitySet}</span>
            )}
          </div>
          <div className="flex flex-wrap gap-4 text-[11px] text-muted-foreground">
            <span>{vm.namespace}</span>
            {vm.ip       && <span className="flex items-center gap-1"><Network className="w-3 h-3"/>{vm.ip}</span>}
            {vm.cpuCores && <span className="flex items-center gap-1"><Cpu className="w-3 h-3"/>{vm.cpuCores} vCPU</span>}
            {vm.ramGb    && <span className="flex items-center gap-1"><MemoryStick className="w-3 h-3"/>{vm.ramGb}</span>}
            {vm.createdAt && <span>Créée : {new Date(vm.createdAt).toLocaleDateString("fr-FR")}</span>}
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2 px-4 py-2 bg-muted/20 border-b border-border/40 flex-wrap">
          {vm.status==="Stopped" ? (
            <Button size="sm" variant="outline" className="h-7 gap-1.5 text-[12px]"
              onClick={() => onAction(() => startVm(vm.name), vm.name)} disabled={isBusy}>
              {isBusy ? <Loader2 className="w-3 h-3 animate-spin"/> : <Play className="w-3 h-3"/>} Démarrer
            </Button>
          ) : (
            <Button size="sm" variant="outline" className="h-7 gap-1.5 text-[12px]"
              onClick={() => onAction(() => stopVm(vm.name), vm.name)} disabled={isBusy||!isRunning}>
              {isBusy ? <Loader2 className="w-3 h-3 animate-spin"/> : <Square className="w-3 h-3"/>} Arrêter
            </Button>
          )}
          <Button size="sm" variant="outline" className="h-7 gap-1.5 text-[12px]"
            onClick={() => onAction(() => rebootVm(vm.name), vm.name)} disabled={isBusy||!isRunning}>
            {isBusy ? <Loader2 className="w-3 h-3 animate-spin"/> : <RotateCcw className="w-3 h-3"/>} Reboot
          </Button>
          <Button size="sm" variant="outline" className="h-7 gap-1.5 text-[12px]"
            onClick={handleQuickSnapshot} disabled={isBusy||snapCreating||!isRunning}
            title={!isRunning ? "La VM doit être Running" : "Créer un instantané"}>
            {snapCreating ? <Loader2 className="w-3 h-3 animate-spin"/> : <Camera className="w-3 h-3"/>} Snapshot
          </Button>
          <Button size="sm" variant="outline"
            className="h-7 gap-1.5 text-[12px] text-violet-700 border-violet-200 hover:bg-violet-50"
            onClick={() => setShowClone(true)} disabled={isBusy}>
            <GitBranch className="w-3 h-3"/> Cloner
          </Button>
          <Button size="sm" variant="outline" className="h-7 w-7 p-0 text-red-600 hover:text-red-700 ml-auto"
            onClick={() => onDeleteRequest(vm.name)} disabled={isBusy} title="Supprimer">
            <Trash2 className="w-3 h-3"/>
          </Button>
        </div>

        {/* Onglets */}
        <div className="flex border-b border-border/60 overflow-x-auto bg-background" style={{ scrollbarWidth:"none" }}>
          {TABS.map(tab => (
            <button key={tab.id} onClick={() => handleTabChange(tab.id)}
              className={cn("flex items-center gap-1.5 px-4 py-2.5 text-[12px] whitespace-nowrap border-b-2 transition-colors flex-shrink-0",
                activeTab===tab.id ? "border-foreground text-foreground font-medium" : "border-transparent text-muted-foreground hover:text-foreground")}>
              {tab.icon}{tab.label}
            </button>
          ))}
        </div>

        {/* Panel actif */}
        <div className="bg-card">{PANELS[activeTab]}</div>
      </div>
    </>
  )
}

// ─────────────────────────────────────────────
// VmsPage — page principale
// ─────────────────────────────────────────────
export default function VmsPage() {
  const { items: notifyItems, show: notify, dismiss: notifyDismiss } = useNotify()
  const [vms,           setVms]           = React.useState<VmDTO[]>([])
  const [loading,       setLoading]       = React.useState(true)
  const [error,         setError]         = React.useState<string | null>(null)
  const [actionLoading, setActionLoading] = React.useState<string | null>(null)
  const [passwordInfo,  setPasswordInfo]  = React.useState<{ vmName: string; password: string } | null>(null)
  const [deleteTarget,  setDeleteTarget]  = React.useState<string | null>(null)
  const [deleteLoading, setDeleteLoading] = React.useState(false)

  const load = React.useCallback(async () => {
    setLoading(true); setError(null)
    try { setVms(await getMyVms()) }
    catch (e: any) { setError(e.message) }
    finally { setLoading(false) }
  }, [])

  React.useEffect(() => { load() }, [load])

  const handleAction = async (action: () => Promise<void>, vmName: string) => {
    setActionLoading(vmName)
    try { await action(); await load() }
    catch (e: any) { notify(e.message, "error") }
    finally { setActionLoading(null) }
  }

  const confirmDelete = async () => {
    if (!deleteTarget) return
    setDeleteLoading(true)
    try { await deleteVm(deleteTarget); await load() }
    catch (e: any) { notify(e.message, "error") }
    finally { setDeleteLoading(false); setDeleteTarget(null) }
  }

  return (
    <SidebarInset>
      <NotifyContainer items={notifyItems} dismiss={notifyDismiss} />
      {passwordInfo && (
        <PasswordDialog vmName={passwordInfo.vmName} password={passwordInfo.password} onClose={() => setPasswordInfo(null)}/>
      )}

      <AlertDialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer cette VM ?</AlertDialogTitle>
            <AlertDialogDescription>
              La VM <strong>{deleteTarget}</strong> sera définitivement supprimée. Cette action est irréversible.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteLoading}>Annuler</AlertDialogCancel>
            <AlertDialogAction className="bg-destructive hover:bg-destructive/90 text-destructive-foreground gap-1.5"
              onClick={confirmDelete} disabled={deleteLoading}>
              {deleteLoading && <Loader2 className="size-3.5 animate-spin"/>} Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <header className="flex h-14 items-center gap-3 border-b border-border/60 px-5 bg-background/95 backdrop-blur sticky top-0 z-10">
        <SidebarTrigger className="-ml-1 size-8 text-muted-foreground hover:text-foreground hover:bg-muted rounded-md transition-colors"/>
        <Separator orientation="vertical" className="h-4 opacity-40"/>
        <nav className="flex items-center gap-1.5 text-[13px]">
          <span className="text-muted-foreground">Dashboard</span>
          <span className="text-muted-foreground/30">/</span>
          <span className="text-muted-foreground">Déploiements</span>
          <span className="text-muted-foreground/30">/</span>
          <span className="font-medium">Machines Virtuelles</span>
        </nav>
        <Button size="sm" variant="outline"
          className="ml-auto h-8 gap-1.5 text-[12px] text-[#0a7fcf] border-[#0a7fcf] hover:bg-[#0a7fcf]/10"
          onClick={load}>
          <RefreshCw className="w-3.5 h-3.5" style={{ color:"#0a7fcf" }}/> Actualiser
        </Button>
      </header>

      <div className="p-6 pl-9 max-w-5xl ml-0 w-full space-y-6">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Mes machines virtuelles</h1>
          <p className="text-[13px] text-muted-foreground mt-1">Gérez et accédez à vos VMs : Console VNC, SSH, métriques et plus.</p>
        </div>

        {loading && <div className="flex items-center justify-center py-16"><Loader2 className="size-4 animate-spin text-muted-foreground"/></div>}
        {error   && <div className="border border-red-200 bg-red-50 rounded-xl px-5 py-4 text-[13px] text-red-600">{error}</div>}
        {!loading && !error && vms.length===0 && <div className="text-center py-16 text-[13px] text-muted-foreground">Aucune VM déployée.</div>}

        {!loading && vms.map(vm => (
          <VmDetailCard key={vm.name} vm={vm} onAction={handleAction}
            actionLoading={actionLoading} onDeleteRequest={setDeleteTarget} onRefresh={load} notify={notify}/>
        ))}
      </div>
    </SidebarInset>
  )
}