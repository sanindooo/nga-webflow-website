/**
 * Random Images Fade In
 *
 * Pinned process-grid sections with staggered fade-in of header items and
 * shuffled grid items on scroll.
 */

export const randomImagesFadeIn = () => {
  const wrapper = document.querySelector<HTMLElement>('.process_grid-wrapper')
  if (!wrapper) return

  const sections = Array.from(wrapper.querySelectorAll<HTMLElement>('.process_compontent'))
  if (!sections.length) return

  wrapper.style.display = 'block'

  const isMobile = window.matchMedia('(max-width: 991px)').matches

  sections.forEach((section) => {
    const headerItems = Array.from(section.querySelectorAll<HTMLElement>('.process_header-item'))
    const gridItems = Array.from(section.querySelectorAll<HTMLElement>('.process_grid-item'))

    if (isMobile) {
      gsap.set([...headerItems, ...gridItems], { autoAlpha: 0, y: 20 })
      ;[...headerItems, ...gridItems].forEach((item) => {
        gsap.to(item, {
          autoAlpha: 1,
          y: 0,
          duration: 0.6,
          ease: 'power2.out',
          scrollTrigger: {
            trigger: item,
            start: 'top 50%',
            toggleActions: 'play none none none',
          },
        })
      })
    } else {
      const shuffledGridItems = [...gridItems].sort(() => Math.random() - 0.5)

      gsap.set([...headerItems, ...gridItems], { autoAlpha: 0, y: 20 })

      const scrollDistance = (headerItems.length + gridItems.length) * 120

      const sectionTimeline = gsap.timeline({
        scrollTrigger: {
          trigger: section,
          start: 'top top',
          end: `+=${scrollDistance}`,
          pin: true,
          pinSpacing: true,
          scrub: true,
          markers: false,
        },
      })

      headerItems.forEach((headerItem) => {
        sectionTimeline.to(
          headerItem,
          { autoAlpha: 1, y: 0, duration: 1, ease: 'power2.out' },
          '<0.3',
        )
      })

      shuffledGridItems.forEach((gridItem) => {
        sectionTimeline.to(
          gridItem,
          { autoAlpha: 1, y: 0, duration: 1, ease: 'power2.out' },
          '<0.3',
        )
      })
    }
  })
}
