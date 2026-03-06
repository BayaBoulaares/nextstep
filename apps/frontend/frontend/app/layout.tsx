//app/layout
import type { Metadata } from "next"
import { Geist } from "next/font/google"
import "./globals.css"
import { Providers } from "@/components/providers"

const geist = Geist({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "NextStep",
  description: "Gestion des offres",
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="fr">
      <body className={geist.className}>
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}