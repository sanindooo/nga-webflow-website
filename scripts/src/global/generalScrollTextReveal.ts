/**
 * General Scroll Text Reveal
 *
 * Scroll-triggered SplitText word reveal for elements with [scroll-text-reveal].
 * Handles both direct text elements and elements with child nodes.
 * Dependencies: GSAP + ScrollTrigger + SplitText (via Webflow CDN toggle)
 */

;(function () {
  'use strict'

  const __s = ((window as any).__loadedScripts ??= {})
  if (__s['generalScrollTextReveal']) return
  __s['generalScrollTextReveal'] = true

  function setupTextReveals() {
    const textElements = document.querySelectorAll('[scroll-text-reveal]')
    if (textElements.length === 0) return

    textElements.forEach((element) => {
      if (element.children.length > 0) {
        const timeline = gsap.timeline()

        Array.from(element.children).forEach((child, index) => {
          const split = new SplitText(child, { types: 'lines', mask: 'lines' })
          // gsap.set(split.lines, { overflow: 'hidden' })
          timeline.fromTo(
            split.lines,
            { y: '110%' },
            {
              y: '0%',
              duration: 0.75,
              ease: 'power4.out',
              stagger: 0.05,
            },
            index * 0.75,
          )
        })

        ScrollTrigger.create({
          trigger: element,
          start: 'top 80%',
          end: 'bottom 20%',
          animation: timeline,
        })
      } else {
        const split = new SplitText(element, { types: 'lines', mask: 'lines' })
        // gsap.set(split.lines, { overflow: 'hidden' })

        ScrollTrigger.create({
          trigger: element,
          start: 'top 80%',
          end: 'bottom 20%',
          animation: gsap.fromTo(
            split.lines,
            { y: '110%' },
            {
              y: '0%',
              duration: 1,
              ease: 'power4.out',
              stagger: 0.15,
            },
          ),
        })
      }
    })
  }

  function init() {
    // layoutReady already waits for fonts — just use onLayoutReady
    if (typeof window.onLayoutReady === 'function') {
      window.onLayoutReady(setupTextReveals)
    } else {
      setupTextReveals()
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init)
  } else {
    init()
  }
})()
