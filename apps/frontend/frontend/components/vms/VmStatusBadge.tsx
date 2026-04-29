"use client";

type Status = "EN_ATTENTE" | "EN_LIGNE" | "ARRETEE" | "ERREUR";

const config: Record<Status, { label: string; classes: string; dot: string }> = {
  EN_ATTENTE: {
    label: "En attente",
    classes: "bg-amber-50 text-amber-700 border border-amber-200",
    dot: "bg-amber-400",
  },
  EN_LIGNE: {
    label: "En ligne",
    classes: "bg-green-50 text-green-700 border border-green-200",
    dot: "bg-green-500",
  },
  ARRETEE: {
    label: "Arrêtée",
    classes: "bg-slate-100 text-slate-600 border border-slate-200",
    dot: "bg-slate-400",
  },
  ERREUR: {
    label: "Erreur",
    classes: "bg-red-50 text-red-700 border border-red-200",
    dot: "bg-red-500",
  },
};

export function VmStatusBadge({ status }: { status: Status }) {
  const { label, classes, dot } = config[status] ?? config.EN_ATTENTE;
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${classes}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${dot} ${status === "EN_LIGNE" ? "animate-pulse" : ""}`} />
      {label}
    </span>
  );
}