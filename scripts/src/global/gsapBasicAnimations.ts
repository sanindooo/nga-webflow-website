/**
 * GSAP Basic Animations
 *
 * Batch scroll-reveal animations for .slide-in and .fade-in elements.
 * Dependencies: GSAP, ScrollTrigger (via CDN)
 */

;(function () {
  'use strict'

  const __s = ((window as any).__loadedScripts ??= {});
  if (__s['gsapBasicAnimations']) return; __s['gsapBasicAnimations'] = true;

  function init() {
    gsap.set('.slide-in', { y: 25, opacity: 0 })
    ScrollTrigger.batch('.slide-in', {
      start: 'top bottom-=100px',
      onEnter: (batch: Element[]) => gsap.to(batch, { opacity: 1, y: 0, duration: 1 }),
    })

    gsap.set('.fade-in', { opacity: 0 })
    ScrollTrigger.batch('.fade-in', {
      start: 'top bottom-=100px',
      onEnter: (batch: Element[]) => gsap.to(batch, { opacity: 1, duration: 1 }),
    })
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init)
  } else {
    init()
  }
})()
