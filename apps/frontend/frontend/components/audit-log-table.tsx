"use client";

import { useEffect, useState, useCallback } from "react";
import { useSession } from "next-auth/react";
import {
  Search, Calendar, RefreshCw, Download, ChevronLeft,
  ChevronRight, ArrowDown, Filter, CheckCircle2, Clock,
  XCircle, AlertCircle, Eye, X,
} from "lucide-react";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";

// ─── Types ─────────────────────────────────────────────────────────────────────

type Outcome = "SUCCESS" | "FAILURE" | "ACCESS_DENIED" | "PARTIAL";
type AuditAction =
  | "CREATE" | "READ" | "UPDATE" | "DELETE"
  | "LOGIN"  | "LOGOUT" | "EXPORT" | "SEARCH";

interface AuditLog {
  id: string;
  userId: string;
  userEmail: string;
  userName: string;
  userRoles: string;
  action: AuditAction;
  module: string;
  description: string;
  resourceType: string;
  resourceId: string;
  resourceLabel: string;
  httpMethod: string;
  endpoint: string;
  httpStatus: number;
  ipAddress: string;
  userAgent: string;
  realm: string;
  keycloakClientId: string;
  durationMs: number;
  requestPayload: string;
  beforeState: string;
  afterState: string;
  outcome: Outcome;
  errorMessage: string;
  createdAt: string;
}

interface PageResponse {
  content: AuditLog[];
  totalElements: number;
  totalPages: number;
  number: number;
  size: number;
}

interface Filters {
  search: string;
  action: string;
  module: string;
  outcome: string;
  dateFrom: string;
  dateTo: string;
}

// ─── Constants ─────────────────────────────────────────────────────────────────

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8081";

const ACTION_OPTIONS = ["CREATE","READ","UPDATE","DELETE","LOGIN","LOGOUT","EXPORT","SEARCH"];
const MODULE_OPTIONS = ["USER_MANAGEMENT","TRANSACTION","REPORT","SETTINGS","SECURITY","GENERAL"];
const OUTCOME_OPTIONS = ["SUCCESS","FAILURE","ACCESS_DENIED","PARTIAL"];

// ─── Style helpers ──────────────────────────────────────────────────────────────

const outcomeConfig: Record<Outcome, { label: string; className: string; icon: typeof CheckCircle2 }> = {
  SUCCESS:      { label: "Success",      className: "bg-emerald-50 text-emerald-700 border-emerald-200", icon: CheckCircle2 },
  FAILURE:      { label: "Failure",      className: "bg-red-50    text-red-700    border-red-200",     icon: XCircle      },
  ACCESS_DENIED:{ label: "Access Denied",className: "bg-orange-50 text-orange-700 border-orange-200", icon: AlertCircle  },
  PARTIAL:      { label: "Partial",      className: "bg-yellow-50 text-yellow-700 border-yellow-200", icon: Clock        },
};

const actionConfig: Record<string, string> = {
  CREATE: "bg-blue-100   text-blue-700",
  READ:   "bg-slate-100  text-slate-600",
  UPDATE: "bg-amber-100  text-amber-700",
  DELETE: "bg-red-100    text-red-700",
  LOGIN:  "bg-violet-100 text-violet-700",
  LOGOUT: "bg-violet-100 text-violet-600",
  EXPORT: "bg-teal-100   text-teal-700",
  SEARCH: "bg-slate-100  text-slate-600",
};

const moduleConfig: Record<string, string> = {
  USER_MANAGEMENT: "bg-blue-50   text-blue-600",
  TRANSACTION:     "bg-green-50  text-green-700",
  REPORT:          "bg-purple-50 text-purple-700",
  SETTINGS:        "bg-gray-100  text-gray-600",
  SECURITY:        "bg-red-50    text-red-600",
  GENERAL:         "bg-gray-50   text-gray-500",
};

// ─── API helpers ────────────────────────────────────────────────────────────────

async function fetchAuditLogs(
  token: string,
  filters: Filters,
  page: number,
  size: number
): Promise<PageResponse> {
  const params = new URLSearchParams();
  params.set("page", String(page));
  params.set("size", String(size));
  params.set("sort", "createdAt,desc");
  if (filters.search)  params.set("search",   filters.search);
  if (filters.action)  params.set("action",   filters.action);
  if (filters.module)  params.set("module",   filters.module);
  if (filters.outcome) params.set("outcome",  filters.outcome);
  if (filters.dateFrom)params.set("dateFrom", filters.dateFrom + "T00:00:00");
  if (filters.dateTo)  params.set("dateTo",   filters.dateTo  + "T23:59:59");

  const res = await fetch(`${API_BASE}/audit-logs?${params}`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`API ${res.status}`);
  return res.json();
}

async function exportCsv(token: string, filters: Filters) {
  const params = new URLSearchParams();
  if (filters.search)   params.set("search",   filters.search);
  if (filters.action)   params.set("action",   filters.action);
  if (filters.module)   params.set("module",   filters.module);
  if (filters.outcome)  params.set("outcome",  filters.outcome);
  if (filters.dateFrom) params.set("dateFrom", filters.dateFrom + "T00:00:00");
  if (filters.dateTo)   params.set("dateTo",   filters.dateTo  + "T23:59:59");

  const res = await fetch(`${API_BASE}/audit-logs/export?${params}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error("Export failed");

  const blob = await res.blob();
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement("a");
  a.href     = url;
  a.download = `audit-logs-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

// ─── Detail Modal ───────────────────────────────────────────────────────────────

function DetailModal({ log, onClose }: { log: AuditLog; onClose: () => void }) {
  const cfg = outcomeConfig[log.outcome] ?? outcomeConfig.SUCCESS;
  const Icon = cfg.icon;

  const Field = ({ label, value, mono = false }: { label: string; value?: string | number | null; mono?: boolean }) =>
    value ? (
      <div className="space-y-0.5">
        <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-400">{label}</p>
        <p className={`text-sm text-slate-800 break-all ${mono ? "font-mono" : ""}`}>{value}</p>
      </div>
    ) : null;

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base">
            <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold ${cfg.className}`}>
              <Icon className="h-3.5 w-3.5" />
              {cfg.label}
            </span>
            <span className="font-mono text-slate-500 text-sm">{log.id}</span>
          </DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-2 gap-4 mt-2">
          {/* Qui */}
          <div className="col-span-2 rounded-xl bg-slate-50 p-4 space-y-3">
            <p className="text-xs font-bold uppercase tracking-wider text-slate-500">👤 Acteur</p>
            <div className="grid grid-cols-3 gap-3">
              <Field label="Email"      value={log.userEmail} />
              <Field label="Nom"        value={log.userName} />
              <Field label="User ID"    value={log.userId} mono />
            </div>
            {log.userRoles && (
              <div className="flex flex-wrap gap-1 mt-1">
                {log.userRoles.split(",").map(r => (
                  <span key={r} className="rounded bg-slate-200 px-2 py-0.5 text-[10px] font-mono text-slate-600">{r.replace("ROLE_","")}</span>
                ))}
              </div>
            )}
          </div>

          {/* Action */}
          <div className="col-span-2 rounded-xl bg-slate-50 p-4 space-y-3">
            <p className="text-xs font-bold uppercase tracking-wider text-slate-500">⚡ Action</p>
            <div className="grid grid-cols-3 gap-3">
              <Field label="Action"      value={log.action} />
              <Field label="Module"      value={log.module} />
              <Field label="Description" value={log.description} />
            </div>
          </div>

          {/* Technique */}
          <div className="col-span-2 rounded-xl bg-slate-50 p-4 space-y-3">
            <p className="text-xs font-bold uppercase tracking-wider text-slate-500">🔧 Technique</p>
            <div className="grid grid-cols-3 gap-3">
              <Field label="Méthode HTTP"  value={log.httpMethod} />
              <Field label="Endpoint"      value={log.endpoint} mono />
              <Field label="Status HTTP"   value={log.httpStatus} />
              <Field label="IP Address"    value={log.ipAddress} mono />
              <Field label="Durée"         value={log.durationMs ? `${log.durationMs} ms` : undefined} />
              <Field label="Client ID"     value={log.keycloakClientId} />
            </div>
          </div>

          {/* Ressource */}
          {(log.resourceType || log.resourceId) && (
            <div className="col-span-2 rounded-xl bg-slate-50 p-4 space-y-3">
              <p className="text-xs font-bold uppercase tracking-wider text-slate-500">📦 Ressource</p>
              <div className="grid grid-cols-3 gap-3">
                <Field label="Type"   value={log.resourceType} />
                <Field label="ID"     value={log.resourceId}    mono />
                <Field label="Label"  value={log.resourceLabel} />
              </div>
            </div>
          )}

          {/* Données */}
          {(log.beforeState || log.afterState || log.requestPayload) && (
            <div className="col-span-2 rounded-xl bg-slate-50 p-4 space-y-3">
              <p className="text-xs font-bold uppercase tracking-wider text-slate-500">📋 Données</p>
              {log.requestPayload && (
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 mb-1">Payload</p>
                  <pre className="rounded bg-white p-2 text-xs text-slate-700 overflow-auto max-h-24 border border-slate-200">{log.requestPayload}</pre>
                </div>
              )}
              {log.beforeState && (
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 mb-1">Avant</p>
                  <pre className="rounded bg-white p-2 text-xs text-slate-700 overflow-auto max-h-24 border border-slate-200">{log.beforeState}</pre>
                </div>
              )}
              {log.afterState && (
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 mb-1">Après</p>
                  <pre className="rounded bg-white p-2 text-xs text-slate-700 overflow-auto max-h-24 border border-slate-200">{log.afterState}</pre>
                </div>
              )}
            </div>
          )}

          {/* Erreur */}
          {log.errorMessage && (
            <div className="col-span-2 rounded-xl bg-red-50 border border-red-200 p-4">
              <p className="text-xs font-bold uppercase tracking-wider text-red-400 mb-1">⚠ Erreur</p>
              <p className="text-sm text-red-700 font-mono">{log.errorMessage}</p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ─── Skeleton row ───────────────────────────────────────────────────────────────

function SkeletonRow() {
  return (
    <TableRow>
      {Array.from({ length: 8 }).map((_, i) => (
        <TableCell key={i}><Skeleton className="h-4 w-full" /></TableCell>
      ))}
    </TableRow>
  );
}

// ─── Main Component ─────────────────────────────────────────────────────────────

export default function AuditLogTable() {
  const { data: session } = useSession();
  const token = (session as any)?.accessToken as string | undefined;

  const [data,       setData]       = useState<PageResponse | null>(null);
  const [loading,    setLoading]    = useState(true);
  const [error,      setError]      = useState<string | null>(null);
  const [page,       setPage]       = useState(0);
  const [pageSize,   setPageSize]   = useState(20);
  const [detail,     setDetail]     = useState<AuditLog | null>(null);
  const [exporting,  setExporting]  = useState(false);

  const [filters, setFilters] = useState<Filters>({
    search: "", action: "", module: "", outcome: "",
    dateFrom: "", dateTo: "",
  });

  // ── Fetch ──
  const load = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setError(null);
    try {
      const result = await fetchAuditLogs(token, filters, page, pageSize);
      setData(result);
    } catch (e: any) {
      setError(e.message ?? "Erreur de chargement");
    } finally {
      setLoading(false);
    }
  }, [token, filters, page, pageSize]);

  useEffect(() => { load(); }, [load]);

  // Reset page on filter change
  const setFilter = (key: keyof Filters, value: string) => {
    setFilters(f => ({ ...f, [key]: value }));
    setPage(0);
  };

  const clearFilters = () => {
    setFilters({ search: "", action: "", module: "", outcome: "", dateFrom: "", dateTo: "" });
    setPage(0);
  };

  const hasActiveFilters = Object.values(filters).some(Boolean);

  const handleExport = async () => {
    if (!token) return;
    setExporting(true);
    try { await exportCsv(token, filters); }
    catch { alert("Export échoué"); }
    finally { setExporting(false); }
  };

  const logs       = data?.content ?? [];
  const totalItems = data?.totalElements ?? 0;
  const totalPages = data?.totalPages ?? 1;

  // Pagination pages display
  const pageNumbers: (number | "…")[] = [];
  if (totalPages <= 7) {
    for (let i = 0; i < totalPages; i++) pageNumbers.push(i);
  } else {
    [0, 1, 2].forEach(p => pageNumbers.push(p));
    if (page > 3) pageNumbers.push("…");
    if (page > 2 && page < totalPages - 3) pageNumbers.push(page);
    if (page < totalPages - 4) pageNumbers.push("…");
    [totalPages - 3, totalPages - 2, totalPages - 1].forEach(p => pageNumbers.push(p));
  }
  const uniquePages = [...new Set(pageNumbers)];

  return (
    <div className="min-h-screen bg-white text-sm text-gray-700 font-sans">

      {/* ── Breadcrumb ── */}
      <div className="px-6 pt-5 pb-2">
        <p className="text-xs text-gray-400 uppercase tracking-widest font-semibold">
          Traçabilité / <span className="text-gray-700">Audit Logs</span>
        </p>
      </div>

      {/* ── Toolbar ── */}
      <div className="px-6 py-3 flex flex-wrap items-center gap-2 border-b border-gray-100">

        {/* Date range */}
        <div className="flex items-center gap-1 border border-gray-200 rounded-lg px-3 py-1.5 bg-white">
          <Calendar className="w-3.5 h-3.5 text-gray-400" />
          <input
            type="date"
            value={filters.dateFrom}
            onChange={e => setFilter("dateFrom", e.target.value)}
            className="text-xs text-gray-600 outline-none w-28 bg-transparent"
          />
          <span className="text-gray-300 text-xs">—</span>
          <input
            type="date"
            value={filters.dateTo}
            onChange={e => setFilter("dateTo", e.target.value)}
            className="text-xs text-gray-600 outline-none w-28 bg-transparent"
          />
        </div>

        {/* Total */}
        <span className="text-xs text-gray-400 font-medium tabular-nums">
          {loading ? "…" : totalItems.toLocaleString()} logs
        </span>

        <div className="flex-1" />

        {/* Filters */}
        <Select value={filters.action || "all"} onValueChange={v => setFilter("action", v === "all" ? "" : v)}>
          <SelectTrigger className="h-8 w-32 text-xs">
            <SelectValue placeholder="Action" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Toutes actions</SelectItem>
            {ACTION_OPTIONS.map(a => <SelectItem key={a} value={a}>{a}</SelectItem>)}
          </SelectContent>
        </Select>

        <Select value={filters.module || "all"} onValueChange={v => setFilter("module", v === "all" ? "" : v)}>
          <SelectTrigger className="h-8 w-36 text-xs">
            <SelectValue placeholder="Module" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous modules</SelectItem>
            {MODULE_OPTIONS.map(m => <SelectItem key={m} value={m}>{m.replace("_", " ")}</SelectItem>)}
          </SelectContent>
        </Select>

        <Select value={filters.outcome || "all"} onValueChange={v => setFilter("outcome", v === "all" ? "" : v)}>
          <SelectTrigger className="h-8 w-36 text-xs">
            <SelectValue placeholder="Résultat" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous résultats</SelectItem>
            {OUTCOME_OPTIONS.map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}
          </SelectContent>
        </Select>

        {hasActiveFilters && (
          <Button variant="ghost" size="sm" onClick={clearFilters} className="h-8 text-xs text-red-500 hover:text-red-600 gap-1">
            <X className="w-3 h-3" /> Réinitialiser
          </Button>
        )}

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
          <Input
            value={filters.search}
            onChange={e => setFilter("search", e.target.value)}
            placeholder="Rechercher email, action, IP…"
            className="pl-8 h-8 w-60 text-xs"
          />
        </div>

        {/* Actions */}
        <Button variant="outline" size="sm" onClick={load} className="h-8 w-8 p-0">
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
        </Button>
        <Button variant="outline" size="sm" onClick={handleExport} disabled={exporting} className="h-8 gap-1 text-xs">
          <Download className="w-3.5 h-3.5" />
          {exporting ? "Export…" : "CSV"}
        </Button>
      </div>

      {/* ── Error ── */}
      {error && (
        <div className="mx-6 mt-3 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          ⚠ {error}
        </div>
      )}

      {/* ── Table ── */}
      <div className="overflow-x-auto px-6 pt-3">
        <Table className="min-w-[900px]">
          <TableHeader>
            <TableRow className="bg-gray-50 hover:bg-gray-50">
              <TableHead className="w-40 text-xs font-semibold text-gray-600 uppercase tracking-wide">
                <div className="flex items-center gap-1">Date <ArrowDown className="w-3 h-3 text-gray-400" /></div>
              </TableHead>
              <TableHead className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Utilisateur</TableHead>
              <TableHead className="text-xs font-semibold text-gray-600 uppercase tracking-wide">
                <div className="flex items-center gap-1">Action <Filter className="w-3 h-3 text-gray-400" /></div>
              </TableHead>
              <TableHead className="text-xs font-semibold text-gray-600 uppercase tracking-wide">
                <div className="flex items-center gap-1">Module <Filter className="w-3 h-3 text-gray-400" /></div>
              </TableHead>
              <TableHead className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Ressource</TableHead>
              <TableHead className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Endpoint</TableHead>
              <TableHead className="text-xs font-semibold text-gray-600 uppercase tracking-wide">IP</TableHead>
              <TableHead className="text-xs font-semibold text-gray-600 uppercase tracking-wide">
                <div className="flex items-center gap-1">Résultat <Filter className="w-3 h-3 text-gray-400" /></div>
              </TableHead>
              <TableHead className="w-8" />
            </TableRow>
          </TableHeader>

          <TableBody>
            {loading
              ? Array.from({ length: 8 }).map((_, i) => <SkeletonRow key={i} />)
              : logs.length === 0
              ? (
                <TableRow>
                  <TableCell colSpan={9} className="py-16 text-center text-gray-400">
                    Aucun log trouvé
                  </TableCell>
                </TableRow>
              )
              : logs.map(log => {
                  const outcomeCfg = outcomeConfig[log.outcome] ?? outcomeConfig.SUCCESS;
                  const OutcomeIcon = outcomeCfg.icon;
                  return (
                    <TableRow
                      key={log.id}
                      className="group hover:bg-blue-50/30 border-b border-gray-100 transition-colors cursor-pointer"
                      onClick={() => setDetail(log)}
                    >
                      {/* Date */}
                      <TableCell className="py-2.5 text-xs text-gray-500 tabular-nums whitespace-nowrap">
                        {new Date(log.createdAt).toLocaleDateString("fr-FR")}<br />
                        <span className="text-gray-400">
                          {new Date(log.createdAt).toLocaleTimeString("fr-FR")}
                        </span>
                      </TableCell>

                      {/* Utilisateur */}
                      <TableCell className="py-2.5">
                        <p className="text-xs font-medium text-gray-800 truncate max-w-[140px]" title={log.userEmail}>
                          {log.userEmail}
                        </p>
                        <p className="text-[10px] text-gray-400 truncate max-w-[140px]" title={log.userName}>
                          {log.userName}
                        </p>
                      </TableCell>

                      {/* Action */}
                      <TableCell className="py-2.5">
                        <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${actionConfig[log.action] ?? "bg-gray-100 text-gray-600"}`}>
                          {log.action}
                        </span>
                      </TableCell>

                      {/* Module */}
                      <TableCell className="py-2.5">
                        <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${moduleConfig[log.module] ?? "bg-gray-100 text-gray-600"}`}>
                          {log.module?.replace("_", " ")}
                        </span>
                      </TableCell>

                      {/* Ressource */}
                      <TableCell className="py-2.5 text-xs text-gray-500">
                        {log.resourceType && (
                          <span className="font-medium text-gray-700">{log.resourceType}</span>
                        )}
                        {log.resourceId && (
                          <span className="font-mono text-gray-400 ml-1">#{log.resourceId}</span>
                        )}
                      </TableCell>

                      {/* Endpoint */}
                      <TableCell className="py-2.5">
                        <span className="font-mono text-[11px] text-gray-500 truncate max-w-[180px] block" title={log.endpoint}>
                          <span className={`font-semibold mr-1 ${
                            log.httpMethod === "GET"    ? "text-blue-500"  :
                            log.httpMethod === "POST"   ? "text-green-600" :
                            log.httpMethod === "DELETE" ? "text-red-500"   :
                            "text-amber-600"
                          }`}>
                            {log.httpMethod}
                          </span>
                          {log.endpoint}
                        </span>
                      </TableCell>

                      {/* IP */}
                      <TableCell className="py-2.5 font-mono text-xs text-gray-400">
                        {log.ipAddress}
                      </TableCell>

                      {/* Résultat */}
                      <TableCell className="py-2.5">
                        <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-semibold ${outcomeCfg.className}`}>
                          <OutcomeIcon className="h-3 w-3" />
                          {outcomeCfg.label}
                        </span>
                      </TableCell>

                      {/* Action button */}
                      <TableCell className="py-2.5">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                          onClick={e => { e.stopPropagation(); setDetail(log); }}
                        >
                          <Eye className="h-3.5 w-3.5 text-gray-400" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })
            }
          </TableBody>
        </Table>
      </div>

      {/* ── Pagination ── */}
      <div className="px-6 py-3 flex items-center justify-between border-t border-gray-100 mt-2">
        {/* Page size */}
        <div className="flex items-center gap-1">
          {[10, 20, 50].map(s => (
            <button
              key={s}
              onClick={() => { setPageSize(s); setPage(0); }}
              className={`h-7 w-8 flex items-center justify-center rounded text-xs font-semibold border transition-colors ${
                pageSize === s
                  ? "bg-gray-800 text-white border-gray-800"
                  : "border-gray-200 text-gray-500 hover:bg-gray-50"
              }`}
            >
              {s}
            </button>
          ))}
        </div>

        {/* Info + pages */}
        <div className="flex items-center gap-1.5 text-xs text-gray-500">
          <span className="mr-2">
            Page <strong className="text-gray-800">{page + 1}</strong>{" "}
            sur <strong className="text-gray-800">{totalPages}</strong>{" "}
            ({totalItems.toLocaleString()} entrées)
          </span>

          <button
            onClick={() => setPage(p => Math.max(0, p - 1))}
            disabled={page === 0}
            className="h-7 w-7 flex items-center justify-center rounded border border-gray-200 text-gray-400 hover:bg-gray-50 disabled:opacity-30"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>

          {uniquePages.map((p, i) =>
            p === "…" ? (
              <span key={i} className="text-gray-400 px-1">…</span>
            ) : (
              <button
                key={i}
                onClick={() => setPage(p as number)}
                className={`h-7 w-7 flex items-center justify-center rounded text-xs font-semibold border transition-colors ${
                  page === p
                    ? "bg-blue-500 text-white border-blue-500"
                    : "border-gray-200 text-gray-600 hover:bg-gray-50"
                }`}
              >
                {(p as number) + 1}
              </button>
            )
          )}

          <button
            onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
            disabled={page >= totalPages - 1}
            className="h-7 w-7 flex items-center justify-center rounded border border-gray-200 text-gray-400 hover:bg-gray-50 disabled:opacity-30"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* ── Detail Modal ── */}
      {detail && <DetailModal log={detail} onClose={() => setDetail(null)} />}
    </div>
  );
}