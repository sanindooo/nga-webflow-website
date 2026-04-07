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
 * overlaps with dark-theme sections. This gives a pixel-perfect clip wipe:
 * stopping mid-scroll shows both colours simultaneously.
 */

;(function () {
  'use strict'

  const __s = ((window as any).__loadedScripts ??= {})
  if (__s['navTheme']) return
  __s['navTheme'] = true

  const DARK_COLOR = '#012C72'

  const initNavTheme = () => {
    const headerElement = document.querySelector<HTMLElement>('.header')
    const logoWrapper = document.querySelector<HTMLElement>('.nav-custom_logo')
    const hamburgerToggle = document.querySelector<HTMLElement>('.nav-custom_toggle')
    const darkThemeSections = Array.from(
      document.querySelectorAll<HTMLElement>("[data-header-theme='dark']"),
    )

    if (!headerElement || !logoWrapper || !hamburgerToggle) return
    if (darkThemeSections.length === 0) return
    // ── Build dark overlay container ────────────────────────────────────────

    const darkOverlay = document.createElement('div')
    darkOverlay.setAttribute('aria-hidden', 'true')
    // Mirror header classes so descendant CSS selectors (e.g. .header .nav-custom_logo)
    // continue to match inside the overlay.
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

    // Clone logo wrapper — SVG inherits color via currentColor from this element
    const logoClone = logoWrapper.cloneNode(true) as HTMLElement
    Object.assign(logoClone.style, {
      position: 'absolute',
      margin: '0',
      padding: '0',
      color: DARK_COLOR,
    })
    darkOverlay.appendChild(logoClone)

    // Clone hamburger toggle — set dark background on both lines
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

    // ── Position clones to exactly match their originals ─────────────────────

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

    // ── Mask gradient helpers ─────────────────────────────────────────────────

    /**
     * Builds a `linear-gradient(to bottom, ...)` string that is opaque (black)
     * only at the y-ranges where dark sections overlap the nav, transparent
     * everywhere else. CSS mask treats black as visible, transparent as hidden.
     */
    const buildMaskGradient = (intervals: Array<{ start: number; end: number }>): string => {
      if (intervals.length === 0) {
        return 'linear-gradient(transparent, transparent)'
      }

      const sorted = [...intervals].sort(
        (intervalA, intervalB) => intervalA.start - intervalB.start,
      )
      const stops: string[] = []
      let cursor = 0

      for (const { start, end } of sorted) {
        if (start > cursor) {
          // Gap before this interval — transparent (white nav shows)
          stops.push(`transparent ${cursor}px`, `transparent ${start}px`)
        }
        // Covered interval — opaque (dark overlay shows)
        stops.push(`black ${start}px`, `black ${end}px`)
        cursor = end
      }

      if (cursor < navHeight) {
        stops.push(`transparent ${cursor}px`, `transparent ${navHeight}px`)
      }

      return `linear-gradient(to bottom, ${stops.join(', ')})`
    }

    // ── Per-frame update ──────────────────────────────────────────────────────

    let lastScrollY = -1
    let lastGradient = ''

    const updateMask = () => {
      // Skip while mobile nav menu is open — overlay would fight with the open state
      if (headerElement.classList.contains('is-nav-open')) return

      // Bail out immediately if the page hasn't scrolled since the last tick.
      // This makes the rAF loop essentially free at rest and avoids triggering
      // getBoundingClientRect() (and a potential forced reflow) every frame.
      const currentScrollY = window.scrollY
      if (currentScrollY === lastScrollY) return
      lastScrollY = currentScrollY

      const coverageIntervals: Array<{ start: number; end: number }> = []

      for (const section of darkThemeSections) {
        const rect = section.getBoundingClientRect()
        const intervalStart = Math.max(0, Math.min(rect.top, navHeight))
        const intervalEnd = Math.max(0, Math.min(rect.bottom, navHeight))
        if (intervalEnd > intervalStart) {
          coverageIntervals.push({ start: intervalStart, end: intervalEnd })
        }
      }

      const gradient = buildMaskGradient(coverageIntervals)

      // Skip the style write if the gradient hasn't changed — avoids a repaint.
      if (gradient === lastGradient) return
      lastGradient = gradient

      darkOverlay.style.maskImage = gradient
      ;(darkOverlay.style as any).webkitMaskImage = gradient
    }

    // ── Hide toggle clone while nav menu is open ──────────────────────────────
    //
    // When the hamburger animates to its open/X state, the clone (frozen in the
    // closed state) overlaps it. We watch for the `is-nav-open` class so we can
    // hide the toggle clone the moment the menu opens and restore it on close.

    const navOpenObserver = new MutationObserver(() => {
      const isOpen = headerElement.classList.contains('is-nav-open')
      if (isOpen) {
        // Nav opening — hide clone instantly so the real hamburger animates freely.
        toggleClone.style.transition = 'none'
        toggleClone.style.opacity = '0'
        toggleClone.style.display = 'none'
      } else {
        // Nav has finished closing — the real hamburger is already back in its
        // resting position. Fade the clone in over it so there's no hard snap.
        toggleClone.style.display = ''
        // Force a reflow so the browser registers the display change
        // before we start the opacity transition.
        void toggleClone.offsetHeight
        toggleClone.style.transition = 'opacity 0.4s ease'
        toggleClone.style.opacity = '1'
      }
    })

    navOpenObserver.observe(headerElement, {
      attributes: true,
      attributeFilter: ['class'],
    })

    // ── Initialise and start rAF loop ─────────────────────────────────────────

    syncClonePositions()
    updateMask()

    // rAF loop keeps the mask in sync with Lenis virtual scrolling (which
    // updates visual position every frame rather than on native scroll events).
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

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initNavTheme)
  } else {
    initNavTheme()
  }
})()
