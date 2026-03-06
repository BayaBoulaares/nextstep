// components/query-provider.tsx
"use client"

import { useState } from "react"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"

// Ce composant est séparé du layout car layout.tsx est un Server Component
// et QueryClientProvider nécessite "use client".
export function QueryProvider({ children }: { children: React.ReactNode }) {
  // useState garantit une instance unique de QueryClient par session client
  // (évite le partage d'état entre requêtes côté serveur)
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime:          1000 * 60,      // 1 min avant refetch auto
            retry:              1,               // 1 seule tentative après échec
            refetchOnWindowFocus: false,         // évite les refetch intempestifs
          },
        },
      }),
  )

  return (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  )
}