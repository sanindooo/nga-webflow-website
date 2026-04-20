/**
 * GSAP Basic Animations
 *
 * Batch scroll-reveal animations for .slide-in and .fade-in elements.
 */

export const gsapBasicAnimations = () => {
  gsap.set('.slide-in', { y: 25, opacity: 0 })
  ScrollTrigger.batch('.slide-in', {
    start: 'top 80%',
    end: 'bottom 20%',
    onEnter: (batch: Element[]) => gsap.to(batch, { opacity: 1, y: 0, duration: 1 }),
  })

  gsap.set('.fade-in', { opacity: 0 })
  ScrollTrigger.batch('.fade-in', {
    start: 'top 80%',
    end: 'bottom 20%',
    onEnter: (batch: Element[]) => gsap.to(batch, { opacity: 1, duration: 1 }),
  })
}
