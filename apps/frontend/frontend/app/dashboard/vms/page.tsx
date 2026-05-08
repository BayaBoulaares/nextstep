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
  Layers, ShieldAlert, Wifi,
} from "lucide-react"
import {
  getMyVms, startVm, stopVm, rebootVm, deleteVm, getVncUrl,
  getVmCredentials, getVmNetwork, exposeVmSsh, unexposeVmSsh,
  getVmMetrics, getVmEvents,
  type VmDTO, type VmNetworkInfo, type VmMetrics, type VmEvent,
} from "@/lib/services/vms.api"
import { cn } from "@/lib/utils"
import { VncConsole } from "@/components/vms/VncConsole"
import { PasswordDialog } from "@/components/vms/PasswordDialog"
import {
  listSnapshots, createSnapshot, deleteSnapshot, restoreSnapshot,
  type VmSnapshot,
} from "@/lib/services/vms.api"
// ─────────────────────────────────────────────
// Constantes
// ─────────────────────────────────────────────
const STATUS_STYLE: Record<string, string> = {
  Running: "bg-emerald-50 text-emerald-700 border-emerald-200",
  Stopped: "bg-zinc-50 text-zinc-500 border-zinc-200",
  ImagePullBackOff: "bg-red-50 text-red-600 border-red-200",
  Provisioning: "bg-amber-50 text-amber-700 border-amber-200",
}

type TabId =
  | "overview" | "metrics" | "config" | "events"
  | "console" | "ssh" | "acces" | "snapshots" | "diag"

interface Tab { id: TabId; label: string; icon: React.ReactNode }

const TABS: Tab[] = [
  { id: "overview", label: "Vue d'ensemble", icon: <LayoutDashboard className="w-3.5 h-3.5" /> },
  { id: "metrics", label: "Métriques", icon: <Activity className="w-3.5 h-3.5" /> },
  { id: "config", label: "Configuration", icon: <Settings className="w-3.5 h-3.5" /> },
  { id: "events", label: "Événements", icon: <ScrollText className="w-3.5 h-3.5" /> },
  { id: "console", label: "Console", icon: <Monitor className="w-3.5 h-3.5" /> },
  { id: "ssh", label: "SSH", icon: <Wifi className="w-3.5 h-3.5" /> },
  { id: "acces", label: "Accès", icon: <KeyRound className="w-3.5 h-3.5" /> },
  { id: "snapshots", label: "Instantanés", icon: <Layers className="w-3.5 h-3.5" /> },
  { id: "diag", label: "Diagnostics", icon: <ShieldAlert className="w-3.5 h-3.5" /> },
]

type CredState = { login: string; password: string; visible: boolean; loading: boolean; pwVisible: boolean }
type NetState = { info: VmNetworkInfo | null; visible: boolean; loading: boolean }

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
  if (osImage.includes("ubuntu:24") || osImage.includes("ubuntu_24")) return "Ubuntu 24.04"
  if (osImage.includes("ubuntu:22") || osImage.includes("ubuntu_22")) return "Ubuntu 22.04"
  if (osImage.includes("debian")) return "Debian 12"
  if (osImage.includes("rocky")) return "Rocky Linux 9"
  if (osImage.includes("fedora")) return "Fedora"
  return osImage.split("/").pop() ?? osImage
}

// ─────────────────────────────────────────────
// Composant VM avec onglets
// ─────────────────────────────────────────────
function VmDetailCard({
  vm,
  onAction,
  actionLoading,
  onDeleteRequest,
}: {
  vm: VmDTO
  onAction: (fn: () => Promise<void>, name: string) => Promise<void>
  actionLoading: string | null
  onDeleteRequest: (name: string) => void
}) {
  const [activeTab, setActiveTab] = React.useState<TabId>("overview")
  const [vncData, setVncData] = React.useState<{ url: string; token: string } | null>(null)
  const [cred, setCred] = React.useState<CredState | null>(null)
  const [net, setNet] = React.useState<NetState>({ info: null, visible: false, loading: false })
  const [metrics, setMetrics] = React.useState<VmMetrics | null>(null)
  const [metricsLoad, setMetricsLoad] = React.useState(false)
  const [events, setEvents] = React.useState<VmEvent[]>([])
  const [eventsLoad, setEventsLoad] = React.useState(false)
  const [copied, setCopied] = React.useState<string | null>(null)

  const isRunning = vm.status === "Running"
  const isBusy = actionLoading === vm.name

  const copyText = (text: string, key: string) => {
    navigator.clipboard.writeText(text)
    setCopied(key)
    setTimeout(() => setCopied(null), 2000)
  }

  const handleTabChange = async (tabId: TabId) => {
    setActiveTab(tabId)

    if (tabId === "console" && !vncData && isRunning) {
      try {
        const data = await getVncUrl(vm.name)
        setVncData(data)
      } catch (e: any) { alert("Impossible d'ouvrir la console VNC : " + e.message) }
    }

    if (tabId === "acces" && !cred) {
      setCred({ login: "", password: "", visible: false, loading: true, pwVisible: false })
      try {
        const data = await getVmCredentials(vm.name)
        setCred({ ...data, visible: true, loading: false, pwVisible: false })
      } catch {
        setCred({ login: "ubuntu", password: "non-disponible", visible: true, loading: false, pwVisible: false })
      }
    }

    if (tabId === "ssh" && !net.info && !net.loading) {
      setNet({ info: null, visible: false, loading: true })
      try {
        const services = await getVmNetwork(vm.name)
        const info = services.length > 0 ? services[0] : await exposeVmSsh(vm.name)
        setNet({ info, visible: true, loading: false })
      } catch (e: any) {
        setNet({ info: null, visible: false, loading: false })
        alert("Erreur réseau : " + e.message)
      }
    }

    if (tabId === "metrics" && !metrics && !metricsLoad) {
      setMetricsLoad(true)
      try { setMetrics(await getVmMetrics(vm.name)) }
      catch { /* fallback silencieux */ }
      finally { setMetricsLoad(false) }
    }

    if (tabId === "events" && events.length === 0 && !eventsLoad) {
      setEventsLoad(true)
      try { setEvents(await getVmEvents(vm.name)) }
      catch { /* fallback silencieux */ }
      finally { setEventsLoad(false) }
    }
  }

  const [snapCreating, setSnapCreating] = React.useState(false)

  const handleQuickSnapshot = async () => {
    setSnapCreating(true)
    try {
      await createSnapshot(vm.name, undefined)
      await handleTabChange("snapshots")
    } catch (e: any) { alert("Snapshot échoué : " + e.message) }
    finally { setSnapCreating(false) }
  }
  // ── Panels ──────────────────────────────────

  const PanelOverview = () => (
    <div className="p-5 space-y-4">
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
        <InfoCard label="Nom" value={vm.name} />
        <InfoCard label="Statut" value={
          <span className={cn("px-2 py-0.5 rounded-full text-[11px] border font-medium",
            STATUS_STYLE[vm.status] ?? "bg-muted text-muted-foreground border-border")}>
            {vm.status}
          </span>
        } mono={false} />
        <InfoCard label="OS" value={getOsLabel(vm.osImage)} mono={false} />
        <InfoCard label="Namespace" value={vm.namespace} />
        <InfoCard label="IP" value={vm.ip ?? "—"} />
        <InfoCard label="CPU | RAM" value={`${vm.cpuCores ?? "?"} vCPU | ${vm.ramGb ?? "?"}`} />
        <InfoCard label="Nœud" value={vm.node ?? "—"} />
        <InfoCard label="Créée le" value={vm.createdAt ? new Date(vm.createdAt).toLocaleDateString("fr-FR") : "—"} mono={false} />
        <InfoCard label="Machine" value={vm.machineType ?? "—"} />
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
    </div>
  )

  const PanelMetrics = () => {
    if (metricsLoad) return <div className="flex justify-center py-12"><Loader2 className="size-4 animate-spin text-muted-foreground" /></div>
    const m = metrics
    return (
      <div className="p-5 space-y-4">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {([
            { label: "CPU", value: m ? `${m.cpuPercent.toFixed(2)}%` : "—", sub: "Demandé de 1", pct: m?.cpuPercent, color: "bg-blue-500" },
            { label: "Mémoire", value: m ? `${m.memPercent.toFixed(1)}%` : "—", sub: m ? `${m.memUsedMiB} MiB / ${m.memTotalMiB} MiB` : "", pct: m?.memPercent, color: "bg-amber-500" },
            { label: "Disque", value: m ? `${m.diskPercent.toFixed(2)}%` : "—", sub: m?.diskUsed ?? "", pct: m?.diskPercent, color: "bg-emerald-500" },
            { label: "Réseau", value: m ? `${m.netBps} Bps` : "—", sub: "Transfert total", pct: undefined, color: "" },
          ] as const).map(({ label, value, sub, pct, color }) => (
            <div key={label} className="bg-muted/40 border border-border/60 rounded-xl px-3 py-3">
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">{label}</p>
              <p className="text-[20px] font-medium">{value}</p>
              <p className="text-[11px] text-muted-foreground">{sub}</p>
              {pct !== undefined && <ProgressBar value={pct} color={color} />}
            </div>
          ))}
        </div>
        {!m && (
          <p className="text-[11px] text-muted-foreground bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">
            ⚠ Endpoint <code className="font-mono">GET /api/vms/{"{name}"}/metrics</code> requis côté backend pour les données temps réel.
          </p>
        )}
      </div>
    )
  }

  const PanelConfig = () => {
    const [opts, setOpts] = React.useState({ headless: false, guestLog: true, deleteProtect: false })
    return (
      <div className="p-5">
        <div className="space-y-0 mb-4">
          {([
            { label: "Description", value: "Aucune" },
            { label: "Profil de charge", value: "Non disponible" },
            { label: "CPU | Mémoire", value: `${vm.cpuCores ?? "1"} vCPU | ${vm.ramGb ?? "1 GiB"}` },
            { label: "Type de machine", value: vm.machineType ?? "pc-q35-rhel9.6.0" },
            { label: "Nom d'hôte", value: vm.name },
          ]).map(({ label, value }) => (
            <div key={label} className="flex justify-between items-center py-2.5 border-b border-border/50 last:border-0 text-[13px]">
              <span className="text-muted-foreground">{label}</span>
              <code className="font-mono font-medium text-[12px]">{value}</code>
            </div>
          ))}
        </div>

        <p className="text-[12px] font-medium mb-2 text-muted-foreground uppercase tracking-wider text-[10px]">Options</p>
        {([
          { label: "Mode sans tête", key: "headless" as const },
          { label: "Accès au journal du système invité", key: "guestLog" as const },
          { label: "Protection contre la suppression", key: "deleteProtect" as const },
        ]).map(({ label, key }) => (
          <div key={key} className="flex justify-between items-center py-2.5 border-b border-border/50 last:border-0 text-[13px]">
            <span className="text-muted-foreground">{label}</span>
            <button
              onClick={() => setOpts(o => ({ ...o, [key]: !o[key] }))}
              className={cn("relative w-9 h-5 rounded-full transition-colors",
                opts[key] ? "bg-blue-600" : "bg-muted-foreground/30")}
            >
              <span className={cn("absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform",
                opts[key] && "translate-x-4")} />
            </button>
          </div>
        ))}
      </div>
    )
  }

  const PanelEvents = () => {
    const dotColor: Record<string, string> = {
      Normal: "bg-emerald-500",
      Warning: "bg-amber-500",
      Error: "bg-red-500",
    }
    if (eventsLoad) return <div className="flex justify-center py-12"><Loader2 className="size-4 animate-spin text-muted-foreground" /></div>
    return (
      <div className="p-5 space-y-1">
        {events.length === 0 && (
          <p className="text-[12px] text-amber-700 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">
            ⚠ Endpoint <code className="font-mono">GET /api/vms/{"{name}"}/events</code> requis côté backend.
            <br /><span className="text-muted-foreground">En attendant : <code>kubectl get events -n {vm.namespace}</code></span>
          </p>
        )}
        {events.map((ev, i) => (
          <div key={i} className="flex gap-3 py-2.5 border-b border-border/40 last:border-0">
            <div className={cn("w-2 h-2 rounded-full mt-1.5 flex-shrink-0", dotColor[ev.type] ?? "bg-zinc-400")} />
            <div className="min-w-[56px] text-[11px] text-muted-foreground">{ev.lastTime}</div>
            <div>
              <p className="text-[12px] font-medium">{ev.message}</p>
              <p className="text-[11px] text-muted-foreground">{ev.reason}</p>
            </div>
            {ev.count > 1 && (
              <span className="ml-auto text-[10px] text-muted-foreground">×{ev.count}</span>
            )}
          </div>
        ))}
      </div>
    )
  }

  const PanelConsole = () => (
    <div className="p-5">
      {!isRunning ? (
        <p className="text-[12px] text-muted-foreground">La VM doit être démarrée pour accéder à la console.</p>
      ) : !vncData ? (
        <div className="flex justify-center py-12"><Loader2 className="size-4 animate-spin text-muted-foreground" /></div>
      ) : (
        <VncConsole apiUrl={vncData.url} token={vncData.token} vmName={vm.name} />
      )}
    </div>
  )

  const PanelSsh = () => {
    if (net.loading) return <div className="flex justify-center py-12"><Loader2 className="size-4 animate-spin text-muted-foreground" /></div>
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
              <InfoCard label="IP Node" value={net.info.nodeIp} />
              <InfoCard label="Port SSH" value={String(net.info.nodePort)} />
              <InfoCard label="Type" value={net.info.type} />
            </div>
            <div className="bg-zinc-900 rounded-xl px-4 py-3 flex items-center gap-3">
              <Terminal className="w-3.5 h-3.5 text-zinc-500 flex-shrink-0" />
              <code className="text-[12px] text-emerald-400 font-mono flex-1 break-all">{net.info.sshCommand}</code>
              <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-zinc-400 hover:text-white"
                onClick={() => copyText(net.info!.sshCommand, "ssh")}>
                {copied === "ssh" ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
              </Button>
            </div>
            <div className="flex justify-between items-center">
              <p className="text-[11px] text-muted-foreground">⚠️ Accessible uniquement depuis le réseau VPN NextStep</p>
              <Button size="sm" variant="outline"
                className="h-7 gap-1.5 text-[11px] text-red-600 hover:text-red-700"
                onClick={async () => {
                  try { await unexposeVmSsh(vm.name); setNet({ info: null, visible: false, loading: false }) }
                  catch (e: any) { alert(e.message) }
                }}>
                <X className="w-3 h-3" /> Supprimer
              </Button>
            </div>
          </>
        ) : isRunning && (
          <p className="text-[12px] text-muted-foreground">Aucune exposition SSH active. Rechargez l'onglet pour en créer une.</p>
        )}
      </div>
    )
  }

  const PanelAcces = () => {
    if (!cred || cred.loading) return <div className="flex justify-center py-12"><Loader2 className="size-4 animate-spin text-muted-foreground" /></div>
    return (
      <div className="p-5 space-y-4">
        <div className="grid grid-cols-2 gap-2">
          <InfoCard label="Login" value={cred.login} />
          <div className="bg-muted/40 border border-border/60 rounded-xl px-3 py-2.5">
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Mot de passe</p>
            <div className="flex items-center gap-2">
              <code className="font-mono text-[13px] font-medium flex-1">
                {cred.pwVisible ? cred.password : "••••••••••"}
              </code>
              <Button size="sm" variant="ghost" className="h-6 w-6 p-0"
                onClick={() => setCred(c => c ? { ...c, pwVisible: !c.pwVisible } : c)}>
                {cred.pwVisible ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
              </Button>
              <Button size="sm" variant="ghost" className="h-6 w-6 p-0"
                onClick={() => copyText(cred.password, "pw")}>
                {copied === "pw" ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
              </Button>
            </div>
          </div>
        </div>
        <p className="text-[11px] text-muted-foreground">
          Stocké chiffré côté backend (<code className="font-mono">VmCredential</code>).
        </p>
      </div>
    )
  }

  /* ekher version kbal ma nzid feature sanpshot concretee
  const PanelSnapshots = () => (
    <div className="p-5">
      <div className="text-center py-12 text-muted-foreground">
        <Camera className="w-8 h-8 mx-auto mb-3 opacity-30" />
        <p className="text-[13px]">Aucun instantané disponible.</p>
        <p className="text-[11px] mt-1 opacity-70">Nécessite un stockage persistant (DataVolume).</p>
      </div>
    </div>
  )*/
  const PanelSnapshots = () => {
    const [snapshots, setSnapshots] = React.useState<VmSnapshot[]>([])
    const [loading, setLoading] = React.useState(false)
    const [creating, setCreating] = React.useState(false)
    const [newSnapName, setNewSnapName] = React.useState("")
    const [restoring, setRestoring] = React.useState<string | null>(null)
    const [deleting, setDeleting] = React.useState<string | null>(null)
    const [error, setError] = React.useState<string | null>(null)

    const loadSnapshots = React.useCallback(async () => {
      setLoading(true); setError(null)
      try { setSnapshots(await listSnapshots(vm.name)) }
      catch (e: any) { setError(e.message) }
      finally { setLoading(false) }
    }, [])

    React.useEffect(() => { loadSnapshots() }, [loadSnapshots])

    const handleCreate = async () => {
      setCreating(true); setError(null)
      try {
        await createSnapshot(vm.name, newSnapName.trim() || undefined)
        setNewSnapName("")
        await loadSnapshots()
      } catch (e: any) { setError(e.message) }
      finally { setCreating(false) }
    }

    const handleRestore = async (snapName: string) => {
      if (!confirm(`Restaurer la VM depuis "${snapName}" ? La VM sera redémarrée.`)) return
      setRestoring(snapName); setError(null)
      try { await restoreSnapshot(vm.name, snapName); await loadSnapshots() }
      catch (e: any) { setError(e.message) }
      finally { setRestoring(null) }
    }

    const handleDelete = async (snapName: string) => {
      if (!confirm(`Supprimer l'instantané "${snapName}" ?`)) return
      setDeleting(snapName); setError(null)
      try { await deleteSnapshot(vm.name, snapName); await loadSnapshots() }
      catch (e: any) { setError(e.message) }
      finally { setDeleting(null) }
    }

    const phaseStyle: Record<string, string> = {
      Succeeded: "bg-emerald-50 text-emerald-700 border-emerald-200",
      InProgress: "bg-amber-50  text-amber-700  border-amber-200",
      Failed: "bg-red-50    text-red-600    border-red-200",
    }

    return (
      <div className="p-5 space-y-4">

        {/* ── Créer un snapshot ── */}
        <div className="flex gap-2">
          <input
            type="text"
            placeholder="Nom de l'instantané (optionnel)"
            value={newSnapName}
            onChange={e => setNewSnapName(e.target.value)}
            className="flex-1 h-8 rounded-lg border border-border bg-muted/40 px-3 text-[12px] font-mono focus:outline-none focus:ring-1 focus:ring-ring"
          />
          <Button
            size="sm" variant="outline"
            className="h-7 gap-1.5 text-[12px]"
            onClick={() => handleTabChange("snapshots")}
            disabled={isBusy}
            title="Créer un instantané"
          >
            <Camera className="w-3 h-3" /> Snapshot
          </Button>
          <Button size="sm" variant="ghost" className="h-8 w-8 p-0" onClick={loadSnapshots} disabled={loading}>
            <RefreshCw className={cn("w-3 h-3", loading && "animate-spin")} />
          </Button>
        </div>

        {!isRunning && (
          <p className="text-[11px] text-amber-700 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2">
            ⚠ La VM doit être en cours d'exécution pour créer un instantané.
          </p>
        )}

        {error && (
          <p className="text-[11px] text-red-600 bg-red-50 border border-red-200 rounded-xl px-3 py-2">
            {error}
          </p>
        )}

        {/* ── Liste des snapshots ── */}
        {loading && (
          <div className="flex justify-center py-8">
            <Loader2 className="size-4 animate-spin text-muted-foreground" />
          </div>
        )}

        {!loading && snapshots.length === 0 && (
          <div className="text-center py-10 text-muted-foreground">
            <Camera className="w-8 h-8 mx-auto mb-3 opacity-20" />
            <p className="text-[13px]">Aucun instantané disponible.</p>
            <p className="text-[11px] mt-1 opacity-60">
              Nécessite une VM avec DataVolume (stockage persistant NFS).
            </p>
          </div>
        )}

        {!loading && snapshots.map(snap => (
          <div key={snap.name}
            className="flex items-center gap-3 px-4 py-3 bg-muted/30 border border-border/50 rounded-xl">

            <Camera className="w-4 h-4 text-muted-foreground flex-shrink-0" />

            <div className="flex-1 min-w-0">
              <p className="text-[13px] font-mono font-medium truncate">{snap.name}</p>
              <p className="text-[11px] text-muted-foreground">
                {snap.createdAt ? new Date(snap.createdAt).toLocaleString("fr-FR") : "—"}
              </p>
            </div>

            <span className={cn(
              "text-[10px] font-medium px-2 py-0.5 rounded-full border flex-shrink-0",
              phaseStyle[snap.phase] ?? "bg-muted text-muted-foreground border-border"
            )}>
              {snap.readyToUse ? "✓ Prêt" : snap.phase}
            </span>

            {/* Restaurer */}
            <Button
              size="sm" variant="outline"
              className="h-7 gap-1 text-[11px] flex-shrink-0"
              onClick={() => handleRestore(snap.name)}
              disabled={restoring === snap.name || !snap.readyToUse}
              title={!snap.readyToUse ? "Instantané pas encore prêt" : "Restaurer"}
            >
              {restoring === snap.name
                ? <Loader2 className="w-3 h-3 animate-spin" />
                : <RotateCcw className="w-3 h-3" />}
              Restaurer
            </Button>

            {/* Supprimer */}
            <Button
              size="sm" variant="ghost"
              className="h-7 w-7 p-0 text-red-500 hover:text-red-600 flex-shrink-0"
              onClick={() => handleDelete(snap.name)}
              disabled={deleting === snap.name}
              title="Supprimer l'instantané"
            >
              {deleting === snap.name
                ? <Loader2 className="w-3 h-3 animate-spin" />
                : <Trash2 className="w-3 h-3" />}
            </Button>
          </div>
        ))}
      </div>
    )
  }

  const PanelDiag = () => (
    <div className="p-5 space-y-2">
      {([
        { label: "VMI prête", ok: true, detail: "VirtualMachineInstance active" },
        { label: "Pod virt-launcher actif", ok: isRunning, detail: `virt-launcher-${vm.name}` },
        { label: "Interface réseau", ok: !!vm.ip, detail: vm.ip ?? "IP non assignée" },
        { label: "Agent invité (QEMU)", ok: false, detail: "Non installé — requis pour métriques OS" },
        { label: "Stockage rootdisk", ok: true, detail: "Dynamique / virtio" },
        { label: "Stockage cloudinit", ok: true, detail: "Dynamique / virtio" },
      ]).map(({ label, ok, detail }) => (
        <div key={label} className="flex items-center justify-between py-2.5 px-3 bg-muted/30 border border-border/50 rounded-xl text-[13px]">
          <div>
            <p className="font-medium">{label}</p>
            <p className="text-[11px] text-muted-foreground">{detail}</p>
          </div>
          <span className={cn("text-[11px] font-medium flex items-center gap-1",
            ok ? "text-emerald-600" : "text-amber-600")}>
            {ok ? <Check className="w-3 h-3" /> : <ShieldAlert className="w-3 h-3" />}
            {ok ? "OK" : "Attention"}
          </span>
        </div>
      ))}
    </div>
  )

  const PANELS: Record<TabId, React.ReactNode> = {
    overview: <PanelOverview />,
    metrics: <PanelMetrics />,
    config: <PanelConfig />,
    events: <PanelEvents />,
    console: <PanelConsole />,
    ssh: <PanelSsh />,
    acces: <PanelAcces />,
    snapshots: <PanelSnapshots />,
    diag: <PanelDiag />,
  }

  return (
    <div className="border border-border rounded-2xl overflow-hidden">

      {/* ── Header ── */}
      <div className="px-5 py-3.5 bg-card border-b border-border/60">
        <div className="flex items-center gap-3 flex-wrap mb-1.5">
          <p className="text-[14px] font-semibold font-mono">{vm.name}</p>
          <span className={cn("text-[10px] font-medium px-2 py-0.5 rounded-full border",
            STATUS_STYLE[vm.status] ?? "bg-muted text-muted-foreground border-border")}>
            {vm.status}
          </span>
          {vm.osImage && (
            <span className="text-[10px] text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
              {getOsLabel(vm.osImage)}
            </span>
          )}
          {vm.availabilitySet && (
            <span className="text-[10px] text-blue-600 bg-blue-50 border border-blue-100 px-2 py-0.5 rounded-full">
              🔗 {vm.availabilitySet}
            </span>
          )}
        </div>
        <div className="flex flex-wrap gap-4 text-[11px] text-muted-foreground">
          <span>{vm.namespace}</span>
          {vm.ip && <span className="flex items-center gap-1"><Network className="w-3 h-3" />{vm.ip}</span>}
          {vm.cpuCores && <span className="flex items-center gap-1"><Cpu className="w-3 h-3" />{vm.cpuCores} vCPU</span>}
          {vm.ramGb && <span className="flex items-center gap-1"><MemoryStick className="w-3 h-3" />{vm.ramGb}</span>}
          {vm.createdAt && <span>Créée : {new Date(vm.createdAt).toLocaleDateString("fr-FR")}</span>}
        </div>
      </div>

      {/* ── Barre d'actions rapides ── */}
      <div className="flex items-center gap-2 px-4 py-2 bg-muted/20 border-b border-border/40 flex-wrap">
        {vm.status === "Stopped" ? (
          <Button size="sm" variant="outline" className="h-7 gap-1.5 text-[12px]"
            onClick={() => onAction(() => startVm(vm.name), vm.name)} disabled={isBusy}>
            {isBusy ? <Loader2 className="w-3 h-3 animate-spin" /> : <Play className="w-3 h-3" />} Démarrer
          </Button>
        ) : (
          <Button size="sm" variant="outline" className="h-7 gap-1.5 text-[12px]"
            onClick={() => onAction(() => stopVm(vm.name), vm.name)} disabled={isBusy || !isRunning}>
            {isBusy ? <Loader2 className="w-3 h-3 animate-spin" /> : <Square className="w-3 h-3" />} Arrêter
          </Button>
        )}
        <Button size="sm" variant="outline" className="h-7 gap-1.5 text-[12px]"
          onClick={() => onAction(() => rebootVm(vm.name), vm.name)} disabled={isBusy || !isRunning}>
          {isBusy ? <Loader2 className="w-3 h-3 animate-spin" /> : <RotateCcw className="w-3 h-3" />} Reboot
        </Button>
        <Button
          size="sm" variant="outline"
          className="h-7 gap-1.5 text-[12px]"
          onClick={handleQuickSnapshot}
          disabled={isBusy || snapCreating || !isRunning}
          title={!isRunning ? "La VM doit être Running" : "Créer un instantané"}
        >
          {snapCreating
            ? <Loader2 className="w-3 h-3 animate-spin" />
            : <Camera className="w-3 h-3" />}
          Snapshot
        </Button>
        <Button size="sm" variant="outline"
          className="h-7 w-7 p-0 text-red-600 hover:text-red-700 ml-auto"
          onClick={() => onDeleteRequest(vm.name)} disabled={isBusy} title="Supprimer">
          <Trash2 className="w-3 h-3" />
        </Button>
      </div>

      {/* ── Onglets ── */}
      <div className="flex border-b border-border/60 overflow-x-auto bg-background"
        style={{ scrollbarWidth: "none" }}>
        {TABS.map(tab => (
          <button key={tab.id} onClick={() => handleTabChange(tab.id)}
            className={cn(
              "flex items-center gap-1.5 px-4 py-2.5 text-[12px] whitespace-nowrap border-b-2 transition-colors flex-shrink-0",
              activeTab === tab.id
                ? "border-foreground text-foreground font-medium"
                : "border-transparent text-muted-foreground hover:text-foreground"
            )}>
            {tab.icon}{tab.label}
          </button>
        ))}
      </div>

      {/* ── Panel actif ── */}
      <div className="bg-card">
        {PANELS[activeTab]}
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────
// Page principale
// ─────────────────────────────────────────────
export default function VmsPage() {
  const [vms, setVms] = React.useState<VmDTO[]>([])
  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState<string | null>(null)
  const [actionLoading, setActionLoading] = React.useState<string | null>(null)
  const [passwordInfo, setPasswordInfo] = React.useState<{ vmName: string; password: string } | null>(null)
  const [deleteTarget, setDeleteTarget] = React.useState<string | null>(null)
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
    catch (e: any) { alert(e.message) }
    finally { setActionLoading(null) }
  }

  const confirmDelete = async () => {
    if (!deleteTarget) return
    setDeleteLoading(true)
    try { await deleteVm(deleteTarget); await load() }
    catch (e: any) { alert(e.message) }
    finally { setDeleteLoading(false); setDeleteTarget(null) }
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

      {/* AlertDialog confirmation suppression */}
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
            Gérez et accédez à vos VMs — Console VNC, SSH, métriques et plus.
          </p>
        </div>

        {loading && (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="size-4 animate-spin text-muted-foreground" />
          </div>
        )}

        {error && (
          <div className="border border-red-200 bg-red-50 rounded-xl px-5 py-4 text-[13px] text-red-600">{error}</div>
        )}

        {!loading && !error && vms.length === 0 && (
          <div className="text-center py-16 text-[13px] text-muted-foreground">Aucune VM déployée.</div>
        )}

        {!loading && vms.map(vm => (
          <VmDetailCard
            key={vm.name}
            vm={vm}
            onAction={handleAction}
            actionLoading={actionLoading}
            onDeleteRequest={setDeleteTarget}
          />
        ))}
      </div>
    </SidebarInset>
  )
}