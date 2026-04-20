/**
 * Sticky Filter Hide/Show
 *
 * Hides the sticky filter bar on scroll down, reveals on scroll up.
 * Targets .section_news-filter elements with position: sticky.
 */

export const stickyFilter = () => {
  const filterBar = document.querySelector<HTMLElement>('.section_news-filter')
  if (!filterBar) return

  let isHidden = false
  let isStuck = false

  ScrollTrigger.create({
    trigger: filterBar,
    start: 'top top',
    onEnter: () => {
      isStuck = true
    },
    onLeaveBack: () => {
      isStuck = false
      if (isHidden) {
        isHidden = false
        gsap.set(filterBar, { y: '0%' })
      }
    },
  })

  ScrollTrigger.create({
    start: 'top top',
    end: 'max',
    onUpdate: (self: { direction: number }) => {
      if (!isStuck) return
      const down = self.direction === 1

      if (down && !isHidden) {
        isHidden = true
        gsap.to(filterBar, { y: '-100%', duration: 0.6, ease: 'power2.out' })
      } else if (!down && isHidden) {
        isHidden = false
        gsap.to(filterBar, { y: '0%', duration: 0.6, ease: 'power2.out' })
      }
    },
  })
}
