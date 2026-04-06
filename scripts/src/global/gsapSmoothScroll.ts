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

  // Recalculate Lenis scroll height after lazy-loaded images settle.
  // Add data-lenis-resize to any section with CMS images whose intrinsic
  // aspect ratios aren't known upfront (causes layout shift on load).
  let resizeScheduled = false
  const scheduleResize = () => {
    if (resizeScheduled) return
    resizeScheduled = true
    requestAnimationFrame(() => {
      lenis.resize()
      resizeScheduled = false
    })
  }

  function initImageListeners() {
    let hasPendingImages = false

    document.querySelectorAll<HTMLElement>('[data-lenis-resize]').forEach((section) => {
      section.querySelectorAll<HTMLImageElement>('img').forEach((image) => {
        // Safari reports complete=true for lazy images that haven't loaded yet.
        // Check naturalWidth to confirm actual content has loaded.
        const isLoaded = image.complete && image.naturalWidth > 0
        if (!isLoaded) {
          hasPendingImages = true
          image.addEventListener('load', scheduleResize, { once: true })
          image.addEventListener('error', scheduleResize, { once: true })
        }
      })
    })

    // If all images are already loaded (cached/fast connection), resize immediately
    if (!hasPendingImages) {
      scheduleResize()
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initImageListeners)
  } else {
    initImageListeners()
  }
})()
