export const footerTextSticky = () => {
  const section = document.querySelector<HTMLElement>('.section_follow-banner')
  if (!section) return

  const component = section.querySelector<HTMLElement>('.footer_follow-component')
  if (!component) return

  const heading = component.querySelector<HTMLElement>('h1, h2, h3, h4, h5, h6')
  if (!heading) return

  const links = Array.from(component.querySelectorAll<HTMLElement>('a'))

  const mm = gsap.matchMedia()

  mm.add(
    { isDesktop: '(min-width: 481px)', isMobile: '(max-width: 480px)' },
    (context) => {
      const { isMobile } = context.conditions

      if (isMobile) {
        const targets = [heading, ...links]
        gsap.set(targets, { opacity: 0, y: 20 })
        ScrollTrigger.create({
          trigger: section,
          start: 'top 80%',
          animation: gsap.to(targets, {
            opacity: 1,
            y: 0,
            duration: 0.6,
            stagger: 0.1,
            ease: 'power2.out',
          }),
        })
        return
      }

      const split = new SplitText(heading, {
        types: 'words, lines',
        wordsClass: 'sticky-word',
      })

      gsap.set(split.lines, { overflow: 'hidden' })
      gsap.set(split.words, { y: '110%' })
      gsap.set(links, { opacity: 0, y: 20 })

      const tl = gsap.timeline()
      tl.to(split.words, { y: '0%', stagger: 0.1 }).to(
        links,
        { opacity: 1, y: 0, duration: 0.4, stagger: 0.1, ease: 'power2.out' },
        '>-0.2',
      )

      ScrollTrigger.create({
        trigger: section,
        start: 'top 10%',
        end: 'bottom top',
        pin: component,
        pinSpacing: false,
      })

      ScrollTrigger.create({
        trigger: section,
        start: 'top 2%',
        end: 'bottom top',
        animation: tl,
      })
    },
  )
}
