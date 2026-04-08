;(function () {
  'use strict'

  const __s = ((window as any).__loadedScripts ??= {})
  if (__s['officeCardTabs']) return
  __s['officeCardTabs'] = true

  function init() {
    const officeCards = document.querySelectorAll<HTMLElement>('.office-card_component')
    if (officeCards.length === 0) return

    officeCards.forEach((card) => {
      const placePanel = card.querySelector<HTMLElement>('.office-card_image')
      const mapPanel = card.querySelector<HTMLElement>('.office-card_map')
      const tabs = card.querySelectorAll<HTMLElement>('.office-card_tab')

      if (!placePanel || !mapPanel || tabs.length === 0) return

      const panels: Record<string, HTMLElement> = {
        place: placePanel,
        map: mapPanel,
      }

      // Set default state: place active
      placePanel.classList.add('is-active')
      mapPanel.classList.remove('is-active')

      tabs.forEach((tab) => {
        const target = tab.getAttribute('data-office-tab')
        if (!target) return

        // Mark default active tab
        if (target === 'place') {
          tab.classList.add('is-active')
        }

        tab.addEventListener('click', () => {
          // Toggle active class on tabs
          tabs.forEach((sibling) => sibling.classList.remove('is-active'))
          tab.classList.add('is-active')

          // Toggle active class on panels
          Object.entries(panels).forEach(([key, panel]) => {
            panel.classList.toggle('is-active', key === target)
          })
        })
      })
    })
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init)
  } else {
    init()
  }
})()
