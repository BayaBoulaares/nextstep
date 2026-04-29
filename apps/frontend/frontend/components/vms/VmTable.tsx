"use client";

import { useState } from "react";
import { VmResponse, vmApi } from "@/lib/vmApi";
import { VmStatusBadge } from "./VmStatusBadge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu, DropdownMenuContent,
  DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Play, Square, Trash2, MoreHorizontal, Loader2, Cpu, HardDrive, MemoryStick } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { fr } from "date-fns/locale";

interface Props {
  vms: VmResponse[];
  onRefresh: () => void;
}

export function VmTable({ vms, onRefresh }: Props) {
  const [loadingVm, setLoadingVm] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);

  const action = async (fn: () => Promise<void>, vmName: string) => {
    setLoadingVm(vmName);
    try {
      await fn();
      onRefresh();
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingVm(null);
    }
  };

  if (vms.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center gap-3">
        <div className="w-14 h-14 rounded-full bg-slate-100 flex items-center justify-center">
          <Cpu className="w-6 h-6 text-slate-400" />
        </div>
        <p className="text-slate-600 font-medium">Aucune VM déployée</p>
        <p className="text-slate-400 text-sm">Créez votre première machine virtuelle pour commencer.</p>
      </div>
    );
  }

  return (
    <>
      <div className="rounded-xl border border-slate-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200">
              <th className="text-left px-4 py-3 font-medium text-slate-500">Nom</th>
              <th className="text-left px-4 py-3 font-medium text-slate-500">Statut</th>
              <th className="text-left px-4 py-3 font-medium text-slate-500">Ressources</th>
              <th className="text-left px-4 py-3 font-medium text-slate-500">Namespace</th>
              <th className="text-left px-4 py-3 font-medium text-slate-500">Créée</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {vms.map((vm) => (
              <tr key={vm.id} className="hover:bg-slate-50 transition-colors">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg bg-blue-100 flex items-center justify-center">
                      <Cpu className="w-3.5 h-3.5 text-blue-600" />
                    </div>
                    <span className="font-medium text-slate-800">{vm.name}</span>
                  </div>
                </td>
                <td className="px-4 py-3">
                  <VmStatusBadge status={vm.status} />
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3 text-slate-500 text-xs">
                    <span className="flex items-center gap-1">
                      <Cpu className="w-3 h-3" />{vm.cpuCores} vCPU
                    </span>
                    <span className="flex items-center gap-1">
                      <MemoryStick className="w-3 h-3" />{vm.ramGb} Go
                    </span>
                    <span className="flex items-center gap-1">
                      <HardDrive className="w-3 h-3" />{vm.diskGb} Go
                    </span>
                  </div>
                </td>
                <td className="px-4 py-3">
                  <span className="font-mono text-xs text-slate-500 bg-slate-100 px-2 py-1 rounded">
                    {vm.namespace}
                  </span>
                </td>
                <td className="px-4 py-3 text-slate-400 text-xs">
                  {vm.createdAt
                    ? formatDistanceToNow(new Date(vm.createdAt), { addSuffix: true, locale: fr })
                    : "—"}
                </td>
                <td className="px-4 py-3">
                  {loadingVm === vm.name ? (
                    <Loader2 className="w-4 h-4 animate-spin text-slate-400" />
                  ) : (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <MoreHorizontal className="w-4 h-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-40">
                        {vm.status === "ARRETEE" || vm.status === "EN_ATTENTE" ? (
                          <DropdownMenuItem
                            className="gap-2 text-green-700"
                            onClick={() => action(() => vmApi.start(vm.name), vm.name)}
                          >
                            <Play className="w-3.5 h-3.5" /> Démarrer
                          </DropdownMenuItem>
                        ) : (
                          <DropdownMenuItem
                            className="gap-2 text-amber-700"
                            onClick={() => action(() => vmApi.stop(vm.name), vm.name)}
                          >
                            <Square className="w-3.5 h-3.5" /> Arrêter
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuItem
                          className="gap-2 text-red-600"
                          onClick={() => setDeleteTarget(vm.name)}
                        >
                          <Trash2 className="w-3.5 h-3.5" /> Supprimer
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Confirm delete dialog */}
      <AlertDialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer la VM ?</AlertDialogTitle>
            <AlertDialogDescription>
              La VM <strong>{deleteTarget}</strong> sera définitivement supprimée du cluster OpenShift.
              Cette action est irréversible.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 hover:bg-red-700"
              onClick={() => {
                if (deleteTarget) action(() => vmApi.delete(deleteTarget), deleteTarget);
                setDeleteTarget(null);
              }}
            >
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}