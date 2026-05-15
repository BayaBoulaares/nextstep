// app/dashboard/storage/[id]/page.tsx
"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { useRouter, useParams } from "next/navigation"
import { SidebarInset, SidebarTrigger } from "@/components/ui/sidebar"
import { Separator } from "@/components/ui/separator"
import { Button } from "@/components/ui/button"
import { Loader2, Copy, Eye, EyeOff, Trash2, RefreshCw } from "lucide-react"
import { cn } from "@/lib/utils"
import { getStorage, deleteStorage } from "@/lib/services/storage.api"
import { STORAGE_META, STATUT_META, StorageResponse } from "@/lib/types"

const ICONS: Record<string, string> = {
  "ti-bucket":        "🪣",
  "ti-device-floppy": "💿",
  "ti-folder":        "📁",
}

function InfoRow({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex items-center justify-between py-2.5 border-b border-border/50 last:border-0">
      <span className="text-[12px] text-muted-foreground w-36 shrink-0">{label}</span>
      <span className={cn(
        "text-[12px] text-foreground text-right break-all",
        mono && "font-mono text-[11px]"
      )}>{value}</span>
    </div>
  )
}

function CopyRow({ label, value }: { label: string; value: string }) {
  const [copied, setCopied] = useState(false)
  const doCopy = () => {
    navigator.clipboard.writeText(value)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }
  return (
    <div className="flex items-center gap-2 py-2.5 border-b border-border/50 last:border-0">
      <span className="text-[12px] text-muted-foreground w-36 shrink-0">{label}</span>
      <span className="text-[11px] font-mono text-foreground flex-1 truncate">{value}</span>
      <button
        onClick={doCopy}
        className="shrink-0 p-1 rounded hover:bg-muted transition-colors"
      >
        {copied
          ? <span className="text-[10px] text-green-600">✓</span>
          : <Copy className="w-3 h-3 text-muted-foreground" />
        }
      </button>
    </div>
  )
}

function SecretRow({ label, value }: { label: string; value: string }) {
  const [show, setShow] = useState(false)
  const [copied, setCopied] = useState(false)
  const doCopy = () => {
    navigator.clipboard.writeText(value)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }
  return (
    <div className="flex items-center gap-2 py-2.5">
      <span className="text-[12px] text-muted-foreground w-36 shrink-0">{label}</span>
      <span className="text-[11px] font-mono text-foreground flex-1 truncate">
        {show ? value : "••••••••••••••••"}
      </span>
      <button onClick={() => setShow(s => !s)} className="shrink-0 p-1 rounded hover:bg-muted">
        {show ? <EyeOff className="w-3 h-3 text-muted-foreground" /> : <Eye className="w-3 h-3 text-muted-foreground" />}
      </button>
      <button onClick={doCopy} className="shrink-0 p-1 rounded hover:bg-muted">
        {copied ? <span className="text-[10px] text-green-600">✓</span> : <Copy className="w-3 h-3 text-muted-foreground" />}
      </button>
    </div>
  )
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="border border-border rounded-2xl overflow-hidden bg-card">
      <div className="px-5 py-3 border-b border-border bg-muted/20">
        <p className="text-[12px] font-semibold text-foreground uppercase tracking-wide">{title}</p>
      </div>
      <div className="px-5 py-1">{children}</div>
    </div>
  )
}

function CodeBlock({ code }: { code: string }) {
  const [copied, setCopied] = useState(false)
  return (
    <div className="relative">
      <pre className="bg-[#1a1a1a] text-[#e8e8e8] text-[11px] font-mono rounded-xl px-4 py-4
                      overflow-x-auto leading-relaxed whitespace-pre">
        {code}
      </pre>
      <button
        onClick={() => { navigator.clipboard.writeText(code); setCopied(true); setTimeout(() => setCopied(false), 2000) }}
        className="absolute top-3 right-3 px-2 py-1 rounded text-[10px] bg-white/10 text-white/60
                   hover:bg-white/20 transition-colors"
      >
        {copied ? "✓ Copié" : "Copier"}
      </button>
    </div>
  )
}

export default function StorageDetailPage() {
  const params      = useParams()
  const router      = useRouter()
  const id          = Number(params.id)

  const [storage,  setStorage]  = useState<StorageResponse | null>(null)
  const [loading,  setLoading]  = useState(true)
  const [deleting, setDeleting] = useState(false)
  const [error,    setError]    = useState<string | null>(null)

  const load = async () => {
    setLoading(true)
    try { setStorage(await getStorage(id)) }
    catch (e: any) { setError(e.message) }
    finally { setLoading(false) }
  }

  useEffect(() => { if (id) load() }, [id])

  const handleDelete = async () => {
    if (!confirm("Supprimer ce stockage ? Toutes les données seront perdues définitivement.")) return
    setDeleting(true)
    try {
      await deleteStorage(id)
      router.push("/dashboard/storage")
    } catch (e: any) {
      alert(e.message ?? "Erreur de suppression")
      setDeleting(false)
    }
  }

  if (loading) return (
    <SidebarInset>
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
      </div>
    </SidebarInset>
  )

  if (error || !storage) return (
    <SidebarInset>
      <div className="flex h-screen flex-col items-center justify-center gap-3">
        <p className="text-[13px] text-muted-foreground">{error ?? "Ressource introuvable"}</p>
        <Button variant="outline" size="sm" onClick={() => router.back()}>← Retour</Button>
      </div>
    </SidebarInset>
  )

  const meta   = STORAGE_META[storage.type]
  const statut = STATUT_META[storage.statut]

  // Snippet kubectl pour Block/File Storage
  const kubectlSnippet = storage.type !== "OBJECT_STORAGE" ? `volumes:
  - name: mon-volume
    persistentVolumeClaim:
      claimName: ${storage.ressourceNom}
volumeMounts:
  - name: mon-volume
    mountPath: /data` : null

  // Snippet boto3 pour Object Storage
  const boto3Snippet = storage.type === "OBJECT_STORAGE" ? `import boto3

s3 = boto3.client(
    's3',
    endpoint_url='${storage.endpointS3}',
    aws_access_key_id='${storage.accessKey ?? "YOUR_ACCESS_KEY"}',
    aws_secret_access_key='***',
)

# Lister les objets
response = s3.list_objects_v2(Bucket='${storage.bucketName ?? storage.ressourceNom}')` : null

  return (
    <SidebarInset>
      <header className="flex h-14 items-center gap-3 border-b border-border/60 px-5
                         bg-background/95 backdrop-blur sticky top-0 z-10">
        <SidebarTrigger className="-ml-1 size-8 text-muted-foreground hover:text-foreground
                                    hover:bg-muted rounded-md transition-colors" />
        <Separator orientation="vertical" className="h-4 opacity-40" />
        <nav className="flex items-center gap-1.5 text-[12px] text-muted-foreground">
          <Link href="/dashboard/storage" className="hover:text-foreground">Mes stockages</Link>
          <span className="opacity-30">/</span>
          <span className="font-medium text-foreground font-mono">{storage.ressourceNom}</span>
        </nav>
        <div className="ml-auto flex items-center gap-2">
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={load}>
            <RefreshCw className="w-3.5 h-3.5" />
          </Button>
        </div>
      </header>

      <div className="p-6 max-w-2xl mx-auto w-full space-y-5">

        {/* Header ressource */}
        <div className="flex items-center gap-3">
          <span className="text-3xl">{ICONS[meta.icon]}</span>
          <div className="flex-1">
            <h1 className="text-[18px] font-semibold">{meta.label}</h1>
            <p className="text-[12px] text-muted-foreground font-mono">{storage.ressourceNom}</p>
          </div>
          <span className={cn(
            "text-[11px] font-medium px-2.5 py-1 rounded-full border",
            statut.color
          )}>
            {statut.label}
          </span>
        </div>

        {/* Informations générales */}
        <Card title="Informations">
          <InfoRow label="Type"          value={meta.label} />
          <InfoRow label="Capacité"      value={`${storage.capaciteGo >= 1000 ? `${storage.capaciteGo / 1000} To` : `${storage.capaciteGo} Go`}`} />
          <InfoRow label="Namespace"     value={storage.namespace} mono />
          <InfoRow label="StorageClass"  value={meta.storageClass} mono />
          <InfoRow label="Access mode"   value={storage.accessMode ?? "—"} mono />
          <InfoRow label="Créé le"       value={new Date(storage.createdAt).toLocaleString("fr-FR")} />
        </Card>

        {/* Object Storage — credentials S3 */}
        {storage.type === "OBJECT_STORAGE" && storage.endpointS3 && (
          <Card title="Accès S3">
            <CopyRow label="Endpoint"   value={storage.endpointS3} />
            <CopyRow label="Bucket"     value={storage.bucketName ?? storage.ressourceNom} />
            <CopyRow label="Access Key" value={storage.accessKey ?? "—"} />
            <SecretRow label="Secret Key" value={storage.secretKey ?? "—"} />
          </Card>
        )}

        {/* Snippet de connexion */}
        {boto3Snippet && (
          <Card title="Connexion Python (boto3)">
            <div className="py-3">
              <CodeBlock code={boto3Snippet} />
            </div>
          </Card>
        )}

        {kubectlSnippet && (
          <Card title="Montage dans un Pod">
            <div className="py-3">
              <CodeBlock code={kubectlSnippet} />
            </div>
          </Card>
        )}

        {/* Zone danger */}
        {storage.statut !== "SUPPRIME" && (
          <div className="border border-red-200 rounded-2xl overflow-hidden">
            <div className="px-5 py-3 border-b border-red-200 bg-red-50/50">
              <p className="text-[12px] font-semibold text-red-700 uppercase tracking-wide">
                Zone dangereuse
              </p>
            </div>
            <div className="px-5 py-4 flex items-center justify-between gap-4">
              <div>
                <p className="text-[13px] font-medium text-foreground">
                  Supprimer ce stockage
                </p>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  Supprime la ressource OpenShift et toutes les données de manière irréversible.
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                className="text-[12px] text-red-600 border-red-200 hover:bg-red-50 shrink-0 gap-1.5"
                onClick={handleDelete}
                disabled={deleting}
              >
                {deleting
                  ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  : <Trash2 className="w-3.5 h-3.5" />
                }
                Supprimer
              </Button>
            </div>
          </div>
        )}
      </div>
    </SidebarInset>
  )
}