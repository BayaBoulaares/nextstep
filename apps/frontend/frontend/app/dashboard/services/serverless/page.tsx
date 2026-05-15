// app/dashboard/services/serverless/page.tsx
"use client"

import * as React from "react"
import Link from "next/link"
import { SidebarInset, SidebarTrigger } from "@/components/ui/sidebar"
import { Separator } from "@/components/ui/separator"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Loader2, Check, ChevronRight, ExternalLink, RefreshCw } from "lucide-react"
import { cn } from "@/lib/utils"
import { knativeApi } from "@/lib/services/registry-knative.api"
import type {
  KnativeType,
  EventSourceType,
  KnativeServiceResponse,
  KnativeServiceRequest,
} from "@/lib/types"
import {
  KNATIVE_STATUS_META,
  EVENT_SOURCE_META,
} from "@/lib/types"

// ── Constantes ────────────────────────────────────────────────────────────────

const NAME_REGEX = /^[a-z][a-z0-9-]{0,61}[a-z0-9]$|^[a-z]$/

const IMAGE_REGEX = /^[a-z0-9./:-]+:[a-z0-9._-]+$/

const CPU_OPTIONS    = ["100m", "250m", "500m", "1000m", "2000m"]
const MEMORY_OPTIONS = ["128Mi", "256Mi", "512Mi", "1Gi", "2Gi"]

// ── SectionCard (même pattern) ────────────────────────────────────────────────
function SectionCard({ icon, title, sub, children }: {
  icon: string; title: string; sub: string; children: React.ReactNode
}) {
  return (
    <div className="border border-border rounded-2xl overflow-hidden">
      <div className="flex items-center gap-3 px-6 py-4 border-b border-border bg-muted/20">
        <span className="text-lg">{icon}</span>
        <div>
          <p className="text-[13px] font-semibold text-foreground">{title}</p>
          <p className="text-[11px] text-muted-foreground">{sub}</p>
        </div>
      </div>
      <div className="px-6 py-5 space-y-5 bg-card">{children}</div>
    </div>
  )
}

// ── StatusBadge ───────────────────────────────────────────────────────────────
function KnativeStatusBadge({ status }: { status: KnativeServiceResponse["status"] }) {
  const meta = KNATIVE_STATUS_META[status]
  return (
    <span className={cn(
      "inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-medium border",
      meta.color
    )}>
      {status === "DEPLOYING" && <Loader2 className="w-3 h-3 animate-spin" />}
      {meta.icon} {meta.label}
    </span>
  )
}

// ── ServiceCard ───────────────────────────────────────────────────────────────
function KnativeServiceCard({
  service,
  onSync,
  onDelete,
  syncing,
}: {
  service:  KnativeServiceResponse
  onSync:   (id: number) => void
  onDelete: (id: number) => void
  syncing:  number | null
}) {
  return (
    <div className="border border-border rounded-2xl overflow-hidden bg-card">
      <div className="flex items-center justify-between px-5 py-4 border-b border-border bg-muted/10">
        <div className="flex items-center gap-3">
          <span className="text-xl">
            {service.knativeType === "SERVING" ? "⚡" : "λ"}
          </span>
          <div>
            <p className="text-[13px] font-semibold text-foreground">{service.name}</p>
            <p className="text-[11px] text-muted-foreground">
              {service.knativeType === "SERVING" ? "Knative Serving" : "Knative Function"}
              {service.eventSource && ` · ${EVENT_SOURCE_META[service.eventSource].label}`}
            </p>
          </div>
        </div>
        <KnativeStatusBadge status={service.status} />
      </div>

      <div className="px-5 py-4 space-y-3">

        {/* URL publique */}
        {service.serviceUrl && (
          <a
            href={service.serviceUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-between gap-2 bg-muted/30 rounded-lg px-3 py-2 hover:bg-muted/50 transition-colors group"
          >
            <code className="text-[12px] font-mono text-foreground truncate">
              {service.serviceUrl}
            </code>
            <ExternalLink className="w-3.5 h-3.5 shrink-0 text-muted-foreground group-hover:text-foreground transition-colors" />
          </a>
        )}

        {/* Image container */}
        <div className="flex items-center justify-between text-[12px]">
          <span className="text-muted-foreground">Image</span>
          <code className="font-mono text-foreground bg-muted/40 px-2 py-0.5 rounded text-[11px] truncate max-w-[200px]">
            {service.containerImage}
          </code>
        </div>

        {/* Scaling */}
        <div className="flex items-center justify-between text-[12px]">
          <span className="text-muted-foreground">Scaling</span>
          <span className="text-foreground font-medium">
            {service.minScale} → {service.maxScale} replicas
          </span>
        </div>

        {/* Ressources */}
        <div className="flex items-center justify-between text-[12px]">
          <span className="text-muted-foreground">Ressources</span>
          <span className="text-foreground font-medium">
            {service.cpuLimit} CPU · {service.memoryLimit}
          </span>
        </div>

        {/* Source d'événement (Functions) */}
        {service.eventSource && (
          <div className="flex items-center justify-between text-[12px]">
            <span className="text-muted-foreground">Source</span>
            <span className="flex items-center gap-1.5 text-foreground font-medium">
              {EVENT_SOURCE_META[service.eventSource].icon}
              {EVENT_SOURCE_META[service.eventSource].label}
              {service.cronSchedule && (
                <code className="font-mono bg-muted/40 px-1.5 py-0.5 rounded text-[11px]">
                  {service.cronSchedule}
                </code>
              )}
              {service.kafkaTopic && (
                <code className="font-mono bg-muted/40 px-1.5 py-0.5 rounded text-[11px]">
                  {service.kafkaTopic}
                </code>
              )}
            </span>
          </div>
        )}

        {/* Scale to zero info */}
        {service.status === "SCALED_TO_ZERO" && (
          <div className="flex items-center gap-2 bg-blue-50 border border-blue-200 rounded-lg px-3 py-2 text-[11px] text-blue-700">
            💤 En veille — redémarre automatiquement à la prochaine requête
          </div>
        )}
      </div>

      <div className="px-5 py-3 border-t border-border bg-muted/5 flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          className="text-[12px] gap-1.5"
          onClick={() => onSync(service.id)}
          disabled={syncing === service.id}
        >
          {syncing === service.id
            ? <Loader2 className="w-3 h-3 animate-spin" />
            : <RefreshCw className="w-3 h-3" />}
          Sync statut
        </Button>
        <Button
          variant="outline"
          size="sm"
          className="text-[12px] text-destructive hover:text-destructive hover:bg-destructive/5 border-destructive/30 ml-auto"
          onClick={() => onDelete(service.id)}
        >
          Supprimer
        </Button>
      </div>
    </div>
  )
}

// ── Page principale ───────────────────────────────────────────────────────────
export default function ServerlessPage() {

  // Onglet actif
  const [activeTab, setActiveTab] = React.useState<KnativeType>("SERVING")

  // Liste des services
  const [services, setServices] = React.useState<KnativeServiceResponse[]>([])
  const [fetching, setFetching] = React.useState(true)
  const [syncing,  setSyncing]  = React.useState<number | null>(null)

  // Formulaire création
  const [creating,     setCreating]     = React.useState(false)
  const [createError,  setCreateError]  = React.useState<string | null>(null)
  const [showForm,     setShowForm]     = React.useState(false)

  // Champs formulaire
  const [name,         setName]         = React.useState("")
  const [image,        setImage]        = React.useState("")
  const [minScale,     setMinScale]     = React.useState(0)
  const [maxScale,     setMaxScale]     = React.useState(10)
  const [cpuLimit,     setCpuLimit]     = React.useState("500m")
  const [memoryLimit,  setMemoryLimit]  = React.useState("256Mi")
  const [eventSource,  setEventSource]  = React.useState<EventSourceType>("PING")
  const [kafkaTopic,   setKafkaTopic]   = React.useState("")
  const [cronSchedule, setCronSchedule] = React.useState("*/5 * * * *")

  // Validations
  const nameError = React.useMemo(() => {
    if (!name) return null
    if (!NAME_REGEX.test(name)) return "Minuscules, chiffres et tirets uniquement"
    return null
  }, [name])

  const imageError = React.useMemo(() => {
    if (!image) return null
    if (!IMAGE_REGEX.test(image)) return "Format : registry/image:tag"
    return null
  }, [image])

  // Services filtrés par onglet
  const filteredServices = React.useMemo(
    () => services.filter(s => s.knativeType === activeTab),
    [services, activeTab]
  )

  // Chargement
  React.useEffect(() => {
    knativeApi.list()
      .then(setServices)
      .catch(console.error)
      .finally(() => setFetching(false))
  }, [])

  // Création
  const handleCreate = async () => {
    if (!name || !image || nameError || imageError) return
    setCreating(true)
    setCreateError(null)

    const payload: KnativeServiceRequest = {
      name,
      knativeType:    activeTab,
      containerImage: image,
      minScale,
      maxScale,
      cpuLimit,
      memoryLimit,
      ...(activeTab === "FUNCTION" && {
        eventSource,
        kafkaTopic:   eventSource === "KAFKA" ? kafkaTopic   : undefined,
        cronSchedule: eventSource === "PING"  ? cronSchedule : undefined,
      }),
    }

    try {
      const created = await knativeApi.create(payload)
      setServices(prev => [created, ...prev])
      // Reset formulaire
      setName(""); setImage(""); setShowForm(false)
    } catch (e: any) {
      setCreateError(e.message ?? "Erreur lors du déploiement")
    } finally {
      setCreating(false)
    }
  }

  // Sync statut
  const handleSync = async (id: number) => {
    setSyncing(id)
    try {
      const updated = await knativeApi.sync(id)
      setServices(prev => prev.map(s => s.id === id ? updated : s))
    } catch (e) {
      console.error(e)
    } finally {
      setSyncing(null)
    }
  }

  // Suppression
  const handleDelete = async (id: number) => {
    try {
      await knativeApi.delete(id)
      setServices(prev => prev.filter(s => s.id !== id))
    } catch (e: any) {
      alert(e.message ?? "Erreur lors de la suppression")
    }
  }

  // ── Rendu ─────────────────────────────────────────────────────────────────
  return (
    <SidebarInset>
      <header className="flex h-14 items-center gap-3 border-b border-border/60 px-5 bg-background/95 backdrop-blur sticky top-0 z-10">
        <SidebarTrigger className="-ml-1 size-8 text-muted-foreground hover:text-foreground hover:bg-muted rounded-md transition-colors" />
        <Separator orientation="vertical" className="h-4 opacity-40" />
        <nav className="flex items-center gap-1.5 text-[12px] text-muted-foreground">
          <Link href="/dashboard/services" className="hover:text-foreground transition-colors">
            Marketplace
          </Link>
          <span className="opacity-30">/</span>
          <span className="font-medium text-foreground">Serverless</span>
        </nav>
      </header>

      <div className="flex gap-6 p-6 max-w-6xl mx-auto w-full items-start">

        {/* ── Colonne principale ── */}
        <div className="flex-1 min-w-0 space-y-5">

          {/* Onglets SERVING / FUNCTION */}
          <div className="flex items-center gap-1 p-1 bg-muted/40 rounded-xl border border-border w-fit">
            {(["SERVING", "FUNCTION"] as KnativeType[]).map(tab => (
              <button
                key={tab}
                onClick={() => { setActiveTab(tab); setShowForm(false) }}
                className={cn(
                  "flex items-center gap-2 px-4 py-2 rounded-lg text-[13px] font-medium transition-all",
                  activeTab === tab
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                {tab === "SERVING" ? "⚡" : "λ"}
                {tab === "SERVING" ? "Knative Serving" : "Knative Functions"}
                <span className="text-[11px] bg-muted px-1.5 py-0.5 rounded-full">
                  {services.filter(s => s.knativeType === tab).length}
                </span>
              </button>
            ))}
          </div>

          {/* Description de l'onglet actif */}
          <div className="border border-border rounded-2xl px-5 py-4 bg-card flex items-start gap-4">
            <span className="text-2xl mt-0.5">{activeTab === "SERVING" ? "⚡" : "λ"}</span>
            <div className="flex-1">
              <p className="text-[13px] font-semibold text-foreground">
                {activeTab === "SERVING"
                  ? "Knative Serving — Auto-scaling to zero"
                  : "Knative Functions — FaaS event-driven"}
              </p>
              <p className="text-[12px] text-muted-foreground mt-1 leading-relaxed">
                {activeTab === "SERVING"
                  ? "Déployez vos applications HTTP avec un scaling automatique de 0 à N replicas selon la charge. Coût zéro quand inactif."
                  : "Déployez des fonctions invoquées sur événement (Kafka, cron, API Kubernetes). Scale to zero entre chaque invocation."}
              </p>
            </div>
            <Button
              size="sm"
              className="text-[12px] shrink-0"
              onClick={() => setShowForm(prev => !prev)}
            >
              {showForm ? "Annuler" : `+ Nouveau ${activeTab === "SERVING" ? "service" : "fonction"}`}
            </Button>
          </div>

          {/* Formulaire de création */}
          {showForm && (
            <SectionCard
              icon={activeTab === "SERVING" ? "⚡" : "λ"}
              title={`Nouveau ${activeTab === "SERVING" ? "service Serving" : "Knative Function"}`}
              sub="Configuration du déploiement"
            >
              {/* Nom */}
              <div className="space-y-1.5">
                <Label className="text-[12px]">Nom *</Label>
                <Input
                  value={name}
                  onChange={e => setName(e.target.value.toLowerCase())}
                  placeholder="ex: mon-api"
                  className={cn("h-8 text-[13px]", nameError && "border-destructive")}
                />
                {nameError && <p className="text-[11px] text-destructive">{nameError}</p>}
              </div>

              {/* Image container */}
              <div className="space-y-1.5">
                <Label className="text-[12px]">Image container *</Label>
                <Input
                  value={image}
                  onChange={e => setImage(e.target.value)}
                  placeholder="ex: quay.io/mon-org/mon-image:latest"
                  className={cn("h-8 text-[13px] font-mono", imageError && "border-destructive")}
                />
                {imageError
                  ? <p className="text-[11px] text-destructive">{imageError}</p>
                  : <p className="text-[11px] text-muted-foreground">
                      Utilisez l'URL de votre Image Registry créé ci-dessus.
                    </p>
                }
              </div>

              {/* Scaling */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-[12px]">Min replicas</Label>
                  <div className="flex items-center gap-2">
                    <input
                      type="range" min={0} max={5} value={minScale}
                      onChange={e => setMinScale(Number(e.target.value))}
                      className="flex-1"
                    />
                    <span className="text-[13px] font-mono w-6 text-center">{minScale}</span>
                  </div>
                  {minScale === 0 && (
                    <p className="text-[11px] text-blue-600">💤 Scale to zero activé</p>
                  )}
                </div>
                <div className="space-y-1.5">
                  <Label className="text-[12px]">Max replicas</Label>
                  <div className="flex items-center gap-2">
                    <input
                      type="range" min={1} max={20} value={maxScale}
                      onChange={e => setMaxScale(Number(e.target.value))}
                      className="flex-1"
                    />
                    <span className="text-[13px] font-mono w-8 text-center">{maxScale}</span>
                  </div>
                </div>
              </div>

              {/* Ressources */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-[12px]">CPU limit</Label>
                  <div className="flex gap-1 flex-wrap">
                    {CPU_OPTIONS.map(opt => (
                      <button
                        key={opt}
                        onClick={() => setCpuLimit(opt)}
                        className={cn(
                          "px-2 py-1 rounded-lg text-[11px] border transition-colors",
                          cpuLimit === opt
                            ? "border-foreground bg-foreground text-background"
                            : "border-border hover:border-foreground/40"
                        )}
                      >
                        {opt}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-[12px]">Memory limit</Label>
                  <div className="flex gap-1 flex-wrap">
                    {MEMORY_OPTIONS.map(opt => (
                      <button
                        key={opt}
                        onClick={() => setMemoryLimit(opt)}
                        className={cn(
                          "px-2 py-1 rounded-lg text-[11px] border transition-colors",
                          memoryLimit === opt
                            ? "border-foreground bg-foreground text-background"
                            : "border-border hover:border-foreground/40"
                        )}
                      >
                        {opt}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Source d'événements — Functions uniquement */}
              {activeTab === "FUNCTION" && (
                <>
                  <Separator className="opacity-40" />
                  <div className="space-y-3">
                    <Label className="text-[12px]">Source d'événements *</Label>
                    <div className="grid grid-cols-2 gap-2">
                      {(["API_SERVER", "PING", "KAFKA", "SINK_BINDING"] as EventSourceType[]).map(src => {
                        const meta = EVENT_SOURCE_META[src]
                        return (
                          <button
                            key={src}
                            onClick={() => setEventSource(src)}
                            className={cn(
                              "text-left p-3 rounded-xl border text-[12px] transition-all",
                              eventSource === src
                                ? "border-foreground bg-foreground/5"
                                : "border-border hover:border-foreground/30 hover:bg-muted/30"
                            )}
                          >
                            <span className="block text-base mb-1">{meta.icon}</span>
                            <span className="block font-semibold text-foreground">{meta.label}</span>
                            <span className="text-[11px] text-muted-foreground">{meta.description}</span>
                          </button>
                        )
                      })}
                    </div>

                    {/* Config spécifique à la source */}
                    {eventSource === "KAFKA" && (
                      <div className="space-y-1.5">
                        <Label className="text-[12px]">Topic Kafka *</Label>
                        <Input
                          value={kafkaTopic}
                          onChange={e => setKafkaTopic(e.target.value)}
                          placeholder="ex: nextstep-events"
                          className="h-8 text-[13px] font-mono"
                        />
                      </div>
                    )}

                    {eventSource === "PING" && (
                      <div className="space-y-1.5">
                        <Label className="text-[12px]">Schedule cron *</Label>
                        <Input
                          value={cronSchedule}
                          onChange={e => setCronSchedule(e.target.value)}
                          placeholder="*/5 * * * *"
                          className="h-8 text-[13px] font-mono"
                        />
                        <div className="flex gap-2">
                          {["*/5 * * * *", "0 * * * *", "0 0 * * *"].map(c => (
                            <button
                              key={c}
                              onClick={() => setCronSchedule(c)}
                              className="text-[10px] font-mono bg-muted/40 px-2 py-1 rounded border border-border hover:border-foreground/30 transition-colors"
                            >
                              {c}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </>
              )}

              {createError && (
                <p className="text-[12px] text-destructive bg-destructive/5 border border-destructive/20 rounded-lg px-3 py-2">
                  {createError}
                </p>
              )}

              <Button
                className="w-full h-9 text-[13px] font-medium  bg-[#0a7fcf] hover:bg-[#0869b0] text-white"
                onClick={handleCreate}
                disabled={
                  !name.trim() || !image.trim() ||
                  !!nameError || !!imageError  ||
                  (activeTab === "FUNCTION" && eventSource === "KAFKA" && !kafkaTopic.trim()) ||
                  creating
                }
              >
                {creating
                  ? <><Loader2 className="w-3.5 h-3.5 mr-2 animate-spin" />Déploiement…</>
                  : <>Déployer <ChevronRight className="w-4 h-4 ml-1" /></>
                }
              </Button>
            </SectionCard>
          )}

          {/* Liste des services */}
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-muted-foreground mb-3">
              {activeTab === "SERVING" ? "Mes services Serving" : "Mes fonctions"} ({filteredServices.length})
            </p>

            {fetching ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
              </div>
            ) : filteredServices.length === 0 ? (
              <div className="border border-dashed border-border rounded-2xl py-12 text-center">
                <p className="text-[13px] text-muted-foreground">
                  {activeTab === "SERVING"
                    ? "Aucun service Serving déployé"
                    : "Aucune fonction déployée"}
                </p>
                <p className="text-[11px] text-muted-foreground mt-1">
                  Cliquez sur "+ Nouveau" pour commencer.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {filteredServices.map(svc => (
                  <KnativeServiceCard
                    key={svc.id}
                    service={svc}
                    onSync={handleSync}
                    onDelete={handleDelete}
                    syncing={syncing}
                  />
                ))}
              </div>
            )}
          </div>
        </div>

        {/* ── Résumé sticky ── */}
        <div className="w-72 shrink-0 sticky top-[88px] space-y-3">
          <div className="border border-border rounded-2xl overflow-hidden">
            <div className="px-5 py-4 bg-foreground text-background">
              <p className="text-[10px] font-semibold uppercase tracking-widest opacity-60 mb-1">
                OpenShift Serverless
              </p>
              <p className="text-base font-semibold">Knative</p>
            </div>
            <div className="px-5 py-4 space-y-3 bg-card">
              {[
                { icon: "⚡", label: "Serving",   count: services.filter(s => s.knativeType === "SERVING").length   },
                { icon: "λ",  label: "Functions", count: services.filter(s => s.knativeType === "FUNCTION").length  },
                { icon: "💤", label: "En veille", count: services.filter(s => s.status === "SCALED_TO_ZERO").length },
              ].map(row => (
                <div key={row.label} className="flex items-center justify-between text-[12px]">
                  <span className="flex items-center gap-1.5 text-muted-foreground">
                    <span>{row.icon}</span> {row.label}
                  </span>
                  <span className="font-semibold text-foreground">{row.count}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="border border-border rounded-xl px-4 py-3 text-[12px] text-muted-foreground bg-muted/20 flex items-start gap-2">
            <span className="text-amber-500 shrink-0 mt-0.5">💤</span>
            <span>Scale to zero : coût nul quand aucune requête. Redémarre en &lt;1s.</span>
          </div>

          <div className="border border-border rounded-xl px-4 py-3 text-[12px] text-muted-foreground bg-muted/20 flex items-start gap-2">
            <span className="text-blue-500 shrink-0 mt-0.5">ℹ️</span>
            Utilisez l'URL de votre Image Registry pour le champ image.
          </div>
        </div>

      </div>
    </SidebarInset>
  )
}