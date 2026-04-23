/**
 * GSAP Smooth Scroll (Lenis)
 *
 * Desktop: Lenis smooth scrolling with GSAP ticker integration.
 * Mobile: Native scroll only — touch devices already have smooth momentum
 * scrolling, and Lenis can interfere with ScrollTrigger's position calculations.
 *
 * Layered defenses against stale ScrollTrigger positions from late layout
 * shifts (image loads, font swaps, CMS hydration, accordions):
 *   1. body ResizeObserver — catches DOM-driven height changes invisible to
 *      ScrollTrigger's built-in autoRefreshEvents (resize / load / DCL).
 *   2. window.load — canonical "all external resources finished" hook for
 *      the final image that resolves after DOMContentLoaded.
 *   3. per-image load listener — catches lazy-loaded images individually so
 *      refresh fires as each finishes, not only after all complete.
 */

let lenisInstance: LenisInstance | null = null

export const stopSmoothScroll = () => lenisInstance?.stop()
export const startSmoothScroll = () => lenisInstance?.start()

export const gsapSmoothScroll = () => {
  ScrollTrigger.config({ ignoreMobileResize: true })

  const isTouch = ScrollTrigger.isTouch

  if (isTouch) {
    // Mobile: skip Lenis, use native scroll. ScrollTrigger works with native
    // scroll events directly — no special integration needed.

    let pending = false
    let lastHeight = document.body.offsetHeight
    const refreshOnBodyResize = new ResizeObserver(() => {
      const height = document.body.offsetHeight
      if (height === lastHeight || pending) return
      lastHeight = height
      pending = true
      requestAnimationFrame(() => {
        ScrollTrigger.refresh(true)
        pending = false
      })
    })
    refreshOnBodyResize.observe(document.body)

    window.addEventListener('load', () => ScrollTrigger.refresh(true), { once: true })

    document.querySelectorAll('img').forEach((img) => {
      if (img.complete && img.naturalWidth > 0) return
      img.addEventListener('load', () => ScrollTrigger.refresh(true), { once: true })
    })
  } else {
    // Desktop: Lenis smooth scrolling
    const lenis = new Lenis({
      prevent: (node: HTMLElement) => node.getAttribute('data-prevent-lenis') === 'true',
    })

    lenisInstance = lenis

    lenis.on('scroll', ScrollTrigger.update)

    gsap.ticker.add((time: number) => {
      lenis.raf(time * 1000)
    })

    gsap.ticker.lagSmoothing(0)

    let pending = false
    let lastHeight = document.body.offsetHeight
    const refreshOnBodyResize = new ResizeObserver(() => {
      const height = document.body.offsetHeight
      if (height === lastHeight || pending) return
      lastHeight = height
      pending = true
      requestAnimationFrame(() => {
        ScrollTrigger.refresh(true)
        pending = false
      })
    })
    refreshOnBodyResize.observe(document.body)

    window.addEventListener('load', () => ScrollTrigger.refresh(), { once: true })

    document.querySelectorAll('img').forEach((img) => {
      if (img.complete && img.naturalWidth > 0) return
      img.addEventListener('load', () => ScrollTrigger.refresh(), { once: true })
    })
  }
}
