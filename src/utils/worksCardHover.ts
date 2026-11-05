/**
 * Works Card Hover — desktop-only hover reveal for works card overlay and content.
 */

interface CmsLoadListInstance {
  items: { element: HTMLElement }[]
  on: (event: string, callback: (addedItems: { element: HTMLElement }[]) => void) => void
}

const CARD_SELECTOR = '.works_list-item'

const cardsIn = (root: Element) =>
  root.matches(CARD_SELECTOR)
    ? [root as HTMLElement]
    : Array.from(root.querySelectorAll<HTMLElement>(CARD_SELECTOR))

export const worksCardHover = () => {
  const isTouchDevice = window.matchMedia('(hover: none)').matches

  const setUpCards = new WeakSet<HTMLElement>()

  const setupCard = (card: HTMLElement) => {
    if (setUpCards.has(card)) return
    setUpCards.add(card)
    const overlay = card.querySelector<HTMLElement>('.works_content-wrapper .overlay')
    const contentWrapper = card.querySelector<HTMLElement>('.works_content')
    const image = card.querySelector<HTMLElement>('img')
    if (isTouchDevice) {
      gsap.set(contentWrapper, { autoAlpha: 1, y: 0 })
      gsap.set(overlay, { autoAlpha: 1 })

      return
    }

    if (!overlay || !contentWrapper) return

    gsap.set(overlay, { autoAlpha: 0 })
    gsap.set(contentWrapper, { autoAlpha: 0, y: -12 })
    gsap.set(image?.parentElement, { overflow: 'hidden' })

    card.addEventListener('mouseenter', () => {
      gsap.to(overlay, { autoAlpha: 1, duration: 0.4, ease: 'power2.out' })
      gsap.to(contentWrapper, { autoAlpha: 1, y: 0, duration: 0.4, ease: 'power2.out' })
      if (image) gsap.to(image, { scale: 1.1, duration: 0.4, ease: 'power2.out' })
    })

    card.addEventListener('mouseleave', () => {
      gsap.to(overlay, { autoAlpha: 0, duration: 0.4, ease: 'power2.in' })
      gsap.to(contentWrapper, { autoAlpha: 0, y: -12, duration: 0.4, ease: 'power2.in' })
      if (image) gsap.to(image, { scale: 1, duration: 0.4, ease: 'power2.in' })
    })
  }

  cardsIn(document.body).forEach(setupCard)

  // Finsweet CMS Load fetches the later pages after load; set those cards up too.
  const fsAttributes = (window.fsAttributes ??= [])
  fsAttributes.push([
    'cmsload',
    (listInstances: CmsLoadListInstance[]) => {
      listInstances.forEach((listInstance) => {
        // Pages that landed before this callback ran.
        listInstance.items.forEach(({ element }) => cardsIn(element).forEach(setupCard))
        listInstance.on('additems', (addedItems) => {
          addedItems.forEach(({ element }) => cardsIn(element).forEach(setupCard))
        })
      })
    },
  ])
}
