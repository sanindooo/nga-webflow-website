/**
 * Filter Active State
 *
 * Promotes fs-cmsfilter_active to parent wrappers for Finsweet CMS Filter.
 * Also manages the "All" clear button active state. Works with checkbox
 * (multi-select) and radio (single-select) filter inputs.
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

const attachImageRefreshListener = (image: HTMLImageElement) => {
  if (image.complete && image.naturalWidth > 0) return
  image.addEventListener('load', () => ScrollTrigger.refresh(true), { once: true })
}

const refreshAfterCmsHydration = () => {
  ScrollTrigger.sort()
  ScrollTrigger.refresh(true)
}

function syncActiveStates(filterForm: HTMLElement, clearWrapper: Element | null | undefined) {
  const filterInputs = filterForm.querySelectorAll<HTMLInputElement>(FILTER_INPUTS)
  const hasChecked = Array.from(filterInputs).some((input) => input.checked)

  if (clearWrapper) {
    clearWrapper.classList.toggle(ACTIVE_CLASS, !hasChecked)
  }

  filterInputs.forEach((input) => {
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
    const clearButton = filterForm.querySelector<HTMLElement>('[fs-cmsfilter-element="clear"]')
    const clearWrapper = clearButton?.parentElement

    if (clearWrapper) {
      clearWrapper.classList.add(ACTIVE_CLASS)
    }

    filterForm.addEventListener('change', () => {
      syncActiveStates(filterForm, clearWrapper)
    })

    if (clearButton) {
      // Finsweet resets the inputs in its own click handler; sync on the next
      // frame so a still-checked radio isn't read as active.
      clearButton.addEventListener('click', () => {
        requestAnimationFrame(() => syncActiveStates(filterForm, clearWrapper))
      })
    }
  })

  const fsAttributes: FinsweetQueue = (window.fsAttributes ??= [])
  fsAttributes.push([
    'cmsfilter',
    (filterInstances: FsFilterInstance[]) => {
      filterForms.forEach((filterForm) => {
        const clearWrapper = filterForm.querySelector<HTMLElement>(
          '[fs-cmsfilter-element="clear"]',
        )?.parentElement
        syncActiveStates(filterForm, clearWrapper)
      })

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

  document
    .querySelectorAll<HTMLElement>('[fs-cmsfilter-element="list"]')
    .forEach((listEl) => {
      let pending = false
      const observer = new MutationObserver(() => {
        if (pending) return
        pending = true
        requestAnimationFrame(() => {
          listEl
            .querySelectorAll<HTMLImageElement>('img')
            .forEach(attachImageRefreshListener)
          refreshAfterCmsHydration()
          pending = false
        })
      })
      observer.observe(listEl, { childList: true, subtree: false })
    })
}
