/**
 * Hero Text Reveal
 *
 * SplitText word-by-word reveal animation for the hero heading.
 * Targets .heading-style-h1.hero_title elements (not sliders).
 * Uses autoSplit:true so line breaks re-resolve after font swap / resize.
 *
 * Optional `additionalSelectors` reveals other hero elements (CTAs, badges,
 * etc.) in the same timeline so they stay in sync with the text intro.
 */

export const heroTextReveal = (additionalSelectors: string[] = []) => {
  const heroText = document.querySelector<HTMLElement>(
    '.heading-style-h1.hero_title:not(.is-slider)',
  )
  if (!heroText) return

  const additionalElements = additionalSelectors.flatMap((selector) =>
    Array.from(document.querySelectorAll<HTMLElement>(selector)),
  )

  new SplitText(heroText, {
    types: 'words, lines',
    mask: 'lines',
    autoSplit: true,
    onSplit: (self: SplitTypeInstance) => {
      const timeline = gsap.timeline()

      timeline.fromTo(
        self.words,
        { y: '110%' },
        {
          y: '0%',
          duration: 1,
          ease: 'power4.out',
          stagger: 0.05,
        },
      )

      if (additionalElements.length) {
        timeline.fromTo(
          additionalElements,
          { y: '110%', opacity: 0 },
          {
            y: '0%',
            opacity: 1,
            duration: 1,
            ease: 'power4.out',
            stagger: 0.05,
          },
          '-=0.6',
        )
      }

      return timeline
    },
  })
}
