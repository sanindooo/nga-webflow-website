/**
 * GSAP Smooth Scroll (Lenis)
 *
 * Initialises Lenis smooth scrolling integrated with GSAP's ticker.
 * Exposes stop/start on window for other scripts (e.g., modals).
 * Coordinates ScrollTrigger initialization via layoutReady event.
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

  // ─── Layout Ready Coordination ─────────────────────────────────────────────
  // All ScrollTrigger-creating scripts must wait for layoutReady before
  // creating triggers. This ensures:
  // 1. Fonts are loaded (affects text measurement for SplitText)
  // 2. Initial layout has settled (rAF after fonts)
  // 3. ScrollTrigger.refresh() has been called once
  //
  // We do NOT wait for lazy images — they load on scroll and would block
  // forever. Instead, images with aspect-ratio CSS reserve space upfront,
  // and we call lenis.resize() progressively as images load.

  let layoutReadyFired = false
  const pendingCallbacks: (() => void)[] = []

  window.onLayoutReady = (callback: () => void) => {
    if (layoutReadyFired) {
      callback()
    } else {
      pendingCallbacks.push(callback)
    }
  }

  function fireLayoutReady() {
    if (layoutReadyFired) return
    layoutReadyFired = true

    lenis.resize()
    ScrollTrigger.refresh()

    pendingCallbacks.forEach((callback) => callback())
    pendingCallbacks.length = 0

    window.dispatchEvent(new CustomEvent('layoutReady'))
  }

  function initLayoutReady() {
    const fontsReady = document.fonts?.ready ?? Promise.resolve()

    fontsReady.then(() => {
      // Give browser one frame to settle layout after fonts load
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          fireLayoutReady()
        })
      })
    })
  }

  // ─── Lazy Image Resize (progressive, non-blocking) ─────────────────────────
  // For images without aspect-ratio that cause layout shift after loading,
  // add data-lenis-resize to the section. This calls lenis.resize() on each
  // image load to update scroll bounds — but does NOT block layoutReady.

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
    const sections = document.querySelectorAll<HTMLElement>('[data-lenis-resize]')

    sections.forEach((section) => {
      section.querySelectorAll<HTMLImageElement>('img').forEach((image) => {
        const isLoaded = image.complete && image.naturalWidth > 0
        if (!isLoaded) {
          image.addEventListener('load', scheduleResize, { once: true })
          image.addEventListener('error', scheduleResize, { once: true })
        }
      })
    })
  }

  // ─── Initialization ────────────────────────────────────────────────────────

  function init() {
    initImageListeners()
    initLayoutReady()
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init)
  } else {
    init()
  }
})()
