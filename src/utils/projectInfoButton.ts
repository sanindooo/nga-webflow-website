export const projectInfoButton = () => {
  const button = document.querySelector<HTMLElement>('.hero-open_modal')
  if (!button) return

  const footer = document.querySelector<HTMLElement>('.footer')

  if (footer) {
    ScrollTrigger.create({
      trigger: footer,
      start: 'top bottom',
      end: 'bottom top',
      onToggle: (self: ScrollTriggerInstance) => {
        gsap.to(button, { autoAlpha: self.isActive ? 0 : 1, duration: 0.3 })
      },
    })
  }

  const figures = document.querySelectorAll<HTMLElement>('figure.dynamic-image_item')
  if (!figures.length) return

  const activeFigures = new Set<HTMLElement>()
  let evaluatePending = false

  const getButtonCenter = () => {
    const rect = button.getBoundingClientRect()
    return rect.top + rect.height / 2
  }

  // data-layout holds space-separated tokens from "Image N - Settings",
  // e.g. "w-1/2 full-height right". data-alignment is the pre-2026-10 markup,
  // kept so this bundle also works against the last published template.
  const coversRight = (figure: HTMLElement): boolean => {
    const layoutTokens = (figure.getAttribute('data-layout') || '').split(/\s+/)
    if (layoutTokens.includes('w-full') || layoutTokens.includes('right')) return true
    return figure.getAttribute('data-alignment')?.toLowerCase() === 'right'
  }

  const evaluate = () => {
    if (activeFigures.size === 0) {
      button.classList.remove('is-dark')
      return
    }

    let anyCoversRight = false

    for (const figure of activeFigures) {
      if (coversRight(figure)) anyCoversRight = true
    }

    button.classList.toggle('is-dark', !anyCoversRight)
  }

  const scheduleEvaluate = () => {
    if (evaluatePending) return
    evaluatePending = true
    requestAnimationFrame(() => {
      evaluatePending = false
      evaluate()
    })
  }

  const mm = gsap.matchMedia()

  mm.add({ isDesktop: '(min-width: 768px)' }, () => {
    figures.forEach((figure) => {
      ScrollTrigger.create({
        trigger: figure,
        start: () => `top ${getButtonCenter()}`,
        end: () => `bottom ${getButtonCenter()}`,
        onToggle: (self: ScrollTriggerInstance) => {
          if (self.isActive) activeFigures.add(figure)
          else activeFigures.delete(figure)
          scheduleEvaluate()
        },
      })
    })
  })
}
