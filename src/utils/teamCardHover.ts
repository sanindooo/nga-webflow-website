/**
 * Team Card Hover — reveals description on hover + scales image.
 */

const DURATION = 0.45
const EASE = 'power2.inOut'

export const teamCardHover = () => {
  const cards = Array.from(document.querySelectorAll<HTMLElement>('.studio-team_card'))
  if (!cards.length) return

  cards.forEach((card) => {
    const description = card.querySelector<HTMLElement>('.studio-team_card-info p')
    const image = card.querySelector<HTMLElement>('.studio-team_card img')
    if (!description) return

    gsap.set(description, { autoAlpha: 0, yPercent: 20 })

    card.addEventListener('mouseenter', () => {
      gsap.killTweensOf(description)
      gsap.to(description, { autoAlpha: 1, yPercent: 0, duration: DURATION, ease: EASE })
      gsap.to(image, { scale: 1.1, duration: DURATION, ease: EASE })
    })

    card.addEventListener('mouseleave', () => {
      gsap.killTweensOf(description)
      gsap.to(description, { autoAlpha: 0, yPercent: 20, duration: DURATION, ease: EASE })
      gsap.to(image, { scale: 1, duration: DURATION, ease: EASE })
    })
  })
}
