/**
 * Publications Grid Fade
 *
 * Scroll-scrubbed fade-in reveal for .card-grid_grid items in randomised order.
 * Items are grouped into rows by offsetTop; each row is shuffled independently
 * so the reveal order is random within rows but still reads top-to-bottom.
 */

function buildRowGroups(gridItems: HTMLElement[]) {
  const rowMap = new Map<number, HTMLElement[]>()
  gridItems.forEach((gridItem) => {
    const topOffset = gridItem.offsetTop
    if (!rowMap.has(topOffset)) rowMap.set(topOffset, [])
    rowMap.get(topOffset)!.push(gridItem)
  })
  return Array.from(rowMap.entries())
    .sort(([topOffsetA], [topOffsetB]) => topOffsetA - topOffsetB)
    .map(([, rowItems]) => [...rowItems].sort(() => Math.random() - 0.5))
}

export const publicationsGridFade = () => {
  const grids = document.querySelectorAll<HTMLElement>('.card-grid_grid')
  if (!grids.length) return

  grids.forEach((grid) => {
    const gridItems = Array.from(grid.querySelectorAll<HTMLElement>('.card-grid_grid-item'))
    if (!gridItems.length) return

    const shuffledRows = buildRowGroups(gridItems)

    gsap.set(gridItems, { autoAlpha: 0, y: 20 })

    const scrollDistance = shuffledRows.length * 300

    const timeline = gsap.timeline({
      scrollTrigger: {
        trigger: grid,
        start: 'top 50%',
        end: `+=${scrollDistance}`,
        scrub: true,
        markers: false,
      },
    })

    shuffledRows.forEach((rowItems, rowIndex) => {
      const rowStartPosition = rowIndex === 0 ? 0 : `>-0.2`
      rowItems.forEach((gridItem, itemIndex) => {
        const itemPosition = itemIndex === 0 ? rowStartPosition : '<0.15'
        timeline.to(
          gridItem,
          { autoAlpha: 1, y: 0, duration: 1, ease: 'power2.out' },
          itemPosition,
        )
      })
    })
  })
}
