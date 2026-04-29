// next.config.ts — racine du projet
import type { NextConfig } from "next"

const nextConfig: NextConfig = {
  async rewrites() {
    return [
      {
        // ✅ Syntaxe correcte Next.js — :path* (pas regex $1)
        // ❌ Exclut /api/auth/** géré par NextAuth
        source:      "/api/:path((?!auth).*)",
        destination: "http://localhost:8081/api/:path",
      },
       {
        source:      "/vnc-proxy/:path*",
        destination: "https://api.ocp4.nextstep-it.com:6443/:path*",
      },
    ]
  },
}

export default nextConfig
