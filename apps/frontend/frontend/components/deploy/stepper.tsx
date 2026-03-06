import { Check } from "lucide-react"
import { cn } from "@/lib/utils"

export type Step = { id: number; label: string }

export function Stepper({
  steps,
  current,
}: {
  steps: Step[]
  current: number
}) {
  return (
    <div className="flex items-center gap-0">
      {steps.map((step, i) => {
        const done   = step.id < current
        const active = step.id === current

        return (
          <div key={step.id} className="flex items-center">
            {/* Cercle */}
            <div className="flex items-center gap-2">
              <div
                className={cn(
                  "w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-semibold border transition-colors shrink-0",
                  done   && "bg-foreground border-foreground text-background",
                  active && "bg-foreground border-foreground text-background",
                  !done && !active && "bg-background border-border text-muted-foreground"
                )}
              >
                {done ? <Check className="w-3 h-3" /> : step.id}
              </div>
              <span
                className={cn(
                  "text-[12px] font-medium whitespace-nowrap",
                  active && "text-foreground",
                  done   && "text-foreground",
                  !done && !active && "text-muted-foreground"
                )}
              >
                {step.label}
              </span>
            </div>

            {/* Séparateur */}
            {i < steps.length - 1 && (
              <div className={cn(
                "w-8 h-px mx-3",
                step.id < current ? "bg-foreground" : "bg-border"
              )} />
            )}
          </div>
        )
      })}
    </div>
  )
}