/**
 * Filter Panels — custom replacement for the Webflow Dropdown on the Works
 * filter bar.
 *
 * Webflow's dropdown opens from its own touch handling, which fires after a
 * horizontal swipe ends on a toggle, so swiping the mobile filter row opened
 * panels. A native `click` never fires after a scroll gesture, so a plain
 * <button> listening for `click` fixes that for free.
 *
 * DOM contract (per panel):
 *   [data-filter-panel]
 *     button[data-filter-panel-toggle]
 *     [data-filter-panel-content]
 *
 * Behaviour: one panel open at a time; a second click on its toggle closes
 * it. Picking a radio or clicking a panel's "all" closes it. Range sliders
 * and search stay open while in use. Outside click and Escape close the open
 * panel (Escape returns focus to the toggle). `is-open` goes on the toggle and
 * the content; styles live on those combo classes.
 */

const OPEN_CLASS = 'is-open'

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
      const wasOpen = openPanel === panel
      close(openPanel)
      if (!wasOpen) setOpen(panel, true)
    })

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
    if (openPanel && !openPanel.root.contains(event.target as Node)) close(openPanel)
  })

  document.addEventListener('keydown', (event) => {
    if (event.key !== 'Escape' || !openPanel) return
    const { toggle } = openPanel
    close(openPanel)
    toggle.focus()
  })
}
