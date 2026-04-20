/**
 * Office Card Tabs — place/map tab switcher for office cards on the contact page.
 */

export const officeCardTabs = () => {
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

    tabContainer.setAttribute('role', 'tablist')

    Object.entries(panels).forEach(([key, panel]) => {
      const panelId = `office-${cardIndex}-${key}-panel`
      panel.id = panelId
      panel.setAttribute('role', 'tabpanel')
    })

    placePanel.classList.add('is-active')
    mapPanel.classList.remove('is-active')

    tabs.forEach((tab) => {
      const target = tab.getAttribute('data-office-tab')
      if (!target) return

      const panelId = `office-${cardIndex}-${target}-panel`
      const tabId = `office-${cardIndex}-${target}-tab`
      tab.id = tabId
      tab.setAttribute('role', 'tab')
      tab.setAttribute('aria-controls', panelId)
      panels[target]?.setAttribute('aria-labelledby', tabId)

      if (target === 'place') {
        tab.classList.add('is-active')
        tab.setAttribute('aria-selected', 'true')
      } else {
        tab.setAttribute('aria-selected', 'false')
      }

      tab.addEventListener('click', () => {
        tabs.forEach((sibling) => {
          sibling.classList.remove('is-active')
          sibling.setAttribute('aria-selected', 'false')
        })
        tab.classList.add('is-active')
        tab.setAttribute('aria-selected', 'true')

        Object.entries(panels).forEach(([key, panel]) => {
          panel.classList.toggle('is-active', key === target)
        })
      })
    })
  })
}
