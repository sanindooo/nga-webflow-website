/**
 * Filter Active State
 *
 * Promotes fs-cmsfilter_active to parent wrappers for Finsweet CMS Filter.
 * Also manages the "All" clear button active state, per filter panel when a
 * form has several clears. Works with checkbox (multi-select) and radio
 * (single-select) filter inputs.
 *
 * Additionally, this module is the single ScrollTrigger refresh point for
 * Finsweet CMS rehydration. When the filter swaps in new collection items,
 * any ScrollTriggers below the list have stale start/end positions because
 * the list height changed. The rehydration handler re-attaches per-image
 * load listeners on the new items, sorts triggers back into source order
 * (out-of-order triggers after dynamic insertion is the documented #1 cause
 * of "can't scroll past pin"), then refresh(true) — deferred past Lenis
 * momentum so the click-driven refresh doesn't fight a scroll-in-progress.
 *
 * A scoped MutationObserver is registered as belt-and-braces in case the
 * fsAttributes callback is bypassed by some other rehydration path.
 * subtree:false guards against pin-spacer feedback loops; pin-spacers attach
 * outside the cmsfilter list container anyway.
 */

const ACTIVE_CLASS = 'fs-cmsfilter_active'
const FILTER_INPUTS = 'input[type="checkbox"], input[type="radio"]'

interface FsListInstance {
  on: (event: string, callback: () => void) => void
  items: Array<{ element: HTMLElement }>
}

interface FsFilterInstance {
  listInstance: FsListInstance
}

type FinsweetQueue = Array<unknown>

declare global {
  interface Window {
    fsAttributes?: FinsweetQueue
  }
}

// One filter change fires renderitems once per list instance (Works has a row
// and a grid list) plus the backup MutationObserver. They land in the same
// frame as ScrollTrigger's own resize refresh, so they collapse into one
// refresh on the next frame. Image loads trickle in afterwards and share a
// trailing debounce instead of refreshing once per image.
const IMAGE_SETTLE_MS = 100
let refreshFrame: number | undefined
let imageTimer: number | undefined

const refreshAfterCmsHydration = () => {
  if (refreshFrame !== undefined) return
  refreshFrame = requestAnimationFrame(() => {
    refreshFrame = undefined
    ScrollTrigger.sort()
    ScrollTrigger.refresh(true)
  })
}

const refreshAfterImageLoads = () => {
  window.clearTimeout(imageTimer)
  imageTimer = window.setTimeout(refreshAfterCmsHydration, IMAGE_SETTLE_MS)
}

// Newly shown items' images load after the render; each load shifts layout,
// so they join the same trailing refresh instead of refreshing one by one.
const attachImageRefreshListener = (image: HTMLImageElement) => {
  if (image.complete && image.naturalWidth > 0) return
  image.addEventListener('load', refreshAfterImageLoads, { once: true })
}

// Each "all" clear button is active while nothing in its own group is set.
// A group is the clear's Webflow dropdown (Works: one per filter panel) or the
// whole form (News: a single clear). Range panels count as set when either
// hidden from/to input holds a value.
// Forms opted in with [data-filter-panels] (Works) also mark each dropdown
// toggle active while its panel has a filter set, and a toggle label carrying
// [data-filter-label] shows the selected option instead of its default text.
const panelHasValue = (panel: HTMLElement) =>
  Array.from(panel.querySelectorAll<HTMLInputElement>('input')).some((input) =>
    input.type === 'checkbox' || input.type === 'radio'
      ? input.checked
      : input.type !== 'range' && input.value.trim() !== '',
  )

function syncPanels(filterForm: HTMLElement) {
  filterForm.querySelectorAll<HTMLElement>('[data-filter-panel]').forEach((panel) => {
    panel
      .querySelector('[data-filter-panel-toggle]')
      ?.classList.toggle(ACTIVE_CLASS, panelHasValue(panel))

    const label = panel.querySelector<HTMLElement>('[data-filter-label]')
    if (!label) return
    label.dataset.filterLabelDefault ??= label.textContent ?? ''
    const checkedInput = panel.querySelector<HTMLInputElement>('input:checked')
    const selectedText = checkedInput
      ?.closest('.w-radio, .w-checkbox')
      ?.querySelector('.w-form-label')
      ?.textContent?.trim()
    label.textContent = selectedText || label.dataset.filterLabelDefault
  })
}

function syncActiveStates(filterForm: HTMLElement) {
  if (filterForm.hasAttribute('data-filter-panels')) syncPanels(filterForm)

  // Clear All is hidden until any filter in the form is set.
  filterForm.querySelectorAll<HTMLElement>('[data-filter-clear-all]').forEach((clearAll) => {
    clearAll.classList.toggle('hide', !panelHasValue(filterForm))
  })

  filterForm
    .querySelectorAll<HTMLElement>('[fs-cmsfilter-element="clear"]:not([data-filter-clear-all])')
    .forEach((clearButton) => {
      const group = clearButton.closest<HTMLElement>('[data-filter-panel]') ?? filterForm
      const hasChecked = Array.from(group.querySelectorAll<HTMLInputElement>(FILTER_INPUTS)).some(
        (input) => input.checked,
      )
      const hasRange = Array.from(
        group.querySelectorAll<HTMLInputElement>('input[fs-cmsfilter-range]'),
      ).some((input) => input.value !== '')
      clearButton.parentElement?.classList.toggle(ACTIVE_CLASS, !hasChecked && !hasRange)
    })

  filterForm.querySelectorAll<HTMLInputElement>(FILTER_INPUTS).forEach((input) => {
    const inputWrapper = input.closest('.news-filter_link')
    if (inputWrapper) {
      inputWrapper.classList.toggle(ACTIVE_CLASS, input.checked)
    }
  })
}

export const filterActiveState = () => {
  const filterForms = document.querySelectorAll<HTMLElement>('[fs-cmsfilter-element="filters"]')
  if (!filterForms.length) return

  filterForms.forEach((filterForm) => {
    syncActiveStates(filterForm)
    filterForm.addEventListener('change', () => syncActiveStates(filterForm))
    filterForm.addEventListener('input', () => syncActiveStates(filterForm))

    // Finsweet resets the inputs in its own click handler; sync on the next
    // frame so a still-checked radio isn't read as active.
    filterForm
      .querySelectorAll<HTMLElement>('[fs-cmsfilter-element="clear"]')
      .forEach((clearButton) => {
        clearButton.addEventListener('click', () => {
          requestAnimationFrame(() => syncActiveStates(filterForm))
        })
      })
  })

  const fsAttributes: FinsweetQueue = (window.fsAttributes ??= [])
  fsAttributes.push([
    'cmsfilter',
    (filterInstances: FsFilterInstance[]) => {
      filterForms.forEach((filterForm) => syncActiveStates(filterForm))

      filterInstances?.forEach((instance) => {
        instance.listInstance?.on('renderitems', () => {
          instance.listInstance.items.forEach((item) => {
            item.element
              .querySelectorAll<HTMLImageElement>('img')
              .forEach(attachImageRefreshListener)
          })
          refreshAfterCmsHydration()
        })
      })
    },
  ])

  document.querySelectorAll<HTMLElement>('[fs-cmsfilter-element="list"]').forEach((listEl) => {
    let pending = false
    const observer = new MutationObserver(() => {
      if (pending) return
      pending = true
      requestAnimationFrame(() => {
        listEl.querySelectorAll<HTMLImageElement>('img').forEach(attachImageRefreshListener)
        refreshAfterCmsHydration()
        pending = false
      })
    })
    observer.observe(listEl, { childList: true, subtree: false })
  })
}
