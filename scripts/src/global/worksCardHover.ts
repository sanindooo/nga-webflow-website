// card item class name .works_list-item
// card item overlay class name .works_content-wrapper .overlay
// card item content wrapper class name .works_content

;(function () {
  'use strict'

  const __s = ((window as any).__loadedScripts ??= {})
  if (__s['worksCardHover']) return
  __s['worksCardHover'] = true

  const desktopMediaQuery = window.matchMedia('(min-width: 992px)')

  function applyDesktopStyles(card: HTMLElement, overlay: HTMLElement, contentWrapper: HTMLElement) {
    overlay.style.opacity = '0'
    overlay.style.transition = 'opacity 0.4s ease'
    contentWrapper.style.transform = 'translateY(-12px)'
    contentWrapper.style.opacity = '0'
    contentWrapper.style.transition = 'transform 0.4s ease, opacity 0.4s ease'
  }

  function removeDesktopStyles(overlay: HTMLElement, contentWrapper: HTMLElement) {
    overlay.style.opacity = ''
    overlay.style.transition = ''
    contentWrapper.style.transform = ''
    contentWrapper.style.opacity = ''
    contentWrapper.style.transition = ''
  }

  function init() {
    const cardItems = document.querySelectorAll<HTMLElement>('.works_list-item')

    cardItems.forEach((card) => {
      const overlay = card.querySelector<HTMLElement>('.works_content-wrapper .overlay')
      const contentWrapper = card.querySelector<HTMLElement>('.works_content')

      if (!overlay || !contentWrapper) return

      if (desktopMediaQuery.matches) {
        applyDesktopStyles(card, overlay, contentWrapper)
      }

      card.addEventListener('mouseenter', () => {
        if (!desktopMediaQuery.matches) return
        overlay.style.opacity = '1'
        contentWrapper.style.transform = 'translateY(0)'
        contentWrapper.style.opacity = '1'
      })

      card.addEventListener('mouseleave', () => {
        if (!desktopMediaQuery.matches) return
        overlay.style.opacity = '0'
        contentWrapper.style.transform = 'translateY(-12px)'
        contentWrapper.style.opacity = '0'
      })

      desktopMediaQuery.addEventListener('change', (event) => {
        if (event.matches) {
          applyDesktopStyles(card, overlay, contentWrapper)
        } else {
          removeDesktopStyles(overlay, contentWrapper)
        }
      })
    })
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init)
  } else {
    init()
  }
})()
