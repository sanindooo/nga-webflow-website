// grid wrapper class .card-grid_grid
// grid item class .card-grid_grid-item

;(function () {
  'use strict'

  const loadedScripts = ((window as any).__loadedScripts ??= {})
  if (loadedScripts['publicationsGridFade']) return
  loadedScripts['publicationsGridFade'] = true

  function setupGridFade() {
    const grids = document.querySelectorAll<HTMLElement>('.card-grid_grid')
    if (!grids.length) return

    grids.forEach((grid) => {
      const gridItems = Array.from(grid.querySelectorAll<HTMLElement>('.card-grid_grid-item'))
      if (!gridItems.length) return

      gsap.set(gridItems, { autoAlpha: 0, y: 20 })

      // Group items into rows by their top offset position
      const rowMap = new Map<number, HTMLElement[]>()
      gridItems.forEach((gridItem) => {
        const topOffset = gridItem.offsetTop
        if (!rowMap.has(topOffset)) rowMap.set(topOffset, [])
        rowMap.get(topOffset)!.push(gridItem)
      })

      // Sort rows top-to-bottom and shuffle items within each row
      const rows = Array.from(rowMap.entries())
        .sort(([topOffsetA], [topOffsetB]) => topOffsetA - topOffsetB)
        .map(([, rowItems]) => [...rowItems].sort(() => Math.random() - 0.5))

      const scrollDistance = rows.length * 300

      const gridTimeline = gsap.timeline({
        scrollTrigger: {
          trigger: grid,
          start: 'top 50%',
          end: `+=${scrollDistance}`,
          scrub: true,
          markers: false,
        },
      })

      rows.forEach((rowItems, rowIndex) => {
        const rowStartPosition = rowIndex === 0 ? 0 : `>-0.2`

        rowItems.forEach((gridItem, itemIndex) => {
          const itemPosition = itemIndex === 0 ? rowStartPosition : '<0.15'
          gridTimeline.to(
            gridItem,
            { autoAlpha: 1, y: 0, duration: 1, ease: 'power2.out' },
            itemPosition,
          )
        })
      })
    })
  }

  function init() {
    if (typeof window.onLayoutReady === 'function') {
      window.onLayoutReady(setupGridFade)
    } else {
      setupGridFade()
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init)
  } else {
    init()
  }
})()
