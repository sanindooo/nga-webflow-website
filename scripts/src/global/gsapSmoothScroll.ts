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
  // creating triggers. The coordination mechanism (window.onLayoutReady) is
  // initialized by an inline script in <head> BEFORE any CDN scripts load.
  // This script just fires the event when Lenis + fonts are ready.

  function fireLayoutReady() {
    lenis.resize()
    ScrollTrigger.refresh()
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
