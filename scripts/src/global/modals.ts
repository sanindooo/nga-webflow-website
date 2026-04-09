/**
 * Modals
 *
 * Opens/closes accessible dialog modals.
 *
 * DOM contract (set in Webflow Designer):
 *   - Trigger:    `[data-modal-open="{id}"]` — value matches a modal's id
 *   - Modal:      `[role="dialog"]` with a native `id` attribute — both are
 *                 required. In the NGA CMS setup the id is bound to the
 *                 Principal's slug, producing one unique dialog per item.
 *   - Close:      `[data-modal-close]` — closes the active modal
 *   - Overlay:    `[data-modal-overlay]` — optional global backdrop, toggled
 *                 in sync with the active modal (usually also carries
 *                 `data-modal-close` so clicks on it dismiss the dialog).
 *                 Individual modals can opt out with `data-modal-no-overlay`.
 *
 * The open state is expressed via the `is-open` class on the modal (and the
 * overlay when one is present) — CSS handles the actual visibility,
 * animation, and easing via Webflow combo classes.
 *
 * Accessibility handled at runtime:
 *   - role="dialog" + aria-modal="true" (static, set in Designer)
 *   - aria-labelledby → first heading inside the modal
 *   - aria-describedby → first rich-text / paragraph block inside the modal
 *   - aria-hidden toggles with is-open
 *   - aria-expanded on the trigger toggles with is-open
 *   - Focus moves into the modal on open, returns to the trigger on close
 *   - Focus is trapped within the modal while open
 *   - ESC key closes the active modal
 *   - Clicking the modal's backdrop (the dialog element itself, outside content) closes
 *   - Body scroll is locked and smooth scroll is paused
 *
 * Dependencies: gsapSmoothScroll (exposes window.stopSmoothScroll / startSmoothScroll)
 */

;(function () {
  'use strict'

  const loadedScripts = ((window as any).__loadedScripts ??= {})
  if (loadedScripts['modals']) return
  loadedScripts['modals'] = true

  const FOCUSABLE_SELECTOR = [
    'a[href]',
    'button:not([disabled])',
    'input:not([disabled]):not([type="hidden"])',
    'select:not([disabled])',
    'textarea:not([disabled])',
    '[tabindex]:not([tabindex="-1"])',
  ].join(',')

  function init() {
    const modalElements = document.querySelectorAll<HTMLElement>('[role="dialog"]')
    if (!modalElements.length) return

    const overlayElement = document.querySelector<HTMLElement>('[data-modal-overlay]')

    let activeModal: HTMLElement | null = null
    let activeTrigger: HTMLElement | null = null
    let savedScrollY = 0

    // Prepare each modal once: wire aria-labelledby / aria-describedby to
    // the first heading and description element inside the dialog.
    modalElements.forEach((modal) => {
      if (!modal.id) return

      const titleElement = modal.querySelector<HTMLElement>('h1, h2, h3, h4, h5, h6')
      if (titleElement) {
        if (!titleElement.id) titleElement.id = `${modal.id}-title`
        modal.setAttribute('aria-labelledby', titleElement.id)
      }

      const descriptionElement = modal.querySelector<HTMLElement>(
        '.w-richtext, [role="document"], p'
      )
      if (descriptionElement) {
        if (!descriptionElement.id) descriptionElement.id = `${modal.id}-desc`
        modal.setAttribute('aria-describedby', descriptionElement.id)
      }
    })

    function getFocusableElements(root: HTMLElement): HTMLElement[] {
      return Array.from(root.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)).filter(
        (element) => !element.hasAttribute('disabled') && element.offsetParent !== null
      )
    }

    function openModal(modal: HTMLElement, trigger: HTMLElement) {
      if (activeModal) closeModal()

      activeModal = modal
      activeTrigger = trigger

      modal.classList.add('is-open')
      modal.setAttribute('aria-hidden', 'false')
      trigger.setAttribute('aria-expanded', 'true')

      const overlayEnabled = overlayElement && !modal.hasAttribute('data-modal-no-overlay')
      if (overlayEnabled) {
        overlayElement.classList.add('is-open')
        overlayElement.setAttribute('aria-hidden', 'false')
      }

      savedScrollY = window.scrollY
      document.body.style.top = `-${savedScrollY}px`
      document.body.classList.add('no-scroll')
      ;(window as any).stopSmoothScroll?.()

      // Move focus into the modal on the next frame so CSS transitions don't
      // fight with the focus ring position.
      requestAnimationFrame(() => {
        const focusable = getFocusableElements(modal)
        const firstFocusable = focusable[0] ?? modal
        firstFocusable.focus({ preventScroll: true })
      })
    }

    function closeModal() {
      if (!activeModal) return

      const modal = activeModal
      const trigger = activeTrigger

      modal.classList.remove('is-open')
      modal.setAttribute('aria-hidden', 'true')
      trigger?.setAttribute('aria-expanded', 'false')

      if (overlayElement) {
        overlayElement.classList.remove('is-open')
        overlayElement.setAttribute('aria-hidden', 'true')
      }

      document.body.classList.remove('no-scroll')
      document.body.style.top = ''
      window.scrollTo(0, savedScrollY)
      ;(window as any).startSmoothScroll?.()

      // Restore focus to the element that opened the modal.
      trigger?.focus({ preventScroll: true })

      activeModal = null
      activeTrigger = null
    }

    // Open: delegate from document so it works for CMS-rendered triggers.
    document.addEventListener('click', (event) => {
      const target = event.target as HTMLElement | null
      const trigger = target?.closest<HTMLElement>('[data-modal-open]')
      if (trigger) {
        event.preventDefault()
        const modalId = trigger.getAttribute('data-modal-open')
        if (!modalId) return
        const modal = document.getElementById(modalId)
        if (modal && modal.getAttribute('role') === 'dialog') {
          openModal(modal, trigger)
        }
        return
      }

      const closeButton = target?.closest<HTMLElement>('[data-modal-close]')
      if (closeButton && activeModal) {
        event.preventDefault()
        closeModal()
      }
    })

    // ESC to close + focus trap.
    document.addEventListener('keydown', (event) => {
      if (!activeModal) return

      if (event.key === 'Escape') {
        event.preventDefault()
        closeModal()
        return
      }

      if (event.key === 'Tab') {
        const focusable = getFocusableElements(activeModal)
        if (!focusable.length) {
          event.preventDefault()
          return
        }
        const firstFocusable = focusable[0]
        const lastFocusable = focusable[focusable.length - 1]
        const currentFocus = document.activeElement as HTMLElement | null

        if (event.shiftKey && currentFocus === firstFocusable) {
          event.preventDefault()
          lastFocusable.focus({ preventScroll: true })
        } else if (!event.shiftKey && currentFocus === lastFocusable) {
          event.preventDefault()
          firstFocusable.focus({ preventScroll: true })
        }
      }
    })
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init)
  } else {
    init()
  }
})()
