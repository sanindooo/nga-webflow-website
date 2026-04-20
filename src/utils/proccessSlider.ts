/**
 * Process Slider
 *
 * Pinned process slider with staggered title/number/paragraph reveals.
 * Each step = transition animation + hold pause before the next one.
 */

const TRANSITION_DURATION = 0.45
const HOLD_DURATION = 1.5
const SCROLL_PX_PER_SECTION = 600

const getTitle = (section: HTMLElement) =>
  section.querySelector<HTMLElement>('h3.benefit-card_title')
const getNumber = (section: HTMLElement) =>
  section.querySelector<HTMLElement>('p.process-slider_number')
const getParagraph = (section: HTMLElement) =>
  section.querySelector<HTMLElement>('.benefit-card_body p')
const getFigure = (section: HTMLElement) =>
  section.querySelector<HTMLElement>('.process-slider_figure')

export const proccessSlider = () => {
  const wrapper = document.querySelector<HTMLElement>('.process-card_wrapper')
  if (!wrapper) return

  const sections = Array.from(wrapper.querySelectorAll<HTMLElement>('.process-slider_component'))
  if (sections.length < 2) return

  gsap.set(wrapper, { position: 'relative' })

  sections.forEach((section, sectionIndex) => {
    gsap.set(section, {
      backgroundColor: 'transparent',
      zIndex: sections.length - sectionIndex,
    })

    const figure = getFigure(section)
    const title = getTitle(section)
    const number = getNumber(section)
    const paragraph = getParagraph(section)

    if (title?.parentElement) gsap.set(title.parentElement, { overflow: 'hidden' })
    if (number?.parentElement) gsap.set(number.parentElement, { overflow: 'hidden' })
    if (paragraph?.parentElement) gsap.set(paragraph.parentElement, { overflow: 'hidden' })

    if (sectionIndex === 0) return

    if (title) gsap.set(title, { yPercent: 100 })
    if (number) gsap.set(number, { yPercent: 120 })
    if (paragraph) gsap.set(paragraph, { yPercent: 100 })

    void figure
  })

  const timeline = gsap.timeline()
  const stepDuration = TRANSITION_DURATION + HOLD_DURATION

  sections.slice(1).forEach((incomingSection, relativeIndex) => {
    const outgoingSection = sections[relativeIndex]
    const timeOffset = relativeIndex * stepDuration

    const outFigure = getFigure(outgoingSection)
    const outTitle = getTitle(outgoingSection)
    const outNumber = getNumber(outgoingSection)
    const outParagraph = getParagraph(outgoingSection)

    const inTitle = getTitle(incomingSection)
    const inNumber = getNumber(incomingSection)
    const inParagraph = getParagraph(incomingSection)

    if (outFigure)
      timeline.to(
        outFigure,
        { clipPath: 'inset(0 0 100% 0)', duration: TRANSITION_DURATION, ease: 'power2.inOut' },
        timeOffset,
      )

    if (outTitle)
      timeline.to(
        outTitle,
        { yPercent: -100, duration: TRANSITION_DURATION, ease: 'power2.inOut' },
        timeOffset,
      )
    if (outNumber)
      timeline.to(
        outNumber,
        { yPercent: -120, duration: TRANSITION_DURATION, ease: 'power2.inOut' },
        timeOffset,
      )
    if (outParagraph)
      timeline.to(
        outParagraph,
        { yPercent: -100, duration: TRANSITION_DURATION, ease: 'power2.inOut' },
        timeOffset,
      )

    if (inTitle)
      timeline.to(
        inTitle,
        { yPercent: 0, duration: TRANSITION_DURATION, ease: 'power2.inOut' },
        timeOffset,
      )
    if (inNumber)
      timeline.to(
        inNumber,
        { yPercent: 0, duration: TRANSITION_DURATION, ease: 'power2.inOut' },
        timeOffset,
      )
    if (inParagraph)
      timeline.to(
        inParagraph,
        { yPercent: 0, duration: TRANSITION_DURATION, ease: 'power2.inOut' },
        timeOffset,
      )
  })

  ScrollTrigger.create({
    trigger: wrapper,
    pin: true,
    markers: false,
    animation: timeline,
    scrub: true,
    end: `+=${sections.length * SCROLL_PX_PER_SECTION}`,
  })
}
