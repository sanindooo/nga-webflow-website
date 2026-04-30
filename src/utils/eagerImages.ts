/**
 * Eager Images
 *
 * Promotes loading="lazy" images to eager when marked with [data-eager],
 * either on the image itself or on any ancestor (typically a section or card).
 *
 * Use when images lack proper width/height attributes — for example
 * API-uploaded Webflow CMS images that emit width="Auto" height="Auto" — and
 * therefore don't reserve aspect-ratio space. Without that reservation, each
 * image load shifts layout downward, and any ScrollTrigger animation below
 * the shift fires against a stale cached start position.
 *
 * Promoting to eager forces the browser to start loading these images
 * immediately, so window.load waits for them and ScrollTrigger's post-load
 * refresh in gsapSmoothScroll measures against the settled layout.
 *
 *   <section data-eager>...</section>          → all lazy imgs inside
 *   <img data-eager loading="lazy" src="..." /> → just this image
 *
 * Must run before any ScrollTrigger-creating module (i.e. first inside
 * Webflow.push).
 */

export const eagerImages = () => {
  document.querySelectorAll<HTMLElement>('[data-eager]').forEach((element) => {
    if (element instanceof HTMLImageElement && element.loading === 'lazy') {
      element.loading = 'eager'
    }
    element.querySelectorAll<HTMLImageElement>('img[loading="lazy"]').forEach((image) => {
      image.loading = 'eager'
    })
  })
}
