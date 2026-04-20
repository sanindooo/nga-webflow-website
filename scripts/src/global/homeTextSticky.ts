/**
 * Home Sticky Text
 *
 * Pins each .sticky-text_component title wrapper while its parent
 * .section_sticky-text scrolls through the viewport. Transitions
 * between sections with a scrubbed fade + slide — old title out,
 * new title in — so the handoff is smooth even on adjacent sections.
 * Dependencies: GSAP, ScrollTrigger (via CDN)
 */

;(function () {
  'use strict'

  const __s = ((window as any).__loadedScripts ??= {})
  if (__s['homeTextSticky']) return
  __s['homeTextSticky'] = true

  function setupStickyText() {
    const sections = Array.from(document.querySelectorAll<HTMLElement>('.section_sticky-text'))
    if (sections.length === 0) return

    sections.forEach((section, i) => {
      const titleWrapper = section.querySelector<HTMLElement>('.sticky-text_component')
      if (!titleWrapper) return
      gsap.set(section, { position: 'relative', zIndex: i + 1 })
      // Keep the title pinned to the top of the viewport for the full
      // scroll duration of its parent section.
      // pinSpacing: false — the section itself already has the required height.

      const split = new SplitText(titleWrapper.querySelector('h2')!, { types: 'words, lines' })
      const arrow = titleWrapper.querySelector('.right-arrow_svg')
      gsap.set([split.lines, arrow?.parentElement], { overflow: 'hidden' })
      gsap.set([split.words, arrow], { y: '110%' })

      let arrowVisible = false

      titleWrapper.addEventListener('mouseenter', () => {
        if (!arrowVisible) return
        gsap.to(arrow, { y: '0%', duration: 0.4, ease: 'power2.out' })
      })

      titleWrapper.addEventListener('mouseleave', () => {
        if (!arrowVisible) return
        gsap.to(arrow, { y: '110%', duration: 0.4, ease: 'power2.in' })
      })

      const tl = gsap.timeline()

      tl.to(split.words, {
        y: '0%',
        stagger: 0.1,
        onComplete: () => {
          arrowVisible = true
        },
      })

      ScrollTrigger.create({
        trigger: section,
        start: 'top 5%',
        end: 'bottom top',
        pin: titleWrapper,
        pinSpacing: false,
      })
      ScrollTrigger.create({
        trigger: section,
        start: 'top 2%',
        end: 'bottom top',
        markers: false,
        animation: tl,
      })
    })
  }

  function init() {
    if (typeof window.onLayoutReady === 'function') {
      window.onLayoutReady(setupStickyText)
    } else {
      setupStickyText()
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init)
  } else {
    init()
  }
})()
