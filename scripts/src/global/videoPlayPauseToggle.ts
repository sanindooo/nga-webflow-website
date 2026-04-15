/**
 * Video Play/Pause Toggle
 *
 * Reveals .video-play-pause buttons only when the user has requested reduced
 * motion. The button is hidden by default in CSS; this script adds the
 * `is-visible` class when `prefers-reduced-motion: reduce` matches, so users
 * who prefer less motion can manually control autoplaying videos.
 *
 * Updates live if the OS-level preference changes during the session.
 */

;(function () {
  'use strict'

  const __s = ((window as any).__loadedScripts ??= {})
  if (__s['videoPlayPauseToggle']) return; __s['videoPlayPauseToggle'] = true

  const VISIBLE_CLASS = 'is-visible'

  function applyPreference(prefersReducedMotion: boolean) {
    const buttons = document.querySelectorAll<HTMLElement>('.video-play-pause')
    buttons.forEach((button) => {
      button.classList.toggle(VISIBLE_CLASS, prefersReducedMotion)
    })
  }

  function init() {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)')

    applyPreference(mediaQuery.matches)

    mediaQuery.addEventListener('change', (event) => {
      applyPreference(event.matches)
    })
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init)
  } else {
    init()
  }
})()
