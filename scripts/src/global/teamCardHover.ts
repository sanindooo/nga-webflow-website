;(function () {
  'use strict'
  const loadedScripts = ((window as any).__loadedScripts ??= {})
  if (loadedScripts['teamCardHover']) return
  loadedScripts['teamCardHover'] = true

  const DURATION = 0.45
  const EASE = 'power2.inOut'

  function init() {
    const gsap = (window as any).gsap
    if (!gsap) return

    const cards = Array.from(document.querySelectorAll<HTMLElement>('.studio-team_card'))
    if (!cards.length) return

    cards.forEach((card) => {
      const description = card.querySelector<HTMLElement>('.studio-team_card-info p')

      if (!description) return

      gsap.set(description, { autoAlpha: 0, yPercent: 20 })

      card.addEventListener('mouseenter', () => {
        gsap.killTweensOf(description)
        gsap.to(description, { autoAlpha: 1, yPercent: 0, duration: DURATION, ease: EASE })
      })

      card.addEventListener('mouseleave', () => {
        gsap.killTweensOf(description)
        gsap.to(description, { autoAlpha: 0, yPercent: 20, duration: DURATION, ease: EASE })
      })
    })
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init)
  } else {
    init()
  }
})()
