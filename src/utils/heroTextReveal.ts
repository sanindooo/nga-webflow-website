/**
 * Hero Text Reveal
 *
 * SplitText word-by-word reveal animation for the hero heading.
 * Targets .heading-style-h1.hero_title elements (not sliders).
 * Uses autoSplit:true so line breaks re-resolve after font swap / resize.
 */

export const heroTextReveal = () => {
  const heroText = document.querySelector<HTMLElement>(
    '.heading-style-h1.hero_title:not(.is-slider)',
  )
  if (!heroText) return

  new SplitText(heroText, {
    types: 'words, lines',
    mask: 'lines',
    autoSplit: true,
    onSplit: (self: SplitTypeInstance) => {
      return gsap.fromTo(
        self.words,
        { y: '110%' },
        {
          y: '0%',
          duration: 1,
          ease: 'power4.out',
          stagger: 0.05,
        },
      )
    },
  })
}
