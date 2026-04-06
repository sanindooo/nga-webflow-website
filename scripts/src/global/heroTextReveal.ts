/**
 * Hero Text Reveal
 *
 * SplitText word-by-word reveal animation for the hero heading.
 * Targets .heading-style-h1.hero_title elements.
 * Dependencies: GSAP + SplitText (via Webflow CDN toggle)
 */

;(function () {
  'use strict'

  const __s = ((window as any).__loadedScripts ??= {})
  if (__s['heroTextReveal']) return; __s['heroTextReveal'] = true

  document.addEventListener('DOMContentLoaded', () => {
    gsap.registerPlugin(SplitText)

    const heroText = document.querySelector(
      '.heading-style-h1.hero_title',
    ) as HTMLElement

    if (!heroText) return

    const split = new SplitText(heroText, { types: 'words, lines' })
    gsap.set(split.lines, { overflow: 'hidden' })
    gsap.fromTo(
      split.words,
      { y: '110%' },
      {
        y: '0%',
        duration: 1,
        ease: 'power4.out',
        stagger: 0.05,
      },
    )
  })
})()
