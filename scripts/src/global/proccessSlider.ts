;(function () {
  'use strict'

  // Dedup guard
  const loadedScripts = ((window as any).__loadedScripts ??= {})
  if (loadedScripts['processSlider']) return
  loadedScripts['processSlider'] = true

  // Duration constants
  const TRANSITION_DURATION = 0.45
  const HOLD_DURATION = 1.5
  const SCROLL_PX_PER_SECTION = 600

  function getTitle(section: HTMLElement) {
    return section.querySelector<HTMLElement>('h3.benefit-card_title')
  }
  function getNumber(section: HTMLElement) {
    return section.querySelector<HTMLElement>('p.process-slider_number')
  }
  function getParagraph(section: HTMLElement) {
    return section.querySelector<HTMLElement>('.benefit-card_body p')
  }
  function getFigure(section: HTMLElement) {
    return section.querySelector<HTMLElement>('.process-slider_figure')
  }

  function setupProcessSlider() {
    const gsap = (window as any).gsap
    const ScrollTrigger = (window as any).ScrollTrigger

    if (!gsap || !ScrollTrigger) return

    const wrapper = document.querySelector<HTMLElement>('.process-card_wrapper')
    if (!wrapper) return

    const sections = Array.from(wrapper.querySelectorAll<HTMLElement>('.process-slider_component'))
    if (sections.length < 2) return

    // ── Initial state ────────────────────────────────────────────────────────

    gsap.set(wrapper, { position: 'relative' })

    sections.forEach((section, sectionIndex) => {
      gsap.set(section, { backgroundColor: 'transparent', zIndex: sections.length - sectionIndex })

      const figure = getFigure(section)
      const title = getTitle(section)
      const number = getNumber(section)
      const paragraph = getParagraph(section)

      // Clip containers so yPercent slides are invisible when off-position
      if (title?.parentElement) gsap.set(title.parentElement, { overflow: 'hidden' })
      if (number?.parentElement) gsap.set(number.parentElement, { overflow: 'hidden' })
      if (paragraph?.parentElement) gsap.set(paragraph.parentElement, { overflow: 'hidden' })

      if (sectionIndex === 0) {
        // First section is fully visible — no offset needed
        return
      }

      // All subsequent sections: text content starts below, out of sight
      // Images sit at natural position — revealed when the section above clips out
      if (title) gsap.set(title, { yPercent: 100 })
      if (number) gsap.set(number, { yPercent: 120 })
      if (paragraph) gsap.set(paragraph, { yPercent: 100 })
    })

    // ── Build one sequential timeline for all transitions ────────────────────

    const timeline = gsap.timeline()
    // Each step = transition animation + hold pause before the next one
    const stepDuration = TRANSITION_DURATION + HOLD_DURATION

    sections.slice(1).forEach((incomingSection, relativeIndex) => {
      const outgoingSection = sections[relativeIndex]
      const timeOffset = relativeIndex * stepDuration

      const outFigure = getFigure(outgoingSection)
      const outTitle = getTitle(outgoingSection)
      const outNumber = getNumber(outgoingSection)
      const outParagraph = getParagraph(outgoingSection)

      const inFigure = getFigure(incomingSection)
      const inTitle = getTitle(incomingSection)
      const inNumber = getNumber(incomingSection)
      const inParagraph = getParagraph(incomingSection)

      // Outgoing image: clip from bottom to top, revealing the image stacked underneath
      if (outFigure)
        timeline.to(
          outFigure,
          { clipPath: 'inset(0 0 100% 0)', duration: TRANSITION_DURATION, ease: 'power2.inOut' },
          timeOffset,
        )

      // Outgoing text: slide up and off
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

      // Incoming image: already in position underneath — no animation needed
      // Incoming text: slide up into view from below
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

    // ── Single pinned ScrollTrigger driving the whole timeline ───────────────

    ScrollTrigger.create({
      trigger: wrapper,
      pin: true,
      markers: false,
      animation: timeline,
      scrub: true,
      end: `+=${sections.length * SCROLL_PX_PER_SECTION}`,
    })
  }

  function init() {
    if (typeof window.onLayoutReady === 'function') {
      window.onLayoutReady(setupProcessSlider)
    } else {
      setupProcessSlider()
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init)
  } else {
    init()
  }
})()
