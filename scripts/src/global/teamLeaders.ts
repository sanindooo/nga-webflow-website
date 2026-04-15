;(function () {
  'use strict'

  const loadedScripts = ((window as any).__loadedScripts ??= {})
  if (loadedScripts['teamLeaders']) return
  loadedScripts['teamLeaders'] = true

  const DURATION = 0.5
  const HIDE_DELAY_MS = 50

  function getRandomX(): number {
    const minX = window.innerWidth * 0.2
    const maxX = window.innerWidth * 0.8
    return Math.floor(minX + Math.random() * (maxX - minX))
  }

  function init() {
    const gsap = (window as any).gsap
    if (!gsap) return

    const listItems = Array.from(document.querySelectorAll<HTMLElement>('.studio-team-list_item'))
    if (!listItems.length) return

    listItems.forEach((item) => {
      const figure = item.querySelector<HTMLElement>('.studio-team_floating-figure')
      if (!figure) return

      gsap.set(figure, { autoAlpha: 0, border: '1px solid black', zIndex: 1000 })

      let hideTimeout: ReturnType<typeof setTimeout> | null = null

      item.addEventListener('mouseenter', () => {
        if (hideTimeout) {
          clearTimeout(hideTimeout)
          hideTimeout = null
        }

        const randomX = getRandomX()
        gsap.set(figure, { left: randomX })
        gsap.to(figure, { autoAlpha: 1, duration: DURATION, ease: 'power2.out' })
      })

      item.addEventListener('mouseleave', () => {
        hideTimeout = setTimeout(() => {
          gsap.to(figure, { autoAlpha: 0, duration: DURATION, ease: 'power2.in' })
          hideTimeout = null
        }, HIDE_DELAY_MS)
      })
    })
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init)
  } else {
    init()
  }
})()
