/**
 * Nav Toggle — adds/removes "is-nav-open" class on .header.
 *
 * Open: fades nav items in with a small upward shift and reveals the blurred
 * header background. Close: plays the reverse — items fade out and the
 * background fades back to transparent.
 */

export const navToggle = () => {
  const toggle = document.querySelector<HTMLElement>('[data-nav="open"]')
  const header = document.querySelector<HTMLElement>('.header')
  const menu = document.querySelector<HTMLElement>('[data-nav="menu"]')
  const navLinks = document.querySelectorAll<HTMLAnchorElement>('.nav-custom_menu-link')
  const navList = document.querySelector<HTMLElement>('.nav-custom_list:not(.u-social-links)')
  const socialList = document.querySelector<HTMLElement>('.nav-custom_list.u-social-links')

  if (!toggle || !header) return

  toggle.setAttribute('role', 'button')
  toggle.setAttribute('aria-label', 'Open navigation menu')
  toggle.setAttribute('aria-expanded', 'false')
  if (menu) toggle.setAttribute('aria-controls', menu.id || 'nav-menu')

  let isAnimating = false

  const open = () => {
    header.classList.add('is-nav-open')
    gsap.to(header, {
      backgroundColor: 'rgba(250, 250, 250, 0.55)',
      backdropFilter: 'blur(20px)',
      duration: 0.35,
      ease: 'power2.out',
    })
    toggle.setAttribute('aria-expanded', 'true')
    toggle.setAttribute('aria-label', 'Close navigation menu')

    const items = [
      ...(navList ? Array.from(navList.children) : []),
      ...(socialList ? Array.from(socialList.children) : []),
    ]

    if (items.length) {
      gsap.fromTo(
        items,
        { opacity: 0, y: 8 },
        { opacity: 1, y: 0, duration: 0.35, ease: 'power2.out' },
      )
    }
  }

  const close = () => {
    if (isAnimating) return
    isAnimating = true
    toggle.setAttribute('aria-expanded', 'false')
    toggle.setAttribute('aria-label', 'Open navigation menu')

    const timeline = gsap.timeline({
      onComplete: () => {
        header.classList.remove('is-nav-open')
        isAnimating = false
      },
    })

    const items = [
      ...(navList ? Array.from(navList.children) : []),
      ...(socialList ? Array.from(socialList.children) : []),
    ]
    if (items.length) {
      timeline.to(items, { opacity: 0, y: 8, duration: 0.35, ease: 'power2.in' }, 0)
    }
    timeline.to(
      header,
      {
        backgroundColor:
          header.getAttribute('data-wf--main-nav--variant') === 'white-bg'
            ? 'rgb(255,255,255)'
            : 'rgba(250, 250, 250, 0)',
        backdropFilter: 'blur(0px)',
        duration: 0.35,
        ease: 'power2.in',
      },
      0,
    )
  }

  const isOpen = () => header.classList.contains('is-nav-open')

  toggle.addEventListener('click', () => {
    if (isAnimating) return
    if (isOpen()) close()
    else open()
  })

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && isOpen()) close()
  })

  navLinks.forEach((link) =>
    link.addEventListener('click', () => {
      if (!isAnimating) close()
    }),
  )
}
