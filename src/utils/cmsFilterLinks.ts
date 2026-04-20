/**
 * CMS Filter Links
 *
 * Sets link hrefs to a CMS listing page with the Finsweet CMS Filter
 * `category` query parameter based on data attributes. Applies to any
 * anchor carrying both `data-filter-path` and `data-title`.
 */

export const cmsFilterLinks = () => {
  const filterLinks = document.querySelectorAll<HTMLAnchorElement>(
    'a[data-filter-path][data-title]',
  )

  filterLinks.forEach((link) => {
    const categoryName = link.getAttribute('data-title')
    const filterPath = link.getAttribute('data-filter-path')
    if (!categoryName || !filterPath) return
    link.href =
      '/' + filterPath + '?category=' + encodeURIComponent(categoryName).replace(/%20/g, '+')
  })
}
