/**
 * Gallery Layout
 *
 * Reads CMS-bound layout and alignment attributes from gallery image items
 * and applies dynamic flex-basis, aspect-ratio, and alignment styles.
 * Hides items that have no image source.
 *
 * Expected HTML:
 *   .dynamic-image_component  (flex-wrap container)
 *     .dynamic-image_item[data-layout][data-alignment]  (figure)
 *       .dynamic-image_image  (img)
 *
 * Layout values: "Full Width", "Full Width — Tall", "Large", "Large — Tall", "Half", "Half — Tall", "Small", "Small — Tall"
 * Alignment values: "Default", "Left", "Right"
 *
 * Dependencies: none
 */

;(function () {
  'use strict'

  const __s = ((window as any).__loadedScripts ??= {});
  if (__s['galleryLayout']) return; __s['galleryLayout'] = true;

  const GAP_REM = 1

  interface LayoutConfig {
    flexBasis: string
    aspectRatio: string
  }

  const layoutMap: Record<string, LayoutConfig> = {
    'full width': {
      flexBasis: '100%',
      aspectRatio: '16 / 9',
    },
    'full width — tall': {
      flexBasis: '100%',
      aspectRatio: '3 / 2',
    },
    'large': {
      flexBasis: `calc(66% - ${GAP_REM / 2}rem)`,
      aspectRatio: '4 / 3',
    },
    'large — tall': {
      flexBasis: `calc(66% - ${GAP_REM / 2}rem)`,
      aspectRatio: '3 / 4',
    },
    'small': {
      flexBasis: `calc(34% - ${GAP_REM / 2}rem)`,
      aspectRatio: '4 / 3',
    },
    'half': {
      flexBasis: `calc(50% - ${GAP_REM / 2}rem)`,
      aspectRatio: '4 / 3',
    },
    'half — tall': {
      flexBasis: `calc(50% - ${GAP_REM / 2}rem)`,
      aspectRatio: '3 / 4',
    },
    'small — tall': {
      flexBasis: `calc(34% - ${GAP_REM / 2}rem)`,
      aspectRatio: '3 / 4',
    },
  }

  function applyGalleryLayouts() {
    const galleryContainer = document.querySelector<HTMLElement>('.dynamic-image_component')
    if (!galleryContainer) return

    galleryContainer.style.display = 'flex'
    galleryContainer.style.flexWrap = 'wrap'
    galleryContainer.style.gap = `${GAP_REM}rem`

    const galleryItems = galleryContainer.querySelectorAll<HTMLElement>('.dynamic-image_item')

    galleryItems.forEach((item) => {
      const image = item.querySelector<HTMLImageElement>('.dynamic-image_image')

      // Hide items with no image source
      if (!image || !image.src || image.src === window.location.href) {
        item.style.display = 'none'
        return
      }

      const layoutValue = (item.getAttribute('data-layout') || '').trim().toLowerCase()
      const alignmentValue = (item.getAttribute('data-alignment') || '').trim().toLowerCase()

      const layoutConfig = layoutMap[layoutValue]
      if (!layoutConfig) {
        // Default to Large if no valid layout specified
        item.style.flexBasis = `calc(66% - ${GAP_REM / 2}rem)`
        item.style.aspectRatio = '4 / 3'
      } else {
        item.style.flexBasis = layoutConfig.flexBasis
        item.style.aspectRatio = layoutConfig.aspectRatio
      }

      // Alignment
      if (alignmentValue === 'right') {
        item.style.marginLeft = 'auto'
      }

      // Ensure image fills the container
      item.style.overflow = 'hidden'
      image.style.width = '100%'
      image.style.height = '100%'
      image.style.objectFit = 'cover'
    })
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', applyGalleryLayouts)
  } else {
    applyGalleryLayouts()
  }
})()
