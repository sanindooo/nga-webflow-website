/**
 * GSAP Smooth Scroll (ScrollSmoother)
 *
 * Replaces the previous Lenis-based smooth scroll. ScrollSmoother is GSAP's
 * own smooth-scroll plugin and shares ScrollTrigger's internal scroll model —
 * no separate cache, no `lenis.on('scroll', ScrollTrigger.update)` integration,
 * no manual `lenis.resize()` sync. ScrollTrigger reads scroll position from
 * ScrollSmoother directly.
 *
 * Explicit wrapper structure: every page in the Webflow template has a main
 * wrapper carrying `id="smooth-content"`. ScrollSmoother finds it (rather
 * than auto-wrapping the entire body), creates `#smooth-wrapper` around it,
 * and applies `transform: translate3d(...)` to `#smooth-content` per frame.
 * Anything that needs to stay fixed to the viewport (Webflow nav,
 * w-webflow-badge, modal overlays) lives OUTSIDE `#smooth-content` as a
 * sibling of `#smooth-wrapper`, so native `position: fixed` resolves
 * against the viewport — no transformed-ancestor containing-block issue,
 * no reparent utility needed. The `[data-pin]` utility (scrollPin.ts) is
 * for elements that should stay inside `#smooth-content` and pin
 * temporarily (sticky-within-parent or scroll-range-pinned).
 *
 * Touch (mobile): smoothTouch:false — native momentum scrolling preserved.
 *
 * Refresh hooks below catch post-init layout shifts that ScrollTrigger's
 * built-in autoRefreshEvents don't cover (CMS hydration, font swaps,
 * accordion expand) and bfcache restoration.
 */

let smootherInstance: ScrollSmootherInstance | null = null

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

  // Content ResizeObserver — fires on DOM-driven height changes invisible to
  // ScrollTrigger's built-in autoRefreshEvents (CMS hydration, accordion).
  // Must observe #smooth-content, not document.body: under ScrollSmoother
  // the body has overflow: hidden and is height-locked to the viewport, so
  // body.offsetHeight no longer reflects scrollable content height. Content
  // height lives on the page's main wrapper (carrying id="smooth-content"
  // in the Webflow template), which is what ScrollSmoother transforms.
  const smoothContent = document.getElementById('smooth-content')
  if (smoothContent) {
    let pending = false
    let lastHeight = smoothContent.offsetHeight
    const refreshOnContentResize = new ResizeObserver(() => {
      const height = smoothContent.offsetHeight
      if (height === lastHeight || pending) return
      lastHeight = height
      pending = true
      requestAnimationFrame(() => {
        ScrollTrigger.refresh(true)
        pending = false
      })
    })
    refreshOnContentResize.observe(smoothContent)
  }

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
