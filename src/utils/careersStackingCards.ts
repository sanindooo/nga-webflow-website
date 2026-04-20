/**
 * Careers Stacking Cards
 *
 * Stacking benefit cards with clip-path reveal on the incoming card and a
 * black overlay fade on the card being covered by the next one.
 */

export const careersStackingCards = () => {
  const sections = document.querySelectorAll<HTMLElement>('.benefit-card_component')
  if (sections.length === 0) return

  sections.forEach((section, index) => {
    const marginBottom = index < sections.length - 1 ? 'margin-bottom: 80vh;' : ''
    section.style.cssText = `position: sticky; top: 0; z-index: ${index + 1}; ${marginBottom}`

    const blackOverlay = document.createElement('div')
    blackOverlay.style.cssText =
      'position: absolute; inset: 0; background: black; opacity: 0; pointer-events: none; z-index: 10;'
    section.appendChild(blackOverlay)
  })

  sections.forEach((section, index) => {
    const figure = section.querySelector<HTMLElement>('.benefit-card_figure')
    const blackOverlay = section.querySelector<HTMLElement>('div[style*="background: black"]')

    if (figure) {
      const image = figure.querySelector<HTMLElement>('img')

      const sharedScrollTrigger = {
        trigger: section,
        start: 'top 30%',
        end: 'top top',
      }

      gsap.fromTo(
        figure,
        { clipPath: 'inset(0% 0% 100% 0%)' },
        { clipPath: 'inset(0% 0% 0% 0%)', ease: 'none', scrollTrigger: sharedScrollTrigger },
      )

      if (image) {
        gsap.fromTo(
          image,
          { scale: 1.2 },
          { scale: 1, ease: 'power4.out', duration: 1, scrollTrigger: sharedScrollTrigger },
        )
      }
    }

    if (index < sections.length - 1 && blackOverlay) {
      const nextSection = sections[index + 1]
      gsap.to(blackOverlay, {
        opacity: 0.6,
        ease: 'none',
        scrollTrigger: {
          trigger: nextSection,
          start: 'top bottom',
          end: 'top top',
          scrub: true,
        },
      })
    }
  })
}
