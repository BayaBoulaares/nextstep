// import NextAuth, { NextAuthOptions } from "next-auth"
// import KeycloakProvider from "next-auth/providers/keycloak"

// export const authOptions: NextAuthOptions = {
//   providers: [
//     KeycloakProvider({
//       clientId: process.env.KEYCLOAK_CLIENT_ID!,
//       clientSecret: process.env.KEYCLOAK_CLIENT_SECRET!,
//       issuer: process.env.KEYCLOAK_ISSUER!,
//     }),
//   ],
//   callbacks: {
//     async jwt({ token, account }) {
//       // Premier login : account est disponible
//       if (account) {
//         token.accessToken = account.access_token
//         token.refreshToken = account.refresh_token
//       }
//       return token
//     },
//     async session({ session, token }) {
//       // Maintenant TypeScript est content grâce au declare module
//       session.accessToken = token.accessToken
//       session.refreshToken = token.refreshToken
//       return session
//     },
//   },
//   pages: {
//     signIn: "/login", // redirige vers TON formulaire au lieu de celui de NextAuth
//   },
// }

// const handler = NextAuth(authOptions)
// export { handler as GET, handler as POST }
// app/api/auth/[...nextauth]/route.ts
import { handlers } from "@/auth"

export const { GET, POST } = handlers




