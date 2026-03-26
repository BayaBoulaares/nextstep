// "use client"

// import { useState } from "react"
// import { useSearchParams } from "next/navigation"
// import { LoginForm }            from "@/components/login-form"
// import { RegisterForm }         from "@/components/register-form"
// import { IconCircleCheck }      from "@tabler/icons-react"
// import { WaitingVerification }  from "@/components/waiting-verification"

// type Step = "login" | "register" | "waiting"

// export default function LoginPage() {
//   const searchParams = useSearchParams()
//   const justVerified = searchParams.get("verified") === "true"

//   const [step, setStep]                 = useState<Step>("login")
//   const [pendingEmail, setPendingEmail] = useState("")
//   const [pendingName, setPendingName]   = useState("")

//   function handleRegistered(email: string, firstName: string) {
//     setPendingEmail(email)
//     setPendingName(firstName)
//     setStep("waiting")
//   }

//   return (
//     <main className="min-h-screen flex flex-col items-center justify-center p-4 bg-background gap-4">

//       {/* Banner succès après vérification */}
//       {justVerified && step === "login" && (
//         <div className="w-full max-w-md flex items-center gap-2 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-700 text-sm px-4 py-3">
//           <IconCircleCheck className="size-4 flex-shrink-0" />
//           Email vérifié avec succès — vous pouvez vous connecter.
//         </div>
//       )}

//       {step === "login" && (
//         <LoginForm onSwitchToRegister={() => setStep("register")} />
//       )}

//       {step === "register" && (
//         <RegisterForm
//           onSwitchToLogin={() => setStep("login")}
//           onRegistered={handleRegistered}
//         />
//       )}

//       {step === "waiting" && (
//         <WaitingVerification
//           email={pendingEmail}
//           firstName={pendingName}
//           onBack={() => setStep("register")}
//         />
//       )}

//     </main>
//   )
// }
"use client"

import { useState, useEffect } from "react"   // ← ajouter useEffect
import { LoginForm }            from "@/components/login-form"
import { RegisterForm }         from "@/components/register-form"
import { IconCircleCheck }      from "@tabler/icons-react"
import { WaitingVerification }  from "@/components/waiting-verification"

type Step = "login" | "register" | "waiting"

export default function LoginPage() {
  // ✅ Plus de searchParams — on lit sessionStorage à la place
  const [justVerified, setJustVerified] = useState(false)
  const [step, setStep]                 = useState<Step>("login")
  const [pendingEmail, setPendingEmail] = useState("")
  const [pendingName, setPendingName]   = useState("")

  // ✅ Lire sessionStorage au montage et nettoyer immédiatement
  useEffect(() => {
    const verified = sessionStorage.getItem("email_verified")
    if (verified === "true") {
      sessionStorage.removeItem("email_verified")
      setJustVerified(true)
    }
  }, [])

  function handleRegistered(email: string, firstName: string) {
    setPendingEmail(email)
    setPendingName(firstName)
    setStep("waiting")
  }

  return (
    <main className="min-h-screen flex flex-col items-center justify-center p-4 bg-background gap-4">

      {/* Banner succès après vérification — inchangé visuellement */}
      {justVerified && step === "login" && (
        <div className="w-full max-w-md flex items-center gap-2 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-700 text-sm px-4 py-3">
          <IconCircleCheck className="size-4 flex-shrink-0" />
          Email vérifié avec succès — vous pouvez vous connecter.
        </div>
      )}

      {step === "login"    && <LoginForm onSwitchToRegister={() => setStep("register")} />}
      {step === "register" && (
        <RegisterForm
          onSwitchToLogin={() => setStep("login")}
          onRegistered={handleRegistered}
        />
      )}
      {step === "waiting"  && (
        <WaitingVerification
          email={pendingEmail}
          firstName={pendingName}
          onBack={() => setStep("register")}
        />
      )}

    </main>
  )
}