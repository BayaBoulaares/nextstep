"use client"

import * as React from "react"
import {
  IconCloud,
  IconStack2,
  IconCurrencyEuro,
  IconAlertCircle,
  IconTrendingUp,
} from "@tabler/icons-react"
import { Badge }    from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Card,
  CardAction,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { useServiceStats } from "@/app/features/services/hooks/useService"

export function SectionCards() {
  const { stats, loading, error } = useServiceStats()

  const activePct =
    stats.totalServices > 0
      ? Math.round((stats.activeServices / stats.totalServices) * 100)
      : 0

  const activePlansPct =
    stats.totalPlans > 0
      ? Math.round((stats.activePlans / stats.totalPlans) * 100)
      : 0

  const lowestPriceStr =
    stats.lowestPrice !== null
      ? `${stats.lowestPrice.toFixed(3).replace(".", ",")} €/h`
      : "—"

  const cards = [
    {
      id:         "services",
      icon:       <IconCloud className="size-4 text-muted-foreground" />,
      label:      "Services cloud",
      value:      stats.totalServices,
      badge:      `${stats.activeServices} actif${stats.activeServices > 1 ? "s" : ""}`,
      footerMain: `${activePct}% des services sont actifs`,
      footerSub:  `Répartis sur ${stats.categories} catégorie${stats.categories > 1 ? "s" : ""}`,
    },
    {
      id:         "plans",
      icon:       <IconStack2 className="size-4 text-muted-foreground" />,
      label:      "Offres / Plans",
      value:      stats.totalPlans,
      badge:      `${stats.activePlans} actif${stats.activePlans > 1 ? "s" : ""}`,
      footerMain: `${activePlansPct}% des plans sont actifs`,
      footerSub:  "Plans disponibles à la souscription",
    },
    {
      id:         "pricing",
      icon:       <IconCurrencyEuro className="size-4 text-muted-foreground" />,
      label:      "Tarif le plus bas",
      value:      lowestPriceStr,
      badge:      "Pay-as-you-go",
      footerMain: "Facturation à l'usage",
      footerSub:  "Sans engagement, résiliation immédiate",
    },
  ]

  if (error) {
    return (
      <div className="mx-4 lg:mx-6 flex items-center gap-2 rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
        <IconAlertCircle className="size-4 flex-shrink-0" />
        {error}
      </div>
    )
  }

  return (
<div className="grid grid-cols-1 gap-4 px-4 sm:grid-cols-2 lg:grid-cols-3 lg:px-6">      {cards.map((card) => (
        <Card key={card.id} className="@container/card">
          <CardHeader>
            <CardDescription className="flex items-center gap-1.5">
              {card.icon}
              {card.label}
            </CardDescription>

            <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
              {loading ? <Skeleton className="h-8 w-24 mt-1" /> : card.value}
            </CardTitle>

            <CardAction>
              {loading ? (
                <Skeleton className="h-5 w-16 rounded-full" />
              ) : (
                <Badge variant="outline" className="gap-1">
                  <IconTrendingUp className="size-3" />
                  {card.badge}
                </Badge>
              )}
            </CardAction>
          </CardHeader>

          <CardFooter className="flex-col items-start gap-1.5 text-sm">
            <div className="line-clamp-1 flex items-center gap-2 font-medium">
              {loading ? (
                <Skeleton className="h-4 w-40" />
              ) : (
                <>
                  {card.footerMain}
                  <IconTrendingUp className="size-4 flex-shrink-0" />
                </>
              )}
            </div>
            <div className="text-muted-foreground">
              {loading ? <Skeleton className="h-3 w-32 mt-1" /> : card.footerSub}
            </div>
          </CardFooter>
        </Card>
      ))}
    </div>
  )
}