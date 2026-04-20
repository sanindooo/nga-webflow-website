/**
 * Home Sticky Text
 *
 * Pins each .sticky-text_component title wrapper while its parent
 * .section_sticky-text scrolls through the viewport. A word-by-word
 * SplitText reveal plays as the section enters.
 */

export const homeTextSticky = () => {
  const sections = Array.from(document.querySelectorAll<HTMLElement>('.section_sticky-text'))
  if (sections.length === 0) return

  sections.forEach((section, sectionIndex) => {
    const titleWrapper = section.querySelector<HTMLElement>('.sticky-text_component')
    if (!titleWrapper) return

    const heading = titleWrapper.querySelector<HTMLElement>('h2')
    if (!heading) return

    const arrow = titleWrapper.querySelector<HTMLElement>('.right-arrow_svg')
    const arrowParent = arrow?.parentElement ?? null

    gsap.set(section, { position: 'relative', zIndex: sectionIndex + 1 })
    if (arrowParent) gsap.set(arrowParent, { overflow: 'hidden' })
    if (arrow) gsap.set(arrow, { y: '110%' })

    let arrowVisible = false

    titleWrapper.addEventListener('mouseenter', () => {
      if (!arrowVisible || !arrow) return
      gsap.to(arrow, { y: '0%', duration: 0.4, ease: 'power2.out' })
    })

    titleWrapper.addEventListener('mouseleave', () => {
      if (!arrowVisible || !arrow) return
      gsap.to(arrow, { y: '110%', duration: 0.4, ease: 'power2.in' })
    })

    ScrollTrigger.create({
      trigger: section,
      start: 'top 5%',
      end: 'bottom top',
      pin: titleWrapper,
      pinSpacing: false,
    })

    new SplitText(heading, {
      types: 'words, lines',
      mask: 'lines',
      autoSplit: true,
      onSplit: (self: SplitTypeInstance) => {
        return gsap.fromTo(
          self.words,
          { y: '110%' },
          {
            y: '0%',
            stagger: 0.1,
            scrollTrigger: {
              trigger: section,
              start: 'top 2%',
              end: 'bottom top',
            },
            onComplete: () => {
              arrowVisible = true
            },
          },
        )
      },
    })
  })
}
