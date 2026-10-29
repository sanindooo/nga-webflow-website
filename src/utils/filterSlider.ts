/**
 * Filter Slider — back/forward arrows for the Works filter row on mobile.
 *
 * The row is the filter form itself, scrolling natively (overflow comes from
 * the `is-slider` combo classes, mobile landscape and below). Each arrow tap
 * scrolls to the start of the previous or next filter.
 *
 * Swiper was tried first. Its transform mode clips the filter panels (they
 * are absolutely positioned against the sticky filter section, and a
 * transformed wrapper re-anchors them), and its cssMode skipped every other
 * arrow tap and stopped short of the last filter because it ignores the CSS
 * gap. Native scrolling also keeps filterPanels' swipe guard working, which
 * relies on scroll gestures never firing `click`.
 *
 * DOM contract:
 *   [data-filter-slider]
 *     [data-filter-slider-prev]
 *     form.news-filter_links.u-dropdown-parents   the scrolling row
 *       [data-filter-panel] / [data-filter-clear-all]   steps
 *     [data-filter-slider-next]
 *
 * Hidden items (the in-form search on mobile, Clear All until a filter is
 * set) are skipped. Arrows get `is-disabled` at either end; the Designer
 * styles that combo.
 */

const END_TOLERANCE_PX = 2
const DISABLED_CLASS = 'is-disabled'
const SMOOTH_SCROLL_MS = 500
const END_SNAP_PX = 24

export const filterSlider = () => {
  const root = document.querySelector<HTMLElement>('[data-filter-slider]')
  if (!root) return

  const row = root.querySelector<HTMLElement>('.news-filter_links.u-dropdown-parents')
  const prevButton = root.querySelector<HTMLElement>('[data-filter-slider-prev]')
  const nextButton = root.querySelector<HTMLElement>('[data-filter-slider-next]')
  if (!row || !prevButton || !nextButton) return

  // Scroll offsets of each visible filter's left edge, within the row.
  const stepOffsets = () => {
    const rowLeft = row.getBoundingClientRect().left - row.scrollLeft
    return Array.from(row.children)
      .filter((child): child is HTMLElement => child instanceof HTMLElement)
      .filter((child) => child.offsetWidth > 0)
      .map((child) => child.getBoundingClientRect().left - rowLeft)
  }

  const maxScroll = () => row.scrollWidth - row.clientWidth

  const update = () => {
    prevButton.classList.toggle(DISABLED_CLASS, row.scrollLeft <= END_TOLERANCE_PX)
    nextButton.classList.toggle(DISABLED_CLASS, row.scrollLeft >= maxScroll() - END_TOLERANCE_PX)
  }

  // A tap during a smooth scroll steps on from where that scroll is heading,
  // not from the half-way scroll position, so quick taps never repeat a step.
  let pendingTarget: { left: number; until: number } | null = null

  const scrollToStep = (direction: 1 | -1) => {
    const now = performance.now()
    const current = pendingTarget && now < pendingTarget.until ? pendingTarget.left : row.scrollLeft
    const offsets = stepOffsets()
    const target =
      direction === 1
        ? (offsets.find((offset) => offset > current + END_TOLERANCE_PX) ?? maxScroll())
        : (offsets.reverse().find((offset) => offset < current - END_TOLERANCE_PX) ?? 0)
    // A step that would stop just shy of the end goes all the way, so the
    // next tap is never a near-invisible nudge.
    const left = maxScroll() - target < END_SNAP_PX ? maxScroll() : Math.max(0, target)
    pendingTarget = { left, until: now + SMOOTH_SCROLL_MS }
    row.scrollTo({ left, behavior: 'smooth' })
  }

  ;[prevButton, nextButton].forEach((button) => {
    button.setAttribute('role', 'button')
    button.setAttribute('tabindex', '0')
  })
  prevButton.addEventListener('click', () => scrollToStep(-1))
  nextButton.addEventListener('click', () => scrollToStep(1))
  root.addEventListener('keydown', (event) => {
    if (event.key !== 'Enter' && event.key !== ' ') return
    if (event.target !== prevButton && event.target !== nextButton) return
    event.preventDefault()
    scrollToStep(event.target === prevButton ? -1 : 1)
  })

  row.addEventListener('scroll', update, { passive: true })
  // Labels change width as filters are picked and clear-all comes and goes.
  const resizeObserver = new ResizeObserver(update)
  resizeObserver.observe(row)
  Array.from(row.children).forEach((child) => resizeObserver.observe(child))
  update()
}
