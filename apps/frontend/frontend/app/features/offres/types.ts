// features/offres/types.ts

export type TypeOffre = "STANDARD" | "PREMIUM" | "ENTREPRISE"

export interface Offre {
  id: number
  titre: string
  description: string | null
  prix: number                      // BigDecimal Java → number TS
  type: TypeOffre                   // STANDARD, PREMIUM ou ENTREPRISE
  dateDebut: string                 // LocalDate Java → "YYYY-MM-DD"
  dateFin: string
  actif: boolean
  imageUrl: string | null
  dateCreation: string              // LocalDateTime Java → ISO string
  dateModification: string | null
  services?: number[]               // IDs des services (pour l'affichage)
}

// Ce qu'on envoie au POST /offres
export type CreateOffrePayload = Omit<Offre, "id" | "dateCreation" | "dateModification" | "services"> & {
  serviceIds?: number[]             // Pour associer des services lors de la création
}

// Ce qu'on envoie au PATCH /offres/:id
export type UpdateOffrePayload = Partial<CreateOffrePayload>