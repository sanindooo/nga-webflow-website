/**
 * General Image Hover Scale
 *
 * Any <img> (or element) with [hover-scale="true"] scales up on hover.
 * The parent element gets overflow:hidden so the scale stays clipped.
 */

export const generalImageHover = () => {
  const images = Array.from(document.querySelectorAll<HTMLElement>('[hover-scale="true"]'))
  if (images.length === 0) return

  images.forEach((image) => {
    const parentElement = image.parentElement
    if (!parentElement) return

    gsap.set(parentElement, { overflow: 'hidden' })

    parentElement.addEventListener('mouseenter', () => {
      gsap.to(image, { scale: 1.1, duration: 0.5, ease: 'power2.out' })
    })

    parentElement.addEventListener('mouseleave', () => {
      gsap.to(image, { scale: 1, duration: 0.5, ease: 'power2.out' })
    })
  })
}
