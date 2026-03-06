import "next-auth"
import "next-auth/jwt"

declare module "next-auth" {
  interface User {
    id:              string
    email:           string
    name?:           string
    firstName?:      string
    lastName?:       string
    accessToken?:    string
    refreshToken?:   string
    idToken?:        string
    expiresAt?:      number
    roles?:          string[]
    provider?:       string
    rememberMe?:     boolean   // ✅ AJOUT
  }

  interface Session {
    accessToken?:    string
    idToken?:        string
    roles?:          string[]
    error?:          string
    provider?:       string
    user: {
      id?:           string
      email?:        string
      name?:         string
      firstName?:    string
      lastName?:     string
      image?:        string
    }
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    accessToken?:    string
    refreshToken?:   string
    idToken?:        string
    expiresAt?:      number
    sessionExpires?: number    // ✅ AJOUT — expiration liée à "Se souvenir de moi"
    firstName?:      string
    lastName?:       string
    email?:          string
    roles?:          string[]
    error?:          string
    provider?:       string
    sub?:            string
    rememberMe?:     boolean   // ✅ AJOUT
  }
}