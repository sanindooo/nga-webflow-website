/**
 * Video Play/Pause Toggle
 *
 * Reveals .video-play-pause buttons only when the user has requested reduced
 * motion. Updates live if the OS-level preference changes.
 */

const VISIBLE_CLASS = 'is-visible'

function applyPreference(prefersReducedMotion: boolean) {
  const buttons = document.querySelectorAll<HTMLElement>('.video-play-pause')
  buttons.forEach((button) => {
    button.classList.toggle(VISIBLE_CLASS, prefersReducedMotion)
  })
}

export const videoPlayPauseToggle = () => {
  const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)')

  applyPreference(mediaQuery.matches)

  mediaQuery.addEventListener('change', (event) => {
    applyPreference(event.matches)
  })
}
