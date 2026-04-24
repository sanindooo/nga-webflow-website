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

    gsap.set(section, { position: 'relative', zIndex: sectionIndex + 1 })

    const split = new SplitText(titleWrapper.querySelector('h2')!, {
      types: 'words, lines',
      wordsClass: 'sticky-word',
    })
    const arrow = titleWrapper.querySelector<HTMLElement>('.right-arrow_svg')
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
      start: 'top 10%',
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
  const lastSection = sections[sections.length - 1]
  const lastTitleWrapper = lastSection.querySelector<HTMLElement>('.sticky-text_header')
  ScrollTrigger.create({
    trigger: lastSection,
    start: '50% top',
    animation: gsap.to(lastTitleWrapper, {
      opacity: 0,
      duration: 1,
    }),
    // scrub: true,
    markers: true,
    toggleActions: 'play none none reverse',
  })
}
