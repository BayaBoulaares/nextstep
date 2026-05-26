"use client";

import React, { useEffect, useState, useCallback, useRef } from "react";
import { useSession } from "next-auth/react";
import {
  RefreshCw, Download, ChevronLeft, ChevronRight,
  CheckCircle2, Clock, XCircle, AlertCircle,
  Eye, X, Activity, ShieldAlert, TrendingUp, Layers,
  Calendar, ChevronDown, Search,
  Users, ArrowLeftRight, FileText, Settings, Lock, Globe,
} from "lucide-react";

import {
  Table, TableBody, TableCell,
  TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";

// ─── Types ───────────────────────────────────────────────────────────────────────

type Outcome = "SUCCESS" | "FAILURE" | "ACCESS_DENIED" | "PARTIAL";
type AuditAction = "CREATE"|"READ"|"UPDATE"|"DELETE"|"LOGIN"|"LOGOUT"|"EXPORT"|"SEARCH";

interface AuditLog {
  id: string; userId: string; userEmail: string; userName: string;
  userRoles: string; action: AuditAction; module: string;
  description: string; resourceType: string; resourceId: string;
  resourceLabel: string; httpMethod: string; endpoint: string;
  httpStatus: number; ipAddress: string; userAgent: string;
  realm: string; keycloakClientId: string; durationMs: number;
  requestPayload: string; beforeState: string; afterState: string;
  outcome: Outcome; errorMessage: string; createdAt: string;
}

interface PageResponse {
  content: AuditLog[]; totalElements: number;
  totalPages: number; number: number; size: number;
}

interface Filters {
  search: string; action: string; module: string;
  outcome: string; dateFrom: string; dateTo: string;
}

// ─── Constants ───────────────────────────────────────────────────────────────────

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8081";

const ACTION_OPTIONS  = ["CREATE","READ","UPDATE","DELETE","LOGIN","LOGOUT","EXPORT","SEARCH"];
const MODULE_OPTIONS  = ["USER_MANAGEMENT","TRANSACTION","REPORT","SETTINGS","SECURITY","GENERAL"];
const OUTCOME_OPTIONS = ["SUCCESS","FAILURE","ACCESS_DENIED","PARTIAL"];

// ─── Style maps ───────────────────────────────────────────────────────────────────

const outcomeMap: Record<Outcome, { label: string; dot: string; color: string; bg: string; icon: typeof CheckCircle2 }> = {
  SUCCESS:       { label: "Succès",       dot: "bg-emerald-400", color: "text-emerald-700", bg: "bg-emerald-50",  icon: CheckCircle2 },
  FAILURE:       { label: "Échec",        dot: "bg-red-400",     color: "text-red-600",     bg: "bg-red-50",      icon: XCircle      },
  ACCESS_DENIED: { label: "Accès refusé", dot: "bg-orange-400",  color: "text-orange-600",  bg: "bg-orange-50",   icon: AlertCircle  },
  PARTIAL:       { label: "Partiel",      dot: "bg-yellow-400",  color: "text-yellow-700",  bg: "bg-yellow-50",   icon: Clock        },
};

const actionMap: Record<string, { text: string; bg: string }> = {
  CREATE: { text: "text-blue-600",   bg: "bg-blue-50"   },
  READ:   { text: "text-slate-500",  bg: "bg-slate-100" },
  UPDATE: { text: "text-amber-600",  bg: "bg-amber-50"  },
  DELETE: { text: "text-red-500",    bg: "bg-red-50"    },
  LOGIN:  { text: "text-violet-600", bg: "bg-violet-50" },
  LOGOUT: { text: "text-violet-400", bg: "bg-violet-50" },
  EXPORT: { text: "text-teal-600",   bg: "bg-teal-50"   },
  SEARCH: { text: "text-slate-500",  bg: "bg-slate-100" },
};

const methodMap: Record<string, string> = {
  GET: "text-sky-500", POST: "text-emerald-500",
  DELETE: "text-red-400", PUT: "text-amber-500", PATCH: "text-amber-400",
};

// Module map
const moduleMap: Record<string, { label: string; bg: string; text: string; icon: any }> = {
  USER_MANAGEMENT: { label: "User Management", bg: "bg-blue-50",    text: "text-blue-700",   icon: Users           },
  TRANSACTION:     { label: "Transaction",     bg: "bg-emerald-50", text: "text-emerald-700",icon: ArrowLeftRight  },
  REPORT:          { label: "Report",          bg: "bg-purple-50",  text: "text-purple-700", icon: FileText        },
  SETTINGS:        { label: "Settings",        bg: "bg-gray-100",   text: "text-gray-600",   icon: Settings        },
  SECURITY:        { label: "Security",        bg: "bg-red-50",     text: "text-red-600",    icon: Lock            },
  GENERAL:         { label: "General",         bg: "bg-slate-50",   text: "text-slate-500",  icon: Globe           },
};

// User role color palette
const roleColors = [
  { bg: "bg-blue-100",   text: "text-blue-700"   },
  { bg: "bg-violet-100", text: "text-violet-700" },
  { bg: "bg-teal-100",   text: "text-teal-700"   },
  { bg: "bg-emerald-100",text: "text-emerald-700"},
  { bg: "bg-rose-100",   text: "text-rose-700"   },
  { bg: "bg-amber-100",  text: "text-amber-700"  },
];

// ─── API ──────────────────────────────────────────────────────────────────────────

async function fetchAuditLogs(token: string, filters: Filters, page: number, size: number): Promise<PageResponse> {
  const p = new URLSearchParams();
  p.set("page", String(page)); p.set("size", String(size)); p.set("sort", "createdAt,desc");
  if (filters.search)   p.set("search",   filters.search);
  if (filters.action)   p.set("action",   filters.action);
  if (filters.module)   p.set("module",   filters.module);
  if (filters.outcome)  p.set("outcome",  filters.outcome);
  if (filters.dateFrom) p.set("dateFrom", filters.dateFrom + "T00:00:00");
  if (filters.dateTo)   p.set("dateTo",   filters.dateTo   + "T23:59:59");
  const res = await fetch(`${API_BASE}/audit-logs?${p}`, {
    headers: { Authorization: `Bearer ${token}` }, cache: "no-store",
  });
  if (!res.ok) throw new Error(`Erreur API ${res.status}`);
  return res.json();
}

async function exportCsv(token: string, filters: Filters) {
  const p = new URLSearchParams();
  if (filters.search)   p.set("search",   filters.search);
  if (filters.action)   p.set("action",   filters.action);
  if (filters.module)   p.set("module",   filters.module);
  if (filters.outcome)  p.set("outcome",  filters.outcome);
  if (filters.dateFrom) p.set("dateFrom", filters.dateFrom + "T00:00:00");
  if (filters.dateTo)   p.set("dateTo",   filters.dateTo   + "T23:59:59");
  const res = await fetch(`${API_BASE}/audit-logs/export?${p}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error("Export échoué");
  const blob = await res.blob();
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement("a");
  a.href = url; a.download = `audit-logs-${new Date().toISOString().slice(0,10)}.csv`;
  a.click(); URL.revokeObjectURL(url);
}

// ─── Avatar ──────────────────────────────────────────────────────────────────────

function Avatar({ name, email, size = "sm" }: { name?: string; email: string; size?: "sm"|"lg" }) {
  const initials = (name ?? email).split(/[\s@]/).filter(Boolean).slice(0,2)
    .map(w => w[0]).join("").toUpperCase();
  const palettes = [
    ["bg-blue-500","text-white"],["bg-violet-500","text-white"],
    ["bg-emerald-500","text-white"],["bg-rose-500","text-white"],
    ["bg-amber-500","text-white"],["bg-teal-500","text-white"],
    ["bg-indigo-500","text-white"],["bg-pink-500","text-white"],
  ];
  const [bg, fg] = palettes[(email.charCodeAt(0) ?? 0) % palettes.length];
  const sz = size === "lg" ? "w-12 h-12 text-base rounded-xl" : "w-7 h-7 text-[10px] rounded-full";
  return (
    <span className={`inline-flex items-center justify-center shrink-0 font-medium ${sz} ${bg} ${fg}`}>
      {initials}
    </span>
  );
}

// ─── Stat card ───────────────────────────────────────────────────────────────────

function StatCard({ label, value, note, icon: Icon, iconClass }: {
  label: string; value: string | number; note?: string;
  icon: typeof Activity; iconClass: string;
}) {
  return (
    <div className="bg-white rounded-xl border border-gray-100 p-4">
      <div className="flex items-center justify-between mb-3">
        <span className="text-[11px] text-gray-400 tracking-wide">{label}</span>
        <span className={`w-7 h-7 rounded-lg flex items-center justify-center ${iconClass}`}>
          <Icon className="w-3.5 h-3.5" />
        </span>
      </div>
      <p className="text-2xl text-gray-800 leading-none mb-1.5 font-light">{value}</p>
      {note && <p className="text-[11px] text-gray-400">{note}</p>}
    </div>
  );
}

// ─── Custom Select ────────────────────────────────────────────────────────────────

function FilterSelect({
  value, onChange, placeholder, options, width = "w-32", colorMap,
}: {
  value: string; onChange: (v: string) => void;
  placeholder: string; options: string[]; width?: string;
  colorMap?: Record<string, { bg: string; text: string; label?: string; icon?: any }>;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const isActive = !!value;
  const activeColor = value && colorMap?.[value];

  return (
    <div ref={ref} className={`relative ${width}`}>
      {/* Trigger */}
      <button
        onClick={() => setOpen(o => !o)}
        className={`h-9 w-full flex items-center justify-between gap-2 px-3 rounded-lg border text-xs transition-colors ${
          isActive && !activeColor
            ? "border-[#0A7FCF] bg-[#0A7FCF] text-white"
            : !isActive
            ? "border-gray-200 bg-white text-gray-500 hover:border-gray-300"
            : "border-gray-200 bg-white"
        }`}
      >
        {isActive && activeColor ? (
          <span className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[11px] ${activeColor.bg} ${activeColor.text}`}>
            {activeColor.icon && <span className="shrink-0 w-3 h-3 flex items-center justify-center">{React.createElement(activeColor.icon, { className: "w-3 h-3" })}</span>}
            {(activeColor.label ?? value).replace(/_/g," ")}
          </span>
        ) : (
          <span className="truncate">{value ? value.replace(/_/g," ") : placeholder}</span>
        )}
        <ChevronDown className={`w-3.5 h-3.5 shrink-0 transition-transform ${open ? "rotate-180" : ""} ${isActive && !activeColor ? "text-white/60" : "text-gray-400"}`} />
      </button>

      {/* Dropdown */}
      {open && (
        <div className="absolute z-50 mt-1.5 w-full bg-white rounded-xl border border-gray-100 shadow-xl shadow-gray-200/50 py-1.5 overflow-hidden min-w-max">
          {/* Reset */}
          <button
            onClick={() => { onChange(""); setOpen(false); }}
            className="w-full px-3 py-2 text-left text-[11px] text-gray-400 hover:bg-gray-50 transition-colors"
          >
            {placeholder}
          </button>
          <div className="h-px bg-gray-100 mx-2 my-1" />
          {options.map(o => {
            const c = colorMap?.[o];
            const isSelected = value === o;
            return (
              <button
                key={o}
                onClick={() => { onChange(o); setOpen(false); }}
                className={`w-full px-3 py-2 text-left text-xs transition-colors flex items-center gap-2.5 ${
                  isSelected ? "bg-gray-50" : "hover:bg-gray-50"
                }`}
              >
                {/* colored badge */}
                {c ? (
                  <span className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[11px] ${c.bg} ${c.text}`}>
                    {c.icon && React.createElement(c.icon, { className: "w-3 h-3 shrink-0" })}
                    {(c.label ?? o).replace(/_/g," ")}
                  </span>
                ) : (
                  <span className="text-gray-600">{o.replace(/_/g," ")}</span>
                )}
                {isSelected && <span className="ml-auto w-1.5 h-1.5 rounded-full bg-[#0A7FCF] shrink-0" />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── Date picker input ────────────────────────────────────────────────────────────

// ─── Custom Calendar Picker ───────────────────────────────────────────────────────

const MONTHS_FR = ["Janvier","Février","Mars","Avril","Mai","Juin","Juillet","Août","Septembre","Octobre","Novembre","Décembre"];
const DAYS_FR   = ["Lu","Ma","Me","Je","Ve","Sa","Di"];

function CalendarPicker({ value, onChange, placeholder }: {
  value: string; onChange: (v: string) => void; placeholder: string;
}) {
  const [open, setOpen]         = useState(false);
  const [viewYear, setViewYear] = useState(() => value ? new Date(value + "T12:00:00").getFullYear()  : new Date().getFullYear());
  const [viewMonth,setViewMonth]= useState(() => value ? new Date(value + "T12:00:00").getMonth()     : new Date().getMonth());
  const containerRef            = useRef<HTMLDivElement>(null);

  const selectedDate = value ? new Date(value + "T12:00:00") : null;
  const today        = new Date();
  today.setHours(0,0,0,0);

  // close on outside click
  useEffect(() => {
    if (!open) return;
    function handle(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handle);
    return () => document.removeEventListener("mousedown", handle);
  }, [open]);

  // sync view when value changes externally
  useEffect(() => {
    if (value) {
      const d = new Date(value + "T12:00:00");
      setViewYear(d.getFullYear());
      setViewMonth(d.getMonth());
    }
  }, [value]);

  function prevMonth() {
    if (viewMonth === 0) { setViewMonth(11); setViewYear(y => y - 1); }
    else setViewMonth(m => m - 1);
  }
  function nextMonth() {
    if (viewMonth === 11) { setViewMonth(0); setViewYear(y => y + 1); }
    else setViewMonth(m => m + 1);
  }

  // Build calendar grid (Mon-start)
  function buildGrid() {
    const firstDay = new Date(viewYear, viewMonth, 1);
    // Mon=0 … Sun=6
    let startDow = firstDay.getDay() - 1;
    if (startDow < 0) startDow = 6;
    const daysInMonth  = new Date(viewYear, viewMonth + 1, 0).getDate();
    const daysInPrev   = new Date(viewYear, viewMonth, 0).getDate();
    const cells: { date: Date; current: boolean }[] = [];
    for (let i = startDow - 1; i >= 0; i--)
      cells.push({ date: new Date(viewYear, viewMonth - 1, daysInPrev - i), current: false });
    for (let d = 1; d <= daysInMonth; d++)
      cells.push({ date: new Date(viewYear, viewMonth, d), current: true });
    while (cells.length % 7 !== 0)
      cells.push({ date: new Date(viewYear, viewMonth + 1, cells.length - daysInMonth - startDow + 1), current: false });
    return cells;
  }

  function toISO(d: Date) {
    return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
  }

  function select(d: Date) {
    onChange(toISO(d));
    setOpen(false);
  }

  const isActive = !!value;
  const displayLabel = selectedDate
    ? selectedDate.toLocaleDateString("fr-FR", { day:"2-digit", month:"short", year:"numeric" })
    : placeholder;

  const grid = open ? buildGrid() : [];

  return (
    <div ref={containerRef} className="relative">
      {/* Trigger button */}
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className={`h-9 w-40 flex items-center gap-2 px-3 rounded-lg border text-xs transition-colors ${
          isActive
            ? "border-[#0A7FCF] bg-[#0A7FCF] text-white"
            : "border-gray-200 bg-white text-gray-400 hover:border-gray-300"
        }`}
      >
        <Calendar className={`w-3.5 h-3.5 shrink-0 ${isActive ? "text-white/60" : "text-gray-400"}`} />
        <span className="truncate flex-1 text-left">{displayLabel}</span>
        {isActive && (
          <span
            role="button"
            onClick={e => { e.stopPropagation(); onChange(""); }}
            className="ml-auto text-white/50 hover:text-white transition-colors"
          >
            <X className="w-3 h-3" />
          </span>
        )}
      </button>

      {/* Dropdown calendar */}
      {open && (
        <div className="absolute top-full left-0 mt-2 z-50 bg-white rounded-2xl border border-gray-100 shadow-xl shadow-gray-200/60 p-4 w-72 select-none">

          {/* Month / Year nav */}
          <div className="flex items-center justify-between mb-4">
            <button
              type="button"
              onClick={prevMonth}
              className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-gray-100 transition-colors text-gray-400 hover:text-gray-700"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            <span className="text-sm text-gray-800">
              {MONTHS_FR[viewMonth]} {viewYear}
            </span>

            <button
              type="button"
              onClick={nextMonth}
              className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-gray-100 transition-colors text-gray-400 hover:text-gray-700"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {/* Day headers */}
          <div className="grid grid-cols-7 mb-1">
            {DAYS_FR.map(d => (
              <div key={d} className="text-center text-[10px] text-gray-400 tracking-wider py-1">
                {d}
              </div>
            ))}
          </div>

          {/* Day cells */}
          <div className="grid grid-cols-7 gap-y-0.5">
            {grid.map(({ date, current }, i) => {
              const iso       = toISO(date);
              const isSelected= value === iso;
              const isToday   = date.getTime() === today.getTime();
              return (
                <button
                  key={i}
                  type="button"
                  onClick={() => select(date)}
                  className={`
                    h-8 w-full flex items-center justify-center rounded-lg text-xs transition-colors
                    ${isSelected
                      ? "bg-[#0A7FCF] text-white"
                      : isToday
                      ? "border border-gray-300 text-gray-800 hover:bg-gray-50"
                      : current
                      ? "text-gray-700 hover:bg-gray-100"
                      : "text-gray-300 hover:bg-gray-50"
                    }
                  `}
                >
                  {date.getDate()}
                </button>
              );
            })}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-100">
            <button
              type="button"
              onClick={() => { onChange(""); setOpen(false); }}
              className="text-xs text-gray-400 hover:text-gray-700 transition-colors px-1"
            >
              Effacer
            </button>
            <button
              type="button"
              onClick={() => select(today)}
              className="text-xs text-blue-500 hover:text-blue-700 transition-colors px-1"
            >
              Aujourd'hui
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Detail modal ─────────────────────────────────────────────────────────────────

function DetailModal({ log, onClose }: { log: AuditLog; onClose: () => void }) {
  const out  = outcomeMap[log.outcome] ?? outcomeMap.SUCCESS;
  const OutIcon = out.icon;

  const Field = ({ label, value, mono = false, span = 1 }: {
    label: string; value?: string|number|null; mono?: boolean; span?: number;
  }) => value ? (
    <div className={span === 2 ? "col-span-2" : span === 3 ? "col-span-3" : ""}>
      <p className="text-[10px] text-gray-400 tracking-widest uppercase mb-1">{label}</p>
      <p className={`text-xs text-gray-700 break-all leading-relaxed ${mono ? "font-mono" : ""}`}>{value}</p>
    </div>
  ) : null;

  const Section = ({ title, accent, children }: {
    title: string; accent?: string; children: React.ReactNode;
  }) => (
    <div className={`rounded-xl overflow-hidden border ${accent ?? "border-gray-100"}`}>
      <p className={`px-5 py-3 text-[10px] tracking-widest uppercase ${accent ? "bg-white/30 border-b border-white/20 text-white/70" : "bg-gray-50 border-b border-gray-100 text-gray-400"}`}>
        {title}
      </p>
      <div className={`p-5 grid grid-cols-3 gap-x-6 gap-y-4 ${accent ? "bg-white/10" : ""}`}>
        {children}
      </div>
    </div>
  );

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto p-0 gap-0 rounded-2xl">

        {/* Hero header */}
        <div className={`px-6 pt-6 pb-5 rounded-t-2xl ${out.bg}`}>
          <DialogHeader>
            <DialogTitle className="flex items-start gap-4">
              <div className="flex-1">
                <div className={`inline-flex items-center gap-1.5 text-[11px] tracking-widest uppercase mb-3 ${out.color}`}>
                  <OutIcon className="w-3.5 h-3.5" />
                  {out.label}
                </div>
                <div className="flex items-center gap-3">
                  <Avatar name={log.userName} email={log.userEmail} size="lg" />
                  <div>
                    <p className="text-base text-gray-900 leading-tight">{log.userName || log.userEmail}</p>
                    {log.userName && <p className="text-sm text-gray-500 mt-0.5">{log.userEmail}</p>}
                    {log.userRoles && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {log.userRoles.split(",").map((r, i) => {
                          const c = roleColors[i % roleColors.length];
                          return (
                            <span key={r} className={`rounded-full px-2.5 py-0.5 text-[10px] ${c.bg} ${c.text}`}>
                              {r.replace("ROLE_","")}
                            </span>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              </div>
              <div className="text-right">
                <p className="text-[10px] text-gray-400 tracking-widest uppercase mb-1">Log ID</p>
                <p className="font-mono text-xs text-gray-500">{log.id}</p>
                <p className="text-[10px] text-gray-400 mt-3 tracking-widest uppercase mb-1">Date</p>
                <p className="text-xs text-gray-600">
                  {new Date(log.createdAt).toLocaleDateString("fr-FR",{day:"2-digit",month:"long",year:"numeric"})}
                </p>
                <p className="text-xs text-gray-400">
                  {new Date(log.createdAt).toLocaleTimeString("fr-FR")}
                </p>
              </div>
            </DialogTitle>
          </DialogHeader>
        </div>

        {/* Body */}
        <div className="px-6 py-5 space-y-3 bg-white rounded-b-2xl">

          <Section title="Action">
            <Field label="Type"        value={log.action} />
            <Field label="Module"      value={log.module?.replace(/_/g," ")} />
            <Field label="Description" value={log.description} />
          </Section>

          <Section title="Technique">
            <Field label="Méthode HTTP" value={log.httpMethod} />
            <Field label="Endpoint"     value={log.endpoint} mono span={2} />
            <Field label="Statut HTTP"  value={log.httpStatus} />
            <Field label="IP"           value={log.ipAddress} mono />
            <Field label="Durée"        value={log.durationMs ? `${log.durationMs} ms` : null} />
            <Field label="Realm"        value={log.realm} />
            <Field label="Client ID"    value={log.keycloakClientId} span={2} />
            <Field label="User ID"      value={log.userId} mono span={3} />
          </Section>

          {(log.resourceType || log.resourceId) && (
            <Section title="Ressource">
              <Field label="Type"  value={log.resourceType} />
              <Field label="ID"    value={log.resourceId} mono />
              <Field label="Label" value={log.resourceLabel} />
            </Section>
          )}

          {(log.requestPayload || log.beforeState || log.afterState) && (
            <div className="rounded-xl border border-gray-100 overflow-hidden">
              <p className="px-5 py-3 text-[10px] tracking-widest uppercase bg-gray-50 border-b border-gray-100 text-gray-400">
                Données
              </p>
              <div className="p-5 space-y-4">
                {([["Payload",log.requestPayload],["Avant",log.beforeState],["Après",log.afterState]] as [string,string][])
                  .filter(([,v]) => v)
                  .map(([lbl,val]) => (
                    <div key={lbl}>
                      <p className="text-[10px] text-gray-400 tracking-widest uppercase mb-2">{lbl}</p>
                      <pre className="rounded-lg bg-gray-50 border border-gray-100 p-3 text-[11px] font-mono text-gray-600 overflow-auto max-h-28">
                        {val}
                      </pre>
                    </div>
                  ))}
              </div>
            </div>
          )}

          {log.errorMessage && (
            <div className="rounded-xl bg-red-50 border border-red-100 overflow-hidden">
              <p className="px-5 py-3 text-[10px] tracking-widest uppercase text-red-400 bg-red-100/50 border-b border-red-100">
                Erreur
              </p>
              <p className="px-5 py-4 text-xs text-red-600 font-mono">{log.errorMessage}</p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────────

function SkeletonRow() {
  return (
    <TableRow>
      {Array.from({length:9}).map((_,i) => (
        <TableCell key={i}><Skeleton className="h-3.5 w-full rounded-full" /></TableCell>
      ))}
    </TableRow>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────────

export default function AuditLogTable() {
  const { data: session } = useSession();
  const token = (session as any)?.accessToken as string | undefined;

  const [data,      setData]      = useState<PageResponse | null>(null);
  const [loading,   setLoading]   = useState(true);
  const [error,     setError]     = useState<string | null>(null);
  const [page,      setPage]      = useState(0);
  const [pageSize,  setPageSize]  = useState(20);
  const [detail,    setDetail]    = useState<AuditLog | null>(null);
  const [exporting, setExporting] = useState(false);

  const [filters, setFilters] = useState<Filters>({
    search:"", action:"", module:"", outcome:"", dateFrom:"", dateTo:"",
  });

  const load = useCallback(async () => {
    if (!token) return;
    setLoading(true); setError(null);
    try { setData(await fetchAuditLogs(token, filters, page, pageSize)); }
    catch (e: any) { setError(e.message ?? "Erreur"); }
    finally { setLoading(false); }
  }, [token, filters, page, pageSize]);

  useEffect(() => { load(); }, [load]);

  const setFilter = (key: keyof Filters, val: string) => {
    setFilters(f => ({ ...f, [key]: val })); setPage(0);
  };
  const clearFilters = () => {
    setFilters({ search:"", action:"", module:"", outcome:"", dateFrom:"", dateTo:"" }); setPage(0);
  };
  const hasFilters = Object.values(filters).some(Boolean);

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

  const successCount = logs.filter(l => l.outcome === "SUCCESS").length;
  const failureCount = logs.filter(l => l.outcome === "FAILURE" || l.outcome === "ACCESS_DENIED").length;
  const avgDuration  = logs.length ? Math.round(logs.reduce((s,l) => s + (l.durationMs ?? 0), 0) / logs.length) : 0;

  const pageNums: (number | "…")[] = [];
  if (totalPages <= 7) {
    for (let i = 0; i < totalPages; i++) pageNums.push(i);
  } else {
    [0,1,2].forEach(p => pageNums.push(p));
    if (page > 3) pageNums.push("…");
    if (page > 2 && page < totalPages - 3) pageNums.push(page);
    if (page < totalPages - 4) pageNums.push("…");
    [totalPages-3,totalPages-2,totalPages-1].forEach(p => pageNums.push(p));
  }
  const pages = [...new Set(pageNums)];

  return (
    <div className="min-h-screen bg-[#f9f9f8]" style={{ fontFamily: "'Inter', system-ui, -apple-system, sans-serif" }}>

      {/* ── Top bar ── */}
      <div className="bg-white border-b border-gray-100 px-7 h-14 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <span className="text-[11px] text-gray-400 tracking-widest uppercase">Traçabilité</span>
          <span className="text-gray-200 text-sm">/</span>
          <span className="text-sm text-gray-700">Audit logs</span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={load}
            className="h-8 px-3 flex items-center gap-1.5 rounded-lg border border-gray-200 text-xs text-gray-500 hover:bg-gray-50 transition-colors"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
            Actualiser
          </button>
          <button
            onClick={handleExport} disabled={exporting}
            className="h-8 px-3 flex items-center gap-1.5 rounded-lg text-xs text-white transition-colors disabled:opacity-50"
            style={{ backgroundColor: exporting ? "#0A7FCF99" : "#0A7FCF" }}
            onMouseEnter={e => (e.currentTarget.style.backgroundColor = "#0970b8")}
            onMouseLeave={e => (e.currentTarget.style.backgroundColor = "#0A7FCF")}
          >
            <Download className="w-3.5 h-3.5" />
            {exporting ? "Export…" : "Exporter CSV"}
          </button>
        </div>
      </div>

      <div className="px-7 py-6 space-y-4">

        {/* ── Stats ── */}
        <div className="grid grid-cols-4 gap-3">
          <StatCard label="Total sur la période"
            value={loading ? "—" : totalItems.toLocaleString("fr-FR")}
            note="Entrées correspondantes"
            icon={Layers} iconClass="bg-gray-100 text-gray-500" />
          <StatCard label="Succès"
            value={loading ? "—" : successCount}
            note={`Sur ${logs.length} affichés`}
            icon={CheckCircle2} iconClass="bg-emerald-50 text-emerald-500" />
          <StatCard label="Erreurs"
            value={loading ? "—" : failureCount}
            note="Failures + accès refusés"
            icon={ShieldAlert} iconClass="bg-red-50 text-red-400" />
          <StatCard label="Durée moyenne"
            value={loading ? "—" : `${avgDuration} ms`}
            note="Temps de réponse moyen"
            icon={TrendingUp} iconClass="bg-blue-50 text-blue-400" />
        </div>

        {/* ── Filters ── */}
        <div className="bg-white rounded-xl border border-gray-100 px-4 py-3 flex flex-wrap items-center gap-2">

          {/* Date range */}
          <CalendarPicker value={filters.dateFrom} onChange={v => setFilter("dateFrom", v)} placeholder="Date début" />
          <span className="text-gray-300 text-xs px-0.5">→</span>
          <CalendarPicker value={filters.dateTo}   onChange={v => setFilter("dateTo",   v)} placeholder="Date fin" />

          <div className="h-5 w-px bg-gray-100 mx-1" />

          <FilterSelect
            value={filters.action}
            onChange={v => setFilter("action",v)}
            placeholder="Action"
            options={ACTION_OPTIONS}
            width="w-32"
            colorMap={Object.fromEntries(
              Object.entries(actionMap).map(([k,v]) => [k, { bg: v.bg, text: v.text }])
            )}
          />
          <FilterSelect
            value={filters.module}
            onChange={v => setFilter("module",v)}
            placeholder="Module"
            options={MODULE_OPTIONS}
            width="w-44"
            colorMap={Object.fromEntries(
              Object.entries(moduleMap).map(([k,v]) => [k, { bg: v.bg, text: v.text, label: v.label, icon: v.icon }])
            )}
          />
          <FilterSelect
            value={filters.outcome}
            onChange={v => setFilter("outcome",v)}
            placeholder="Résultat"
            options={OUTCOME_OPTIONS}
            width="w-36"
            colorMap={Object.fromEntries(
              Object.entries(outcomeMap).map(([k,v]) => [k, { bg: v.bg, text: v.color }])
            )}
          />

          {hasFilters && (
            <button
              onClick={clearFilters}
              className="h-9 px-3 flex items-center gap-1 rounded-lg text-xs text-red-400 hover:bg-red-50 border border-transparent hover:border-red-100 transition-colors"
            >
              <X className="w-3 h-3" /> Effacer
            </button>
          )}

          <div className="flex-1" />

          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-300 pointer-events-none" />
            <input
              type="text" value={filters.search}
              onChange={e => setFilter("search", e.target.value)}
              placeholder="Email, action, IP…"
              className="h-9 pl-9 pr-3 rounded-lg border border-gray-200 text-xs text-gray-600 bg-white outline-none focus:border-gray-300 w-52 transition-colors placeholder:text-gray-300"
            />
          </div>
        </div>

        {/* ── Error ── */}
        {error && (
          <div className="rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-xs text-red-400 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" /> {error}
          </div>
        )}

        {/* ── Table ── */}
        <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
          <div className="overflow-x-auto">
            <Table className="min-w-[980px]">
              <TableHeader>
                <TableRow className="bg-gray-50/60 hover:bg-gray-50/60 border-b border-gray-100">
                  {[
                    {h:"Date",       cls:"pl-6 w-36"},
                    {h:"Utilisateur",cls:""},
                    {h:"Action",     cls:""},
                    {h:"Module",     cls:""},
                    {h:"Ressource",  cls:""},
                    {h:"Endpoint",   cls:""},
                    {h:"IP",         cls:""},
                    {h:"Résultat",   cls:""},
                    {h:"",           cls:"w-10 pr-5"},
                  ].map(({h,cls}) => (
                    <TableHead key={h} className={`${cls} text-[10px] text-gray-400 tracking-widest py-3 uppercase`}>
                      {h}
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>

              <TableBody>
                {loading
                  ? Array.from({length:8}).map((_,i) => <SkeletonRow key={i} />)
                  : logs.length === 0
                  ? (
                    <TableRow>
                      <TableCell colSpan={9} className="py-20 text-center">
                        <div className="flex flex-col items-center gap-2 text-gray-300">
                          <Activity className="w-7 h-7" />
                          <p className="text-xs">Aucun log trouvé</p>
                        </div>
                      </TableCell>
                    </TableRow>
                  )
                  : logs.map(log => {
                    const out = outcomeMap[log.outcome] ?? outcomeMap.SUCCESS;
                    const act = actionMap[log.action]  ?? { text: "text-gray-400", bg: "bg-gray-100" };
                    return (
                      <TableRow
                        key={log.id}
                        className="group hover:bg-gray-50/50 border-b border-gray-50 last:border-0 cursor-pointer transition-colors"
                        onClick={() => setDetail(log)}
                      >
                        <TableCell className="pl-6 py-3.5 text-xs text-gray-500 tabular-nums whitespace-nowrap">
                          {new Date(log.createdAt).toLocaleDateString("fr-FR",{day:"2-digit",month:"short",year:"numeric"})}
                          <br />
                          <span className="text-[11px] text-gray-300">
                            {new Date(log.createdAt).toLocaleTimeString("fr-FR")}
                          </span>
                        </TableCell>

                        <TableCell className="py-3.5">
                          <div className="flex items-center gap-2">
                            <Avatar name={log.userName} email={log.userEmail} />
                            <div className="min-w-0">
                              <p className="text-xs text-gray-700 truncate max-w-[130px]">{log.userEmail}</p>
                              {log.userName && (
                                <p className="text-[10px] text-gray-400 truncate max-w-[130px]">{log.userName}</p>
                              )}
                            </div>
                          </div>
                        </TableCell>

                        <TableCell className="py-3.5">
                          <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] ${act.bg} ${act.text}`}>
                            {log.action}
                          </span>
                        </TableCell>

                        <TableCell className="py-3.5 text-[11px] text-gray-500">
                          {log.module?.replace(/_/g," ")}
                        </TableCell>

                        <TableCell className="py-3.5 text-[11px] text-gray-500">
                          {log.resourceType && <span className="text-gray-600">{log.resourceType}</span>}
                          {log.resourceId   && <span className="font-mono text-gray-400 text-[10px] ml-1">#{log.resourceId}</span>}
                        </TableCell>

                        <TableCell className="py-3.5">
                          <span className="font-mono text-[11px] text-gray-400 flex items-center gap-1 max-w-[180px]">
                            <span className={`text-[10px] shrink-0 ${methodMap[log.httpMethod] ?? "text-gray-400"}`}>
                              {log.httpMethod}
                            </span>
                            <span className="truncate">{log.endpoint}</span>
                          </span>
                        </TableCell>

                        <TableCell className="py-3.5 font-mono text-[11px] text-gray-400">
                          {log.ipAddress}
                        </TableCell>

                        <TableCell className="py-3.5">
                          <span className={`inline-flex items-center gap-1.5 text-[11px] ${out.color}`}>
                            <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${out.dot}`} />
                            {out.label}
                          </span>
                        </TableCell>

                        <TableCell className="py-3.5 pr-5">
                          <button
                            className="opacity-0 group-hover:opacity-100 transition-opacity p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600"
                            onClick={e => { e.stopPropagation(); setDetail(log); }}
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>
                        </TableCell>
                      </TableRow>
                    );
                  })
                }
              </TableBody>
            </Table>
          </div>

          {/* ── Pagination ── */}
          <div className="px-6 py-3 flex items-center justify-between border-t border-gray-50">
            <div className="flex items-center gap-1">
              <span className="text-[11px] text-gray-400 mr-2">Lignes</span>
              {[10,20,50].map(s => (
                <button
                  key={s}
                  onClick={() => { setPageSize(s); setPage(0); }}
                  className={`h-7 w-8 rounded-lg text-[11px] transition-colors ${
                    pageSize === s ? "bg-[#0A7FCF] text-white" : "text-gray-400 hover:bg-gray-100"
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-1">
              <span className="text-[11px] text-gray-400 mr-3">
                Page {page+1} / {totalPages} · {totalItems.toLocaleString("fr-FR")} entrées
              </span>
              <button
                onClick={() => setPage(p => Math.max(0, p-1))} disabled={page === 0}
                className="h-7 w-7 flex items-center justify-center rounded-lg border border-gray-100 hover:bg-gray-50 disabled:opacity-30 transition-colors"
              >
                <ChevronLeft className="w-3.5 h-3.5 text-gray-500" />
              </button>
              {pages.map((p, i) =>
                p === "…" ? (
                  <span key={i} className="w-5 text-center text-[11px] text-gray-300">…</span>
                ) : (
                  <button
                    key={i} onClick={() => setPage(p as number)}
                    className={`h-7 w-7 rounded-lg text-[11px] transition-colors ${
                      page === p ? "bg-[#0A7FCF] text-white" : "text-gray-500 hover:bg-gray-100"
                    }`}
                  >
                    {(p as number)+1}
                  </button>
                )
              )}
              <button
                onClick={() => setPage(p => Math.min(totalPages-1, p+1))} disabled={page >= totalPages-1}
                className="h-7 w-7 flex items-center justify-center rounded-lg border border-gray-100 hover:bg-gray-50 disabled:opacity-30 transition-colors"
              >
                <ChevronRight className="w-3.5 h-3.5 text-gray-500" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {detail && <DetailModal log={detail} onClose={() => setDetail(null)} />}
    </div>
  );
}