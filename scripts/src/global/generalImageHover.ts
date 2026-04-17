/**
 * General Image Hover Scale
 *
 * Any <img> (or element) with [hover-scale="true"] scales up on hover.
 * The parent element gets overflow:hidden so the scale stays clipped.
 * Dependencies: GSAP (via CDN)
 */

;(function () {
  'use strict'

  const __s = ((window as any).__loadedScripts ??= {})
  if (__s['generalImageHover']) return
  __s['generalImageHover'] = true

  function init() {
    // debugger
    const images = Array.from(document.querySelectorAll<HTMLElement>('[hover-scale="true"]'))
    console.log(images)
    if (images.length === 0) return

    images.forEach((image) => {
      const parentElement = image.parentElement
      if (parentElement) {
        gsap.set(parentElement, { overflow: 'hidden' })
      }

      image.parentElement!.addEventListener('mouseenter', () => {
        console.log('hovering image')
        gsap.to(image, { scale: 1.1, duration: 0.5, ease: 'power2.out' })
      })

      image.parentElement!.addEventListener('mouseleave', () => {
        console.log('left image')
        gsap.to(image, { scale: 1, duration: 0.5, ease: 'power2.out' })
      })
    })
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init)
  } else {
    init()
  }
})()
