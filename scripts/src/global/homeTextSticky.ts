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

  function init() {
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

      const tl = gsap.timeline()

      tl.to(split.words, {
        y: '0%',
      }).to(
        arrow,
        {
          y: '0%',
        },
        '-=.25',
      )

      ScrollTrigger.create({
        trigger: section,
        start: 'top top',
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

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init)
  } else {
    init()
  }
})()
