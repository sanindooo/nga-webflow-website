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
  window.resizeSmoothScroll = () => lenis.resize()

  // Recalculate Lenis scroll height after lazy-loaded images settle.
  // Add data-lenis-resize to any section with CMS images whose intrinsic
  // aspect ratios aren't known upfront (causes layout shift on load).
  //
  // Strategy:
  // 1. Track ALL pending images in marked sections
  // 2. Call lenis.resize() on each load (progressively fixes scroll bounds)
  // 3. Call ScrollTrigger.refresh() ONCE after ALL images load (fixes trigger positions)
  //
  // ScrollTrigger.refresh() is dangerous mid-scroll, but safe here because:
  // - Initial page load: user hasn't scrolled yet
  // - Images load quickly in parallel
  // - One-time refresh after all images >> wrong positions throughout session
  let pendingImageCount = 0
  let resizeScheduled = false

  const scheduleResize = () => {
    if (resizeScheduled) return
    resizeScheduled = true
    requestAnimationFrame(() => {
      lenis.resize()
      resizeScheduled = false
    })
  }

  const handleImageLoaded = () => {
    pendingImageCount--
    scheduleResize()

    // When all images have loaded, refresh ScrollTrigger positions once
    if (pendingImageCount === 0) {
      requestAnimationFrame(() => {
        ScrollTrigger.refresh()
        window.dispatchEvent(new CustomEvent('layoutReady'))
      })
    }
  }

  function initImageListeners() {
    const sections = document.querySelectorAll<HTMLElement>('[data-lenis-resize]')

    sections.forEach((section) => {
      section.querySelectorAll<HTMLImageElement>('img').forEach((image) => {
        // Safari reports complete=true for lazy images that haven't loaded yet.
        // Check naturalWidth to confirm actual content has loaded.
        const isLoaded = image.complete && image.naturalWidth > 0
        if (!isLoaded) {
          pendingImageCount++
          image.addEventListener('load', handleImageLoaded, { once: true })
          image.addEventListener('error', handleImageLoaded, { once: true })
        }
      })
    })

    // If all images are already loaded (cached/fast connection), refresh immediately
    if (pendingImageCount === 0 && sections.length > 0) {
      requestAnimationFrame(() => {
        lenis.resize()
        ScrollTrigger.refresh()
        window.dispatchEvent(new CustomEvent('layoutReady'))
      })
    }
  }

  // Expose a global helper for scripts that need to wait for layout to settle
  // before measuring (e.g., SplitText line width calculations)
  window.onLayoutReady = (callback: () => void) => {
    if (pendingImageCount === 0) {
      callback()
    } else {
      window.addEventListener('layoutReady', callback, { once: true })
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initImageListeners)
  } else {
    initImageListeners()
  }
})()
