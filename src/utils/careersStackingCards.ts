/**
 * Careers Stacking Cards
 *
 * Pins .benefit-card_wrapper and sequences all card transitions in one scrubbed
 * timeline. Each card slides up (yPercent), its figure reveals via clip-path,
 * the image counter-scales, text elements fade in, and the previous card gets
 * a black overlay.
 */

export const careersStackingCards = () => {
  const wrapper = document.querySelector<HTMLElement>('.benefit-card_wrapper')
  const sections = document.querySelectorAll<HTMLElement>('.benefit-card_component')
  if (!wrapper || sections.length === 0) return

  // Setup: z-index, overlays, and initial hidden state for cards after the first
  sections.forEach((section, index) => {
    section.style.cssText = `top: 0; z-index: ${index + 1};`

    const blackOverlay = document.createElement('div')
    blackOverlay.classList.add('black-overlay')
    blackOverlay.style.cssText =
      'position: absolute; inset: 0; background: black; opacity: 0; pointer-events: none; z-index: 10;'
    section.appendChild(blackOverlay)

    if (index === 0) return

    gsap.set(section, { yPercent: 100 })

    const figure = section.querySelector<HTMLElement>('.benefit-card_figure')
    if (figure) {
      gsap.set(figure, { clipPath: 'inset(0% 0% 100% 0%)' })
      const image = figure.querySelector<HTMLElement>('img')
      if (image) gsap.set(image, { scale: 1.2 })
    }

    const textWrapper = section.querySelector<HTMLElement>('.benefit-card_meta')
    // const textElements = section.querySelectorAll<HTMLElement>('h1, h2, h3, h4, h5, h6, p')
    gsap.set(textWrapper, { overflow: 'hidden' })

    gsap.set(textWrapper?.querySelectorAll<HTMLElement>('& > *'), { yPercent: 100 })
  })

  const tl = gsap.timeline()

  // Each segment occupies 3 units: HOLD units of pause (user sees current card),
  // then the remaining units for the actual transition.
  // Smaller HOLD = transition kicks in sooner after pinning (less "dead scroll").
  const SEGMENT = 5
  const HOLD = 0.4 // reduced from 1 so users see motion quickly after the pin
  sections.forEach((section, index) => {
    if (index === 0) return

    const t = (index - 1) * SEGMENT
    const prevOverlay = sections[index - 1].querySelector<HTMLElement>('.black-overlay')
    const figure = section.querySelector<HTMLElement>('.benefit-card_figure')
    const image = figure?.querySelector<HTMLElement>('img')
    // const textElements = section.querySelectorAll<HTMLElement>('h1, h2, h3, h4, h5, h6, p')
    const textWrapper = section.querySelector<HTMLElement>('.benefit-card_meta')

    // Overlay fades in after the hold, during the slide
    if (prevOverlay) {
      tl.to(prevOverlay, { opacity: 0.6, ease: 'none', duration: SEGMENT }, t + HOLD)
    }

    // Slide starts after hold
    const slideStart = t + HOLD
    tl.to(section, { yPercent: 0, ease: 'power2.inOut', duration: SEGMENT }, slideStart)

    // Content animations start at 50% of the slide
    const contentStart = slideStart + 3

    if (figure) {
      // duration 1 (was 0.6) = slower clip-path reveal across more scroll travel
      tl.to(figure, { clipPath: 'inset(0% 0% 0% 0%)', ease: 'none', duration: 1 }, contentStart)
    }

    if (image) {
      tl.to(image, { scale: 1, ease: 'power4.out', duration: 1 }, contentStart)
    }

    if (textWrapper && textWrapper.children.length) {
      tl.to(
        textWrapper?.querySelectorAll('& > *'),
        { yPercent: 0, stagger: 0.06, ease: 'power2.out', duration: 0.6 },
        contentStart,
      )
    }
  })

  ScrollTrigger.create({
    trigger: wrapper,
    start: 'top top',
    end: `+=${(sections.length - 1) * SEGMENT * window.innerHeight * 0.4}`,
    pin: true,
    pinSpacing: true,
    animation: tl,
    scrub: true,
  })
}
