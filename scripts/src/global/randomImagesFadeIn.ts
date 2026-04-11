;(function () {
  'use strict'

  const loadedScripts = ((window as any).__loadedScripts ??= {})
  if (loadedScripts['randomImagesFadeIn']) return
  loadedScripts['randomImagesFadeIn'] = true

  function init() {
    const gridSections = document.querySelectorAll<HTMLElement>('.process_grid')
    if (!gridSections.length) return

    gridSections.forEach((gridSection) => {
      const gridItems = Array.from(gridSection.querySelectorAll<HTMLElement>('.process_grid-item'))
      if (!gridItems.length) return

      // Set initial state — all figures invisible
      gsap.set(gridItems, { autoAlpha: 0, y: 20 })

      ScrollTrigger.create({
        trigger: gridSection,
        start: 'top 50%',
        once: true,
        onEnter() {
          // Shuffle figures into a random order
          const shuffledItems = [...gridItems].sort(() => Math.random() - 0.5)

          const fadeInTimeline = gsap.timeline()
          shuffledItems.forEach((gridItem) => {
            fadeInTimeline.to(
              gridItem,
              {
                autoAlpha: 1,
                y: 0,
                duration: 0.5,
                ease: 'power2.out',
              },
              `<0.1`,
            )
          })
        },
      })
    })
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init)
  } else {
    init()
  }
})()
