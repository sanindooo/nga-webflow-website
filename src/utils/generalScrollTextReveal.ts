/**
 * General Scroll Text Reveal
 *
 * Scroll-triggered SplitText line reveal for elements with [scroll-text-reveal].
 * Handles both direct text elements and elements with child nodes (each child
 * becomes its own line group, staggered by index).
 *
 * Waits for document.fonts.ready before splitting so SplitText measures against
 * the final webfont, then ScrollTrigger.refresh() (inside a rAF so layout has
 * committed) re-aligns every trigger on the page. Combined with the body-level
 * ResizeObserver in gsapSmoothScroll, late autoSplit resplits / layout drift
 * can no longer leave triggers holding stale positions.
 */

export const generalScrollTextReveal = () => {
  const textElements = document.querySelectorAll<HTMLElement>('[scroll-text-reveal]')
  if (textElements.length === 0) return

  // Pre-hide buttons synchronously so they aren't visible during the gap
  // before fonts.ready resolves. SplitText is skipped for buttons because its
  // mask:'lines' wrappers would split buttonIconHover's original/clone spans
  // into separate line masks and break the hover overlay.
  textElements.forEach((element) => {
    if (element.querySelector('.button-square')) {
      element.style.overflow = 'hidden'
      gsap.set(element.children, { y: element.offsetHeight })
    }
  })

  document.fonts.ready.then(() => {
    textElements.forEach((element) => {
      const scrollTrigger = {
        trigger: element,
        start: 'top 80%',
        end: 'bottom 20%',
      }

      if (element.querySelector('.button-square')) {
        gsap.fromTo(
          element.children,
          { y: element.offsetHeight },
          {
            y: 0,
            duration: 0.75,
            ease: 'power4.out',
            stagger: 0.05,
            scrollTrigger,
          },
        )
        return
      }

      if (element.children.length > 0) {
        Array.from(element.children).forEach((child, index) => {
          new SplitText(child as HTMLElement, {
            types: 'lines',
            mask: 'lines',
            autoSplit: true,
            onSplit: (self: SplitTypeInstance) => {
              return gsap.fromTo(
                self.lines,
                { y: '110%' },
                {
                  y: '0%',
                  duration: 0.75,
                  ease: 'power4.out',
                  stagger: 0.05,
                  delay: index * 0.75,
                  scrollTrigger,
                },
              )
            },
          })
        })
      } else {
        new SplitText(element, {
          types: 'lines',
          mask: 'lines',
          autoSplit: true,
          onSplit: (self: SplitTypeInstance) => {
            return gsap.fromTo(
              self.lines,
              { y: '110%' },
              {
                y: '0%',
                duration: 1,
                ease: 'power4.out',
                stagger: 0.15,
                scrollTrigger,
              },
            )
          },
        })
      }
    })
    requestAnimationFrame(() => ScrollTrigger.refresh(true))
  })
}
