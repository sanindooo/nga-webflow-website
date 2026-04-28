/**
 * Nav Theme — switches nav logo and hamburger line colors based on the section
 * currently scrolling behind the fixed header.
 *
 * Default (white) theme is for dark-background sections.
 * Sections with `data-header-theme="dark"` trigger the dark (#012C72) theme.
 *
 * Technique: a fixed dark overlay containing clones of the logo wrapper and
 * hamburger lines is placed over the real elements. A `mask-image` gradient,
 * recomputed every rAF tick, reveals only the portion of the overlay that
 * overlaps with dark-theme sections.
 */

const DARK_COLOR = '#012C72'

export const navTheme = () => {
  const headerElement = document.querySelector<HTMLElement>('.header')
  if (headerElement?.getAttribute('data-wf--main-nav--variant') === 'white-bg') return
  const logoWrapper = document.querySelector<HTMLElement>('.nav-custom_logo')
  const hamburgerToggle = document.querySelector<HTMLElement>('.nav-custom_toggle')
  const darkThemeSections = Array.from(
    document.querySelectorAll<HTMLElement>("[data-header-theme='dark']"),
  )
  const whiteThemeSections = Array.from(
    document.querySelectorAll<HTMLElement>("[data-header-theme='white']"),
  )

  if (!headerElement || !logoWrapper || !hamburgerToggle) return
  if (darkThemeSections.length === 0) return

  const darkOverlay = document.createElement('div')
  darkOverlay.setAttribute('aria-hidden', 'true')
  headerElement.classList.forEach((cls) => darkOverlay.classList.add(cls))
  Object.assign(darkOverlay.style, {
    position: 'fixed',
    top: '0',
    left: '0',
    right: '0',
    height: `${headerElement.offsetHeight}px`,
    pointerEvents: 'none',
    zIndex: '9999',
  })

  const logoClone = logoWrapper.cloneNode(true) as HTMLElement
  Object.assign(logoClone.style, {
    position: 'absolute',
    margin: '0',
    padding: '9px 0 0',
    overflow: 'visible',
    color: DARK_COLOR,
  })
  darkOverlay.appendChild(logoClone)

  const toggleClone = hamburgerToggle.cloneNode(true) as HTMLElement
  Object.assign(toggleClone.style, {
    position: 'absolute',
    margin: '0',
  })
  toggleClone.querySelectorAll<HTMLElement>('.nav-custom_line').forEach((line) => {
    line.style.backgroundColor = DARK_COLOR
  })
  darkOverlay.appendChild(toggleClone)

  document.body.appendChild(darkOverlay)

  let navHeight = headerElement.offsetHeight

  const syncClonePositions = () => {
    navHeight = headerElement.offsetHeight
    darkOverlay.style.height = `${navHeight}px`

    const logoRect = logoWrapper.getBoundingClientRect()
    Object.assign(logoClone.style, {
      top: `${logoRect.top}px`,
      left: `${logoRect.left}px`,
      width: `${logoRect.width}px`,
      height: `${logoRect.height}px`,
    })

    const toggleRect = hamburgerToggle.getBoundingClientRect()
    Object.assign(toggleClone.style, {
      top: `${toggleRect.top}px`,
      left: `${toggleRect.left}px`,
      width: `${toggleRect.width}px`,
      height: `${toggleRect.height}px`,
    })
  }

  const subtractIntervals = (
    darks: Array<{ start: number; end: number }>,
    whites: Array<{ start: number; end: number }>,
  ): Array<{ start: number; end: number }> => {
    if (whites.length === 0) return darks
    const result: Array<{ start: number; end: number }> = []
    for (const dark of darks) {
      let segments = [{ start: dark.start, end: dark.end }]
      for (const white of whites) {
        const next: Array<{ start: number; end: number }> = []
        for (const seg of segments) {
          if (white.end <= seg.start || white.start >= seg.end) {
            next.push(seg)
          } else {
            if (white.start > seg.start) next.push({ start: seg.start, end: white.start })
            if (white.end < seg.end) next.push({ start: white.end, end: seg.end })
          }
        }
        segments = next
      }
      result.push(...segments)
    }
    return result
  }

  const buildMaskGradient = (intervals: Array<{ start: number; end: number }>): string => {
    if (intervals.length === 0) {
      return 'linear-gradient(transparent, transparent)'
    }

    const sorted = [...intervals].sort((intervalA, intervalB) => intervalA.start - intervalB.start)
    const stops: string[] = []
    let cursor = 0

    for (const { start, end } of sorted) {
      if (start > cursor) {
        stops.push(`transparent ${cursor}px`, `transparent ${start}px`)
      }
      stops.push(`black ${start}px`, `black ${end}px`)
      cursor = end
    }

    if (cursor < navHeight) {
      stops.push(`transparent ${cursor}px`, `transparent ${navHeight}px`)
    }

    return `linear-gradient(to bottom, ${stops.join(', ')})`
  }

  let lastScrollY = -1
  let lastGradient = ''

  const updateMask = () => {
    if (headerElement.classList.contains('is-nav-open')) return

    const currentScrollY = window.scrollY
    if (currentScrollY === lastScrollY) return
    lastScrollY = currentScrollY

    const darkIntervals: Array<{ start: number; end: number }> = []
    for (const section of darkThemeSections) {
      const rect = section.getBoundingClientRect()
      const intervalStart = Math.max(0, Math.min(rect.top, navHeight))
      const intervalEnd = Math.max(0, Math.min(rect.bottom, navHeight))
      if (intervalEnd > intervalStart) {
        darkIntervals.push({ start: intervalStart, end: intervalEnd })
      }
    }

    const whiteIntervals: Array<{ start: number; end: number }> = []
    for (const section of whiteThemeSections) {
      const rect = section.getBoundingClientRect()
      const intervalStart = Math.max(0, Math.min(rect.top, navHeight))
      const intervalEnd = Math.max(0, Math.min(rect.bottom, navHeight))
      if (intervalEnd > intervalStart) {
        whiteIntervals.push({ start: intervalStart, end: intervalEnd })
      }
    }

    const coverageIntervals = subtractIntervals(darkIntervals, whiteIntervals)
    const gradient = buildMaskGradient(coverageIntervals)

    if (gradient === lastGradient) return
    lastGradient = gradient

    darkOverlay.style.maskImage = gradient
    ;(darkOverlay.style as CSSStyleDeclaration & { webkitMaskImage?: string }).webkitMaskImage =
      gradient
  }

  const isMobile = () => window.matchMedia('(max-width: 767px)').matches

  const navOpenObserver = new MutationObserver(() => {
    const isOpen = headerElement.classList.contains('is-nav-open')
    if (isOpen) {
      toggleClone.style.transition = 'none'
      toggleClone.style.opacity = '0'
      toggleClone.style.display = 'none'
      // hide the logo clone as well
      if (isMobile()) {
        logoClone.style.transition = 'none'
        logoClone.style.opacity = '0'
        logoClone.style.display = 'none'
      }
    } else {
      toggleClone.style.display = ''
      void toggleClone.offsetHeight
      toggleClone.style.transition = 'opacity 0.4s ease'
      toggleClone.style.opacity = '1'
      // show the logo clone as well
      if (isMobile()) {
        logoClone.style.display = ''
        void logoClone.offsetHeight
        logoClone.style.transition = 'opacity 0.4s ease'
        logoClone.style.opacity = '1'
      }
    }
  })

  navOpenObserver.observe(headerElement, {
    attributes: true,
    attributeFilter: ['class'],
  })

  syncClonePositions()
  updateMask()

  const tick = () => {
    updateMask()
    requestAnimationFrame(tick)
  }
  requestAnimationFrame(tick)

  window.addEventListener(
    'resize',
    () => {
      syncClonePositions()
      updateMask()
    },
    { passive: true },
  )
}
