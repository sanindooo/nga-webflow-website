/**
 * Modals
 *
 * Opens/closes modals via [button-function="modal-open"] triggers.
 * Pauses smooth scroll when modal is open.
 * Dependencies: gsapSmoothScroll (exposes window.stopSmoothScroll/startSmoothScroll)
 */

;(function () {
  'use strict'

  const __s = ((window as any).__loadedScripts ??= {});
  if (__s['modals']) return; __s['modals'] = true;

  function init() {
    const modalButtons = document.querySelectorAll<HTMLElement>('[button-function="modal-open"]')

    modalButtons.forEach((button) => {
      button.addEventListener('click', (e) => {
        e.preventDefault()
        const type = button.getAttribute('button-function-arg1')
        const name = button.getAttribute('button-function-arg2')
        const modal = document.querySelector(`[modal][modal-type="${type}"][modal-name="${name}"]`)
        modal?.setAttribute('is-open', '')

        document.body.style.top = `-${window.scrollY}px`
        document.body.classList.add('no-scroll')
        window.stopSmoothScroll?.()
      })
    })

    const modalCloseButtons = document.querySelectorAll<HTMLElement>('[modal-close]')

    modalCloseButtons.forEach((button) => {
      button.addEventListener('click', (e) => {
        e.preventDefault()

        const scrollY = Math.abs(parseInt(document.body.style.top || '0'))

        button.closest('[modal]')?.removeAttribute('is-open')

        document.body.classList.remove('no-scroll')
        document.body.style.top = ''
        window.scrollTo(0, scrollY)
        window.startSmoothScroll?.()
      })
    })
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init)
  } else {
    init()
  }
})()
