/**
 * Filter Active State
 *
 * Promotes fs-cmsfilter_active to parent wrappers for Finsweet CMS Filter.
 * Finsweet adds the active class to checkbox labels, but our design needs
 * it on the parent news-filter_link wrapper (which holds button-square + label).
 * Also manages the "All" clear button active state, which Finsweet doesn't handle.
 *
 * Uses the Finsweet JS API callback to sync state after initialization,
 * which handles URL-restored filter state (fs-cmsfilter-showquery).
 *
 * Dependencies: Finsweet CMS Filter v1 (loaded externally via CDN)
 */

;(function () {
  'use strict'

  const __s = ((window as any).__loadedScripts ??= {})
  if (__s['filterActiveState']) return; __s['filterActiveState'] = true

  const ACTIVE_CLASS = 'fs-cmsfilter_active'

  function syncActiveStates(filterForm: HTMLElement, clearWrapper: Element | null | undefined) {
    const hasChecked = filterForm.querySelector<HTMLInputElement>('input[type="checkbox"]:checked') !== null

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

  function init() {
    const filterForms = document.querySelectorAll<HTMLElement>('[fs-cmsfilter-element="filters"]')
    if (!filterForms.length) return

    filterForms.forEach((filterForm) => {
      const clearButton = filterForm.querySelector<HTMLElement>('[fs-cmsfilter-element="clear"]')
      const clearWrapper = clearButton?.parentElement

      // "All" wrapper starts active (no filters selected)
      if (clearWrapper) {
        clearWrapper.classList.add(ACTIVE_CLASS)
      }

      // Sync on every filter change
      filterForm.addEventListener('change', () => {
        syncActiveStates(filterForm, clearWrapper)
      })

      // Handle clear button click
      if (clearButton) {
        clearButton.addEventListener('click', () => {
          syncActiveStates(filterForm, clearWrapper)
        })
      }
    })

    // Re-sync after Finsweet initializes (handles URL-restored filter state)
    const fsAttributes = ((window as any).fsAttributes ??= [])
    fsAttributes.push(['cmsfilter', () => {
      filterForms.forEach((filterForm) => {
        const clearWrapper = filterForm.querySelector<HTMLElement>('[fs-cmsfilter-element="clear"]')?.parentElement
        syncActiveStates(filterForm, clearWrapper)
      })
    }])
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init)
  } else {
    init()
  }
})()
