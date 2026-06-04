/**
 * Logo Animation
 *
 * Desktop-only (≥992px). On load the long logo (.u-full) is visible. After
 * 100px of scroll it slides up while the short logo (.u-icon) slides in from
 * below. overflow:clip on the wrapper clips both elements, giving a single-slot
 * reveal effect. Reverses when scrolling back to top.
 *
 * Wrapped in gsap.matchMedia so that crossing the 992px boundary at runtime
 * (dev resizing, mobile rotation, browser zoom) sets up or tears down the
 * animation cleanly. gsap.matchMedia automatically reverts every tween and
 * ScrollTrigger created inside the callback when the query stops matching,
 * which clears the inline transform GSAP wrote on the icon so the Designer's
 * mobile-breakpoint `transform: none` rule can take over and reveal the icon.
 */

export const logoAnimation = () => {
  const wrapper = document.querySelector<HTMLElement>('.nav-brand_link')
  const longLogo = document.querySelector<HTMLElement>('.nav-custom_logo.u-full')
  const shortLogo = document.querySelector<HTMLElement>('.nav-custom_logo.u-icon')

  if (!wrapper || !longLogo || !shortLogo) return

  const mm = gsap.matchMedia()

  mm.add({ isDesktop: '(min-width: 992px)' }, () => {
    gsap.set(wrapper, { overflow: 'clip', position: 'relative' })

    // GSAP reads the CSS `transform: translateY(115%)` as a pixel matrix
    // (43.4664px at this viewport) and stores it as `y`, not `yPercent`.
    // Re-declare the rest state explicitly in percent so the tween below
    // animates from 115% → 0% instead of thinking yPercent is already 0.
    gsap.set(shortLogo, { y: 0, yPercent: 115 })

    const tl = gsap.timeline()
    tl.to(longLogo, { yPercent: -114, duration: 0.4, ease: 'power2.inOut' }, 0).to(
      shortLogo,
      { yPercent: 0, duration: 0.4, ease: 'power2.inOut' },
      0,
    )

    ScrollTrigger.create({
      start: 100,
      animation: tl,
      toggleActions: 'play none none reverse',
      // Re-read cached pixel values from the Designer's `translate` property
      // (Move: 0px, 115%, 0px) when the viewport resizes — otherwise the
      // stale 43.4664px shifts the icon down and exposes the wordmark edge.
      invalidateOnRefresh: true,
    })
  })
}
