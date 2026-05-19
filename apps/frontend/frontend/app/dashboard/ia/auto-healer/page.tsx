"use client"

import * as React from "react"
import { SidebarInset, SidebarTrigger } from "@/components/ui/sidebar"
import { Separator } from "@/components/ui/separator"
import { Button } from "@/components/ui/button"
import {
  ShieldAlert, Loader2, RefreshCw, Trash2,
  X, Info, Check, ChevronDown, ChevronUp,
  AlertTriangle, Activity, Wifi, WifiOff,
  RotateCcw, ZoomIn, Lock,
} from "lucide-react"
import { useRole } from "@/lib/hooks/useRole"
import { useSession } from "next-auth/react"
import { cn } from "@/lib/utils"

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────
type NotifyType = "info" | "warn" | "error"

interface Incident {
  pod_name:       string
  namespace:      string
  cause:          string
  action:         string
  action_label:   string
  confidence:     string
  status:         string
  timestamp:      string
  logs_snippet:   string
  recommendation?: string
}

interface Stats {
  total:           number
  resolved:        number
  alert_sent:      number
  failed:          number
  resolution_rate: number
  watcher_running: boolean
}

interface NotifyItem {
  id:   string
  type: NotifyType
  msg:  string
}

// ─────────────────────────────────────────────────────────────────────────────
// Config
// ─────────────────────────────────────────────────────────────────────────────
const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8081"
const REFRESH_INTERVAL = 10_000 // 10 secondes

// ─────────────────────────────────────────────────────────────────────────────
// Constantes UI
// ─────────────────────────────────────────────────────────────────────────────
const STATUS_STYLE: Record<string, string> = {
  SUCCESS:    "bg-emerald-50 text-emerald-700 border-emerald-200",
  ALERT_SENT: "bg-amber-50 text-amber-700 border-amber-200",
  PENDING:    "bg-blue-50 text-blue-700 border-blue-200",
  SKIPPED:    "bg-zinc-50 text-zinc-500 border-zinc-200",
}

const STATUS_LABEL: Record<string, string> = {
  SUCCESS:    "Résolu",
  ALERT_SENT: "Alerte envoyée",
  PENDING:    "En attente",
  SKIPPED:    "Ignoré",
}

const ACTION_ICON: Record<string, string> = {
  RESTART:        "🔄",
  SCALE_DOWN:     "📉",
  ALERT_HUMAN:    "🚨",
  IMAGE_PULL_FIX: "🐳",
  OOM_FIX:        "💾",
}

const CONFIDENCE_STYLE: Record<string, string> = {
  HIGH:   "text-emerald-600",
  MEDIUM: "text-amber-600",
  LOW:    "text-red-500",
}

const NAMESPACES = ["", "tenant-baya", "baya-tenant-alice", "baya-tenant-bob"]

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────
function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleString("fr-FR", {
      day: "2-digit", month: "2-digit",
      hour: "2-digit", minute: "2-digit", second: "2-digit",
    })
  } catch {
    return iso
  }
}

function timeAgo(iso: string): string {
  try {
    const diff = Date.now() - new Date(iso).getTime()
    const mins = Math.floor(diff / 60000)
    if (mins < 1)  return "À l'instant"
    if (mins < 60) return `Il y a ${mins} min`
    const hrs = Math.floor(mins / 60)
    if (hrs < 24)  return `Il y a ${hrs}h`
    return `Il y a ${Math.floor(hrs / 24)}j`
  } catch {
    return iso
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// useNotify
// ─────────────────────────────────────────────────────────────────────────────
function useNotify() {
  const [items, setItems] = React.useState<NotifyItem[]>([])

  const show = React.useCallback((msg: string, type: NotifyType = "info") => {
    const id = Math.random().toString(36).slice(2)
    setItems(prev => [...prev, { id, type, msg }])
    setTimeout(
      () => setItems(prev => prev.filter(i => i.id !== id)),
      type === "error" ? 7000 : 4000,
    )
  }, [])

  const dismiss = React.useCallback((id: string) => {
    setItems(prev => prev.filter(i => i.id !== id))
  }, [])

  return { items, show, dismiss }
}

// ─────────────────────────────────────────────────────────────────────────────
// NotifyContainer
// ─────────────────────────────────────────────────────────────────────────────
const NOTIFY_STYLE: Record<NotifyType, string> = {
  info:  "bg-blue-50 border-blue-200 text-blue-800",
  warn:  "bg-amber-50 border-amber-200 text-amber-800",
  error: "bg-red-50 border-red-200 text-red-800",
}

function NotifyContainer({
  items,
  dismiss,
}: {
  items:   NotifyItem[]
  dismiss: (id: string) => void
}) {
  if (!items.length) return null
  return (
    <div className="fixed bottom-4 right-4 z-[200] flex flex-col gap-2 max-w-sm w-full pointer-events-none">
      {items.map(item => (
        <div
          key={item.id}
          className={cn(
            "flex items-start gap-3 px-4 py-3 rounded-xl border shadow-xl pointer-events-auto",
            NOTIFY_STYLE[item.type],
          )}
        >
          <Info className="w-4 h-4 flex-shrink-0 mt-0.5" />
          <p className="flex-1 text-[12px] leading-relaxed">{item.msg}</p>
          <button onClick={() => dismiss(item.id)} className="opacity-50 hover:opacity-100">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      ))}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// AccessDenied
// ─────────────────────────────────────────────────────────────────────────────
function AccessDenied() {
  return (
    <div className="flex flex-col items-center justify-center py-24 px-6 text-center">
      <div className="w-16 h-16 rounded-2xl bg-red-50 border border-red-200 flex items-center justify-center mb-5">
        <Lock className="w-7 h-7 text-red-500" />
      </div>
      <h2 className="text-[17px] font-semibold mb-2">Accès restreint</h2>
      <p className="text-[13px] text-muted-foreground max-w-xs">
        Cette fonctionnalité est réservée aux administrateurs nextstep.
      </p>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// StatCard
// ─────────────────────────────────────────────────────────────────────────────
function StatCard({
  label,
  value,
  color = "text-foreground",
  sub,
}: {
  label: string
  value: string | number
  color?: string
  sub?:  string
}) {
  return (
    <div className="bg-muted/40 border border-border/60 rounded-xl px-4 py-3">
      <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">{label}</p>
      <p className={cn("text-[26px] font-bold font-mono leading-none", color)}>{value}</p>
      {sub && <p className="text-[10px] text-muted-foreground mt-1">{sub}</p>}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// IncidentCard
// ─────────────────────────────────────────────────────────────────────────────
function IncidentCard({ incident }: { incident: Incident }) {
  const [expanded, setExpanded] = React.useState(false)

  const statusStyle = STATUS_STYLE[incident.status]
    ?? "bg-zinc-50 text-zinc-500 border-zinc-200"
  const statusLabel = STATUS_LABEL[incident.status] ?? incident.status

  return (
    <div className={cn(
      "border rounded-xl overflow-hidden transition-all",
      incident.status === "SUCCESS"    ? "border-emerald-100"
      : incident.status === "ALERT_SENT" ? "border-amber-100"
      : "border-border/50",
    )}>
      {/* Ligne principale */}
      <div className="flex items-start gap-3 px-4 py-3 bg-card">
        {/* Icône action */}
        <div className="text-[22px] flex-shrink-0 mt-0.5">
          {ACTION_ICON[incident.action] ?? "⚙️"}
        </div>

        {/* Infos */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <span className="font-mono text-[13px] font-semibold text-foreground">
              {incident.pod_name}
            </span>
            <span className="text-[10px] font-mono text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
              {incident.namespace}
            </span>
          </div>
          <p className="text-[12px] text-muted-foreground line-clamp-1">{incident.cause}</p>
          <div className="flex items-center gap-3 mt-1.5 flex-wrap">
            <span className="text-[11px] text-muted-foreground">{incident.action_label}</span>
            <span className={cn("text-[10px] font-semibold", CONFIDENCE_STYLE[incident.confidence] ?? "text-muted-foreground")}>
              Confiance : {incident.confidence}
            </span>
          </div>
        </div>

        {/* Droite */}
        <div className="flex flex-col items-end gap-2 flex-shrink-0">
          <span className={cn(
            "text-[10px] font-medium px-2 py-0.5 rounded-full border",
            statusStyle,
          )}>
            {statusLabel}
          </span>
          <span className="text-[10px] text-muted-foreground">{timeAgo(incident.timestamp)}</span>
          <button
            onClick={() => setExpanded(v => !v)}
            className="text-[10px] text-muted-foreground hover:text-foreground flex items-center gap-0.5 transition-colors"
          >
            {expanded ? <><ChevronUp className="w-3 h-3" /> Moins</> : <><ChevronDown className="w-3 h-3" /> Détails</>}
          </button>
        </div>
      </div>

      {/* Détails expandés */}
      {expanded && (
        <div className="border-t border-border/40 bg-muted/20 px-4 py-3 space-y-3">
          {/* Timestamp complet */}
          <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
            <span className="font-mono">{formatDate(incident.timestamp)}</span>
          </div>

          {/* Recommandation */}
          {incident.recommendation && (
            <div className="bg-blue-50 border border-blue-100 rounded-lg px-3 py-2 flex items-start gap-2">
              <Info className="w-3.5 h-3.5 text-blue-500 flex-shrink-0 mt-0.5" />
              <p className="text-[11px] text-blue-800">{incident.recommendation}</p>
            </div>
          )}

          {/* Logs */}
          {incident.logs_snippet && incident.logs_snippet !== "[Logs non disponibles]" && (
            <div>
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1.5">
                Extrait des logs
              </p>
              <pre className="bg-zinc-950 text-emerald-400 font-mono text-[10px] p-3 rounded-lg overflow-x-auto max-h-[120px] overflow-y-auto leading-relaxed"
                style={{ scrollbarWidth: "thin" }}>
                {incident.logs_snippet}
              </pre>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// AutoHealerPage
// ─────────────────────────────────────────────────────────────────────────────
export default function AutoHealerPage() {
  const { isAdmin }        = useRole()
  const { data: session }  = useSession()
  const { items: notifyItems, show: notify, dismiss: notifyDismiss } = useNotify()

  const [incidents,    setIncidents]    = React.useState<Incident[]>([])
  const [stats,        setStats]        = React.useState<Stats | null>(null)
  const [loading,      setLoading]      = React.useState(true)
  const [clearing,     setClearing]     = React.useState(false)
  const [filterNs,     setFilterNs]     = React.useState("")
  const [filterStatus, setFilterStatus] = React.useState("")
  const [lastRefresh,  setLastRefresh]  = React.useState<Date | null>(null)

  const token = React.useMemo(
    () => (session as { accessToken?: string } | null)?.accessToken ?? "",
    [session],
  )

  // ── Fetch ──
  const fetchData = React.useCallback(async (silent = false) => {
    if (!isAdmin) return
    if (!silent) setLoading(true)
    try {
      const nsParam     = filterNs     ? `?namespace=${filterNs}`                  : ""
      const statusParam = filterStatus ? `${nsParam ? "&" : "?"}status=${filterStatus}` : ""
      const uri         = `${API}/api/ia/healer/incidents${nsParam}${statusParam}`

      const [incRes, statRes] = await Promise.all([
        fetch(uri,                              { headers: { Authorization: `Bearer ${token}` } }),
        fetch(`${API}/api/ia/healer/incidents/stats`, { headers: { Authorization: `Bearer ${token}` } }),
      ])

      if (incRes.ok)  setIncidents(await incRes.json()  as Incident[])
      if (statRes.ok) setStats(await statRes.json()     as Stats)
      setLastRefresh(new Date())
    } catch (e: unknown) {
      if (!silent) notify(e instanceof Error ? e.message : "Erreur réseau", "error")
    } finally {
      if (!silent) setLoading(false)
    }
  }, [isAdmin, token, filterNs, filterStatus, notify])

  // Premier chargement
  React.useEffect(() => { fetchData() }, [fetchData])

  // Auto-refresh toutes les 10 secondes
  React.useEffect(() => {
    if (!isAdmin) return
    const iv = setInterval(() => fetchData(true), REFRESH_INTERVAL)
    return () => clearInterval(iv)
  }, [isAdmin, fetchData])

  // ── Clear incidents ──
  async function handleClear() {
    if (!confirm("Vider tous les incidents ?")) return
    setClearing(true)
    try {
      const res = await fetch(`${API}/api/ia/healer/incidents`, {
        method:  "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!res.ok) throw new Error(`Erreur ${res.status}`)
      setIncidents([])
      setStats(null)
      notify("Incidents effacés.", "info")
    } catch (e: unknown) {
      notify(e instanceof Error ? e.message : "Erreur", "error")
    } finally {
      setClearing(false)
    }
  }

  // ── Filtered incidents ──
  const filtered = React.useMemo(() => {
    return incidents
      .filter(i => !filterNs     || i.namespace === filterNs)
      .filter(i => !filterStatus || i.status    === filterStatus)
  }, [incidents, filterNs, filterStatus])

  return (
    <SidebarInset>
      <NotifyContainer items={notifyItems} dismiss={notifyDismiss} />

      {/* ── Header ── */}
      <header className="flex h-14 items-center gap-3 border-b border-border/60 px-5 bg-background/95 backdrop-blur sticky top-0 z-10">
        <SidebarTrigger className="-ml-1 size-8 text-muted-foreground hover:text-foreground hover:bg-muted rounded-md transition-colors" />
        <Separator orientation="vertical" className="h-4 opacity-40" />
        <nav className="flex items-center gap-1.5 text-[13px]">
          <span className="text-muted-foreground">Dashboard</span>
          <span className="text-muted-foreground/30">/</span>
          <span className="text-muted-foreground">IA Services</span>
          <span className="text-muted-foreground/30">/</span>
          <span className="font-medium text-foreground">Auto-Healer</span>
        </nav>
        <div className="ml-auto flex items-center gap-2">
          {/* Watcher status */}
          {stats && (
            <div className={cn(
              "flex items-center gap-1.5 rounded-full border px-3 py-1 text-[11px] font-medium",
              stats.watcher_running
                ? "bg-emerald-50 border-emerald-200 text-emerald-700"
                : "bg-red-50 border-red-200 text-red-600",
            )}>
              {stats.watcher_running
                ? <><Wifi className="w-3 h-3" /> Watcher actif</>
                : <><WifiOff className="w-3 h-3" /> Watcher arrêté</>
              }
            </div>
          )}
          {/* Admin badge */}
          <div className="flex items-center gap-1.5 rounded-full border border-border bg-muted/40 px-3 py-1 text-[11px] font-medium">
            <ShieldAlert className="size-3 text-foreground/60" />
            <span className="text-foreground/70 uppercase">Admin</span>
          </div>
          {/* Refresh */}
          <Button size="sm" variant="outline" className="h-8 gap-1.5 text-[12px]"
            onClick={() => fetchData()} disabled={loading}>
            <RefreshCw className={cn("w-3.5 h-3.5", loading && "animate-spin")} />
            Actualiser
          </Button>
        </div>
      </header>

      {/* ── Body ── */}
      <div className="p-6 pl-9 max-w-5xl w-full space-y-6">

        {/* Hero */}
        <div>
          <p className="text-[11px] font-semibold tracking-[0.18em] uppercase text-muted-foreground mb-1.5">
            IA Services — Administration
          </p>
          <h1 className="text-xl font-semibold tracking-tight flex items-center gap-2">
            <Activity className="w-5 h-5 text-muted-foreground" />
            Auto-Healer
          </h1>
          <p className="mt-1 text-[13px] text-muted-foreground">
            Surveillance et auto-correction des pods en erreur sur{" "}
            <code className="font-mono text-[12px]">ocp4.nextstep-it.com</code>.
            Refresh automatique toutes les 10 secondes.
            {lastRefresh && (
              <span className="ml-2 opacity-50">
                Dernière MAJ : {lastRefresh.toLocaleTimeString("fr-FR")}
              </span>
            )}
          </p>
        </div>

        <Separator className="opacity-40" />

        {!isAdmin ? <AccessDenied /> : (
          <div className="space-y-6">

            {/* ── Stats ── */}
            {loading && !stats ? (
              <div className="flex justify-center py-8">
                <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
              </div>
            ) : stats ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
                <StatCard label="Total"           value={stats.total}           />
                <StatCard label="Résolus auto"    value={stats.resolved}        color="text-emerald-600" />
                <StatCard label="Alertes"         value={stats.alert_sent}      color="text-amber-600" />
                <StatCard label="Échecs"          value={stats.failed}          color="text-red-500" />
                <StatCard
                  label="Taux résolution"
                  value={`${stats.resolution_rate}%`}
                  color={stats.resolution_rate >= 70 ? "text-emerald-600" : "text-amber-600"}
                  sub="automatique"
                />
              </div>
            ) : null}

            {/* ── Barre de filtres ── */}
            <div className="flex items-center gap-3 flex-wrap">
              {/* Filtre namespace */}
              <div className="flex items-center gap-1.5">
                <span className="text-[11px] text-muted-foreground">Namespace :</span>
                <div className="flex gap-1">
                  {NAMESPACES.map(ns => (
                    <button key={ns} onClick={() => setFilterNs(ns)}
                      className={cn(
                        "text-[11px] font-mono px-2 py-1 rounded-lg border transition-all",
                        filterNs === ns
                          ? "border-foreground bg-foreground/5 text-foreground"
                          : "border-border/50 text-muted-foreground hover:border-border",
                      )}>
                      {ns || "Tous"}
                    </button>
                  ))}
                </div>
              </div>

              {/* Filtre status */}
              <div className="flex items-center gap-1.5">
                <span className="text-[11px] text-muted-foreground">Statut :</span>
                <div className="flex gap-1">
                  {(["", "SUCCESS", "ALERT_SENT", "PENDING"] as const).map(s => (
                    <button key={s} onClick={() => setFilterStatus(s)}
                      className={cn(
                        "text-[11px] px-2 py-1 rounded-lg border transition-all",
                        filterStatus === s
                          ? "border-foreground bg-foreground/5 text-foreground"
                          : "border-border/50 text-muted-foreground hover:border-border",
                      )}>
                      {s === ""           ? "Tous"
                      : s === "SUCCESS"    ? "Résolus"
                      : s === "ALERT_SENT" ? "Alertes"
                      : "En attente"}
                    </button>
                  ))}
                </div>
              </div>

              {/* Clear */}
              <Button size="sm" variant="outline"
                className="h-8 gap-1.5 text-[11px] text-red-600 border-red-200 hover:bg-red-50 ml-auto"
                onClick={handleClear} disabled={clearing || incidents.length === 0}>
                {clearing
                  ? <><Loader2 className="w-3 h-3 animate-spin" /> Effacement…</>
                  : <><Trash2  className="w-3 h-3" /> Vider ({incidents.length})</>
                }
              </Button>
            </div>

            {/* ── Liste incidents ── */}
            {loading ? (
              <div className="flex justify-center py-12">
                <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
              </div>
            ) : filtered.length === 0 ? (
              <div className="text-center py-16 text-muted-foreground border border-border/30 rounded-2xl">
                <Check className="w-10 h-10 mx-auto mb-3 opacity-20" />
                <p className="text-[14px] font-medium">Aucun incident détecté</p>
                <p className="text-[12px] mt-1 opacity-60">
                  {filterNs || filterStatus
                    ? "Essayez de modifier les filtres."
                    : "Le watcher surveille les namespaces nextstep en temps réel."}
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {filtered.map((incident, i) => (
                  <IncidentCard key={`${incident.pod_name}-${incident.timestamp}-${i}`} incident={incident} />
                ))}
              </div>
            )}

            {/* ── Info namespace surveillés ── */}
            <div className="border border-border/40 rounded-xl p-4 bg-muted/20">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-2">
                Namespaces surveillés
              </p>
              <div className="flex flex-wrap gap-2">
                {["tenant-baya", "baya-tenant-*"].map(ns => (
                  <span key={ns}
                    className="text-[11px] font-mono px-2.5 py-1 bg-muted border border-border/50 rounded-lg text-foreground">
                    {ns}
                  </span>
                ))}
              </div>
              <p className="text-[11px] text-muted-foreground mt-2">
                Les namespaces système OpenShift sont automatiquement exclus.
              </p>
            </div>

          </div>
        )}
      </div>
    </SidebarInset>
  )
}