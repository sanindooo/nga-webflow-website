/**
 * Logo Animation
 *
 * On load the long logo (.u-full) is visible. After 100px of scroll it slides
 * down (yPercent 100) while the short logo (.u-icon) slides in from above
 * (yPercent -100 → 0). overflow:hidden on the wrapper clips both elements,
 * giving a single-slot reveal effect. Reverses when scrolling back to top.
 */

export const logoAnimation = () => {
  const wrapper = document.querySelector<HTMLElement>('.nav-brand_link')
  const longLogo = document.querySelector<HTMLElement>('.nav-custom_logo.u-full')
  const shortLogo = document.querySelector<HTMLElement>('.nav-custom_logo.u-icon')

  if (!wrapper || !longLogo || !shortLogo) return

  // Clip both logos to the wrapper bounds
  gsap.set(wrapper, {
    overflow: 'hidden',
    position: 'relative',
    display: 'grid',
    gridTemplateColumns: '1fr',
    gridTemplateRows: '1fr',
    padding: '4px 0',
  })

  // Long logo starts visible; short logo parked above, ready to enter
  gsap.set(longLogo, { display: 'flex', yPercent: 0, gridArea: '1 / 1' })
  gsap.set(shortLogo, { yPercent: 10, gridArea: '1 / 1' })

  const tl = gsap.timeline()
  tl.to(longLogo, { yPercent: -110, duration: 0.4, ease: 'power2.inOut' }, 0).to(
    shortLogo,
    { yPercent: -100, duration: 0.4, ease: 'power2.inOut' },
    0,
  )

  // Fire when page has scrolled 100px; reverse when scrolling back up
  ScrollTrigger.create({
    start: 100,
    animation: tl,
    toggleActions: 'play none none reverse',
  })
}
