/**
 * Button Icon Hover — text slides up revealing a duplicate from below; square spins 360°.
 */

const DURATION = 0.5
const EASE = 'power2.out'
const ROTATION = 360

export const buttonIconHover = () => {
  const buttons = Array.from(document.querySelectorAll<HTMLAnchorElement>('.button.is-link.is-icon'))
  if (!buttons.length) return

  const isTouchDevice = window.matchMedia('(hover: none)').matches
  if (isTouchDevice) return

  buttons.forEach((button) => {
    const square = button.querySelector<HTMLElement>('.button-square')
    const textEl = Array.from(button.children).find(
      (child): child is HTMLElement =>
        child instanceof HTMLElement && !child.classList.contains('button-square')
    )
    if (!square || !textEl) return

    const text = textEl.textContent?.trim() ?? ''
    if (!text) return

    textEl.textContent = ''
    textEl.style.position = 'relative'
    textEl.style.overflow = 'hidden'
    textEl.style.display = 'inline-block'

    const original = document.createElement('span')
    original.textContent = text
    original.style.display = 'block'

    const clone = document.createElement('span')
    clone.textContent = text
    clone.setAttribute('aria-hidden', 'true')
    clone.style.display = 'block'
    clone.style.position = 'absolute'
    clone.style.top = '0'
    clone.style.left = '0'
    clone.style.width = '100%'
    clone.style.pointerEvents = 'none'

    textEl.append(original, clone)

    gsap.set(clone, { yPercent: 100 })

    button.addEventListener('mouseenter', () => {
      gsap.killTweensOf([original, clone, square])
      gsap.to(original, { yPercent: -100, duration: DURATION, ease: EASE })
      gsap.to(clone, { yPercent: 0, duration: DURATION, ease: EASE })
      gsap.to(square, { rotation: ROTATION, duration: DURATION, ease: EASE })
    })

    button.addEventListener('mouseleave', () => {
      gsap.killTweensOf([original, clone, square])
      gsap.to(original, { yPercent: 0, duration: DURATION, ease: EASE })
      gsap.to(clone, { yPercent: 100, duration: DURATION, ease: EASE })
      gsap.to(square, { rotation: 0, duration: DURATION, ease: EASE })
    })
  })
}
