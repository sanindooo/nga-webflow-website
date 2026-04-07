/**
 * Typology Links
 *
 * Sets project grid link hrefs to the Works page with the correct
 * Finsweet CMS Filter query parameter based on the data-title attribute.
 * Produces relative URLs so it works on both staging and production.
 *
 * Scoped to: Homepage only
 */

;(function () {
  'use strict'

  const __s = ((window as any).__loadedScripts ??= {})
  if (__s['typologyLinks']) return; __s['typologyLinks'] = true

  function init() {
    const typologyLinks = document.querySelectorAll<HTMLAnchorElement>('.project-grid_link[data-title]')

    typologyLinks.forEach((link) => {
      const categoryName = link.getAttribute('data-title')
      if (!categoryName) return
      link.href = '/works?Category=' + encodeURIComponent(categoryName)
    })
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init)
  } else {
    init()
  }
})()
