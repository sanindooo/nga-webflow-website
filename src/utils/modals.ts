/**
 * Modals — accessible dialog open/close.
 *
 * DOM contract (set in Webflow Designer):
 *   - Trigger:    `[data-modal-open="{id}"]` — value matches a modal's id
 *   - Modal:      `[role="dialog"]` with a native `id` attribute
 *   - Close:      `[data-modal-close]`
 *   - Overlay:    `[data-modal-overlay]` — optional global backdrop
 *                 (individual modals can opt out with `data-modal-no-overlay`)
 *
 * Open state is expressed via the `is-open` class — CSS handles visibility,
 * animation, and easing via Webflow combo classes.
 *
 * ScrollSmoother constraint: the dialog and overlay must live OUTSIDE
 * `#smooth-content` in Designer, otherwise their `position: fixed` resolves
 * against the transformed content layer instead of the viewport. For static
 * modals, place them as a sibling of the page's main wrapper. For CMS-bound
 * modals, render them via a second Collection List that lives outside the
 * main wrapper (the trigger card list stays inside, the modal list is its
 * own sibling list — both bound to the same collection, slug-based ids
 * pair them via `data-modal-open`).
 *
 * Focus management is unaffected by DOM placement: the script finds modals
 * via `getElementById`, so triggers and dialogs can live anywhere.
 */

const FOCUSABLE_SELECTOR = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled]):not([type="hidden"])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(',')

export const modals = () => {
  const modalElements = document.querySelectorAll<HTMLElement>('[role="dialog"]')
  if (!modalElements.length) return

  const overlayElement = document.querySelector<HTMLElement>('[data-modal-overlay]')

  let activeModal: HTMLElement | null = null
  let activeTrigger: HTMLElement | null = null

  modalElements.forEach((modal) => {
    if (!modal.id) return

    const titleElement = modal.querySelector<HTMLElement>('h1, h2, h3, h4, h5, h6')
    if (titleElement) {
      if (!titleElement.id) titleElement.id = `${modal.id}-title`
      modal.setAttribute('aria-labelledby', titleElement.id)
    }

    const descriptionElement = modal.querySelector<HTMLElement>(
      '.w-richtext, [role="document"], p',
    )
    if (descriptionElement) {
      if (!descriptionElement.id) descriptionElement.id = `${modal.id}-desc`
      modal.setAttribute('aria-describedby', descriptionElement.id)
    }
  })

  function getFocusableElements(root: HTMLElement): HTMLElement[] {
    return Array.from(root.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)).filter(
      (element) => !element.hasAttribute('disabled') && element.offsetParent !== null,
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

    // Defer focus until the open transition has finished. Focusing while the
    // modal is mid-slide leaves the focusable below the viewport edge — under
    // ScrollSmoother with normalizeScroll: true, the browser's focus-into-view
    // request bypasses preventScroll:true and ScrollSmoother actually scrolls
    // the page (verified via debug overlay showing scrollTop jumping from 0
    // to ~the trigger's Y position). Deferring puts the focusable inside the
    // viewport before focus runs, so there's nothing to scroll into view.
    focusAfterTransition(modal)
  }

  function focusAfterTransition(modal: HTMLElement) {
    const computed = getComputedStyle(modal)
    const duration = parseSecondsList(computed.transitionDuration)
    const delay = parseSecondsList(computed.transitionDelay)
    const waitMs = Math.max(50, (duration + delay) * 1000 + 50)
    window.setTimeout(() => {
      if (activeModal !== modal) return
      const focusable = getFocusableElements(modal)
      const firstFocusable = focusable[0] ?? modal
      firstFocusable.focus({ preventScroll: true })
    }, waitMs)
  }

  function parseSecondsList(value: string): number {
    return Math.max(
      0,
      ...value.split(',').map((v) => {
        const trimmed = v.trim()
        if (trimmed.endsWith('ms')) return parseFloat(trimmed) / 1000
        if (trimmed.endsWith('s')) return parseFloat(trimmed)
        return 0
      }),
    )
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

    trigger?.focus({ preventScroll: true })

    activeModal = null
    activeTrigger = null
  }

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
