// app/dashboard/admin/clients/page.tsx
"use client";

import { useEffect, useState, useCallback } from "react";
import { ClientsTable }  from "./components/ClientsTable";
import { fetchClients }  from "@/lib/services/admin.api";
import { UserAdminDTO, PageResponse } from "@/types/admin";
import { Users } from "lucide-react";

export default function AdminClientsPage() {
  const [data,    setData]    = useState<PageResponse<UserAdminDTO> | null>(null);
  const [page,    setPage]    = useState(0);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const result = await fetchClients(page);
      setData(result);
    } catch (e: any) {
      console.error("[AdminClients] erreur fetch:", e);
      setError(e?.message ?? "Impossible de charger la liste des clients.");
    } finally {
      setLoading(false);
    }
  }, [page]);

  useEffect(() => { load(); }, [load]);

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-3">
        <Users className="w-6 h-6 text-primary" />
        <div>
          <h1 className="text-2xl font-bold">Gestion des clients</h1>
          <p className="text-sm text-muted-foreground">
            {data ? `${data.totalElements} client(s) au total` : "Chargement..."}
          </p>
        </div>
      </div>

      {error && (
        <div className="text-destructive border border-destructive/30 rounded-md p-4 text-sm">
          {error}
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-20 text-muted-foreground">
          Chargement des clients...
        </div>
      ) : data && (
        <ClientsTable
          users={data.content}
          totalPages={data.totalPages}
          currentPage={page}
          onPageChange={setPage}
          onRefresh={load}
        />
      )}
    </div>
  );
}