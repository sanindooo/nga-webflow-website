/**
 * View Switcher
 *
 * Toggles between grid and list views on the works listing page.
 * Persists the user's preference in localStorage.
 * Dependencies: none
 */

;(function () {
  'use strict'

  const STORAGE_KEY = 'nga-works-view'
  const DEFAULT_VIEW = 'grid'

  function init() {
    const toggles = document.querySelectorAll<HTMLElement>('[data-view]')
    const wrappers = document.querySelectorAll<HTMLElement>('.works-list-wrapper')

    if (!toggles.length || wrappers.length < 2) return

    // First wrapper has u-row-view = list, second = grid
    let listWrapper: HTMLElement | null = null
    let gridWrapper: HTMLElement | null = null

    wrappers.forEach((w) => {
      if (w.classList.contains('u-row-view')) {
        listWrapper = w
      } else {
        gridWrapper = w
      }
    })

    if (!listWrapper || !gridWrapper) return

    const saved = localStorage.getItem(STORAGE_KEY)
    const initialView = saved === 'list' || saved === 'grid' ? saved : DEFAULT_VIEW

    function applyView(view: string) {
      ;(listWrapper as HTMLElement).classList.toggle('is-active', view === 'list')
      ;(gridWrapper as HTMLElement).classList.toggle('is-active', view === 'grid')

      toggles.forEach((t) => {
        t.classList.toggle('is-active', t.getAttribute('data-view') === view)
      })

      localStorage.setItem(STORAGE_KEY, view)
    }

    applyView(initialView)

    toggles.forEach((toggle) => {
      toggle.addEventListener('click', (e) => {
        e.preventDefault()
        const view = toggle.getAttribute('data-view')
        if (view) applyView(view)
      })
    })
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init)
  } else {
    init()
  }
})()
