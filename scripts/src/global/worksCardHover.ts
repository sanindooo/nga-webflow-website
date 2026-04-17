// card item class name .works_list-item
// card item overlay class name .works_content-wrapper .overlay
// card item content wrapper class name .works_content

;(function () {
  'use strict'

  const __s = ((window as any).__loadedScripts ??= {})
  if (__s['worksCardHover']) return
  __s['worksCardHover'] = true

  const gsap = (window as any).gsap
  const desktopMediaQuery = window.matchMedia('(min-width: 992px)')

  function init() {
    if (!gsap) return

    const cardItems = document.querySelectorAll<HTMLElement>('.works_list-item')

    cardItems.forEach((card) => {
      const overlay = card.querySelector<HTMLElement>('.works_content-wrapper .overlay')
      const contentWrapper = card.querySelector<HTMLElement>('.works_content')
      const image = card.querySelector<HTMLElement>('img')

      if (!overlay || !contentWrapper) return

      // Set initial state
      gsap.set(overlay, { autoAlpha: 0 })
      gsap.set(contentWrapper, { autoAlpha: 0, y: -12 })
      gsap.set(image?.parentElement, { overflow: 'hidden' })
      card.addEventListener('mouseenter', () => {
        if (!desktopMediaQuery.matches) return
        gsap.to(overlay, { autoAlpha: 1, duration: 0.4, ease: 'power2.out' })
        gsap.to(contentWrapper, { autoAlpha: 1, y: 0, duration: 0.4, ease: 'power2.out' })
        if (image) gsap.to(image, { scale: 1.1, duration: 0.4, ease: 'power2.out' })
      })

      card.addEventListener('mouseleave', () => {
        if (!desktopMediaQuery.matches) return
        gsap.to(overlay, { autoAlpha: 0, duration: 0.4, ease: 'power2.in' })
        gsap.to(contentWrapper, { autoAlpha: 0, y: -12, duration: 0.4, ease: 'power2.in' })
        if (image) gsap.to(image, { scale: 1, duration: 0.4, ease: 'power2.in' })
      })

      desktopMediaQuery.addEventListener('change', (event) => {
        if (!event.matches) {
          gsap.set(overlay, { autoAlpha: 1, clearProps: 'opacity,visibility' })
          gsap.set(contentWrapper, {
            autoAlpha: 1,
            y: 0,
            clearProps: 'opacity,visibility,transform',
          })
          if (image) gsap.set(image, { scale: 1, clearProps: 'transform' })
        } else {
          gsap.set(overlay, { autoAlpha: 0 })
          gsap.set(contentWrapper, { autoAlpha: 0, y: -12 })
        }
      })
    })
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init)
  } else {
    init()
  }
})()
