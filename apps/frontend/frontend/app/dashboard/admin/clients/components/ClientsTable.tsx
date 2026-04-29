"use client";

import { useState } from "react";
import {
  Table, TableBody, TableCell,
  TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge }  from "@/components/ui/badge";
import {
  Tooltip, TooltipContent, TooltipTrigger, TooltipProvider,
} from "@/components/ui/tooltip";
import { Info } from "lucide-react";
import { StatusBadge } from "./StatusBadge";
import { SuspendModal } from "./SuspendModal";
import { reactivateClient } from "@/lib/services/admin.api";
import { UserAdminDTO } from "@/types/admin";

interface Props {
  users:        UserAdminDTO[];
  totalPages:   number;
  currentPage:  number;
  onPageChange: (p: number) => void;
  onRefresh:    () => void;
}

export function ClientsTable({
  users, totalPages, currentPage, onPageChange, onRefresh,
}: Props) {
  const [selectedUser, setSelectedUser] = useState<UserAdminDTO | null>(null);
  const [reactivating, setReactivating] = useState<string | null>(null);

  const handleReactivate = async (user: UserAdminDTO) => {
    setReactivating(user.keycloakId);
    try {
      await reactivateClient(user.keycloakId);
      onRefresh();
    } finally {
      setReactivating(null);
    }
  };

  return (
    <TooltipProvider>
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-28">Connexion</TableHead>
              <TableHead>Utilisateur</TableHead>
              <TableHead>Email</TableHead>
              <TableHead className="w-28">Statut compte</TableHead>
              <TableHead>Suspension</TableHead>
              <TableHead className="w-36 text-right">Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {users.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-10 text-muted-foreground">
                  Aucun client trouvé.
                </TableCell>
              </TableRow>
            )}
            {users.map((user) => (
              <TableRow
                key={user.keycloakId}
                className={!user.enabled ? "bg-muted/40" : ""}
              >
                {/* Statut connecté — session Keycloak */}
                <TableCell>
                  <StatusBadge isOnline={user.isOnline} />
                </TableCell>

                <TableCell className="font-medium">{user.username}</TableCell>
                <TableCell className="text-muted-foreground">{user.email}</TableCell>

                {/* Statut compte */}
                <TableCell>
                  {user.enabled ? (
                    <Badge variant="outline" className="text-green-600 border-green-500">
                      Actif
                    </Badge>
                  ) : (
                    <Badge variant="destructive">Suspendu</Badge>
                  )}
                </TableCell>

                {/* Info suspension */}
                <TableCell>
                  {!user.enabled && user.suspensionReason ? (
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <div className="flex items-center gap-1 cursor-help">
                          <Info className="w-4 h-4 text-muted-foreground" />
                          <span className="text-xs text-muted-foreground truncate max-w-[120px]">
                            {user.suspensionReason}
                          </span>
                        </div>
                      </TooltipTrigger>
                      <TooltipContent className="max-w-xs space-y-1">
                        <p><strong>Motif :</strong> {user.suspensionReason}</p>
                        <p><strong>Par :</strong> {user.suspendedBy}</p>
                        <p><strong>Le :</strong>{" "}
                          {user.suspendedAt
                            ? new Date(user.suspendedAt).toLocaleString("fr-FR")
                            : "—"}
                        </p>
                      </TooltipContent>
                    </Tooltip>
                  ) : (
                    <span className="text-muted-foreground text-xs">—</span>
                  )}
                </TableCell>

                {/* Actions */}
                <TableCell className="text-right">
                  {user.enabled ? (
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => setSelectedUser(user)}
                    >
                      Suspendre
                    </Button>
                  ) : (
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={reactivating === user.keycloakId}
                      onClick={() => handleReactivate(user)}
                    >
                      {reactivating === user.keycloakId ? "..." : "Réactiver"}
                    </Button>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-4 text-sm text-muted-foreground">
          <span>Page {currentPage + 1} sur {totalPages}</span>
          <div className="flex gap-2">
            <Button
              variant="outline" size="sm"
              disabled={currentPage === 0}
              onClick={() => onPageChange(currentPage - 1)}
            >
              ← Précédent
            </Button>
            <Button
              variant="outline" size="sm"
              disabled={currentPage >= totalPages - 1}
              onClick={() => onPageChange(currentPage + 1)}
            >
              Suivant →
            </Button>
          </div>
        </div>
      )}

      {/* Modale suspension */}
      {selectedUser && (
        <SuspendModal
          user={selectedUser}
          onClose={() => setSelectedUser(null)}
          onSuccess={() => { setSelectedUser(null); onRefresh(); }}
        />
      )}
    </TooltipProvider>
  );
}