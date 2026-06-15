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
    Loader2, RefreshCw, Trash2, Copy, Check,
    HardDrive, Database, FolderOpen, Eye, EyeOff,
    X, Info, ShieldAlert, Activity, Settings,
    LayoutDashboard, ScrollText, Globe, Lock,
    CalendarClock, CheckCircle2, AlertCircle, Clock,
    Upload, Download, FileText,
} from "lucide-react"
import { apiFetch } from "@/lib/apiClient"
import {
    getStorageCredentials,
    listObjects,
    uploadObject,
    deleteObject,
    getDownloadUrl,
} from "@/lib/services/storage.api"
import type {
    StorageResourceResponse, StorageCredentials,
    StorageResourceStatus, StorageType,
} from "@/lib/types"
import { cn } from "@/lib/utils"
import { useStorageDeployments, type StorageDeployment } from "@/lib/hooks/useStorageDeployments"
import { CopyButton } from "@/components/CopyButton"
// ══════════════════════════════════════════════════════════════════════════════
// Constantes
// ══════════════════════════════════════════════════════════════════════════════

const STATUS_CONFIG: Record<StorageResourceStatus, {
    label: string; icon: React.ReactNode; style: string
}> = {
    PENDING: {
        label: "En attente",
        icon: <Clock className="w-3 h-3" />,
        style: "bg-zinc-50 text-zinc-500 border-zinc-200",
    },
    PROVISIONING: {
        label: "Provisionnement",
        icon: <Loader2 className="w-3 h-3 animate-spin" />,
        style: "bg-amber-50 text-amber-700 border-amber-200",
    },
    READY: {
        label: "Prêt",
        icon: <CheckCircle2 className="w-3 h-3" />,
        style: "bg-emerald-50 text-emerald-700 border-emerald-200",
    },
    FAILED: {
        label: "Échec",
        icon: <AlertCircle className="w-3 h-3" />,
        style: "bg-red-50 text-red-600 border-red-200",
    },
    DELETED: {
        label: "Supprimé",
        icon: <X className="w-3 h-3" />,
        style: "bg-zinc-100 text-zinc-400 border-zinc-200",
    },
}

const STORAGE_TYPE_CONFIG: Record<StorageType, {
    label: string; icon: React.ReactNode; color: string
}> = {
    OBJECT_STORAGE: {
        label: "Object Storage",
        icon: <Database className="w-4 h-4" />,
        color: "text-blue-600 bg-blue-50 border-blue-200",
    },
    BLOCK_STORAGE: {
        label: "Block Storage",
        icon: <HardDrive className="w-4 h-4" />,
        color: "text-violet-600 bg-violet-50 border-violet-200",
    },
    FILE_STORAGE: {
        label: "File Storage",
        icon: <FolderOpen className="w-4 h-4" />,
        color: "text-amber-600 bg-amber-50 border-amber-200",
    },
}

type TabId = "overview" | "acces" | "fichiers" | "config" | "events"

const TABS: { id: TabId; label: string; icon: React.ReactNode }[] = [
    { id: "overview", label: "Vue d'ensemble", icon: <LayoutDashboard className="w-3.5 h-3.5" /> },
    { id: "acces", label: "Accès", icon: <Lock className="w-3.5 h-3.5" /> },
    { id: "fichiers", label: "Fichiers", icon: <FileText className="w-3.5 h-3.5" /> },
    { id: "config", label: "Configuration", icon: <Settings className="w-3.5 h-3.5" /> },
    { id: "events", label: "Événements", icon: <ScrollText className="w-3.5 h-3.5" /> },
]

// ══════════════════════════════════════════════════════════════════════════════
// Helpers UI
// ══════════════════════════════════════════════════════════════════════════════

function InfoCard({ label, value, mono = true }: {
    label: string; value: React.ReactNode; mono?: boolean
}) {
    return (
        <div className="bg-muted/40 border border-border/60 rounded-xl px-3 py-2.5">
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">{label}</p>
            <p className={cn("text-[13px] font-medium truncate", mono && "font-mono")}>{value ?? "—"}</p>
        </div>
    )
}

function StatusBadge({ status }: { status: StorageResourceStatus }) {
    const cfg = STATUS_CONFIG[status]
    return (
        <span className={cn(
            "inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-medium border",
            cfg.style
        )}>
            {cfg.icon}
            {cfg.label}
        </span>
    )
}

// ══════════════════════════════════════════════════════════════════════════════
// Notify
// ══════════════════════════════════════════════════════════════════════════════

interface NotifyItem { id: string; type: "info" | "warn" | "error"; msg: string }

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

function NotifyContainer({ items, dismiss }: {
    items: NotifyItem[]; dismiss: (id: string) => void
}) {
    if (!items.length) return null
    const STYLE: Record<string, string> = {
        info: "bg-blue-50 border-blue-200 text-blue-800",
        warn: "bg-amber-50 border-amber-200 text-amber-800",
        error: "bg-red-50 border-red-200 text-red-800",
    }
    const ICON: Record<string, React.ReactNode> = {
        info: <Info className="w-4 h-4 flex-shrink-0 text-blue-600" />,
        warn: <ShieldAlert className="w-4 h-4 flex-shrink-0 text-amber-600" />,
        error: <X className="w-4 h-4 flex-shrink-0 text-red-600" />,
    }
    return (
        <div className="fixed bottom-4 right-4 z-[200] flex flex-col gap-2 max-w-sm w-full pointer-events-none">
            {items.map(item => (
                <div key={item.id} className={cn(
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

// ══════════════════════════════════════════════════════════════════════════════
// StorageCredentialsPanel
// ══════════════════════════════════════════════════════════════════════════════

function StorageCredentialsPanel({ deploymentId, storageType, storage }: {
    deploymentId: number; storageType: StorageType | null; storage: StorageResourceResponse | null
}) {
    const [creds, setCreds] = React.useState<StorageCredentials | null>(null)
    const [loading, setLoading] = React.useState(false)
    const [error, setError] = React.useState<string | null>(null)
    const [showSecret, setShowSecret] = React.useState(false)
    const [copied, setCopied] = React.useState<string | null>(null)
    // ← Appeler l'API SEULEMENT pour Object Storage
    React.useEffect(() => {
        if (storageType !== "OBJECT_STORAGE") return
        setLoading(true)
        getStorageCredentials(deploymentId)
            .then(setCreds)
            .catch(e => setError(e.message))
            .finally(() => setLoading(false))
    }, [deploymentId, storageType])

    const copyText = (value: string, key: string) => {
        navigator.clipboard.writeText(value)
        setCopied(key)
        setTimeout(() => setCopied(null), 2000)
    }

    if (loading) return (
        <div className="flex justify-center py-12">
            <Loader2 className="size-4 animate-spin text-muted-foreground" />
        </div>
    )

    if (storageType !== "OBJECT_STORAGE") {
        const pvcName = storage?.pvcName ?? "<nom-de-votre-pvc>"
        const namespace = storage?.namespace ?? "<namespace>"
        const accessMode = storage?.accessMode ?? (
            storageType === "FILE_STORAGE" ? "ReadWriteMany" : "ReadWriteOnce"
        )

        return (
            <div className="p-5 space-y-3">
                {/* Info PVC */}
                <div className="grid grid-cols-2 gap-2">
                    <InfoCard label="Nom du PVC" value={pvcName} />
                    <InfoCard label="Namespace" value={namespace} />
                    <InfoCard label="Mode d'accès" value={accessMode} mono={false} />
                    <InfoCard label="Capacité" value={storage?.capacity ?? "—"} mono={false} />
                </div>

                {/* Bouton copier le nom du PVC */}
                <div className="bg-muted/40 border border-border/60 rounded-xl px-4 py-3 flex items-center justify-between">
                    <div>
                        <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-0.5">
                            Nom du PVC
                        </p>
                        <code className="text-[13px] font-mono font-medium">{pvcName}</code>
                    </div>
                    <CopyButton value={pvcName} />
                </div>

                {/* Exemple YAML */}
                <div className="bg-zinc-900 rounded-xl px-4 py-3 font-mono text-[12px] text-emerald-400 space-y-0.5">
                    <p className="text-zinc-500 text-[10px] mb-2"># Montage dans votre Deployment</p>
                    <p>volumes:</p>
                    <p className="ml-4">- name: storage</p>
                    <p className="ml-6">persistentVolumeClaim:</p>
                    <p className="ml-8">claimName: <span className="text-white">{pvcName}</span></p>
                    <p>volumeMounts:</p>
                    <p className="ml-4">- name: storage</p>
                    <p className="ml-6">mountPath: <span className="text-amber-400">/mnt/data</span></p>
                    <p className="text-zinc-500 mt-2"># namespace: {namespace}</p>
                    <p className="text-zinc-500"># accessMode: {accessMode}</p>
                </div>

                {storageType === "FILE_STORAGE" && (
                    <div className="bg-amber-50 border border-amber-200 rounded-xl px-3 py-2.5 text-[11px] text-amber-700 flex items-start gap-2">
                        <Info className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
                        Ce volume ReadWriteMany peut être monté simultanément par plusieurs pods.
                    </div>
                )}
            </div>
        )
    }

    if (error || !creds?.accessKeyId) {
        return (
            <div className="p-5">
                <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 text-[12px] text-amber-700">
                    <p className="font-medium mb-1">Credentials non disponibles</p>
                    <p>Le bucket est peut-être encore en cours de provisionnement, ou les credentials n'ont pas encore été générés.</p>
                </div>
            </div>
        )
    }

    const rows: { label: string; value: string; secret?: boolean; key: string }[] = [
        { label: "Bucket", value: creds.bucketName ?? "—", key: "bucket" },
        { label: "Endpoint", value: creds.s3Endpoint ?? "—", key: "endpoint" },
        { label: "Access Key", value: creds.accessKeyId ?? "—", key: "accessKey" },
        { label: "Secret Key", value: creds.secretAccessKey ?? "—", key: "secretKey", secret: true },
    ]

    return (
        <div className="p-5 space-y-4">
            <div className="flex items-center justify-between">
                <p className="text-[13px] font-medium">Credentials S3</p>
                <span className="text-[11px] text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
                    Compatible AWS SDK
                </span>
            </div>
            <div className="border border-border/60 rounded-xl overflow-hidden divide-y divide-border/60">
                {rows.map(row => (
                    <div key={row.key} className="flex items-center gap-3 px-4 py-3 bg-card">
                        <span className="text-[12px] text-muted-foreground w-24 shrink-0">{row.label}</span>
                        <span className="text-[12px] font-mono flex-1 truncate">
                            {row.secret && !showSecret ? "••••••••••••••••••••" : row.value}
                        </span>
                        <div className="flex items-center gap-1 shrink-0">
                            {row.secret && (
                                <button
                                    onClick={() => setShowSecret(v => !v)}
                                    className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                                >
                                    {showSecret ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                                </button>
                            )}
                            <button
                                onClick={() => copyText(row.value, row.key)}
                                className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                            >
                                <Copy className={cn("w-3.5 h-3.5 transition-colors", copied === row.key && "text-emerald-500")} />
                            </button>
                        </div>
                    </div>
                ))}
            </div>
            <div>
                <p className="text-[11px] text-muted-foreground mb-2 font-medium uppercase tracking-wider">
                    Exemple Python (boto3)
                </p>
                <div className="bg-zinc-900 rounded-xl px-4 py-3 font-mono text-[11px] text-emerald-400 space-y-0.5">
                    <p className="text-zinc-500"># pip install boto3</p>
                    <p>import boto3</p>
                    <p>s3 = boto3.client(</p>
                    <p className="ml-4">"s3",</p>
                    <p className="ml-4">endpoint_url=<span className="text-amber-400">"{creds.s3Endpoint}"</span>,</p>
                    <p className="ml-4">aws_access_key_id=<span className="text-amber-400">"{creds.accessKeyId}"</span>,</p>
                    <p className="ml-4">aws_secret_access_key=<span className="text-amber-400">"***"</span>,</p>
                    <p>)</p>
                    <p>s3.list_buckets()</p>
                </div>
            </div>
            <div className="bg-amber-50 border border-amber-200 rounded-xl px-3 py-2.5 text-[11px] text-amber-700 flex items-start gap-2">
                <ShieldAlert className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
                Ne partagez jamais votre Secret Key. Conservez-la dans un gestionnaire de secrets.
            </div>
        </div>
    )
}

function EndpointDisplay({ deploymentId }: { deploymentId: number }) {
    const [endpoint, setEndpoint] = React.useState<string | null>(null)
    const [copied, setCopied] = React.useState(false)

    React.useEffect(() => {
        getStorageCredentials(deploymentId)
            .then(c => setEndpoint(c.s3Endpoint ?? null))
            .catch(() => { })
    }, [deploymentId])

    if (!endpoint) return null

    return (
        <div className="bg-muted/40 border border-border/60 rounded-xl px-4 py-3 flex items-center justify-between">
            <div>
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-0.5">
                    Endpoint S3
                </p>
                <code className="text-[12px] font-mono text-foreground">{endpoint}</code>
            </div>
            <button
                onClick={() => {
                    navigator.clipboard.writeText(endpoint)
                    setCopied(true)
                    setTimeout(() => setCopied(false), 2000)
                }}
                className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
            >
                {copied
                    ? <Check className="w-4 h-4 text-emerald-500" />
                    : <Copy className="w-4 h-4" />}
            </button>
        </div>
    )
}
// ══════════════════════════════════════════════════════════════════════════════
// StorageDetailCard
// ══════════════════════════════════════════════════════════════════════════════

function StorageDetailCard({ item, onDeleteRequest, onRefresh, notify }: {
    item: StorageDeployment
    onDeleteRequest: (id: number, name: string) => void
    onRefresh: () => Promise<void>
    notify: (msg: string, type?: "info" | "warn" | "error") => void
}) {
    const [activeTab, setActiveTab] = React.useState<TabId>("overview")
    const [copied, setCopied] = React.useState<string | null>(null)

    const { storage } = item
    const storageType = storage?.storageType ?? null
    const typeCfg = storageType ? STORAGE_TYPE_CONFIG[storageType] : null

    const copyText = (text: string, key: string) => {
        navigator.clipboard.writeText(text)
        setCopied(key)
        setTimeout(() => setCopied(null), 2000)
    }


    // ── Panel Overview ────────────────────────────────────────────────────────
    const PanelOverview = () => (
        <div className="p-5 space-y-4">
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                <InfoCard label="Nom" value={item.resourceName} />
                <InfoCard label="Statut" value={
                    storage
                        ? <StatusBadge status={storage.status} />
                        : <span className="text-muted-foreground text-[12px]">—</span>
                } mono={false} />
                <InfoCard label="Type" value={typeCfg?.label ?? item.categoryName} mono={false} />
                <InfoCard label="Namespace" value={storage?.namespace ?? "—"} />
                <InfoCard label="Capacité" value={storage?.capacity ?? "—"} />
                <InfoCard label="Plan" value={item.planName ?? "—"} mono={false} />
                <InfoCard label="Créé le" value={
                    item.createdAt ? new Date(item.createdAt).toLocaleDateString("fr-FR") : "—"
                } mono={false} />
                <InfoCard label="Prêt le" value={
                    storage?.readyAt ? new Date(storage.readyAt).toLocaleDateString("fr-FR") : "—"
                } mono={false} />
                <InfoCard label="Tarif HT" value={
                    item.monthlyPriceHt != null ? `${item.monthlyPriceHt.toFixed(2)} TND/mois` : "—"
                } mono={false} />
            </div>

            {!storage && (
                <div className="flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 text-[12px] text-amber-700">
                    <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                    <div className="flex-1">
                        <p className="font-medium">Ressource OpenShift non provisionnée</p>
                        <p className="mt-0.5 text-[11px]">
                            Statut : <code className="font-mono">{item.deploymentStatus}</code>.
                            {item.deploymentStatus === "EN_ATTENTE" && " Le provisionnement n'a pas encore été lancé."}
                            {item.deploymentStatus === "ECHEC" && " Le provisionnement a échoué."}
                        </p>
                    </div>
                    {item.deploymentStatus === "EN_ATTENTE" && (
                        <button
                            onClick={async () => {
                                try {
                                    await apiFetch(`/api/deployments/${item.deploymentId}/provision`, { method: "PATCH" })
                                    notify("Provisionnement lancé.", "info")
                                    setTimeout(onRefresh, 2000)
                                } catch (e: any) {
                                    notify(e.message ?? "Erreur lors du lancement.", "error")
                                }
                            }}
                            className="shrink-0 px-3 py-1.5 rounded-lg bg-amber-100 hover:bg-amber-200 text-amber-800 text-[11px] font-medium transition-colors"
                        >
                            Lancer →
                        </button>
                    )}
                </div>
            )}

            {storageType === "OBJECT_STORAGE" && storage?.bucketName && (
                <div className="bg-blue-50 border border-blue-100 rounded-xl px-4 py-3 flex items-center justify-between">
                    <div>
                        <p className="text-[10px] text-blue-500 uppercase tracking-wider mb-0.5">Bucket</p>
                        <code className="text-[13px] font-mono font-medium text-blue-700">{storage.bucketName}</code>
                    </div>
                    <CopyButton value={storage.bucketName} />
                </div>
            )}
            {/* ← NOUVEAU — Block/File : afficher le PVC */}
            {(storageType === "BLOCK_STORAGE" || storageType === "FILE_STORAGE") && storage?.pvcName && (
                <div className="bg-violet-50 border border-violet-100 rounded-xl px-4 py-3 flex items-center justify-between">
                    <div>
                        <p className="text-[10px] text-violet-500 uppercase tracking-wider mb-0.5">
                            Nom du PVC
                        </p>
                        <code className="text-[13px] font-mono font-medium text-violet-700">
                            {storage.pvcName}
                        </code>
                    </div>
                    <CopyButton value={storage.pvcName} />
                </div>
            )}
            {storageType === "OBJECT_STORAGE" && storage?.status === "READY" && (
                <EndpointDisplay deploymentId={item.deploymentId} />
            )}

            {storage?.storageClassName && (
                <div className="flex items-center justify-between py-2 px-3 bg-muted/30 border border-border/50 rounded-xl text-[12px]">
                    <span className="text-muted-foreground">StorageClass OpenShift</span>
                    <code className="font-mono font-medium">{storage.storageClassName}</code>
                </div>
            )}

            {storage?.status === "FAILED" && (
                <div className="flex items-start gap-2 bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-[12px] text-red-700">
                    <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                    <div>
                        <p className="font-medium">Provisionnement échoué</p>
                        <p className="mt-0.5 text-[11px]">
                            Vérifiez que la StorageClass <code className="font-mono">nfs-storage</code> est disponible
                            sur le cluster et que le namespace est correctement provisionné.
                        </p>
                    </div>
                </div>
            )}

            {(storage?.status === "PROVISIONING" || storage?.status === "PENDING") && (
                <div className="flex items-center gap-2 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 text-[12px] text-amber-700">
                    <Loader2 className="w-4 h-4 animate-spin flex-shrink-0" />
                    <p>Provisionnement en cours la ressource sera prête dans quelques instants.</p>
                </div>
            )}
            {storageType === "OBJECT_STORAGE" && storage?.status === "READY" && (
                <div className="bg-muted/40 border border-border/60 rounded-xl px-4 py-3 flex items-center justify-between">
                    <div>
                        <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-0.5">
                            Console MinIO
                        </p>
                        <p className="text-[12px] text-muted-foreground">
                            Accessible via VPN uniquement
                        </p>
                    </div>
                    <Button
                        size="sm" variant="outline"
                        className="h-7 text-[12px]"
                        onClick={async () => {
                            try {
                                const creds = await getStorageCredentials(item.deploymentId)
                                notify(
                                    `Console MinIO : ${creds?.consoleEndpoint ?? 'Non disponible'} — minioadmin / minioadmin123`,
                                    "info"
                                )
                            } catch {
                                notify("Impossible de récupérer l'endpoint console", "warn")
                            }
                        }}
                    >
                        <Globe className="w-3 h-3 mr-1" /> Infos connexion
                    </Button>
                </div>
            )}
        </div>
    )

    // ── Panel Fichiers — DANS StorageDetailCard pour accéder à item/storageType/notify ──
    const PanelFichiers = () => {
        const [objects, setObjects] = React.useState<any[]>([])
        const [loadingList, setLoadingList] = React.useState(true)
        const [uploading, setUploading] = React.useState(false)
        const fileInputRef = React.useRef<HTMLInputElement>(null)

        const load = React.useCallback(async () => {
            setLoadingList(true)
            try {
                const data = await listObjects(item.deploymentId)
                setObjects(data)
            } catch (e: any) {
                notify(e.message ?? "Erreur chargement fichiers", "error")
            } finally {
                setLoadingList(false)
            }
        }, [])

        React.useEffect(() => {
            if (storageType !== "OBJECT_STORAGE") return  // ← ajouter
            load()
        }, [load])
        const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
            const file = e.target.files?.[0]
            if (!file) return
            setUploading(true)
            try {
                await uploadObject(item.deploymentId, file)
                notify(`"${file.name}" uploadé avec succès`, "info")
                await load()
            } catch (err: any) {
                notify(err.message ?? "Erreur upload", "error")
            } finally {
                setUploading(false)
                if (fileInputRef.current) fileInputRef.current.value = ""
            }
        }

        const handleDelete = async (key: string) => {
            try {
                await deleteObject(item.deploymentId, key)
                notify(`"${key}" supprimé`, "info")
                await load()
            } catch (err: any) {
                notify(err.message ?? "Erreur suppression", "error")
            }
        }

        if (storageType !== "OBJECT_STORAGE") {
            return (
                <div className="p-5 text-center text-[13px] text-muted-foreground">
                    La gestion de fichiers n'est disponible que pour l'Object Storage.
                </div>
            )
        }

        return (
            <div className="p-5 space-y-4">
                <div className="flex items-center justify-between">
                    <p className="text-[13px] font-medium">Objets du bucket</p>
                    <div className="flex gap-2">
                        <Button size="sm" variant="outline" className="h-7 text-[12px]" onClick={load}>
                            <RefreshCw className="w-3 h-3 mr-1" /> Actualiser
                        </Button>
                        <Button
                            size="sm"
                            className="h-7 text-[12px] bg-[#0a7fcf] hover:bg-[#0869b0] text-white"
                            onClick={() => fileInputRef.current?.click()}
                            disabled={uploading}
                        >
                            {uploading
                                ? <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                                : <Upload className="w-3 h-3 mr-1" />}
                            Uploader
                        </Button>
                        <input
                            ref={fileInputRef}
                            type="file"
                            className="hidden"
                            onChange={handleUpload}
                        />
                    </div>
                </div>

                {loadingList ? (
                    <div className="flex justify-center py-8">
                        <Loader2 className="size-4 animate-spin text-muted-foreground" />
                    </div>
                ) : objects.length === 0 ? (
                    <div className="text-center py-8 text-[12px] text-muted-foreground">
                        Aucun objet dans ce bucket. Uploadez votre premier fichier.
                    </div>
                ) : (
                    <div className="border border-border/60 rounded-xl overflow-hidden divide-y divide-border/60">
                        {objects.map(obj => (
                            <div key={obj.key}
                                className="flex items-center gap-3 px-4 py-3 bg-card hover:bg-muted/20 transition-colors">
                                <FileText className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                                <span className="text-[12px] font-mono flex-1 truncate">{obj.key}</span>
                                <span className="text-[11px] text-muted-foreground shrink-0">
                                    {(obj.size / 1024).toFixed(1)} KB
                                </span>
                                <a
                                    href={getDownloadUrl(item.deploymentId, obj.key)}
                                    download={obj.key}
                                    className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                                    title="Télécharger"
                                >
                                    <Download className="w-3.5 h-3.5" />
                                </a>
                                <button
                                    onClick={() => handleDelete(obj.key)}
                                    className="p-1 rounded hover:bg-muted text-red-400 hover:text-red-600 transition-colors"
                                    title="Supprimer"
                                >
                                    <Trash2 className="w-3.5 h-3.5" />
                                </button>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        )
    }

    // ── Panel Config ──────────────────────────────────────────────────────────
    const PanelConfig = () => (
        <div className="p-5 space-y-3">
            <p className="text-[13px] font-medium mb-3">Paramètres de la ressource</p>
            {[
                { label: "Nom de la ressource", value: storage?.resourceName ?? "—" },
                { label: "Namespace", value: storage?.namespace ?? "—" },
                { label: "StorageClass", value: storage?.storageClassName ?? "—" },
                { label: "Capacité", value: storage?.capacity ?? "—" },
                { label: "Type de stockage", value: typeCfg?.label ?? "—" },
                {
                    label: "Mode d'accès",
                    value: storage?.accessMode ?? (
                        storageType === "OBJECT_STORAGE" ? "S3 API (HTTP/HTTPS)"
                            : storageType === "FILE_STORAGE" ? "ReadWriteMany (RWX)"
                                : "ReadWriteOnce (RWO)"
                    ),
                },
                ...(storageType !== "OBJECT_STORAGE" && storage?.pvcName ? [{
                    label: "Nom du PVC",
                    value: storage.pvcName,
                }] : []),
            ].map(({ label, value }) => (
                <div key={label} className="flex items-center justify-between py-2.5 px-3 bg-muted/30 border border-border/50 rounded-xl text-[13px]">
                    <span className="text-muted-foreground">{label}</span>
                    <code className="font-mono text-[12px] font-medium">{value}</code>
                </div>
            ))}
            <div className="bg-amber-50 border border-amber-200 rounded-xl px-3 py-2.5 text-[11px] text-amber-700 mt-2">
                ⚠ La modification de la capacité nécessite un redimensionnement du PVC via l'API Kubernetes.
            </div>
        </div>
    )

    // ── Panel Events ──────────────────────────────────────────────────────────
    const PanelEvents = () => (
        <div className="p-5 space-y-3">
            <p className="text-[13px] font-medium">Historique</p>
            {[
                {
                    date: item.createdAt ? new Date(item.createdAt).toLocaleString("fr-FR") : "—",
                    event: "Déploiement créé",
                    desc: `Plan : ${item.planName ?? "—"}`,
                    type: "info" as const,
                },
                ...(storage?.status === "READY" ? [{
                    date: storage.readyAt ? new Date(storage.readyAt).toLocaleString("fr-FR") : "—",
                    event: "Ressource prête",
                    desc: `${typeCfg?.label ?? ""} — ${storage.capacity ?? ""}`,
                    type: "success" as const,
                }] : []),
                ...(storage?.status === "FAILED" ? [{
                    date: "—",
                    event: "Échec du provisionnement",
                    desc: "Vérifiez les logs du cluster et la StorageClass nfs-storage",
                    type: "error" as const,
                }] : []),
            ].map((ev, i) => {
                const dotColor = ev.type === "success" ? "bg-emerald-500"
                    : ev.type === "error" ? "bg-red-500" : "bg-blue-500"
                return (
                    <div key={i} className="flex gap-3 py-3 border-b border-border/40 last:border-0">
                        <div className={cn("w-2 h-2 rounded-full mt-1.5 flex-shrink-0", dotColor)} />
                        <div className="min-w-[140px] text-[11px] text-muted-foreground">{ev.date}</div>
                        <div>
                            <p className="text-[12px] font-medium">{ev.event}</p>
                            <p className="text-[11px] text-muted-foreground">{ev.desc}</p>
                        </div>
                    </div>
                )
            })}
        </div>
    )

    // ── PANELS map ────────────────────────────────────────────────────────────
    const PANELS: Record<TabId, React.ReactNode> = {
        overview: <PanelOverview />,
        acces: <StorageCredentialsPanel deploymentId={item.deploymentId} storageType={storageType} storage={storage} />,
        fichiers: <PanelFichiers />,
        config: <PanelConfig />,
        events: <PanelEvents />,
    }

    return (
        <div className="border border-border rounded-2xl overflow-hidden">
            {/* Header */}
            <div className="px-5 py-3.5 bg-card border-b border-border/60">
                <div className="flex items-center gap-3 flex-wrap mb-1.5">
                    {typeCfg && (
                        <div className={cn("w-8 h-8 rounded-lg border flex items-center justify-center flex-shrink-0", typeCfg.color)}>
                            {typeCfg.icon}
                        </div>
                    )}
                    <p className="text-[14px] font-semibold font-mono">{item.resourceName}</p>
                    {storage
                        ? <StatusBadge status={storage.status} />
                        : (
                            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-medium border bg-zinc-50 text-zinc-500 border-zinc-200">
                                <Clock className="w-3 h-3" />
                                {item.deploymentStatus === "EN_ATTENTE" ? "Non provisionné"
                                    : item.deploymentStatus === "ECHEC" ? "Échec"
                                        : item.deploymentStatus}
                            </span>
                        )
                    }
                    {typeCfg && (
                        <span className="text-[10px] bg-muted border border-border px-2 py-0.5 rounded-full text-muted-foreground">
                            {typeCfg.label}
                        </span>
                    )}
                </div>
                <div className="flex flex-wrap gap-4 text-[11px] text-muted-foreground">
                    {storage?.namespace && (
                        <span className="flex items-center gap-1"><Globe className="w-3 h-3" />{storage.namespace}</span>
                    )}
                    {storage?.capacity && (
                        <span className="flex items-center gap-1"><HardDrive className="w-3 h-3" />{storage.capacity}</span>
                    )}
                    {item.createdAt && (
                        <span className="flex items-center gap-1">
                            <CalendarClock className="w-3 h-3" />
                            Créé le {new Date(item.createdAt).toLocaleDateString("fr-FR")}
                        </span>
                    )}
                    {item.monthlyPriceHt != null && (
                        <span className="flex items-center gap-1">
                            <Activity className="w-3 h-3" />
                            {item.monthlyPriceHt.toFixed(2)} TND/mois
                        </span>
                    )}
                </div>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2 px-4 py-2 bg-muted/20 border-b border-border/40 flex-wrap">
                <Button size="sm" variant="outline" className="h-7 gap-1.5 text-[12px]" onClick={onRefresh}>
                    <RefreshCw className="w-3 h-3" /> Actualiser
                </Button>
                <Button
                    size="sm" variant="outline"
                    className="h-7 w-7 p-0 text-red-600 hover:text-red-700 ml-auto"
                    onClick={() => onDeleteRequest(item.deploymentId, item.resourceName)}
                    title="Supprimer"
                >
                    <Trash2 className="w-3 h-3" />
                </Button>
            </div>

            {/* Tabs */}
            <div className="flex border-b border-border/60 overflow-x-auto bg-background" style={{ scrollbarWidth: "none" }}>
                {TABS.map(tab => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        className={cn(
                            "flex items-center gap-1.5 px-4 py-2.5 text-[12px] whitespace-nowrap border-b-2 transition-colors flex-shrink-0",
                            activeTab === tab.id
                                ? "border-foreground text-foreground font-medium"
                                : "border-transparent text-muted-foreground hover:text-foreground"
                        )}
                    >
                        {tab.icon}{tab.label}
                    </button>
                ))}
            </div>

            {/* Panel content */}
            <div className="bg-card">{PANELS[activeTab]}</div>
        </div>
    )
}

// ══════════════════════════════════════════════════════════════════════════════
// StoragePage — page principale
// ══════════════════════════════════════════════════════════════════════════════

export default function StoragePage() {
    const { items: notifyItems, show: notify, dismiss: notifyDismiss } = useNotify()
    const { items, loading, error, refetch } = useStorageDeployments()

    const [deleteTarget, setDeleteTarget] = React.useState<{ id: number; name: string } | null>(null)
    const [deleteLoading, setDeleteLoading] = React.useState(false)

    const confirmDelete = async () => {
        if (!deleteTarget) return
        setDeleteLoading(true)
        try {
            await apiFetch(`/api/deployments/${deleteTarget.id}/storage`, { method: "DELETE" })
            notify(`Ressource "${deleteTarget.name}" supprimée.`, "info")
            await refetch()
        } catch (e: any) {
            notify(e.message ?? "Erreur lors de la suppression.", "error")
        } finally {
            setDeleteLoading(false)
            setDeleteTarget(null)
        }
    }

    const stats = React.useMemo(() => ({
        total: items.length,
        ready: items.filter(i => i.storage?.status === "READY").length,
        pending: items.filter(i => i.storage?.status === "PROVISIONING" || i.storage?.status === "PENDING").length,
        failed: items.filter(i => i.storage?.status === "FAILED").length,
    }), [items])

    return (
        <SidebarInset>
            <NotifyContainer items={notifyItems} dismiss={notifyDismiss} />

            <AlertDialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Supprimer cette ressource de stockage ?</AlertDialogTitle>
                        <AlertDialogDescription>
                            La ressource <strong>{deleteTarget?.name}</strong> sera définitivement supprimée
                            du cluster OpenShift. Toutes les données seront perdues.
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
                            Supprimer définitivement
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
                    <span className="text-muted-foreground">Déploiements</span>
                    <span className="text-muted-foreground/30">/</span>
                    <span className="font-medium">Stockage</span>
                </nav>
                <Button
                    size="sm" variant="outline"
                    className="ml-auto h-8 gap-1.5 text-[12px] text-[#0a7fcf] border-[#0a7fcf] hover:bg-[#0a7fcf]/10"
                    onClick={refetch}
                >
                    <RefreshCw className="w-3.5 h-3.5" style={{ color: "#0a7fcf" }} /> Actualiser
                </Button>
            </header>

            <div className="p-6 pl-9 max-w-5xl ml-0 w-full space-y-6">
                <div>
                    <h1 className="text-xl font-semibold tracking-tight">Mes ressources de stockage</h1>
                    <p className="text-[13px] text-muted-foreground mt-1">
                        Gérez vos buckets S3, volumes block et partages de fichiers sur OpenShift.
                    </p>
                </div>

                {!loading && items.length > 0 && (
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                        {[
                            { label: "Total", value: stats.total, color: "text-foreground" },
                            { label: "Prêtes", value: stats.ready, color: "text-emerald-600" },
                            { label: "En cours", value: stats.pending, color: "text-amber-600" },
                            { label: "En échec", value: stats.failed, color: "text-red-600" },
                        ].map(({ label, value, color }) => (
                            <div key={label} className="bg-card border border-border/60 rounded-xl px-4 py-3 text-center">
                                <p className={cn("text-2xl font-semibold tabular-nums", color)}>{value}</p>
                                <p className="text-[11px] text-muted-foreground mt-0.5">{label}</p>
                            </div>
                        ))}
                    </div>
                )}

                {loading && (
                    <div className="flex items-center justify-center py-16">
                        <Loader2 className="size-4 animate-spin text-muted-foreground" />
                    </div>
                )}

                {error && (
                    <div className="border border-red-200 bg-red-50 rounded-xl px-5 py-4 text-[13px] text-red-600 flex items-center gap-2">
                        <AlertCircle className="w-4 h-4 flex-shrink-0" />
                        {error}
                    </div>
                )}

                {!loading && !error && items.length === 0 && (
                    <div className="text-center py-16 space-y-3">
                        <div className="size-16 rounded-2xl bg-muted flex items-center justify-center text-3xl mx-auto">💾</div>
                        <p className="text-[14px] font-medium text-muted-foreground">Aucune ressource de stockage</p>
                        <p className="text-[12px] text-muted-foreground/70">Déployez un service de stockage depuis le Marketplace.</p>
                        <Button
                            size="sm"
                            className="h-8 text-[12px] gap-1.5 bg-[#0a7fcf] hover:bg-[#0869b0] text-white mt-2"
                            onClick={() => window.location.href = "/dashboard/services"}
                        >
                            Aller au Marketplace →
                        </Button>
                    </div>
                )}

                {!loading && !error && items.map(item => (
                    <StorageDetailCard
                        key={item.deploymentId}
                        item={item}
                        onDeleteRequest={(id, name) => setDeleteTarget({ id, name })}
                        onRefresh={refetch}
                        notify={notify}
                    />
                ))}
            </div>
        </SidebarInset>
    )
}