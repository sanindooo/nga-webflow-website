;(function () {
  'use strict'

  const __s = ((window as any).__loadedScripts ??= {})
  if (__s['careersStackingCards']) return
  __s['careersStackingCards'] = true

  function init() {
    const sections = document.querySelectorAll<HTMLElement>('.benefit-card_component')
    if (sections.length === 0) return

    const gsap = (window as any).gsap
    const ScrollTrigger = (window as any).ScrollTrigger
    if (!gsap || !ScrollTrigger) return

    // Set up stacking styles and inject a black overlay div into each card
    sections.forEach((section, index) => {
      section.style.cssText = `position: sticky; top: 0; background: white; z-index: ${index + 1};`

      const blackOverlay = document.createElement('div')
      blackOverlay.style.cssText =
        'position: absolute; inset: 0; background: black; opacity: 0; pointer-events: none; z-index: 10;'
      section.appendChild(blackOverlay)
    })

    sections.forEach((section, index) => {
      const figure = section.querySelector<HTMLElement>('.benefit-card_figure')
      const blackOverlay = section.querySelector<HTMLElement>('div[style*="background: black"]')

      // Clip-path reveal + image scale on incoming card — starts after card is 30% up
      if (figure) {
        const image = figure.querySelector<HTMLElement>('img')

        const sharedScrollTrigger = {
          trigger: section,
          start: 'top 30%',
          end: 'top top',
          //   scrub: true,
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

      // Fade in black overlay on the card being covered as the next card scrolls over it
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

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init)
  } else {
    init()
  }
})()
