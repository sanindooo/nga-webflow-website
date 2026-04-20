/**
 * Team Leaders — hover/click floating figure with randomised positions.
 */

const DURATION = 0.5

function getRandomX(): number {
  const minX = window.innerWidth * 0.2
  const maxX = window.innerWidth * 0.6
  return Math.floor(minX + Math.random() * (maxX - minX))
}

export const teamLeaders = () => {
  const mobileMediaQuery = window.matchMedia('(max-width: 991px)')

  const listItems = Array.from(document.querySelectorAll<HTMLElement>('.studio-team-list_item'))
  if (!listItems.length) return

  let activeMobileItem: HTMLElement | null = null

  listItems.forEach((item) => {
    const figure = item.querySelector<HTMLElement>('.studio-team_floating-figure')
    if (!figure) return

    gsap.set(figure, { autoAlpha: 0, border: '1px solid #717171', zIndex: 1000 })

    item.addEventListener('mouseenter', () => {
      if (mobileMediaQuery.matches) return
      const randomX = getRandomX()
      gsap.set(figure, { left: randomX })
      gsap.to(figure, { autoAlpha: 1, duration: DURATION, ease: 'power2.out' })
    })

    item.addEventListener('mouseleave', () => {
      if (mobileMediaQuery.matches) return
      gsap.to(figure, { autoAlpha: 0, duration: DURATION, ease: 'power2.in' })
    })

    item.addEventListener('click', () => {
      if (!mobileMediaQuery.matches) return

      if (activeMobileItem === figure) {
        gsap.to(figure, { autoAlpha: 0, duration: DURATION, ease: 'power2.in' })
        activeMobileItem = null
        return
      }

      if (activeMobileItem) {
        gsap.to(activeMobileItem, { autoAlpha: 0, duration: DURATION, ease: 'power2.in' })
      }

      gsap.set(figure, { left: 'auto', right: 16 })
      gsap.to(figure, { autoAlpha: 1, duration: DURATION, ease: 'power2.out' })
      activeMobileItem = figure
    })
  })
}
