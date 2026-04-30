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

  const isMobile = window.matchMedia('(max-width: 991px)').matches

  if (!isMobile) {
    wrapper.style.display = 'block'
  }

  sections.forEach((section) => {
    const headerTitle = section.querySelector<HTMLElement>('.process_header p')
    const gridItems = Array.from(section.querySelectorAll<HTMLElement>('.process_grid-item'))
    const titleSplit = new SplitText(headerTitle!, {
      types: 'words',
      mask: 'words',
    })
    gsap.set(titleSplit.words, { yPercent: 100 })
    if (isMobile) {
      gsap.set([...gridItems], { autoAlpha: 0, y: 20 })
      gsap.to(titleSplit.words, {
        yPercent: 0,
        stagger: 0.1,
        scrollTrigger: {
          trigger: section,
          start: 'top 50%',
          toggleActions: 'play none none none',
        },
      })
      ;[...gridItems].forEach((item) => {
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

      gsap.set([...gridItems], { autoAlpha: 0, y: 20 })

      const scrollDistance = gridItems.length * 120

      const sectionTimeline = gsap.timeline({
        scrollTrigger: {
          trigger: section,
          start: 'top top',
          end: `+=${scrollDistance}`,
          pin: true,
          pinSpacing: true,
          scrub: true,
          markers: false,
          invalidateOnRefresh: true,
        },
      })
      sectionTimeline.to(titleSplit.words, {
        yPercent: 0,
        stagger: 0.1,
      })

      // headerTitle.forEach((headerItem) => {
      //   sectionTimeline.to(
      //     headerItem,
      //     { autoAlpha: 1, y: 0, duration: 1, ease: 'power2.out' },
      //     '<0.3',
      //   )
      // })

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
