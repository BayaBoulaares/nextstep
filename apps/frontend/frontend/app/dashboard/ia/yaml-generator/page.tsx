"use client"

import * as React from "react"
import { SidebarInset, SidebarTrigger } from "@/components/ui/sidebar"
import { Separator } from "@/components/ui/separator"
import { Button } from "@/components/ui/button"
import {
  ShieldAlert, Loader2, Copy, Check,
  Wand2, Clock, ChevronDown, FileCode2,
  BookOpen, X, History, Sparkles, Terminal,
  Lock, Info,
} from "lucide-react"
import { useRole } from "@/lib/hooks/useRole"
import { useSession } from "next-auth/react"
import { cn } from "@/lib/utils"

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────
type OutputType     = "yaml_openshift" | "terraform" | "helm"
type ServiceCategory = "CALCUL" | "HEBERGEMENT" | "IA" | "STOCKAGE" | "BASE_DONNEES" | "RESEAU"
type NotifyType     = "info" | "warn" | "error"

interface GenerateRequest {
  description:       string
  output_type:       OutputType
  namespace:         string
  service_category?: ServiceCategory
  plan_name?:        string
  resource_name?:    string
}

interface GenerateResponse {
  content:        string
  output_type:    string
  explanation:    string
  cached:         boolean
  deployment_id?: number
  generated_at:   string
}

interface HistoryEntry {
  username:     string
  description:  string
  output_type:  string
  namespace:    string
  content:      string
  generated_at: string
}

interface NotifyItem {
  id:   string
  type: NotifyType
  msg:  string
}

// ─────────────────────────────────────────────────────────────────────────────
// Config
// ─────────────────────────────────────────────────────────────────────────────
const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8080"

const OUTPUT_TYPES: { value: OutputType; label: string; icon: React.ReactNode; desc: string }[] = [
  { value: "yaml_openshift", label: "YAML OpenShift", icon: <FileCode2 className="w-4 h-4" />, desc: "Manifeste K8s/OCP" },
  { value: "terraform",      label: "Terraform HCL",  icon: <Terminal  className="w-4 h-4" />, desc: "Infrastructure as Code" },
  { value: "helm",           label: "Helm Chart",     icon: <BookOpen  className="w-4 h-4" />, desc: "Package Kubernetes" },
]

const CATEGORIES: { value: ServiceCategory; label: string; icon: string }[] = [
  { value: "CALCUL",       label: "Calcul",         icon: "🖥️" },
  { value: "HEBERGEMENT",  label: "Hébergement",    icon: "🌐" },
  { value: "IA",           label: "IA / GPU",        icon: "🤖" },
  { value: "STOCKAGE",     label: "Stockage",        icon: "💾" },
  { value: "BASE_DONNEES", label: "Base de données", icon: "🗄️" },
  { value: "RESEAU",       label: "Réseau",          icon: "🔀" },
]

const EXAMPLES: { label: string; text: string }[] = [
  { label: "Déploiement Nginx",      text: "un déploiement Nginx avec 3 replicas sur le port 80, limites 256Mi RAM, dans le namespace tenant-baya" },
  { label: "PostgreSQL StatefulSet", text: "un StatefulSet PostgreSQL avec PVC de 10Gi en storageClass ocs-storagecluster-ceph-rbd, mot de passe via Secret" },
  { label: "CronJob Python",         text: "un CronJob qui exécute un script Python toutes les heures, image depuis la registry interne nextstep" },
  { label: "ConfigMap Spring Boot",  text: "un ConfigMap contenant les variables d'environnement pour une application Spring Boot (SPRING_PROFILES_ACTIVE, DB_URL)" },
  { label: "Route TLS",              text: "une Route OpenShift avec TLS edge termination pointant vers un service 'frontend' sur le port 3000" },
  { label: "PVC Block Storage",      text: "un PersistentVolumeClaim de 20Gi en RWO avec storageClass ocs-storagecluster-ceph-rbd" },
]

const NAMESPACES: string[] = [
  "tenant-baya",
  "baya-tenant-alice",
  "baya-tenant-bob",
  "ia-services",
]

const CLUSTER_INFO: { label: string; value: string }[] = [
  { label: "Cluster",         value: "ocp4.nextstep-it.com" },
  { label: "Registry",        value: "image-registry…svc:5000" },
  { label: "StorageClass RWO",value: "ocs-…-ceph-rbd" },
  { label: "StorageClass RWX",value: "ocs-…-cephfs" },
  { label: "Namespace ops",   value: "tenant-baya" },
  { label: "Keycloak realm",  value: "mon-app" },
]

const TIPS: string[] = [
  "Précisez les ressources CPU/RAM pour des manifestes optimisés.",
  "Mentionnez la StorageClass si vous avez besoin de persistance.",
  "Le contexte nextstep est injecté automatiquement dans le prompt.",
  "Les résultats identiques sont mis en cache pour économiser le quota.",
]

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────
function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleString("fr-FR", {
      day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit",
    })
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
  items: NotifyItem[]
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
        Contactez votre administrateur pour obtenir les droits nécessaires.
      </p>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// HistoryPanel
// ─────────────────────────────────────────────────────────────────────────────
function HistoryPanel({
  history,
  onSelect,
  onClose,
}: {
  history:  HistoryEntry[]
  onSelect: (entry: HistoryEntry) => void
  onClose:  () => void
}) {
  return (
    <div className="fixed inset-0 z-50 flex">
      <div className="flex-1 bg-black/30 backdrop-blur-sm" onClick={onClose} />
      <div className="w-full max-w-md bg-card border-l border-border flex flex-col shadow-2xl">
        <div className="flex items-center justify-between px-5 py-4 border-b border-border/60">
          <div className="flex items-center gap-2">
            <History className="w-4 h-4 text-muted-foreground" />
            <p className="text-[14px] font-semibold">Historique</p>
          </div>
          <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={onClose}>
            <X className="w-4 h-4" />
          </Button>
        </div>
        <div className="flex-1 overflow-y-auto p-3 space-y-2">
          {history.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Clock className="w-8 h-8 mx-auto mb-3 opacity-20" />
              <p className="text-[13px]">Aucune génération pour l'instant.</p>
            </div>
          ) : (
            history.map((entry, i) => (
              <button
                key={i}
                onClick={() => { onSelect(entry); onClose() }}
                className="w-full text-left bg-muted/30 border border-border/50 rounded-xl px-4 py-3 hover:bg-muted/60 transition-colors"
              >
                <div className="flex items-center justify-between mb-1">
                  <span className={cn(
                    "text-[10px] font-medium px-2 py-0.5 rounded-full border",
                    entry.output_type === "yaml_openshift" ? "bg-blue-50 text-blue-700 border-blue-200"
                    : entry.output_type === "terraform"    ? "bg-purple-50 text-purple-700 border-purple-200"
                    : "bg-emerald-50 text-emerald-700 border-emerald-200",
                  )}>
                    {entry.output_type}
                  </span>
                  <span className="text-[10px] text-muted-foreground">
                    {formatDate(entry.generated_at)}
                  </span>
                </div>
                <p className="text-[12px] text-foreground line-clamp-2">{entry.description}</p>
                <p className="text-[10px] text-muted-foreground mt-1 font-mono">{entry.namespace}</p>
              </button>
            ))
          )}
        </div>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// ResultPanel
// ─────────────────────────────────────────────────────────────────────────────
const TYPE_STYLE: Record<string, string> = {
  yaml_openshift: "bg-blue-50 text-blue-700 border-blue-200",
  terraform:      "bg-purple-50 text-purple-700 border-purple-200",
  helm:           "bg-emerald-50 text-emerald-700 border-emerald-200",
}

function ResultPanel({
  result,
  onClear,
}: {
  result:  GenerateResponse
  onClear: () => void
}) {
  const [copied, setCopied] = React.useState(false)

  const handleCopy = () => {
    navigator.clipboard.writeText(result.content)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="border border-border rounded-2xl overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-muted/20 border-b border-border/60">
        <div className="flex items-center gap-2.5">
          <div className="w-2 h-2 rounded-full bg-emerald-500" />
          <span className="text-[13px] font-medium">Manifeste généré</span>
          <span className={cn(
            "text-[10px] font-medium px-2 py-0.5 rounded-full border",
            TYPE_STYLE[result.output_type] ?? "bg-muted text-muted-foreground border-border",
          )}>
            {result.output_type}
          </span>
          {result.cached && (
            <span className="text-[10px] text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full">
              cache
            </span>
          )}
        </div>
        <div className="flex items-center gap-1.5">
          <span className="text-[10px] text-muted-foreground">{formatDate(result.generated_at)}</span>
          <Button size="sm" variant="outline" className="h-7 gap-1.5 text-[11px]" onClick={handleCopy}>
            {copied
              ? <><Check className="w-3 h-3 text-emerald-600" /> Copié</>
              : <><Copy  className="w-3 h-3" /> Copier</>
            }
          </Button>
          <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-muted-foreground" onClick={onClear}>
            <X className="w-3.5 h-3.5" />
          </Button>
        </div>
      </div>

      {/* Code */}
      <div className="bg-zinc-950">
        <pre
          className="text-[12px] text-emerald-400 font-mono p-4 overflow-x-auto leading-relaxed max-h-[420px] overflow-y-auto"
          style={{ scrollbarWidth: "thin" }}
        >
          {result.content}
        </pre>
      </div>

      {/* Explication */}
      {result.explanation && (
        <div className="px-4 py-3 bg-blue-50/50 border-t border-blue-100 flex items-start gap-2.5">
          <Sparkles className="w-3.5 h-3.5 text-blue-500 flex-shrink-0 mt-0.5" />
          <p className="text-[12px] text-blue-800 leading-relaxed">{result.explanation}</p>
        </div>
      )}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// YamlGeneratorPage
// ─────────────────────────────────────────────────────────────────────────────
export default function YamlGeneratorPage() {
  const { isAdmin }        = useRole()
  const { data: session }  = useSession()
  const { items: notifyItems, show: notify, dismiss: notifyDismiss } = useNotify()

  const [description,  setDescription]  = React.useState<string>("")
  const [outputType,   setOutputType]   = React.useState<OutputType>("yaml_openshift")
  const [namespace,    setNamespace]    = React.useState<string>("tenant-baya")
  const [customNs,     setCustomNs]     = React.useState<string>("")
  const [category,     setCategory]     = React.useState<ServiceCategory | "">("")
  const [planName,     setPlanName]     = React.useState<string>("")
  const [resourceName, setResourceName] = React.useState<string>("")
  const [loading,      setLoading]      = React.useState<boolean>(false)
  const [result,       setResult]       = React.useState<GenerateResponse | null>(null)
  const [history,      setHistory]      = React.useState<HistoryEntry[]>([])
  const [showHistory,  setShowHistory]  = React.useState<boolean>(false)
  const [showAdvanced, setShowAdvanced] = React.useState<boolean>(false)

  const activeNamespace = customNs.trim() || namespace

  // ── Fetch history ──
  React.useEffect(() => {
    if (!isAdmin) return
    const token = (session as { accessToken?: string } | null)?.accessToken ?? ""
    fetch(`${API}/api/ia/yaml-generator/history`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(r => (r.ok ? r.json() : null))
      .then((d: { history?: HistoryEntry[] } | null) => {
        if (d?.history) setHistory(d.history)
      })
      .catch(() => {})
  }, [isAdmin, session])

  // ── Génération ──
  async function handleGenerate() {
    if (!description.trim()) { notify("Entrez une description.", "warn"); return }
    setLoading(true)
    setResult(null)

    const body: GenerateRequest = {
      description:      description.trim(),
      output_type:      outputType,
      namespace:        activeNamespace,
      service_category: (category as ServiceCategory) || undefined,
      plan_name:        planName.trim() || undefined,
      resource_name:    resourceName.trim() || undefined,
    }

    try {
      const token = (session as { accessToken?: string } | null)?.accessToken ?? ""
      const res = await fetch(`${API}/api/generate`, {
        method:  "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization:  `Bearer ${token}`,
        },
        body: JSON.stringify(body),
      })

      if (!res.ok) {
        const err = await res.json().catch(() => ({ detail: res.statusText })) as { detail?: string }
        throw new Error(err.detail ?? `Erreur ${res.status}`)
      }

      const data = (await res.json()) as GenerateResponse
      setResult(data)

      const newEntry: HistoryEntry = {
        username:     session?.user?.name ?? "admin",
        description:  description.trim().slice(0, 200),
        output_type:  outputType,
        namespace:    activeNamespace,
        content:      data.content.slice(0, 500),
        generated_at: data.generated_at,
      }
      setHistory(prev => [newEntry, ...prev].slice(0, 50))

    } catch (err: unknown) {
      notify(err instanceof Error ? err.message : "Erreur inconnue", "error")
    } finally {
      setLoading(false)
    }
  }

  function handleSelectHistory(entry: HistoryEntry) {
    setDescription(entry.description)
    setOutputType(entry.output_type as OutputType)
    setNamespace(entry.namespace)
    setResult(null)
  }

  return (
    <SidebarInset>
      <NotifyContainer items={notifyItems} dismiss={notifyDismiss} />

      {/* Header */}
      <header className="flex h-14 items-center gap-3 border-b border-border/60 px-5 bg-background/95 backdrop-blur sticky top-0 z-10">
        <SidebarTrigger className="-ml-1 size-8 text-muted-foreground hover:text-foreground hover:bg-muted rounded-md transition-colors" />
        <Separator orientation="vertical" className="h-4 opacity-40" />
        <nav className="flex items-center gap-1.5 text-[13px]">
          <span className="text-muted-foreground">Dashboard</span>
          <span className="text-muted-foreground/30">/</span>
          <span className="text-muted-foreground">IA Services</span>
          <span className="text-muted-foreground/30">/</span>
          <span className="font-medium text-foreground">YAML Generator</span>
        </nav>
        <div className="ml-auto flex items-center gap-2">
          <div className="flex items-center gap-1.5 rounded-full border border-border bg-muted/40 px-3 py-1 text-[11px] font-medium tracking-wide">
            <ShieldAlert className="size-3 text-foreground/60" />
            <span className="text-foreground/70 uppercase">Admin</span>
          </div>
          <Button
            size="sm"
            variant="outline"
            className="h-8 gap-1.5 text-[12px]"
            onClick={() => setShowHistory(true)}
          >
            <History className="w-3.5 h-3.5" />
            Historique
            {history.length > 0 && (
              <span className="ml-0.5 text-[10px] bg-foreground text-background rounded-full px-1.5 py-0.5">
                {history.length}
              </span>
            )}
          </Button>
        </div>
      </header>

      {showHistory && (
        <HistoryPanel
          history={history}
          onSelect={handleSelectHistory}
          onClose={() => setShowHistory(false)}
        />
      )}

      {/* Body */}
      <div className="p-6 pl-9 max-w-5xl w-full space-y-6">
        <div>
          <p className="text-[11px] font-semibold tracking-[0.18em] uppercase text-muted-foreground mb-1.5">
            IA Services — Administration
          </p>
          <h1 className="text-xl font-semibold tracking-tight flex items-center gap-2">
            <Wand2 className="w-5 h-5 text-muted-foreground" />
            Générateur de manifestes
          </h1>
          <p className="mt-1 text-[13px] text-muted-foreground">
            Décrivez une ressource en langage naturel → manifeste YAML / Terraform / Helm prêt à appliquer sur{" "}
            <code className="font-mono text-[12px]">ocp4.nextstep-it.com</code>.
          </p>
        </div>

        <Separator className="opacity-40" />

        {!isAdmin ? <AccessDenied /> : (
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_380px] gap-6">

            {/* ── Colonne gauche ── */}
            <div className="space-y-4">

              {/* Type de sortie */}
              <div>
                <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider mb-2">
                  Type de sortie
                </p>
                <div className="grid grid-cols-3 gap-2">
                  {OUTPUT_TYPES.map(t => (
                    <button
                      key={t.value}
                      onClick={() => setOutputType(t.value)}
                      className={cn(
                        "flex flex-col items-start gap-1.5 px-3 py-2.5 rounded-xl border text-left transition-all",
                        outputType === t.value
                          ? "border-foreground bg-foreground/5"
                          : "border-border/50 bg-muted/20 hover:bg-muted/40 hover:border-border",
                      )}
                    >
                      <div className={cn(
                        "transition-colors",
                        outputType === t.value ? "text-foreground" : "text-muted-foreground",
                      )}>
                        {t.icon}
                      </div>
                      <div>
                        <p className={cn(
                          "text-[12px] font-medium",
                          outputType === t.value ? "text-foreground" : "text-muted-foreground",
                        )}>
                          {t.label}
                        </p>
                        <p className="text-[10px] text-muted-foreground/60">{t.desc}</p>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Namespace */}
              <div>
                <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider mb-2">
                  Namespace cible
                </p>
                <div className="flex gap-2 flex-wrap mb-2">
                  {NAMESPACES.map(ns => (
                    <button
                      key={ns}
                      onClick={() => { setNamespace(ns); setCustomNs("") }}
                      className={cn(
                        "text-[11px] font-mono px-2.5 py-1 rounded-lg border transition-all",
                        !customNs && namespace === ns
                          ? "border-foreground bg-foreground/5 text-foreground"
                          : "border-border/50 text-muted-foreground hover:border-border hover:text-foreground",
                      )}
                    >
                      {ns}
                    </button>
                  ))}
                </div>
                <input
                  value={customNs}
                  onChange={e => setCustomNs(e.target.value)}
                  placeholder="Ou saisir un namespace personnalisé..."
                  className="w-full h-8 rounded-lg border border-border bg-muted/40 px-3 text-[12px] font-mono focus:outline-none focus:ring-1 focus:ring-ring"
                />
              </div>

              {/* Description */}
              <div>
                <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider mb-2">
                  Description en langage naturel <span className="text-red-500">*</span>
                </p>
                <textarea
                  rows={5}
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  placeholder="Ex: un déploiement Nginx avec 3 replicas sur le port 80, limites 256Mi RAM..."
                  className="w-full rounded-xl border border-border bg-muted/40 px-4 py-3 text-[13px] resize-none focus:outline-none focus:ring-1 focus:ring-ring leading-relaxed"
                />
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {EXAMPLES.map(ex => (
                    <button
                      key={ex.label}
                      onClick={() => setDescription(ex.text)}
                      className="text-[11px] text-muted-foreground bg-muted/40 border border-border/50 rounded-full px-2.5 py-1 hover:text-foreground hover:border-border transition-colors"
                    >
                      {ex.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Options avancées */}
              <div className="border border-border/50 rounded-xl overflow-hidden">
                <button
                  onClick={() => setShowAdvanced(v => !v)}
                  className="w-full flex items-center justify-between px-4 py-2.5 text-[12px] text-muted-foreground hover:text-foreground hover:bg-muted/20 transition-colors"
                >
                  <span className="font-medium">Options avancées (nextstep)</span>
                  <ChevronDown className={cn("w-4 h-4 transition-transform", showAdvanced && "rotate-180")} />
                </button>
                {showAdvanced && (
                  <div className="px-4 pb-4 pt-1 space-y-3 border-t border-border/50 bg-muted/10">
                    <div>
                      <label className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1.5 block">
                        Catégorie de service
                      </label>
                      <div className="flex flex-wrap gap-1.5">
                        <button
                          onClick={() => setCategory("")}
                          className={cn(
                            "text-[11px] px-2.5 py-1 rounded-lg border transition-all",
                            !category
                              ? "border-foreground bg-foreground/5 text-foreground"
                              : "border-border/50 text-muted-foreground hover:border-border",
                          )}
                        >
                          Aucune
                        </button>
                        {CATEGORIES.map(c => (
                          <button
                            key={c.value}
                            onClick={() => setCategory(c.value)}
                            className={cn(
                              "text-[11px] px-2.5 py-1 rounded-lg border transition-all",
                              category === c.value
                                ? "border-foreground bg-foreground/5 text-foreground"
                                : "border-border/50 text-muted-foreground hover:border-border",
                            )}
                          >
                            {c.icon} {c.label}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1 block">
                          Nom du plan
                        </label>
                        <input
                          value={planName}
                          onChange={e => setPlanName(e.target.value)}
                          placeholder="ex: vCore M"
                          className="w-full h-8 rounded-lg border border-border bg-background px-3 text-[12px] focus:outline-none focus:ring-1 focus:ring-ring"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1 block">
                          Nom de la ressource
                        </label>
                        <input
                          value={resourceName}
                          onChange={e => setResourceName(e.target.value)}
                          placeholder="ex: prod-backend-01"
                          className="w-full h-8 rounded-lg border border-border bg-background px-3 text-[12px] font-mono focus:outline-none focus:ring-1 focus:ring-ring"
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Bouton */}
              <Button
                className="w-full h-10 gap-2 text-[13px]"
                onClick={handleGenerate}
                disabled={loading || !description.trim()}
              >
                {loading
                  ? <><Loader2 className="w-4 h-4 animate-spin" /> Génération en cours…</>
                  : <><Wand2   className="w-4 h-4" /> Générer le manifeste</>
                }
              </Button>

              {result && <ResultPanel result={result} onClear={() => setResult(null)} />}
            </div>

            {/* ── Colonne droite ── */}
            <div className="space-y-4">

              {/* Infos cluster */}
              <div className="border border-border/50 rounded-2xl overflow-hidden">
                <div className="px-4 py-3 bg-muted/30 border-b border-border/50">
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                    Contexte cluster
                  </p>
                </div>
                <div className="p-4 text-[12px]">
                  {CLUSTER_INFO.map(({ label, value }) => (
                    <div
                      key={label}
                      className="flex justify-between items-center py-1.5 border-b border-border/30 last:border-0"
                    >
                      <span className="text-muted-foreground">{label}</span>
                      <code className="font-mono text-[11px] text-foreground">{value}</code>
                    </div>
                  ))}
                </div>
              </div>

              {/* Historique rapide */}
              <div className="border border-border/50 rounded-2xl overflow-hidden">
                <div className="flex items-center justify-between px-4 py-3 bg-muted/30 border-b border-border/50">
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                    Récent
                  </p>
                  {history.length > 0 && (
                    <button
                      onClick={() => setShowHistory(true)}
                      className="text-[11px] text-muted-foreground hover:text-foreground transition-colors"
                    >
                      Voir tout →
                    </button>
                  )}
                </div>
                <div className="p-2 space-y-1">
                  {history.length === 0 ? (
                    <p className="text-[12px] text-muted-foreground text-center py-6">
                      Aucune génération récente.
                    </p>
                  ) : (
                    history.slice(0, 5).map((entry, i) => (
                      <button
                        key={i}
                        onClick={() => handleSelectHistory(entry)}
                        className="w-full text-left px-3 py-2.5 rounded-lg hover:bg-muted/40 transition-colors"
                      >
                        <div className="flex items-center justify-between mb-0.5">
                          <span className="text-[10px] font-mono text-muted-foreground">
                            {entry.namespace}
                          </span>
                          <span className="text-[10px] text-muted-foreground">
                            {formatDate(entry.generated_at)}
                          </span>
                        </div>
                        <p className="text-[12px] text-foreground line-clamp-1">{entry.description}</p>
                      </button>
                    ))
                  )}
                </div>
              </div>

              {/* Tips */}
              <div className="border border-blue-100 bg-blue-50/50 rounded-2xl p-4">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-blue-600 mb-2">
                  Conseils
                </p>
                {TIPS.map((tip, i) => (
                  <p key={i} className="text-[12px] text-blue-700 flex items-start gap-2 mb-1.5 last:mb-0">
                    <span className="text-blue-400 flex-shrink-0 mt-0.5">·</span>
                    {tip}
                  </p>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </SidebarInset>
  )
}