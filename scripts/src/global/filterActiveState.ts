/**
 * Filter Active State
 *
 * Promotes fs-cmsfilter_active to parent wrappers for Finsweet CMS Filter.
 * Finsweet adds the active class to checkbox labels, but our design needs
 * it on the parent news-filter_link wrapper (which holds button-square + label).
 * Also manages the "All" clear button active state, which Finsweet doesn't handle.
 *
 * Dependencies: Finsweet CMS Filter v1 (loaded externally)
 */

;(function () {
  'use strict'

  const __s = ((window as any).__loadedScripts ??= {})
  if (__s['filterActiveState']) return; __s['filterActiveState'] = true

  const ACTIVE_CLASS = 'fs-cmsfilter_active'

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

      // Get all checkboxes and their parent wrappers
      const checkboxes = filterForm.querySelectorAll<HTMLInputElement>('input[type="checkbox"]')

      filterForm.addEventListener('change', () => {
        const hasChecked = filterForm.querySelector<HTMLInputElement>('input[type="checkbox"]:checked') !== null

        // Toggle "All" wrapper
        if (clearWrapper) {
          clearWrapper.classList.toggle(ACTIVE_CLASS, !hasChecked)
        }

        // Toggle each checkbox's parent wrapper (news-filter_link)
        checkboxes.forEach((checkbox) => {
          const checkboxWrapper = checkbox.closest('.news-filter_link')
          if (checkboxWrapper) {
            checkboxWrapper.classList.toggle(ACTIVE_CLASS, checkbox.checked)
          }
        })
      })

      // Handle clear button click
      if (clearButton && clearWrapper) {
        clearButton.addEventListener('click', () => {
          clearWrapper.classList.add(ACTIVE_CLASS)
          // Remove active from all checkbox wrappers
          checkboxes.forEach((checkbox) => {
            const checkboxWrapper = checkbox.closest('.news-filter_link')
            if (checkboxWrapper) {
              checkboxWrapper.classList.remove(ACTIVE_CLASS)
            }
          })
        })
      }
    })
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init)
  } else {
    init()
  }
})()
