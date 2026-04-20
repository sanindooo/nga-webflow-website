/**
 * GSAP Smooth Scroll (Lenis)
 *
 * Initialises Lenis, drives it from GSAP's ticker, and exposes stop/start so
 * modals can freeze scroll while open.
 */

let lenisInstance: LenisInstance | null = null

export const stopSmoothScroll = () => lenisInstance?.stop()
export const startSmoothScroll = () => lenisInstance?.start()

export const gsapSmoothScroll = () => {
  const lenis = new Lenis({
    prevent: (node: HTMLElement) => node.getAttribute('data-prevent-lenis') === 'true',
  })

  lenisInstance = lenis

  lenis.on('scroll', ScrollTrigger.update)

  gsap.ticker.add((time: number) => {
    lenis.raf(time * 1000)
  })

  gsap.ticker.lagSmoothing(0)
}
