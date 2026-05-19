"use client"

import * as React from "react"
import { SidebarInset, SidebarTrigger } from "@/components/ui/sidebar"
import { Separator } from "@/components/ui/separator"
import { Button } from "@/components/ui/button"
import {
  ShieldAlert, Loader2, RefreshCw, Trash2,
  X, Info, Leaf, Clock, Zap,
  AlertTriangle, ChevronDown, Lock,
  Play, Ban,
} from "lucide-react"
import { useRole } from "@/lib/hooks/useRole"
import { useSession } from "next-auth/react"
import { cn } from "@/lib/utils"

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────
type NotifyType = "info" | "warn" | "error"
type CarbonLevel = "GREEN" | "YELLOW" | "RED"

interface CarbonReading {
  intensity: number
  zone:      string
  timestamp: string
  is_green:  boolean
  level:     CarbonLevel
}

interface DeferredJob {
  job_name:        string
  namespace:       string
  priority:        string
  max_delay_hours: number
  created_at:      string
  status:          string
}

interface CarbonStats {
  deferred_jobs_count:   number
  average_intensity_24h: number | null
  green_hours_today:     number
  zone:                  string
  thresholds:            { green: number; red: number }
}

interface HistoryPoint {
  intensity: number
  zone:      string
  timestamp: string
  is_green:  boolean
  level:     CarbonLevel
}

interface NotifyItem {
  id:   string
  type: NotifyType
  msg:  string
}

// ─────────────────────────────────────────────────────────────────────────────
// Config
// ─────────────────────────────────────────────────────────────────────────────
const API              = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8081"
const REFRESH_INTERVAL = 30_000 // 30 secondes

// ─────────────────────────────────────────────────────────────────────────────
// Constantes UI
// ─────────────────────────────────────────────────────────────────────────────
const LEVEL_STYLE: Record<CarbonLevel, string> = {
  GREEN:  "bg-emerald-50 text-emerald-700 border-emerald-200",
  YELLOW: "bg-amber-50 text-amber-700 border-amber-200",
  RED:    "bg-red-50 text-red-600 border-red-200",
}

const LEVEL_COLOR: Record<CarbonLevel, string> = {
  GREEN:  "text-emerald-600",
  YELLOW: "text-amber-600",
  RED:    "text-red-500",
}

const LEVEL_BG: Record<CarbonLevel, string> = {
  GREEN:  "from-emerald-500/10 to-transparent",
  YELLOW: "from-amber-500/10 to-transparent",
  RED:    "from-red-500/10 to-transparent",
}

const LEVEL_LABEL: Record<CarbonLevel, string> = {
  GREEN:  "🟢 Vert — Énergie propre",
  YELLOW: "🟡 Modéré",
  RED:    "🔴 Élevé — Énergie carbonée",
}

const PRIORITY_STYLE: Record<string, string> = {
  HIGH:   "bg-red-50 text-red-700 border-red-200",
  MEDIUM: "bg-amber-50 text-amber-700 border-amber-200",
  LOW:    "bg-blue-50 text-blue-700 border-blue-200",
}

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────
function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleString("fr-FR", {
      day: "2-digit", month: "2-digit",
      hour: "2-digit", minute: "2-digit",
    })
  } catch { return iso }
}

function timeAgo(iso: string): string {
  try {
    const diff = Date.now() - new Date(iso).getTime()
    const mins = Math.floor(diff / 60000)
    if (mins < 1)  return "À l'instant"
    if (mins < 60) return `Il y a ${mins} min`
    return `Il y a ${Math.floor(mins / 60)}h`
  } catch { return iso }
}

function deadlineRemaining(createdAt: string, maxDelayHours: number): string {
  try {
    const created  = new Date(createdAt).getTime()
    const deadline = created + maxDelayHours * 3_600_000
    const remaining = deadline - Date.now()
    if (remaining <= 0) return "Délai dépassé"
    const h = Math.floor(remaining / 3_600_000)
    const m = Math.floor((remaining % 3_600_000) / 60_000)
    return `${h}h ${m}m restant`
  } catch { return "" }
}

function deadlinePercent(createdAt: string, maxDelayHours: number): number {
  try {
    const created  = new Date(createdAt).getTime()
    const total    = maxDelayHours * 3_600_000
    const elapsed  = Date.now() - created
    return Math.min(100, Math.round((elapsed / total) * 100))
  } catch { return 0 }
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

function NotifyContainer({ items, dismiss }: { items: NotifyItem[]; dismiss: (id: string) => void }) {
  if (!items.length) return null
  return (
    <div className="fixed bottom-4 right-4 z-[200] flex flex-col gap-2 max-w-sm w-full pointer-events-none">
      {items.map(item => (
        <div key={item.id}
          className={cn("flex items-start gap-3 px-4 py-3 rounded-xl border shadow-xl pointer-events-auto", NOTIFY_STYLE[item.type])}>
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
// CarbonGauge — jauge visuelle de l'intensité
// ─────────────────────────────────────────────────────────────────────────────
function CarbonGauge({ current }: { current: CarbonReading | null }) {
  if (!current) {
    return (
      <div className="border border-border/50 rounded-2xl p-6 flex items-center justify-center">
        <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
      </div>
    )
  }

  const level   = current.level as CarbonLevel
  const maxVal  = 600
  const pct     = Math.min(100, (current.intensity / maxVal) * 100)

  return (
    <div className={cn(
      "border rounded-2xl p-5 bg-gradient-to-br",
      level === "GREEN"  ? "border-emerald-100" :
      level === "YELLOW" ? "border-amber-100"   : "border-red-100",
      LEVEL_BG[level],
    )}>
      {/* Valeur principale */}
      <div className="text-center mb-4">
        <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground mb-2">
          Intensité carbone actuelle
        </p>
        <div className={cn("text-[56px] font-black font-mono leading-none", LEVEL_COLOR[level])}>
          {current.intensity.toFixed(0)}
        </div>
        <p className="text-[12px] text-muted-foreground mt-1">g CO₂/kWh</p>
      </div>

      {/* Barre de progression */}
      <div className="h-2 bg-muted/40 rounded-full overflow-hidden mb-3">
        <div
          className={cn(
            "h-full rounded-full transition-all duration-700",
            level === "GREEN"  ? "bg-emerald-500" :
            level === "YELLOW" ? "bg-amber-500"   : "bg-red-500",
          )}
          style={{ width: `${pct}%` }}
        />
      </div>

      {/* Légende graduée */}
      <div className="flex justify-between text-[9px] text-muted-foreground mb-3">
        <span>0</span>
        <span className="text-emerald-600">200</span>
        <span className="text-amber-600">400</span>
        <span className="text-red-500">600</span>
      </div>

      {/* Badge niveau */}
      <div className={cn(
        "text-center text-[12px] font-medium px-3 py-1.5 rounded-xl border",
        LEVEL_STYLE[level],
      )}>
        {LEVEL_LABEL[level]}
      </div>

      {/* Meta */}
      <div className="flex justify-between mt-3 text-[10px] text-muted-foreground">
        <span>Zone : <strong>{current.zone}</strong></span>
        <span>{timeAgo(current.timestamp)}</span>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// MiniChart — graphique historique en SVG
// ─────────────────────────────────────────────────────────────────────────────
function MiniChart({ history }: { history: HistoryPoint[] }) {
  if (history.length < 2) {
    return (
      <div className="h-[80px] flex items-center justify-center text-[11px] text-muted-foreground">
        Données insuffisantes
      </div>
    )
  }

  const W    = 400
  const H    = 80
  const vals = [...history].reverse().map(h => h.intensity)
  const max  = Math.max(...vals, 500)
  const min  = 0

  const points = vals.map((v, i) => {
    const x = (i / (vals.length - 1)) * W
    const y = H - ((v - min) / (max - min)) * H
    return `${x},${y}`
  }).join(" ")

  const fillPoints = `0,${H} ${points} ${W},${H}`

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" preserveAspectRatio="none">
      {/* Lignes de seuil */}
      {[200, 400].map(threshold => {
        const y = H - ((threshold - min) / (max - min)) * H
        return (
          <line key={threshold}
            x1={0} y1={y} x2={W} y2={y}
            stroke={threshold === 200 ? "#10b981" : "#f59e0b"}
            strokeWidth={0.8}
            strokeDasharray="4,4"
            opacity={0.5}
          />
        )
      })}
      {/* Remplissage */}
      <polygon
        points={fillPoints}
        fill="url(#carbonGrad)"
        opacity={0.3}
      />
      {/* Ligne */}
      <polyline
        points={points}
        fill="none"
        stroke="#10b981"
        strokeWidth={2}
        strokeLinejoin="round"
      />
      <defs>
        <linearGradient id="carbonGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%"   stopColor="#10b981" />
          <stop offset="100%" stopColor="#10b981" stopOpacity={0} />
        </linearGradient>
      </defs>
    </svg>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// JobCard — carte d'un job différé
// ─────────────────────────────────────────────────────────────────────────────
function JobCard({
  job,
  onCancel,
  cancelling,
}: {
  job:        DeferredJob
  onCancel:   (name: string) => void
  cancelling: string | null
}) {
  const pct = deadlinePercent(job.created_at, job.max_delay_hours)

  return (
    <div className="border border-amber-100 bg-amber-50/30 rounded-xl px-4 py-3">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="font-mono text-[13px] font-semibold text-foreground truncate">
              {job.job_name}
            </span>
            <span className={cn(
              "text-[9px] font-medium px-1.5 py-0.5 rounded-full border flex-shrink-0",
              PRIORITY_STYLE[job.priority] ?? "bg-muted text-muted-foreground border-border",
            )}>
              {job.priority}
            </span>
          </div>
          <p className="text-[11px] font-mono text-muted-foreground">{job.namespace}</p>
          <p className="text-[11px] text-muted-foreground mt-1">
            {deadlineRemaining(job.created_at, job.max_delay_hours)}
          </p>
        </div>
        <Button
          size="sm"
          variant="ghost"
          className="h-7 w-7 p-0 text-red-500 hover:text-red-600 hover:bg-red-50 flex-shrink-0"
          onClick={() => onCancel(job.job_name)}
          disabled={cancelling === job.job_name}
          title="Annuler ce job"
        >
          {cancelling === job.job_name
            ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
            : <Ban className="w-3.5 h-3.5" />
          }
        </Button>
      </div>

      {/* Barre de progression du délai */}
      <div className="mt-2.5 h-1.5 bg-muted/40 rounded-full overflow-hidden">
        <div
          className={cn(
            "h-full rounded-full transition-all",
            pct < 50 ? "bg-emerald-500" :
            pct < 80 ? "bg-amber-500"   : "bg-red-500",
          )}
          style={{ width: `${pct}%` }}
        />
      </div>
      <div className="flex justify-between mt-1 text-[9px] text-muted-foreground">
        <span>{formatDate(job.created_at)}</span>
        <span>{pct}% du délai écoulé</span>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// CarbonSchedulerPage
// ─────────────────────────────────────────────────────────────────────────────
export default function CarbonSchedulerPage() {
  const { isAdmin }        = useRole()
  const { data: session }  = useSession()
  const { items: notifyItems, show: notify, dismiss: notifyDismiss } = useNotify()

  const [current,     setCurrent]     = React.useState<CarbonReading | null>(null)
  const [history,     setHistory]     = React.useState<HistoryPoint[]>([])
  const [stats,       setStats]       = React.useState<CarbonStats | null>(null)
  const [jobs,        setJobs]        = React.useState<DeferredJob[]>([])
  const [loading,     setLoading]     = React.useState(true)
  const [cancelling,  setCancelling]  = React.useState<string | null>(null)
  const [lastRefresh, setLastRefresh] = React.useState<Date | null>(null)

  const token = React.useMemo(
    () => (session as { accessToken?: string } | null)?.accessToken ?? "",
    [session],
  )

  // ── Fetch toutes les données ──
  const fetchAll = React.useCallback(async (silent = false) => {
    if (!isAdmin) return
    if (!silent) setLoading(true)
    try {
      const headers = { Authorization: `Bearer ${token}` }
      const [curRes, histRes, statRes, jobRes] = await Promise.all([
        fetch(`${API}/api/ia/carbon/current`,      { headers }),
        fetch(`${API}/api/ia/carbon/history?limit=48`, { headers }),
        fetch(`${API}/api/ia/carbon/stats`,        { headers }),
        fetch(`${API}/api/ia/carbon/jobs/deferred`,{ headers }),
      ])

      if (curRes.ok)  setCurrent(await curRes.json()  as CarbonReading)
      if (histRes.ok) setHistory(await histRes.json() as HistoryPoint[])
      if (statRes.ok) setStats(await statRes.json()   as CarbonStats)
      if (jobRes.ok)  setJobs(await jobRes.json()     as DeferredJob[])
      setLastRefresh(new Date())
    } catch (e: unknown) {
      if (!silent) notify(e instanceof Error ? e.message : "Erreur réseau", "error")
    } finally {
      if (!silent) setLoading(false)
    }
  }, [isAdmin, token, notify])

  React.useEffect(() => { fetchAll() }, [fetchAll])

  React.useEffect(() => {
    if (!isAdmin) return
    const iv = setInterval(() => fetchAll(true), REFRESH_INTERVAL)
    return () => clearInterval(iv)
  }, [isAdmin, fetchAll])

  // ── Annuler un job ──
  async function handleCancel(jobName: string) {
    setCancelling(jobName)
    try {
      const res = await fetch(`${API}/api/ia/carbon/jobs/deferred/${jobName}`, {
        method:  "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!res.ok) throw new Error(`Erreur ${res.status}`)
      setJobs(prev => prev.filter(j => j.job_name !== jobName))
      notify(`Job "${jobName}" annulé.`, "info")
    } catch (e: unknown) {
      notify(e instanceof Error ? e.message : "Erreur", "error")
    } finally {
      setCancelling(null)
    }
  }

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
          <span className="font-medium text-foreground">Carbon Scheduler</span>
        </nav>
        <div className="ml-auto flex items-center gap-2">
          {/* Badge niveau actuel */}
          {current && (
            <div className={cn(
              "flex items-center gap-1.5 rounded-full border px-3 py-1 text-[11px] font-medium",
              LEVEL_STYLE[current.level as CarbonLevel],
            )}>
              <Leaf className="w-3 h-3" />
              {current.intensity.toFixed(0)} g CO₂/kWh
            </div>
          )}
          {/* Admin badge */}
          <div className="flex items-center gap-1.5 rounded-full border border-border bg-muted/40 px-3 py-1 text-[11px] font-medium">
            <ShieldAlert className="size-3 text-foreground/60" />
            <span className="text-foreground/70 uppercase">Admin</span>
          </div>
          {/* Refresh */}
          <Button size="sm" variant="outline" className="h-8 gap-1.5 text-[12px]"
            onClick={() => fetchAll()} disabled={loading}>
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
            <Leaf className="w-5 h-5 text-emerald-600" />
            Carbon Awareness Scheduler
          </h1>
          <p className="mt-1 text-[13px] text-muted-foreground">
            Optimise le scheduling des workloads selon l'intensité carbone du réseau électrique.
            Zone : <strong>{stats?.zone ?? "TN"}</strong>.
            {lastRefresh && (
              <span className="ml-2 opacity-50">
                MAJ : {lastRefresh.toLocaleTimeString("fr-FR")}
              </span>
            )}
          </p>
        </div>

        <Separator className="opacity-40" />

        {!isAdmin ? <AccessDenied /> : loading ? (
          <div className="flex justify-center py-16">
            <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-[320px_1fr] gap-6">

            {/* ── Colonne gauche : jauge + stats ── */}
            <div className="space-y-4">

              {/* Jauge principale */}
              <CarbonGauge current={current} />

              {/* Stats */}
              {stats && (
                <div className="border border-border/50 rounded-2xl overflow-hidden">
                  <div className="px-4 py-3 bg-muted/30 border-b border-border/50">
                    <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                      Statistiques 24h
                    </p>
                  </div>
                  <div className="p-4 space-y-0">
                    {[
                      {
                        label: "Intensité moyenne",
                        value: stats.average_intensity_24h != null
                          ? `${stats.average_intensity_24h} g/kWh` : "—",
                      },
                      {
                        label: "Heures vertes",
                        value: `${stats.green_hours_today}h`,
                        color: "text-emerald-600",
                      },
                      {
                        label: "Jobs en attente",
                        value: stats.deferred_jobs_count,
                        color: stats.deferred_jobs_count > 0 ? "text-amber-600" : "text-foreground",
                      },
                      { label: "Seuil vert",  value: `< ${stats.thresholds.green} g/kWh` },
                      { label: "Seuil rouge", value: `> ${stats.thresholds.red} g/kWh` },
                    ].map(({ label, value, color }) => (
                      <div key={label}
                        className="flex justify-between items-center py-2 border-b border-border/30 last:border-0 text-[12px]">
                        <span className="text-muted-foreground">{label}</span>
                        <span className={cn("font-medium font-mono", color ?? "text-foreground")}>
                          {value}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Légende */}
              <div className="border border-border/40 rounded-xl p-3 space-y-2 bg-muted/10">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Légende
                </p>
                {(["GREEN", "YELLOW", "RED"] as CarbonLevel[]).map(lvl => (
                  <div key={lvl} className="flex items-center gap-2 text-[11px]">
                    <span className={cn(
                      "w-2 h-2 rounded-full flex-shrink-0",
                      lvl === "GREEN"  ? "bg-emerald-500" :
                      lvl === "YELLOW" ? "bg-amber-500"   : "bg-red-500",
                    )} />
                    <span className="text-muted-foreground">{LEVEL_LABEL[lvl]}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* ── Colonne droite : historique + jobs ── */}
            <div className="space-y-4">

              {/* Graphique historique */}
              <div className="border border-border/50 rounded-2xl overflow-hidden">
                <div className="flex items-center justify-between px-4 py-3 bg-muted/30 border-b border-border/50">
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                    Historique 12h
                  </p>
                  <span className="text-[10px] text-muted-foreground">
                    {history.length} points
                  </span>
                </div>
                <div className="p-4">
                  <MiniChart history={history} />
                  <div className="flex justify-between mt-2 text-[10px] text-muted-foreground">
                    <span className="text-emerald-600">— Seuil vert (200)</span>
                    <span className="text-amber-600">— Seuil rouge (400)</span>
                  </div>
                </div>
              </div>

              {/* Jobs différés */}
              <div className="border border-border/50 rounded-2xl overflow-hidden">
                <div className="flex items-center justify-between px-4 py-3 bg-muted/30 border-b border-border/50">
                  <div className="flex items-center gap-2">
                    <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                      Jobs en attente
                    </p>
                    {jobs.length > 0 && (
                      <span className="text-[10px] bg-amber-100 text-amber-700 border border-amber-200 px-1.5 py-0.5 rounded-full">
                        {jobs.length}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
                    <Clock className="w-3 h-3" />
                    Lancés quand énergie verte
                  </div>
                </div>

                <div className="p-3 space-y-2">
                  {jobs.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <Zap className="w-8 h-8 mx-auto mb-2 opacity-20" />
                      <p className="text-[12px]">Aucun job en attente.</p>
                      <p className="text-[11px] mt-1 opacity-60">
                        {current?.is_green
                          ? "L'énergie est verte — les jobs sont lancés immédiatement."
                          : "Les jobs soumis seront reportés jusqu'à l'énergie verte."}
                      </p>
                    </div>
                  ) : (
                    jobs.map(job => (
                      <JobCard
                        key={job.job_name}
                        job={job}
                        onCancel={handleCancel}
                        cancelling={cancelling}
                      />
                    ))
                  )}
                </div>
              </div>

              {/* Info mode simulation */}
              {!process.env.NEXT_PUBLIC_ELECTRICITY_MAPS_KEY && (
                <div className="border border-blue-100 bg-blue-50/50 rounded-xl px-4 py-3 flex items-start gap-2.5">
                  <Info className="w-4 h-4 text-blue-500 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-[12px] text-blue-800 font-medium">Mode simulation actif</p>
                    <p className="text-[11px] text-blue-700 mt-0.5">
                      Aucune clé <code className="font-mono">ELECTRICITY_MAPS_API_KEY</code> configurée.
                      Les données sont simulées selon l'heure de la journée.
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </SidebarInset>
  )
}