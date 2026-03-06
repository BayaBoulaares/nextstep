// app/offres/page.tsx
"use client"

import { useState } from "react"
import { Plus } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Dialog, DialogContent, DialogHeader,
  DialogTitle, DialogDescription,
} from "@/components/ui/dialog"
import { OffreCarousel } from "../features/offres/components/OffreCard"
import { OffreForm, OffreFormValues } from "../features/offres/components/OffreForm"
import { useOffres } from "../features/offres/hooks/useOffre"
import type { Offre } from "../features/offres/types"

type FormMode = { type: "create" } | { type: "edit"; offre: Offre } | null

export default function OffresPage() {
  const { offres, loading, error, refetch, createOffre, updateOffre, deleteOffre } = useOffres()
  const [formMode, setFormMode] = useState<FormMode>(null)

  const isOpen = formMode !== null
  const isEdit = formMode?.type === "edit"

  const closeForm = () => setFormMode(null)

  const handleSubmit = async (values: OffreFormValues) => {
    if (formMode?.type === "edit") {
      await updateOffre(formMode.offre.id, values)
    } else {
      await createOffre(values)
    }
    closeForm()
  }

  const handleDelete = async (id: number) => {
    try {
      await deleteOffre(id)
    } catch (err) {
      alert(err instanceof Error ? err.message : "Erreur lors de la suppression.")
    }
  }

  const defaultValues = isEdit
    ? {
      titre: formMode.offre.titre,
      description: formMode.offre.description,
      prix: formMode.offre.prix,
      type: formMode.offre.type,
      dateDebut: formMode.offre.dateDebut,
      dateFin: formMode.offre.dateFin,
      actif: formMode.offre.actif,
      imageUrl: formMode.offre.imageUrl,
      serviceIds: formMode.offre.services ?? [],
    }
    : undefined

  if (loading) {
    return (
      <main className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3 text-muted-foreground">
          <div className="h-8 w-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
          <p className="text-sm">Chargement des offres...</p>
        </div>
      </main>
    )
  }

  if (error) {
    return (
      <main className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center space-y-3">
          <p className="text-red-600 font-medium">{error}</p>
          <Button variant="outline" onClick={refetch}>Réessayer</Button>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-gray-50">
      <div className="px-8 py-12 flex flex-col gap-8">

        {/* Header */}
        <div className="flex items-center justify-between max-w-7xl">
          <div>
            <h1 className="text-4xl font-bold tracking-tight">Nos Offres</h1>
            <p className="text-muted-foreground text-sm mt-1.5">
              {offres.filter((o) => o.actif).length} offre(s) active(s) sur {offres.length}
            </p>
          </div>
          <Button
            onClick={() => setFormMode({ type: "create" })}
            className="gap-2 rounded-full px-6 py-3 h-auto bg-black text-white hover:bg-gray-800"
          >
            <Plus className="h-5 w-5" />
            Ajouter
          </Button>
        </div>

        {/* Carousel */}
        <OffreCarousel
          offres={offres}
          onDelete={handleDelete}
          onUpdate={(id) => {
            const offre = offres.find((o) => o.id === id)
            if (offre) setFormMode({ type: "edit", offre })
          }}
        />

        {/* Dialog formulaire */}
        <Dialog open={isOpen} onOpenChange={(open) => !open && closeForm()}>
          <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <div className="flex items-center gap-3">
                <div className={`h-7 w-1 rounded-full ${isEdit ? "bg-blue-500" : "bg-black"}`} />
                <DialogTitle>
                  {isEdit ? `Modifier : ${formMode.offre.titre}` : "Nouvelle offre"}
                </DialogTitle>
              </div>
              <DialogDescription>
                {isEdit
                  ? "Modifiez les informations de l'offre ci-dessous."
                  : "Remplissez les informations pour créer une nouvelle offre."}
              </DialogDescription>
            </DialogHeader>

            {isOpen && (
              <OffreForm
                key={isEdit ? `edit-${formMode.offre.id}` : "create"}
                onSubmit={handleSubmit}
                onCancel={closeForm}
                defaultValues={defaultValues}
                submitLabel={isEdit ? "Mettre à jour" : "Enregistrer"}
              />
            )}
          </DialogContent>
        </Dialog>

      </div>
    </main>
  )
}