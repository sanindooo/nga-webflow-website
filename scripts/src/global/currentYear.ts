/**
 * Current Year
 *
 * Sets the text content of #current-year to the current calendar year.
 * Used in the footer copyright line.
 */

;(function () {
  'use strict'

  const __s = ((window as any).__loadedScripts ??= {})
  if (__s['currentYear']) return; __s['currentYear'] = true

  function init() {
    const yearElement = document.getElementById('current-year')
    if (!yearElement) return
    yearElement.textContent = String(new Date().getFullYear())
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init)
  } else {
    init()
  }
})()
