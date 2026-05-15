"use client"

import * as React from "react"
import Link from "next/link"
import { SidebarInset, SidebarTrigger } from "@/components/ui/sidebar"
import { Separator } from "@/components/ui/separator"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Loader2, Check, ChevronRight, Copy,
  Terminal, Package, Info, Lock, Server, AlertTriangle
} from "lucide-react"
import { cn } from "@/lib/utils"
import { registryApi } from "@/lib/services/registry-knative.api"
import type { ImageRegistryResponse } from "@/lib/types"
import { REGISTRY_STATUS_META, INTERNAL_REGISTRY_FEATURES } from "@/lib/types"

const NAME_REGEX    = /^[a-z][a-z0-9-]{0,61}[a-z0-9]$|^[a-z]$/
const PRIMARY_COLOR = "#0a7fcf"

// ── SectionCard ───────────────────────────────────────────────────────────────
function SectionCard({ icon: IconComponent, title, sub, children }: {
  icon: React.ElementType; title: string; sub: string; children: React.ReactNode
}) {
  return (
    <div className="border border-border rounded-2xl overflow-hidden">
      <div className="flex items-center gap-3 px-6 py-4 border-b border-border bg-muted/20">
        <IconComponent className="w-5 h-5" style={{ color: PRIMARY_COLOR }} />
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
function StatusBadge({ status }: { status: ImageRegistryResponse["status"] }) {
  const meta = REGISTRY_STATUS_META[status]
  return (
    <span className={cn(
      "inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-medium border",
      meta.color
    )}>
      {status === "PROVISIONING" && <Loader2 className="w-3 h-3 animate-spin" />}
      {status === "ACTIVE"       && <Check   className="w-3 h-3" />}
      {status === "ERROR"        && <AlertTriangle className="w-3 h-3" />}
      {meta.label}
    </span>
  )
}

// ── CopyLine ──────────────────────────────────────────────────────────────────
function CopyLine({ value, mono = true }: { value: string; mono?: boolean }) {
  const [copied, setCopied] = React.useState(false)
  const copy = () => {
    navigator.clipboard.writeText(value)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }
  return (
    <div className="flex items-center gap-2 bg-muted/40 rounded-lg px-3 py-2 group">
      <code className={cn(
        "flex-1 text-[11px] text-foreground truncate",
        mono && "font-mono"
      )}>{value}</code>
      <button
        onClick={copy}
        className="shrink-0 text-muted-foreground hover:text-foreground transition-colors opacity-0 group-hover:opacity-100"
      >
        {copied
          ? <Check className="w-3.5 h-3.5" style={{ color: PRIMARY_COLOR }} />
          : <Copy  className="w-3.5 h-3.5" />}
      </button>
    </div>
  )
}

// ── RegistryCard ──────────────────────────────────────────────────────────────
function RegistryCard({ registry, onDelete }: {
  registry: ImageRegistryResponse
  onDelete: (id: number) => void
}) {
  const [showCommands, setShowCommands] = React.useState(false)

  return (
    <div className="border border-border rounded-2xl overflow-hidden bg-card">

      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-border bg-muted/10">
        <div className="flex items-center gap-3">
          <Server className="w-5 h-5" style={{ color: PRIMARY_COLOR }} />
          <div>
            <p className="text-[13px] font-semibold text-foreground">{registry.name}</p>
            <p className="text-[11px] text-muted-foreground">Internal Registry OpenShift</p>
          </div>
        </div>
        <StatusBadge status={registry.status} />
      </div>

      {/* Error state */}
      {registry.status === "ERROR" && (
        <div className="mx-5 mt-4 flex items-start gap-2 bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-[12px] text-red-700">
          <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold">Provisionnement échoué</p>
            <p className="mt-0.5 text-[11px]">
              Vérifiez que le namespace existe et que le ServiceAccount a les droits nécessaires.
              Supprimez et recréez le registry pour réessayer.
            </p>
          </div>
        </div>
      )}

      {/* Infos principales */}
      <div className="px-5 py-4 space-y-3">

        {registry.description && (
          <p className="text-[12px] text-muted-foreground">{registry.description}</p>
        )}

        {/* URL externe */}
        {registry.externalRegistryUrl && (
          <div>
            <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">
              URL externe — docker CLI depuis votre poste
            </p>
            <CopyLine value={registry.externalRegistryUrl} />
          </div>
        )}

        {/* URL interne */}
        {registry.registryUrl && (
          <div>
            <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">
              URL interne — pods & Knative dans le cluster
            </p>
            <CopyLine value={registry.registryUrl} />
          </div>
        )}

        {/* Métadonnées */}
        <div className="divide-y divide-border rounded-xl border border-border overflow-hidden">
          {[
            { label: "Namespace",      value: registry.openshiftNamespace },
            { label: "ServiceAccount", value: registry.serviceAccountName },
            { label: "Pull Secret",    value: registry.pullSecretName     },
          ].filter(r => r.value).map(row => (
            <div key={row.label} className="flex items-center justify-between px-4 py-2.5 text-[12px] bg-card">
              <span className="text-muted-foreground">{row.label}</span>
              <code className="font-mono text-foreground bg-muted/40 px-2 py-0.5 rounded text-[11px]">
                {row.value}
              </code>
            </div>
          ))}
        </div>

        {/* Commandes docker — toggle */}
        {registry.status === "ACTIVE" && registry.loginCommand && (
          <div>
            <button
              onClick={() => setShowCommands(v => !v)}
              className="flex items-center gap-1.5 text-[12px] font-medium transition-colors"
              style={{ color: PRIMARY_COLOR }}
            >
              <Terminal className="w-3.5 h-3.5" />
              {showCommands ? "Masquer les commandes" : "Afficher les commandes docker"}
            </button>

            {showCommands && (
              <div className="mt-3 space-y-3">

                {/* Explication de l'auth */}
                <div
                  className="flex items-start gap-2 rounded-xl px-4 py-3 text-[11px]"
                  style={{
                    backgroundColor: `${PRIMARY_COLOR}08`,
                    border: `1px solid ${PRIMARY_COLOR}25`,
                  }}
                >
                  <Info className="w-3.5 h-3.5 shrink-0 mt-0.5" style={{ color: PRIMARY_COLOR }} />
                  <div style={{ color: PRIMARY_COLOR }}>
                    <p className="font-semibold mb-0.5">Authentification via ServiceAccount token</p>
                    <p className="text-[11px] opacity-80">
                      L'Internal Registry OpenShift utilise les tokens SA — pas le mot de passe Keycloak.
                      Vous devez être connecté à <code className="font-mono">oc</code> sur votre poste.
                    </p>
                  </div>
                </div>

                {[
                  { label: "1. Login",  cmd: registry.loginCommand },
                  { label: "2. Push",   cmd: registry.pushCommand  },
                  { label: "3. Pull",   cmd: registry.pullCommand  },
                ].filter(c => c.cmd).map(c => (
                  <div key={c.label}>
                    <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide mb-1">
                      {c.label}
                    </p>
                    <CopyLine value={c.cmd!} />
                  </div>
                ))}

                {/* Tip Knative */}
                <div className="flex items-start gap-2 bg-muted/30 border border-border rounded-xl px-4 py-3 text-[11px] text-muted-foreground">
                  <span className="shrink-0">⚡</span>
                  <span>
                    Pour Knative Serving/Functions, utilisez l'<strong>URL interne</strong>{" "}
                    <code className="font-mono">{registry.registryUrl}/mon-image:tag</code>{" "}
                    — les pods n'ont pas besoin de sortir du cluster.
                  </span>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="px-5 py-3 border-t border-border bg-muted/5 flex items-center justify-between">
        <p className="text-[11px] text-muted-foreground">
          Créé le {new Date(registry.createdAt).toLocaleDateString("fr-FR")}
        </p>
        <Button
          variant="outline"
          size="sm"
          className="text-[12px] text-destructive hover:text-destructive hover:bg-destructive/5 border-destructive/30"
          onClick={() => onDelete(registry.id)}
        >
          Supprimer
        </Button>
      </div>
    </div>
  )
}

// ── Page principale ───────────────────────────────────────────────────────────
export default function RegistryPage() {

  const [registries,  setRegistries] = React.useState<ImageRegistryResponse[]>([])
  const [fetching,    setFetching]   = React.useState(true)
  const [name,        setName]       = React.useState("")
  const [description, setDesc]       = React.useState("")
  const [creating,    setCreating]   = React.useState(false)
  const [createError, setError]      = React.useState<string | null>(null)

  const nameError = React.useMemo(() => {
    if (!name) return null
    if (name.length < 2)  return "Minimum 2 caractères"
    if (name.length > 63) return "Maximum 63 caractères"
    if (!NAME_REGEX.test(name)) return "Minuscules, chiffres et tirets uniquement"
    return null
  }, [name])

  React.useEffect(() => {
    registryApi.list()
      .then(setRegistries)
      .catch(console.error)
      .finally(() => setFetching(false))
  }, [])

  const handleCreate = async () => {
    if (!name || nameError) return
    setCreating(true)
    setError(null)
    try {
      const created = await registryApi.create({
        name,
        description: description || undefined,
      })
      setRegistries(prev => [created, ...prev])
      setName(""); setDesc("")
    } catch (e: any) {
      setError(e.message ?? "Erreur lors de la création")
    } finally {
      setCreating(false)
    }
  }

  const handleDelete = async (id: number) => {
    try {
      await registryApi.delete(id)
      setRegistries(prev => prev.filter(r => r.id !== id))
    } catch (e: any) {
      alert(e.message ?? "Erreur lors de la suppression")
    }
  }

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
          <span className="font-medium text-foreground">Image Registry</span>
        </nav>
      </header>

      <div className="flex gap-6 p-6 max-w-6xl mx-auto w-full items-start">

        {/* ── Colonne principale ── */}
        <div className="flex-1 min-w-0 space-y-5">

          {/* Banner info */}
          <div
            className="flex items-start gap-3 rounded-2xl px-5 py-4"
            style={{
              backgroundColor: `${PRIMARY_COLOR}08`,
              border: `1px solid ${PRIMARY_COLOR}25`,
            }}
          >
            <Server className="w-5 h-5 shrink-0 mt-0.5" style={{ color: PRIMARY_COLOR }} />
            <div>
              <p className="text-[13px] font-semibold" style={{ color: PRIMARY_COLOR }}>
                Internal Registry OpenShift — Privé par défaut
              </p>
              <p className="text-[12px] text-muted-foreground mt-0.5 leading-relaxed">
                Registre d'images inclus dans votre cluster OpenShift. Chaque registry est isolé
                dans un namespace dédié. Le token d'accès est géré automatiquement via ServiceAccount.
              </p>
              <div className="flex flex-wrap gap-1.5 mt-3">
                {INTERNAL_REGISTRY_FEATURES.map(f => (
                  <span
                    key={f}
                    className="flex items-center gap-1 text-[11px] rounded-full px-2.5 py-1"
                    style={{
                      backgroundColor: `${PRIMARY_COLOR}10`,
                      border: `1px solid ${PRIMARY_COLOR}25`,
                      color: PRIMARY_COLOR,
                    }}
                  >
                    <Check className="w-3 h-3" /> {f}
                  </span>
                ))}
              </div>
            </div>
          </div>

          {/* Formulaire */}
          <SectionCard icon={Package} title="Créer un registre" sub="Un registre = un namespace OpenShift isolé + SA token auto-généré">
            <div className="space-y-1.5">
              <Label className="text-[12px]">Nom du registre *</Label>
              <Input
                value={name}
                onChange={e => setName(e.target.value.toLowerCase())}
                placeholder="ex: mon-registry"
                className={cn("h-8 text-[13px]", nameError && "border-destructive")}
              />
              {nameError
                ? <p className="text-[11px] text-destructive">{nameError}</p>
                : <p className="text-[11px] text-muted-foreground">
                    Minuscules, chiffres et tirets — 2 à 63 caractères
                  </p>
              }
            </div>

            <div className="space-y-1.5">
              <Label className="text-[12px]">
                Description <span className="text-muted-foreground">(optionnel)</span>
              </Label>
              <Input
                value={description}
                onChange={e => setDesc(e.target.value)}
                placeholder="ex: Registry images backend API"
                className="h-8 text-[13px]"
              />
            </div>

            {createError && (
              <div className="flex items-start gap-2 bg-destructive/5 border border-destructive/20 rounded-xl px-4 py-3 text-[12px] text-destructive">
                <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{createError}</span>
              </div>
            )}

            <Button
              className="w-full h-9 text-[13px] font-medium text-white"
              style={{ backgroundColor: PRIMARY_COLOR }}
              onClick={handleCreate}
              disabled={!name.trim() || !!nameError || creating}
            >
              {creating
                ? <><Loader2 className="w-3.5 h-3.5 mr-2 animate-spin" />Provisionnement en cours…</>
                : <>Créer le registre <ChevronRight className="w-4 h-4 ml-1" /></>
              }
            </Button>

            {creating && (
              <p className="text-[11px] text-muted-foreground text-center">
                Création du ServiceAccount + RoleBindings + token SA… (≈ 5–10s)
              </p>
            )}
          </SectionCard>

          {/* Liste */}
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-muted-foreground mb-3 flex items-center gap-1.5">
              <Package className="w-3 h-3" style={{ color: PRIMARY_COLOR }} />
              Mes registres ({registries.length})
            </p>

            {fetching ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
              </div>
            ) : registries.length === 0 ? (
              <div className="border border-dashed border-border rounded-2xl py-12 text-center space-y-2">
                <Package className="w-8 h-8 mx-auto text-muted-foreground/40" />
                <p className="text-[13px] text-muted-foreground">Aucun registre configuré</p>
                <p className="text-[11px] text-muted-foreground">
                  Créez votre premier registre ci-dessus.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {registries.map(r => (
                  <RegistryCard key={r.id} registry={r} onDelete={handleDelete} />
                ))}
              </div>
            )}
          </div>
        </div>

        {/* ── Panneau droit ── */}
        <div className="w-72 shrink-0 sticky top-[88px] space-y-3">

          {/* Résumé */}
          <div className="border border-border rounded-2xl overflow-hidden">
            <div className="px-5 py-4 text-white" style={{ backgroundColor: PRIMARY_COLOR }}>
              <p className="text-[10px] font-semibold uppercase tracking-widest opacity-70 mb-1 flex items-center gap-1.5">
                <Info className="w-3 h-3" /> Image Registry
              </p>
              <p className="text-base font-semibold">Internal Registry</p>
            </div>
            <div className="px-5 py-4 space-y-2.5 bg-card text-[12px]">
              {[
                { label: "Type",       value: "Internal OpenShift",   highlight: false },
                { label: "Visibilité", value: "Privé ✓",              highlight: true  },
                { label: "Auth",       value: "ServiceAccount token", highlight: false },
                { label: "Isolation",  value: "Namespace dédié",      highlight: false },
                { label: "Coût",       value: "Inclus ✓",             highlight: true  },
              ].map(row => (
                <div key={row.label} className="flex items-center justify-between">
                  <span className="text-muted-foreground">{row.label}</span>
                  <span
                    className="font-medium"
                    style={row.highlight ? { color: PRIMARY_COLOR } : undefined}
                  >
                    {row.value}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Workflow */}
          <div className="border border-border rounded-xl px-4 py-3 text-[11px] bg-muted/20 space-y-2">
            <p className="font-semibold text-foreground text-[12px]">Workflow</p>
            {[
              { n: "1", text: "Créer le registre (ce portail)" },
              { n: "2", text: "docker login <url-externe>" },
              { n: "3", text: "docker push <url-externe>/image:tag" },
              { n: "4", text: "Knative : utiliser l'URL interne" },
            ].map(s => (
              <div key={s.n} className="flex items-start gap-2 text-muted-foreground">
                <span
                  className="shrink-0 w-4 h-4 rounded-full flex items-center justify-center text-[10px] font-bold text-white mt-0.5"
                  style={{ backgroundColor: PRIMARY_COLOR }}
                >
                  {s.n}
                </span>
                <span>{s.text}</span>
              </div>
            ))}
          </div>

          {/* Note auth */}
          <div className="border border-border rounded-xl px-4 py-3 text-[11px] text-muted-foreground bg-muted/20 flex items-start gap-2">
            <Lock className="w-3.5 h-3.5 shrink-0 mt-0.5" style={{ color: PRIMARY_COLOR }} />
            <span>
              Authentification via token ServiceAccount OpenShift — pas le mot de passe Keycloak.
              Commandes disponibles après création.
            </span>
          </div>

        </div>
      </div>
    </SidebarInset>
  )
}