/**
 * GSAP Smooth Scroll (ScrollSmoother)
 *
 * Replaces the previous Lenis-based smooth scroll. ScrollSmoother is GSAP's
 * own smooth-scroll plugin and shares ScrollTrigger's internal scroll model —
 * no separate cache, no `lenis.on('scroll', ScrollTrigger.update)` integration,
 * no manual `lenis.resize()` sync. ScrollTrigger reads scroll position from
 * ScrollSmoother directly.
 *
 * Auto-wrap mode: ScrollSmoother creates `<div id="smooth-wrapper">
 * <div id="smooth-content">…</div></div>` around body content and applies
 * `position: fixed` + `transform` to the wrapper. Body gets `overflow: hidden`.
 * Side effect: any `position: fixed` element inside content (Webflow nav,
 * w-webflow-badge, modal overlays) becomes fixed-to-content rather than
 * fixed-to-viewport. Pin those via ScrollTrigger or restructure DOM if needed.
 *
 * Touch (mobile): smoothTouch:false — native momentum scrolling preserved.
 *
 * Refresh hooks below catch post-init layout shifts that ScrollTrigger's
 * built-in autoRefreshEvents don't cover (CMS hydration, font swaps,
 * accordion expand) and bfcache restoration.
 */

let smootherInstance: ScrollSmootherInstance | null = null

export const stopSmoothScroll = () => smootherInstance?.paused(true)
export const startSmoothScroll = () => smootherInstance?.paused(false)
export const getSmoother = (): ScrollSmootherInstance | null => smootherInstance

export const gsapSmoothScroll = () => {
  ScrollTrigger.config({ ignoreMobileResize: true })

  // Defensive registration — CDN-loaded plugins usually auto-register, but
  // calling registerPlugin is idempotent and prevents silent failures if the
  // CDN load order shifts.
  gsap.registerPlugin(ScrollSmoother)

  smootherInstance = ScrollSmoother.create({
    smooth: 1.2,
    effects: true,
    smoothTouch: false,
    normalizeScroll: true,
  })

  // Body ResizeObserver — fires on DOM-driven height changes invisible to
  // ScrollTrigger's built-in autoRefreshEvents (CMS hydration, accordion).
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

  // bfcache restore (Safari/Chrome back-forward navigation). DOMContentLoaded
  // and load do NOT re-fire on bfcache restore — only pageshow with
  // event.persisted === true.
  window.addEventListener('pageshow', (event) => {
    if (event.persisted) ScrollTrigger.refresh(true)
  })
}
