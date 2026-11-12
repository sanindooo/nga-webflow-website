/**
 * Filter Search Mirror — keeps the visible search boxes in sync with the real
 * Finsweet search input.
 *
 * The Works search boxes sit outside the filter form (left of "filter by" on
 * desktop, in the sort row on mobile), but Finsweet CMS Filter only reads
 * inputs inside its form. So each copy is a plain input that writes into the
 * hidden in-form search and re-dispatches `input` so Finsweet filters as
 * usual. Values that land in the source another way (another mirror, Clear
 * All, a ?query in the URL on load) are copied back to every mirror.
 *
 * DOM contract:
 *   [data-filter-panel]               a search panel (one per breakpoint)
 *     [data-filter-panel-toggle]      gets fs-cmsfilter_active while searching
 *     input[data-filter-search-mirror]
 *   input[data-filter-search-source]  the Finsweet search input, in the form
 */

const ACTIVE_CLASS = 'fs-cmsfilter_active'

export const filterSearchMirror = () => {
  const mirrors = Array.from(document.querySelectorAll<HTMLInputElement>('[data-filter-search-mirror]'))
  const source = document.querySelector<HTMLInputElement>('[data-filter-search-source]')
  if (!mirrors.length || !source) return

  const toggles = mirrors.map((mirror) =>
    mirror.closest('[data-filter-panel]')?.querySelector<HTMLElement>('[data-filter-panel-toggle]'),
  )

  const pullFromSource = () => {
    const isSearching = source.value.trim() !== ''
    mirrors.forEach((mirror) => {
      if (mirror.value !== source.value) mirror.value = source.value
    })
    toggles.forEach((toggle) => toggle?.classList.toggle(ACTIVE_CLASS, isSearching))
  }

  mirrors.forEach((mirror) => {
    mirror.addEventListener('input', () => {
      source.value = mirror.value
      // Updates the other mirrors and the active state via the source listener.
      source.dispatchEvent(new Event('input', { bubbles: true }))
    })
  })

  source.addEventListener('input', pullFromSource)
  // Finsweet resets the source on Clear All without an input event.
  document.querySelectorAll('[fs-cmsfilter-element="clear"]').forEach((clear) => {
    clear.addEventListener('click', () => requestAnimationFrame(pullFromSource))
  })
  window.fsAttributes ||= []
  window.fsAttributes.push(['cmsfilter', pullFromSource])
}
