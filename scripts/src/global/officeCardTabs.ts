;(function () {
  'use strict'

  const __s = ((window as any).__loadedScripts ??= {})
  if (__s['officeCardTabs']) return
  __s['officeCardTabs'] = true

  function init() {
    const officeCards = document.querySelectorAll<HTMLElement>('.office-card_component')
    if (officeCards.length === 0) return

    officeCards.forEach((card, cardIndex) => {
      const placePanel = card.querySelector<HTMLElement>('.office-card_image')
      const mapPanel = card.querySelector<HTMLElement>('.office-card_map')
      const tabContainer = card.querySelector<HTMLElement>('.office-card_tabs')
      const tabs = card.querySelectorAll<HTMLElement>('.office-card_tab')

      if (!placePanel || !mapPanel || !tabContainer || tabs.length === 0) return

      const panels: Record<string, HTMLElement> = {
        place: placePanel,
        map: mapPanel,
      }

      // ARIA: tablist container
      tabContainer.setAttribute('role', 'tablist')

      // ARIA: assign IDs and roles to panels
      Object.entries(panels).forEach(([key, panel]) => {
        const panelId = `office-${cardIndex}-${key}-panel`
        panel.id = panelId
        panel.setAttribute('role', 'tabpanel')
      })

      // Set default state: place active
      placePanel.classList.add('is-active')
      mapPanel.classList.remove('is-active')

      tabs.forEach((tab) => {
        const target = tab.getAttribute('data-office-tab')
        if (!target) return

        // ARIA: tab role and linkage
        const panelId = `office-${cardIndex}-${target}-panel`
        const tabId = `office-${cardIndex}-${target}-tab`
        tab.id = tabId
        tab.setAttribute('role', 'tab')
        tab.setAttribute('aria-controls', panelId)
        panels[target]?.setAttribute('aria-labelledby', tabId)

        // Mark default active tab
        if (target === 'place') {
          tab.classList.add('is-active')
          tab.setAttribute('aria-selected', 'true')
        } else {
          tab.setAttribute('aria-selected', 'false')
        }

        tab.addEventListener('click', () => {
          // Toggle active class and aria-selected on tabs
          tabs.forEach((sibling) => {
            sibling.classList.remove('is-active')
            sibling.setAttribute('aria-selected', 'false')
          })
          tab.classList.add('is-active')
          tab.setAttribute('aria-selected', 'true')

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
