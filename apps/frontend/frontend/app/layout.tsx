import type { Metadata } from "next"
import { Raleway } from "next/font/google"
import "./globals.css"
import { Providers } from "@/components/providers"

const raleway = Raleway({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
})

export const metadata: Metadata = {
  title: "NextStep",
  description: "Gestion des offres",
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr">
      <body className={raleway.className}>
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}