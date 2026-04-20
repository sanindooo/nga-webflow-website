/**
 * Filter Active State
 *
 * Promotes fs-cmsfilter_active to parent wrappers for Finsweet CMS Filter.
 * Also manages the "All" clear button active state.
 */

const ACTIVE_CLASS = 'fs-cmsfilter_active'

type FinsweetQueue = Array<unknown>

declare global {
  interface Window {
    fsAttributes?: FinsweetQueue
  }
}

function syncActiveStates(filterForm: HTMLElement, clearWrapper: Element | null | undefined) {
  const hasChecked =
    filterForm.querySelector<HTMLInputElement>('input[type="checkbox"]:checked') !== null

  if (clearWrapper) {
    clearWrapper.classList.toggle(ACTIVE_CLASS, !hasChecked)
  }

  filterForm.querySelectorAll<HTMLInputElement>('input[type="checkbox"]').forEach((checkbox) => {
    const checkboxWrapper = checkbox.closest('.news-filter_link')
    if (checkboxWrapper) {
      checkboxWrapper.classList.toggle(ACTIVE_CLASS, checkbox.checked)
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
      clearButton.addEventListener('click', () => {
        syncActiveStates(filterForm, clearWrapper)
      })
    }
  })

  const fsAttributes: FinsweetQueue = (window.fsAttributes ??= [])
  fsAttributes.push([
    'cmsfilter',
    () => {
      filterForms.forEach((filterForm) => {
        const clearWrapper = filterForm.querySelector<HTMLElement>(
          '[fs-cmsfilter-element="clear"]',
        )?.parentElement
        syncActiveStates(filterForm, clearWrapper)
      })
    },
  ])
}
