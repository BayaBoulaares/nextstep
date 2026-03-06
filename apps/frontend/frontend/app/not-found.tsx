// app/not-found.tsx
import Link from "next/link"

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 bg-white">
      <div className="flex flex-col items-center gap-2 text-center">
        <span className="text-6xl font-bold text-gray-200">404</span>
        <h1 className="text-xl font-semibold text-gray-800">Page introuvable</h1>
        <p className="text-sm text-gray-500">
          Cette page n'existe pas ou vous n'avez pas accès.
        </p>
      </div>
      <Link
        href="/dashboard"
        className="rounded-lg bg-gray-900 px-5 py-2.5 text-sm font-medium text-white hover:bg-gray-700 transition-colors"
      >
        Retour au tableau de bord
      </Link>
    </div>
  )
}