/**
 * Sticky Filter Hide/Show
 *
 * Hides the sticky filter bar on scroll down, reveals on scroll up.
 * Uses two ScrollTriggers: one to track sticky state, one for direction.
 * Targets .section_news-filter elements with position: sticky.
 * Dependencies: GSAP, ScrollTrigger (via Webflow CDN toggle)
 */

;(function () {
  'use strict'

  const __s = ((window as any).__loadedScripts ??= {})
  if (__s['stickyFilter']) return; __s['stickyFilter'] = true

  const el = document.querySelector<HTMLElement>('.section_news-filter')
  if (!el) return

  let hidden = false
  let stuck = false

  ScrollTrigger.create({
    trigger: el,
    start: 'top top',
    onEnter: () => { stuck = true },
    onLeaveBack: () => {
      stuck = false
      if (hidden) {
        hidden = false
        gsap.set(el, { y: '0%' })
      }
    },
  })

  ScrollTrigger.create({
    start: 'top top',
    end: 'max',
    onUpdate: (self: { direction: number }) => {
      if (!stuck) return
      const down = self.direction === 1

      if (down && !hidden) {
        hidden = true
        gsap.to(el, { y: '-100%', duration: 0.6, ease: 'power2.out' })
      } else if (!down && hidden) {
        hidden = false
        gsap.to(el, { y: '0%', duration: 0.6, ease: 'power2.out' })
      }
    },
  })
})()
