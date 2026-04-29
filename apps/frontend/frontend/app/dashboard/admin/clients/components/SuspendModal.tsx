"use client";

import { useState } from "react";
import {
  Dialog, DialogContent, DialogHeader,
  DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import { Button }   from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label }    from "@/components/ui/label";
import { AlertTriangle, Mail } from "lucide-react";
import { suspendClient } from "@/lib/services/admin.api";
import { UserAdminDTO }  from "@/types/admin";

interface Props {
  user: UserAdminDTO;
  onClose: () => void;
  onSuccess: () => void;
}

export function SuspendModal({ user, onClose, onSuccess }: Props) {
  const [reason,  setReason]  = useState("");
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState("");

  const handleSubmit = async () => {
    if (reason.trim().length < 10) {
      setError("Le motif doit contenir au moins 10 caractères.");
      return;
    }
    setLoading(true);
    try {
      await suspendClient(user.keycloakId, reason.trim());
      onSuccess();
      onClose();
    } catch {
      setError("Une erreur est survenue. Veuillez réessayer.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-destructive">
            <AlertTriangle className="w-5 h-5" />
            Suspendre le compte de{" "}
            <span className="font-bold">{user.username}</span>
          </DialogTitle>
          <DialogDescription className="flex items-start gap-2 pt-2">
            <Mail className="w-4 h-4 mt-0.5 flex-shrink-0 text-muted-foreground" />
            <span>
              Un e-mail sera automatiquement envoyé à{" "}
              <strong className="text-foreground">{user.email}</strong>{" "}
              avec le motif et votre identifiant admin pour assurer la traçabilité.
            </span>
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 py-2">
          <Label htmlFor="reason">
            Motif de suspension <span className="text-destructive">*</span>
          </Label>
          <Textarea
            id="reason"
            placeholder="Ex : Activité suspecte détectée, non-respect des CGU, impayé..."
            value={reason}
            onChange={(e) => { setReason(e.target.value); setError(""); }}
            rows={4}
            className={error ? "border-destructive" : ""}
          />
          <div className="flex justify-between items-center">
            {error
              ? <p className="text-sm text-destructive">{error}</p>
              : <span />
            }
            <span className="text-xs text-muted-foreground ml-auto">
              {reason.length} caractères
            </span>
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onClose} disabled={loading}>
            Annuler
          </Button>
          <Button
            variant="destructive"
            onClick={handleSubmit}
            disabled={loading || reason.trim().length < 10}
          >
            {loading ? "Suspension en cours..." : "Confirmer la suspension"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}