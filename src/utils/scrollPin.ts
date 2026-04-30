/**
 * Scroll Pin
 *
 * Declarative ScrollTrigger pin utility. Replaces CSS `position: fixed` and
 * `position: sticky` for elements inside `#smooth-content` — both break under
 * ScrollSmoother because the transformed wrapper creates a new containing
 * block (see scrollsmoother-position-fixed-sticky-replacement.md).
 *
 * Two pin types:
 *
 *   data-pin="fixed"   → pins to viewport for an explicit scroll range.
 *                        Defaults: start at element top hitting viewport top,
 *                        end at end of page. Override with data-pin-start /
 *                        data-pin-end (any ScrollTrigger position string).
 *
 *   data-pin="sticky"  → pins to viewport while parent wrapper is in view.
 *                        Pin activates when element's top hits viewport top
 *                        (offset by data-pin-top), releases when parent's
 *                        bottom hits viewport bottom. Equivalent to native
 *                        position:sticky bounded by parent.
 *
 * Offsets (any CSS length — bare numbers get `px`, otherwise pass-through):
 *
 *   data-pin-top, data-pin-left, data-pin-right, data-pin-bottom, data-pin-z
 *   data-pin-mobile-top, ...mobile-z   — overrides at (max-width: 991px)
 *   data-pin-disable-mobile             — skip pin entirely below breakpoint
 *
 * Sticky parent override:
 *
 *   data-pin-parent="<selector>"        — closest matching ancestor used as
 *                                         end trigger. Defaults to parentElement.
 *
 * Element positioning: any element carrying offset attributes gets
 * `position: relative` applied inline so the offsets resolve. ScrollTrigger
 * captures the offset position at pin activation and preserves it for the
 * pinned range under ScrollSmoother.
 *
 * Wired into src/index.ts after gsapSmoothScroll() so #smooth-content exists
 * before pin creation. Re-applies on breakpoint crossings via matchMedia.
 */

const BREAKPOINT = '(max-width: 991px)'

type PinType = 'fixed' | 'sticky'

interface OffsetSet {
  top?: string
  left?: string
  right?: string
  bottom?: string
  z?: string
}

interface PinConfig {
  type: PinType
  desktop: OffsetSet
  mobile: OffsetSet
  disableOnMobile: boolean
  parentSelector?: string
  startStr?: string
  endStr?: string
}

export const scrollPin = () => {
  const elements = document.querySelectorAll<HTMLElement>('[data-pin]')
  if (!elements.length) return

  const mql = window.matchMedia(BREAKPOINT)

  elements.forEach((element) => {
    const config = readConfig(element)
    if (!config) return

    let trigger: ScrollTriggerInstance | null = null

    const apply = () => {
      if (trigger) {
        trigger.kill(true)
        trigger = null
      }
      clearOffsets(element)

      const isMobile = mql.matches
      if (isMobile && config.disableOnMobile) return

      const offsets = mergeOffsets(isMobile ? config.mobile : {}, config.desktop)
      applyOffsets(element, offsets)
      trigger = createTrigger(element, config, offsets)
    }

    apply()
    mql.addEventListener('change', apply)
  })
}

const readConfig = (element: HTMLElement): PinConfig | null => {
  const type = element.getAttribute('data-pin')
  if (type !== 'fixed' && type !== 'sticky') {
    console.warn(`[scrollPin] data-pin="${type}" is invalid — must be "fixed" or "sticky"`, element)
    return null
  }

  const get = (key: string, mobile = false) => {
    const value = element.getAttribute(mobile ? `data-pin-mobile-${key}` : `data-pin-${key}`)
    return value === null ? undefined : value
  }

  return {
    type,
    desktop: {
      top: get('top'),
      left: get('left'),
      right: get('right'),
      bottom: get('bottom'),
      z: get('z'),
    },
    mobile: {
      top: get('top', true),
      left: get('left', true),
      right: get('right', true),
      bottom: get('bottom', true),
      z: get('z', true),
    },
    disableOnMobile: element.hasAttribute('data-pin-disable-mobile'),
    parentSelector: get('parent'),
    startStr: get('start'),
    endStr: get('end'),
  }
}

const mergeOffsets = (primary: OffsetSet, fallback: OffsetSet): OffsetSet => ({
  top: primary.top ?? fallback.top,
  left: primary.left ?? fallback.left,
  right: primary.right ?? fallback.right,
  bottom: primary.bottom ?? fallback.bottom,
  z: primary.z ?? fallback.z,
})

const hasAnyOffset = (offsets: OffsetSet): boolean =>
  offsets.top !== undefined ||
  offsets.left !== undefined ||
  offsets.right !== undefined ||
  offsets.bottom !== undefined

const applyOffsets = (element: HTMLElement, offsets: OffsetSet) => {
  if (hasAnyOffset(offsets)) {
    element.style.position = 'relative'
  }
  element.style.top = withUnit(offsets.top)
  element.style.left = withUnit(offsets.left)
  element.style.right = withUnit(offsets.right)
  element.style.bottom = withUnit(offsets.bottom)
  element.style.zIndex = offsets.z ?? ''
}

const clearOffsets = (element: HTMLElement) => {
  element.style.position = ''
  element.style.top = ''
  element.style.left = ''
  element.style.right = ''
  element.style.bottom = ''
  element.style.zIndex = ''
}

const withUnit = (value: string | undefined): string => {
  if (value === undefined || value === '') return ''
  return /^-?\d+(\.\d+)?$/.test(value) ? `${value}px` : value
}

const createTrigger = (
  element: HTMLElement,
  config: PinConfig,
  offsets: OffsetSet,
): ScrollTriggerInstance | null => {
  const startStr = config.startStr ?? `top ${withUnit(offsets.top) || '0px'}`

  if (config.type === 'fixed') {
    return ScrollTrigger.create({
      trigger: element,
      start: startStr,
      end: config.endStr ?? 'max',
      pin: true,
      pinSpacing: false,
      invalidateOnRefresh: true,
    })
  }

  const parent = config.parentSelector
    ? element.closest<HTMLElement>(config.parentSelector) ?? element.parentElement
    : element.parentElement

  if (!parent) {
    console.warn('[scrollPin] sticky element has no parent — skipping', element)
    return null
  }

  return ScrollTrigger.create({
    trigger: element,
    start: startStr,
    endTrigger: parent,
    end: 'bottom bottom',
    pin: true,
    pinSpacing: false,
    invalidateOnRefresh: true,
  })
}
