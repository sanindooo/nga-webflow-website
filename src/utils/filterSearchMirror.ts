/**
 * Filter Search Mirror — keeps the mobile search box in sync with the real
 * Finsweet search input.
 *
 * On mobile the Works search sits in the sort row, outside the filter form,
 * but Finsweet CMS Filter only reads inputs inside its form. So the mobile
 * copy is a plain input that writes into the in-form search (hidden on
 * mobile) and re-dispatches `input` so Finsweet filters as usual. Values that
 * land in the source another way (Clear All, a ?query in the URL on load) are
 * copied back.
 *
 * DOM contract:
 *   [data-filter-panel]               the mobile search panel
 *     [data-filter-panel-toggle]      gets fs-cmsfilter_active while searching
 *     input[data-filter-search-mirror]
 *   input[data-filter-search-source]  the Finsweet search input, in the form
 */

const ACTIVE_CLASS = 'fs-cmsfilter_active'

export const filterSearchMirror = () => {
  const mirror = document.querySelector<HTMLInputElement>('[data-filter-search-mirror]')
  const source = document.querySelector<HTMLInputElement>('[data-filter-search-source]')
  if (!mirror || !source) return

  const toggle = mirror
    .closest('[data-filter-panel]')
    ?.querySelector<HTMLElement>('[data-filter-panel-toggle]')

  const syncActive = () => toggle?.classList.toggle(ACTIVE_CLASS, source.value.trim() !== '')

  const pullFromSource = () => {
    mirror.value = source.value
    syncActive()
  }

  mirror.addEventListener('input', () => {
    source.value = mirror.value
    source.dispatchEvent(new Event('input', { bubbles: true }))
    syncActive()
  })

  source.addEventListener('input', pullFromSource)
  // Finsweet resets the source on Clear All without an input event.
  document.querySelectorAll('[fs-cmsfilter-element="clear"]').forEach((clear) => {
    clear.addEventListener('click', () => requestAnimationFrame(pullFromSource))
  })
  window.fsAttributes ||= []
  window.fsAttributes.push(['cmsfilter', pullFromSource])
}
