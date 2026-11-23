/**
 * Lightbox Scroll Lock
 *
 * Pauses ScrollSmoother while a Webflow lightbox is open. Webflow only sets
 * overflow:hidden on <html>, which normalizeScroll ignores. It fires no open or
 * close event, so this watches the `w-lightbox-noscroll` class it toggles on
 * <html>. The class is removed after the close fade, so scrolling resumes then.
 *
 * Swipe: ScrollSmoother's nested-scroll handling stops horizontal touchmoves
 * before Webflow's swipe detection sees them. Until the lock, a drag still
 * changed image because normalizeScroll turned it into a click; pausing ends
 * that, so swipes are read here and passed to the lightbox arrows.
 */

import { startSmoothScroll, stopSmoothScroll } from '$utils/gsapSmoothScroll'

const MIN_SWIPE_DISTANCE = 40

export const lightboxScrollLock = () => {
  if (!document.querySelector('.w-lightbox')) return

  let isLocked = false

  new MutationObserver(() => {
    const isLightboxOpen = document.documentElement.classList.contains('w-lightbox-noscroll')
    if (isLightboxOpen === isLocked) return
    isLocked = isLightboxOpen
    if (isLightboxOpen) stopSmoothScroll()
    else startSmoothScroll()
  }).observe(document.documentElement, { attributes: true, attributeFilter: ['class'] })

  // Window capture runs before ScrollTrigger's own document capture listeners
  const listenerOptions = { capture: true, passive: true }
  let swipeStart: Touch | null = null

  window.addEventListener(
    'touchstart',
    (event) => {
      swipeStart = event.touches.length === 1 ? event.touches[0] : null
    },
    listenerOptions,
  )

  window.addEventListener(
    'touchend',
    (event) => {
      if (!isLocked || !swipeStart) return
      const lightboxContent = (event.target as Element).closest('.w-lightbox-content')
      const swipeEnd = event.changedTouches[0]
      const distanceX = swipeEnd.clientX - swipeStart.clientX
      const distanceY = swipeEnd.clientY - swipeStart.clientY
      const isHorizontal = Math.abs(distanceX) > Math.abs(distanceY) * 2
      if (!lightboxContent || !isHorizontal || Math.abs(distanceX) < MIN_SWIPE_DISTANCE) return
      const arrowSelector = distanceX < 0 ? '.w-lightbox-right' : '.w-lightbox-left'
      lightboxContent.querySelector<HTMLElement>(arrowSelector)?.click()
    },
    listenerOptions,
  )
}
