/**
 * Filter Scroll Hint — tells the styles whether a horizontally scrolling row
 * has more content to the right.
 *
 * iOS Safari ignores custom scrollbar styling and only shows its own overlay
 * bar mid-scroll, so a styled scrollbar cannot advertise the mobile filter
 * row. This sets state the Designer can style instead:
 *
 *   is-overflowing   the row is wider than its box (false on desktop)
 *   is-at-end        scrolled to the right edge (hide a "scroll" hint)
 *   --scroll-thumb-size / --scroll-thumb-offset
 *                    percentages for drawing a custom scroll indicator
 *
 * Applies to every [data-scroll-hint] element.
 */

const END_TOLERANCE_PX = 4

export const filterScrollHint = () => {
  const rows = document.querySelectorAll<HTMLElement>('[data-scroll-hint]')
  if (!rows.length) return

  rows.forEach((row) => {
    const update = () => {
      const { scrollLeft, scrollWidth, clientWidth } = row
      const isOverflowing = scrollWidth - clientWidth > END_TOLERANCE_PX
      const maxScroll = scrollWidth - clientWidth
      row.classList.toggle('is-overflowing', isOverflowing)
      row.classList.toggle(
        'is-at-end',
        !isOverflowing || scrollLeft >= maxScroll - END_TOLERANCE_PX,
      )

      const thumbSize = isOverflowing ? (clientWidth / scrollWidth) * 100 : 100
      const thumbOffset = isOverflowing ? (scrollLeft / maxScroll) * (100 - thumbSize) : 0
      row.style.setProperty('--scroll-thumb-size', `${thumbSize}%`)
      row.style.setProperty('--scroll-thumb-offset', `${thumbOffset}%`)
    }

    row.addEventListener('scroll', update, { passive: true })
    new ResizeObserver(update).observe(row)
    update()
  })
}
