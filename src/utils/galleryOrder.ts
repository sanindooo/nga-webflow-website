/**
 * Gallery Order
 *
 * Sorts each Works gallery's figures in the DOM by `data-order`, matching the
 * CSS `order` rules in the Custom Layout embed (no order = last, ties keep slot
 * order). Webflow's lightbox, tab order and screen readers follow the DOM.
 *
 * Must run before modules that measure layout.
 */

const UNORDERED_POSITION = 13

const getOrder = (item: HTMLElement) => Number(item.dataset.order) || UNORDERED_POSITION

export const galleryOrder = () => {
  const galleries = document.querySelectorAll<HTMLElement>('.dynamic-image_component')
  if (!galleries.length) return

  galleries.forEach((gallery) => {
    const items = Array.from(gallery.querySelectorAll<HTMLElement>(':scope > .dynamic-image_item'))
    gallery.append(...items.sort((itemA, itemB) => getOrder(itemA) - getOrder(itemB)))
  })

  // Rebuild the lightbox groups, which Webflow built from the old DOM order
  window.Webflow?.require('lightbox').ready()
}
