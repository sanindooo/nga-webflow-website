/**
 * GSAP Smooth Scroll (Lenis)
 *
 * Initialises Lenis smooth scrolling integrated with GSAP's ticker.
 * Exposes stop/start on window for other scripts (e.g., modals).
 * Dependencies: GSAP, ScrollTrigger, Lenis (all via CDN)
 */

;(function () {
  'use strict'

  const __s = ((window as any).__loadedScripts ??= {});
  if (__s['gsapSmoothScroll']) return; __s['gsapSmoothScroll'] = true;

  const lenis = new Lenis({
    prevent: (node: HTMLElement) => node.getAttribute('data-prevent-lenis') === 'true',
  })

  lenis.on('scroll', ScrollTrigger.update)

  gsap.ticker.add((time: number) => {
    lenis.raf(time * 1000)
  })

  gsap.ticker.lagSmoothing(0)

  window.stopSmoothScroll = () => lenis.stop()
  window.startSmoothScroll = () => lenis.start()

  // Recalculate Lenis scroll height when sections with lazy-loaded images
  // enter the viewport. Add data-lenis-resize to any section whose content
  // causes layout shifts (e.g., CMS images with intrinsic aspect ratios).
  document.querySelectorAll<HTMLElement>('[data-lenis-resize]').forEach((section) => {
    ScrollTrigger.create({
      trigger: section,
      start: 'top bottom',
      once: true,
      onEnter: () => {
        const images = section.querySelectorAll<HTMLImageElement>('img')
        let imagesLoaded = 0

        images.forEach((image) => {
          if (image.complete) {
            imagesLoaded++
          } else {
            image.addEventListener('load', () => {
              imagesLoaded++
              if (imagesLoaded === images.length) {
                lenis.resize()
                ScrollTrigger.refresh()
              }
            }, { once: true })
          }
        })

        if (imagesLoaded === images.length) {
          lenis.resize()
          ScrollTrigger.refresh()
        }
      },
    })
  })
})()
