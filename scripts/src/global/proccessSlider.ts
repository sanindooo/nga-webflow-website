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

  function buildTransition(
    incomingSection: HTMLElement,
    totalSections: number,
    incomingIndex: number,
  ): GSAPTimeline {
    const incomingTitle = getTitle(incomingSection)
    const incomingNumber = getNumber(incomingSection)
    const incomingParagraph = getParagraph(incomingSection)
    const incomingFigure = getFigure(incomingSection)

    const transitionTimeline = gsap.timeline()

    // Reveal and bring incoming section above the current one
    transitionTimeline.set(incomingSection, { autoAlpha: 1, zIndex: totalSections + incomingIndex })

    // Incoming: title + number rotate in from above (unfold from top)
    transitionTimeline.fromTo(
      [incomingTitle, incomingNumber],
      { autoAlpha: 0, y: -24, rotateX: 40, transformOrigin: '50% 0%' },
      {
        autoAlpha: 1,
        y: 0,
        rotateX: 0,
        duration: TRANSITION_DURATION,
        ease: 'power2.out',
        transformOrigin: '50% 0%',
      },
      0,
    )

    // Incoming: paragraph + figure simple fade
    transitionTimeline.fromTo(
      [incomingParagraph, incomingFigure],
      { autoAlpha: 0 },
      {
        autoAlpha: 1,
        duration: TRANSITION_DURATION,
        ease: 'power2.out',
      },
      0,
    )

    return transitionTimeline
  }

  function init() {
    const wrapper = document.querySelector<HTMLElement>('.process-card_wrapper')
    if (!wrapper) return

    const sections = Array.from(wrapper.querySelectorAll<HTMLElement>('.process-slider_component'))
    if (sections.length < 2) return

    const totalSections = sections.length

    // Enable 3D perspective for rotateX animations
    gsap.set(wrapper, { perspective: 800 })

    // Set initial states — section 0 visible, rest hidden above
    sections.forEach((section, index) => {
      const title = getTitle(section)
      const number = getNumber(section)
      const paragraph = getParagraph(section)
      const figure = getFigure(section)

      if (index === 0) {
        gsap.set(section, { autoAlpha: 1, zIndex: totalSections })
        gsap.set([title, number], { autoAlpha: 1, y: 0, rotateX: 0 })
        gsap.set([paragraph, figure], { autoAlpha: 1 })
      } else {
        // Hide the section itself so DOM stacking order doesn't bleed through
        gsap.set(section, { autoAlpha: 0, zIndex: totalSections - index })
        gsap.set([title, number], { autoAlpha: 0, y: -24, rotateX: 40, transformOrigin: '50% 0%' })
        gsap.set([paragraph, figure], { autoAlpha: 0 })
      }
    })

    // Build master timeline: transition → hold → transition → hold ...
    const masterTimeline = gsap.timeline({ paused: true })

    sections.forEach((section, index) => {
      if (index === sections.length - 1) return

      const nextSection = sections[index + 1]

      masterTimeline.add(buildTransition(nextSection, totalSections, index + 1))

      // Hold the incoming section before the next transition
      if (index < sections.length - 2) {
        masterTimeline.to({}, { duration: HOLD_DURATION })
      }
    })

    // Pin wrapper and drive master timeline via scroll
    ScrollTrigger.create({
      trigger: wrapper,
      pin: true,
      anticipatePin: 1,
      start: 'top top',
      end: `+=${(totalSections - 1) * SCROLL_PX_PER_SECTION}`,
      scrub: 1.2,
      animation: masterTimeline,
    })
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init)
  } else {
    init()
  }
})()
