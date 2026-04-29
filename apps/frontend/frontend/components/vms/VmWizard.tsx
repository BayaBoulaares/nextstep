"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { vmApi, OS_IMAGES, VmRequest } from "@/lib/vmApi";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Slider } from "@/components/ui/slider";
import { CheckCircle2, ChevronRight, ChevronLeft, Loader2, Server, Cpu, HardDrive, Network } from "lucide-react";

const STEPS = [
  { id: 1, label: "Nom & OS",     icon: Server },
  { id: 2, label: "Ressources",   icon: Cpu },
  { id: 3, label: "Réseau",       icon: Network },
  { id: 4, label: "Récapitulatif",icon: CheckCircle2 },
];

const DEFAULT_FORM: VmRequest = {
  vmName: "",
  cpuCores: 2,
  ramGb: 4,
  diskGb: 20,
  osImage: OS_IMAGES[0].value,
};

export function VmWizard() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [form, setForm] = useState<VmRequest>(DEFAULT_FORM);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const update = (patch: Partial<VmRequest>) =>
    setForm((f) => ({ ...f, ...patch }));

  const canNext = () => {
    if (step === 1) return form.vmName.trim().length >= 3 && !!form.osImage;
    return true;
  };

  const handleSubmit = async () => {
    setLoading(true);
    setError(null);
    try {
      await vmApi.create(form);
      setSuccess(true);
      setTimeout(() => router.push("/dashboard/vms"), 2000);
    } catch (e: any) {
      setError(e.message ?? "Une erreur est survenue");
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4">
        <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center">
          <CheckCircle2 className="w-8 h-8 text-green-600" />
        </div>
        <h2 className="text-xl font-semibold text-slate-800">VM en cours de déploiement</h2>
        <p className="text-slate-500 text-sm">Redirection vers la liste des VMs…</p>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto">
      {/* Stepper */}
      <div className="flex items-center justify-between mb-10">
        {STEPS.map((s, i) => {
          const Icon = s.icon;
          const done = step > s.id;
          const active = step === s.id;
          return (
            <div key={s.id} className="flex items-center flex-1">
              <div className="flex flex-col items-center gap-1.5">
                <div className={`w-9 h-9 rounded-full flex items-center justify-center transition-all
                  ${done ? "bg-blue-600 text-white" : active ? "bg-blue-600 text-white ring-4 ring-blue-100" : "bg-slate-100 text-slate-400"}`}>
                  {done ? <CheckCircle2 className="w-4 h-4" /> : <Icon className="w-4 h-4" />}
                </div>
                <span className={`text-xs font-medium ${active ? "text-blue-600" : done ? "text-slate-600" : "text-slate-400"}`}>
                  {s.label}
                </span>
              </div>
              {i < STEPS.length - 1 && (
                <div className={`flex-1 h-px mx-3 mt-[-18px] transition-all ${step > s.id ? "bg-blue-600" : "bg-slate-200"}`} />
              )}
            </div>
          );
        })}
      </div>

      {/* Step content */}
      <Card className="border-slate-200 shadow-sm">
        <CardContent className="p-8">
          {step === 1 && <StepNameOs form={form} update={update} />}
          {step === 2 && <StepResources form={form} update={update} />}
          {step === 3 && <StepNetwork />}
          {step === 4 && <StepSummary form={form} />}

          {error && (
            <div className="mt-4 p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm">
              {error}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Navigation */}
      <div className="flex justify-between mt-6">
        <Button
          variant="outline"
          onClick={() => setStep((s) => s - 1)}
          disabled={step === 1}
          className="gap-2"
        >
          <ChevronLeft className="w-4 h-4" /> Précédent
        </Button>

        {step < 4 ? (
          <Button
            onClick={() => setStep((s) => s + 1)}
            disabled={!canNext()}
            className="gap-2 bg-blue-600 hover:bg-blue-700"
          >
            Suivant <ChevronRight className="w-4 h-4" />
          </Button>
        ) : (
          <Button
            onClick={handleSubmit}
            disabled={loading}
            className="gap-2 bg-blue-600 hover:bg-blue-700"
          >
            {loading ? (
              <><Loader2 className="w-4 h-4 animate-spin" /> Déploiement…</>
            ) : (
              <><Server className="w-4 h-4" /> Déployer la VM</>
            )}
          </Button>
        )}
      </div>
    </div>
  );
}

/* ── Step 1 : Nom & OS ── */
function StepNameOs({ form, update }: { form: VmRequest; update: (p: Partial<VmRequest>) => void }) {
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-base font-semibold text-slate-800 mb-4">Informations de base</h3>
        <div className="space-y-2">
          <Label htmlFor="vmName">Nom de la VM <span className="text-red-500">*</span></Label>
          <Input
            id="vmName"
            placeholder="ex: vm-web-prod"
            value={form.vmName}
            onChange={(e) => update({ vmName: e.target.value.toLowerCase().replace(/\s/g, "-") })}
            className="border-slate-200 focus:border-blue-400"
          />
          <p className="text-xs text-slate-400">Minimum 3 caractères, lettres minuscules et tirets uniquement</p>
        </div>
      </div>

      <div>
        <Label className="mb-3 block">Système d'exploitation <span className="text-red-500">*</span></Label>
        <div className="grid grid-cols-2 gap-3">
          {OS_IMAGES.map((os) => (
            <button
              key={os.value}
              type="button"
              onClick={() => update({ osImage: os.value })}
              className={`flex items-center gap-3 p-4 rounded-xl border-2 text-left transition-all
                ${form.osImage === os.value
                  ? "border-blue-500 bg-blue-50 text-blue-800"
                  : "border-slate-200 hover:border-slate-300 text-slate-700"
                }`}
            >
              <span className="text-2xl">{os.icon}</span>
              <span className="text-sm font-medium">{os.label}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ── Step 2 : Ressources ── */
function StepResources({ form, update }: { form: VmRequest; update: (p: Partial<VmRequest>) => void }) {
  return (
    <div className="space-y-8">
      <h3 className="text-base font-semibold text-slate-800">Configuration des ressources</h3>

      <ResourceSlider
        label="CPU"
        unit="vCPU"
        value={form.cpuCores}
        min={1} max={8} step={1}
        onChange={(v) => update({ cpuCores: v })}
        color="blue"
      />
      <ResourceSlider
        label="RAM"
        unit="Go"
        value={form.ramGb}
        min={1} max={32} step={1}
        onChange={(v) => update({ ramGb: v })}
        color="violet"
      />
      <ResourceSlider
        label="Disque"
        unit="Go"
        value={form.diskGb}
        min={10} max={200} step={10}
        onChange={(v) => update({ diskGb: v })}
        color="emerald"
      />

      {/* Quota indicator */}
      <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
        <p className="text-xs font-medium text-slate-500 mb-2">Quota disponible (namespace)</p>
        <div className="grid grid-cols-3 gap-4 text-center">
          <div>
            <p className="text-lg font-semibold text-slate-800">{form.cpuCores} / 8</p>
            <p className="text-xs text-slate-400">vCPU</p>
          </div>
          <div>
            <p className="text-lg font-semibold text-slate-800">{form.ramGb} / 16</p>
            <p className="text-xs text-slate-400">Go RAM</p>
          </div>
          <div>
            <p className="text-lg font-semibold text-slate-800">1 / 5</p>
            <p className="text-xs text-slate-400">VMs</p>
          </div>
        </div>
      </div>
    </div>
  );
}

function ResourceSlider({
  label, unit, value, min, max, step, onChange, color,
}: {
  label: string; unit: string; value: number;
  min: number; max: number; step: number;
  onChange: (v: number) => void; color: string;
}) {
  const colorMap: Record<string, string> = {
    blue: "text-blue-600",
    violet: "text-violet-600",
    emerald: "text-emerald-600",
  };
  return (
    <div className="space-y-2">
      <div className="flex justify-between items-center">
        <Label className="text-slate-700">{label}</Label>
        <span className={`text-lg font-bold ${colorMap[color] ?? "text-slate-800"}`}>
          {value} <span className="text-sm font-normal text-slate-400">{unit}</span>
        </span>
      </div>
      <Slider
        min={min} max={max} step={step}
        value={[value]}
        onValueChange={(vals: number[]) => onChange(vals[0])} 
        className="w-full"
      />
      <div className="flex justify-between text-xs text-slate-400">
        <span>{min} {unit}</span>
        <span>{max} {unit}</span>
      </div>
    </div>
  );
}

/* ── Step 3 : Réseau ── */
function StepNetwork() {
  return (
    <div className="space-y-4">
      <h3 className="text-base font-semibold text-slate-800">Configuration réseau</h3>
      <div className="p-4 rounded-xl border-2 border-blue-500 bg-blue-50">
        <div className="flex items-center gap-3">
          <Network className="w-5 h-5 text-blue-600" />
          <div>
            <p className="text-sm font-medium text-blue-800">Réseau par défaut (pod network)</p>
            <p className="text-xs text-blue-600">Réseau virtuel isolé dans votre namespace</p>
          </div>
        </div>
      </div>
      <p className="text-sm text-slate-500 mt-2">
        D'autres configurations réseau (VLANs, IPs fixes) seront disponibles prochainement.
      </p>
    </div>
  );
}

/* ── Step 4 : Récapitulatif ── */
function StepSummary({ form }: { form: VmRequest }) {
  const os = OS_IMAGES.find((o) => o.value === form.osImage);
  const rows = [
    { label: "Nom", value: form.vmName },
    { label: "OS", value: `${os?.icon} ${os?.label}` },
    { label: "CPU", value: `${form.cpuCores} vCPU` },
    { label: "RAM", value: `${form.ramGb} Go` },
    { label: "Disque", value: `${form.diskGb} Go` },
    { label: "Réseau", value: "Pod network (défaut)" },
  ];

  return (
    <div className="space-y-4">
      <h3 className="text-base font-semibold text-slate-800">Récapitulatif avant déploiement</h3>
      <div className="rounded-xl border border-slate-200 overflow-hidden">
        {rows.map((row, i) => (
          <div
            key={row.label}
            className={`flex justify-between items-center px-4 py-3 ${i % 2 === 0 ? "bg-slate-50" : "bg-white"}`}
          >
            <span className="text-sm text-slate-500">{row.label}</span>
            <span className="text-sm font-medium text-slate-800">{row.value}</span>
          </div>
        ))}
      </div>
      <p className="text-xs text-slate-400 text-center">
        La VM sera déployée dans votre namespace OpenShift dédié.
      </p>
    </div>
  );
}