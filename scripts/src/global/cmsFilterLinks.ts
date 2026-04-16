/**
 * CMS Filter Links
 *
 * Sets link hrefs to a CMS listing page with the Finsweet CMS Filter
 * `category` query parameter based on data attributes. Applies to any
 * anchor carrying both data attributes — nav dropdowns, mobile menus,
 * project grid cards, footer sitemap, etc.
 *
 *   data-filter-path — listing page slug (e.g. "works", "news")
 *   data-title       — category name to filter by
 *
 * Produces relative URLs so it works on both staging and production.
 */

;(function () {
  'use strict'

  const __s = ((window as any).__loadedScripts ??= {})
  if (__s['cmsFilterLinks']) return; __s['cmsFilterLinks'] = true

  function init() {
    const filterLinks = document.querySelectorAll<HTMLAnchorElement>(
      'a[data-filter-path][data-title]'
    )

    filterLinks.forEach((link) => {
      const categoryName = link.getAttribute('data-title')
      const filterPath = link.getAttribute('data-filter-path')
      if (!categoryName || !filterPath) return
      link.href = '/' + filterPath + '?category=' + encodeURIComponent(categoryName).replace(/%20/g, '+')
    })
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init)
  } else {
    init()
  }
})()
