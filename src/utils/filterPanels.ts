/**
 * Filter Panels — custom replacement for the Webflow Dropdown on the Works
 * filter bar.
 *
 * Webflow's dropdown opens from its own touch handling, which fires after a
 * horizontal swipe ends on a toggle, so swiping the mobile filter row opened
 * panels. A native `click` never fires after a scroll gesture, so a plain
 * <button> listening for `click` fixes most of that.
 *
 * Not all of it: on touch devices ScrollSmoother's normalizeScroll takes over
 * touchmove. When it does not hand a horizontal swipe to the nested filter
 * row (seen intermittently after filtering), the native scroll is blocked and
 * the browser treats the gesture as a tap, firing `click` on the toggle under
 * the finger. So clicks that end a touch which travelled more than
 * TAP_SLOP_PX are ignored, whatever the browser decided.
 *
 * DOM contract (per panel):
 *   [data-filter-panel]
 *     button[data-filter-panel-toggle]
 *     [data-filter-panel-content]
 *
 * The same guard covers clicks inside a panel, so scrolling a long option
 * list never picks the option the finger lifts on.
 *
 * Behaviour: one panel open at a time; a second click on its toggle closes
 * it. Picking a radio or clicking a panel's "all" closes it. Range sliders
 * and search stay open while in use. Outside click and Escape close the open
 * panel (Escape returns focus to the toggle). `is-open` goes on the toggle and
 * the content; styles live on those combo classes.
 */

const OPEN_CLASS = 'is-open'
const TAP_SLOP_PX = 10

// Tracks the latest touch from start to end; capture + passive so neither
// normalizeScroll's preventDefault nor scroll performance is affected.
const touchGesture = { startX: 0, startY: 0, travelled: 0 }

const trackTouches = () => {
  const options = { capture: true, passive: true }
  document.addEventListener(
    'touchstart',
    (event) => {
      const [touch] = event.touches
      touchGesture.startX = touch.clientX
      touchGesture.startY = touch.clientY
      touchGesture.travelled = 0
    },
    options,
  )
  document.addEventListener(
    'touchmove',
    (event) => {
      const [touch] = event.touches
      const distance = Math.hypot(
        touch.clientX - touchGesture.startX,
        touch.clientY - touchGesture.startY,
      )
      touchGesture.travelled = Math.max(touchGesture.travelled, distance)
    },
    options,
  )
}

// A click from a mouse or keyboard never follows a touchmove, so travelled
// stays 0 for them; only swipes are filtered out.
const isSwipe = () => touchGesture.travelled > TAP_SLOP_PX

interface FilterPanel {
  root: HTMLElement
  toggle: HTMLButtonElement
  content: HTMLElement
}

export const filterPanels = () => {
  const panels = Array.from(document.querySelectorAll<HTMLElement>('[data-filter-panel]'))
    .map((root): FilterPanel | null => {
      const toggle = root.querySelector<HTMLButtonElement>('[data-filter-panel-toggle]')
      const content = root.querySelector<HTMLElement>('[data-filter-panel-content]')
      return toggle && content ? { root, toggle, content } : null
    })
    .filter((panel): panel is FilterPanel => panel !== null)
  if (!panels.length) return

  trackTouches()
  let openPanel: FilterPanel | null = null

  const setOpen = (panel: FilterPanel, isOpen: boolean) => {
    panel.toggle.classList.toggle(OPEN_CLASS, isOpen)
    panel.content.classList.toggle(OPEN_CLASS, isOpen)
    panel.toggle.setAttribute('aria-expanded', String(isOpen))
    if (isOpen) openPanel = panel
    else if (openPanel === panel) openPanel = null
  }

  const close = (panel: FilterPanel | null) => {
    if (panel) setOpen(panel, false)
  }

  panels.forEach((panel) => {
    const contentId = panel.content.id || `filter-panel-${panel.root.dataset.filterPanel}`
    panel.content.id = contentId
    panel.toggle.setAttribute('aria-controls', contentId)
    panel.toggle.setAttribute('aria-expanded', 'false')

    panel.toggle.addEventListener('click', () => {
      if (isSwipe()) return
      const wasOpen = openPanel === panel
      close(openPanel)
      if (!wasOpen) setOpen(panel, true)
    })

    // Panel lists scroll vertically on mobile, and the same normalizeScroll
    // hand-off failure turns a scroll that ends on an option into a tap.
    // Capture runs before the label activates its radio and before
    // Finsweet's clear handlers, so a swipe never picks or clears anything.
    panel.content.addEventListener(
      'click',
      (event) => {
        if (!isSwipe()) return
        event.preventDefault()
        event.stopPropagation()
      },
      { capture: true },
    )

    // Choosing an option closes the panel; sliders and search keep it open.
    panel.content.addEventListener('change', (event) => {
      const target = event.target as HTMLInputElement
      if (target.type === 'radio' || target.type === 'checkbox') close(panel)
    })
    panel.content.querySelectorAll('[fs-cmsfilter-element="clear"]').forEach((clear) => {
      clear.addEventListener('click', () => close(panel))
    })
  })

  document.addEventListener('click', (event) => {
    if (isSwipe()) return
    if (openPanel && !openPanel.root.contains(event.target as Node)) close(openPanel)
  })

  document.addEventListener('keydown', (event) => {
    if (event.key !== 'Escape' || !openPanel) return
    const { toggle } = openPanel
    close(openPanel)
    toggle.focus()
  })
}
