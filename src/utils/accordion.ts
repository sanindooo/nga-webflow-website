/**
 * Accordion — toggles accordion items with accessibility attributes.
 * Targets .accordion_header / .accordion_content elements.
 */

export const accordion = () => {
  const accordionTriggers = document.querySelectorAll<HTMLElement>('.accordion_header')

  if (!accordionTriggers.length) return

  function toggleAccordion(item: HTMLElement, height: number) {
    accordionTriggers.forEach((otherItem) => {
      if (otherItem !== item) {
        otherItem.setAttribute('aria-expanded', 'false')
        otherItem.classList.remove('is-active')
        const otherContent = otherItem.nextElementSibling as HTMLElement | null
        if (otherContent) {
          otherContent.style.maxHeight = '0px'
        }
      }
    })

    const isExpanded = item.getAttribute('aria-expanded') === 'true'
    item.setAttribute('aria-expanded', isExpanded ? 'false' : 'true')
    item.classList.toggle('is-active')

    const text = item.nextElementSibling as HTMLElement | null
    if (text) {
      text.style.maxHeight = text.style.maxHeight === '0px' ? `${height + 9 * 14}px` : '0px'
    }
  }

  accordionTriggers.forEach((item, index) => {
    const contentWrapper = item.nextElementSibling as HTMLElement | null
    if (!contentWrapper) return

    contentWrapper.style.maxHeight = '0px'

    const accordionId = `accordion-${index}`
    const accordionTargetId = `accordion-target-${index}`

    item.id = accordionId
    item.setAttribute('aria-controls', accordionTargetId)

    contentWrapper.id = accordionTargetId
    contentWrapper.setAttribute('aria-labelledby', accordionId)

    item.addEventListener('click', (event) => {
      event.preventDefault()
      const content = contentWrapper.querySelector<HTMLElement>('.accordion_content')
      if (!content) return
      toggleAccordion(item, content.offsetHeight)
    })
  })
}
