// Affiche la date de chargement
document.addEventListener('DOMContentLoaded', () => {
  const footer = document.querySelector('footer p')
  const now = new Date().toLocaleString('fr-FR')
  footer.textContent += ` · Chargé le ${now}`

  // Anime les cartes au chargement
  document.querySelectorAll('.card').forEach((card, i) => {
    card.style.opacity = '0'
    card.style.transform = 'translateY(20px)'
    card.style.transition = 'all 0.4s ease'
    setTimeout(() => {
      card.style.opacity = '1'
      card.style.transform = 'translateY(0)'
    }, i * 150)
  })
})