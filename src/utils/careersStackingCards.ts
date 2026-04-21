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

    const textElements = section.querySelectorAll<HTMLElement>('h1, h2, h3, h4, h5, h6, p')
    if (textElements.length) gsap.set(textElements, { autoAlpha: 0, y: 16 })
  })

  const tl = gsap.timeline()

  // Each segment occupies 3 units: 1 unit of "hold" (nothing animates = user sees current card),
  // then 2 units for the actual transition. The gap creates the delay without any dummy tweens.
  const SEGMENT = 3
  sections.forEach((section, index) => {
    if (index === 0) return

    const t = (index - 1) * SEGMENT
    const prevOverlay = sections[index - 1].querySelector<HTMLElement>('.black-overlay')
    const figure = section.querySelector<HTMLElement>('.benefit-card_figure')
    const image = figure?.querySelector<HTMLElement>('img')
    const textElements = section.querySelectorAll<HTMLElement>('h1, h2, h3, h4, h5, h6, p')

    // Overlay fades in after the hold, during the slide
    if (prevOverlay) {
      tl.to(prevOverlay, { opacity: 0.6, ease: 'none', duration: 2 }, t + 1)
    }

    // Slide starts after 1-unit hold
    const slideStart = t + 1
    tl.to(section, { yPercent: 0, ease: 'power2.inOut', duration: 2 }, slideStart)

    // Content animations start at 50% of the slide
    const contentStart = slideStart + 1

    if (figure) {
      tl.to(figure, { clipPath: 'inset(0% 0% 0% 0%)', ease: 'none', duration: 0.6 }, contentStart)
    }

    if (image) {
      tl.to(image, { scale: 1, ease: 'power4.out', duration: 0.6 }, contentStart)
    }

    if (textElements.length) {
      tl.to(
        textElements,
        { autoAlpha: 1, y: 0, stagger: 0.06, ease: 'power2.out', duration: 0.4 },
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
