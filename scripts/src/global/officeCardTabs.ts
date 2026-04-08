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

      // Set default state: place visible, map hidden
      mapPanel.style.display = 'none'

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

          // Toggle panel visibility
          Object.entries(panels).forEach(([key, panel]) => {
            panel.style.display = key === target ? '' : 'none'
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
