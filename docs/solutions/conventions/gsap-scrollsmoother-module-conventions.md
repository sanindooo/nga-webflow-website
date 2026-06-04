---
title: GSAP ScrollSmoother Module Conventions
date: 2026-05-28
category: conventions
module: nga-webflow-website
problem_type: convention
component: frontend_stimulus
severity: low
applies_when:
  - Building new GSAP-based utility modules for the Webflow custom code bundle
  - Adding overlay UIs (modals, nav menus, drawers) to a ScrollSmoother site
  - Adding inline scrollable containers inside smooth-content
  - Implementing scroll-aware element theming or visibility
  - Creating responsive animations with different desktop/mobile behavior
tags:
  - gsap
  - scrollsmoother
  - scrolltrigger
  - splittext
  - normalize-scroll
  - responsive-animation
  - module-pattern
  - webflow-bundle
---

# GSAP ScrollSmoother Module Conventions

## Context

This guidance emerges from a batch of client feedback fixes applied to the NGA Webflow website's custom JS bundle. The site uses a single TypeScript entry point (`src/index.ts`) that imports feature modules from `src/utils/`, built via esbuild into a single IIFE served from jsDelivr by git tag. The runtime environment is GSAP with ScrollSmoother, SplitText, ScrollTrigger, and Swiper as ambient CDN globals inside a `Webflow.push` callback.

The fixes addressed real user-reported issues: scroll bleeding through nav overlays, horizontal filter bars fighting ScrollSmoother's normalizeScroll, a floating button flashing between dark/light themes during scroll, and footer detection picking up the wrong element. These conventions codify the patterns that solved those problems into reusable rules for future modules.

## Guidance

### 1. ScrollSmoother pause/resume for overlay UIs

Any UI that takes over the viewport (modals, nav menus, drawers, lightboxes) must pause ScrollSmoother so the page does not scroll behind the overlay and so native scroll works inside the overlay content.

- Import `stopSmoothScroll` and `startSmoothScroll` from `gsapSmoothScroll.ts`
- Call `stopSmoothScroll()` immediately when the overlay opens
- Call `startSmoothScroll()` inside the close animation's `onComplete` callback — never before the animation finishes

```ts
import { stopSmoothScroll, startSmoothScroll } from '$utils/gsapSmoothScroll'

// Open
stopSmoothScroll()
overlay.classList.add('is-open')

// Close — resume only after animation completes
const tl = gsap.timeline({
  onComplete: () => {
    overlay.classList.remove('is-open')
    startSmoothScroll()
  },
})
tl.to(overlay, { autoAlpha: 0, duration: 0.3 })
```

Originally implemented for modals (`modals.ts`), now also applied to `navToggle.ts`. Every future overlay UI must follow the same contract.

### 2. `allowNestedScroll` for inline scrollable containers

When elements inside `#smooth-content` need their own scroll (horizontal filter bars, scrollable lists), configure ScrollSmoother's normalizeScroll with the `allowNestedScroll` option.

```ts
// Before — breaks nested scroll
ScrollSmoother.create({ normalizeScroll: true })

// After — nested scrollable elements work naturally
ScrollSmoother.create({ normalizeScroll: { allowNestedScroll: true } })
```

### 3. Scroll-aware element theming via ScrollTrigger intersection tracking

When an element's appearance must change based on what content it overlaps during scroll, use per-element `ScrollTrigger.create()` instances that track active intersections in a `Set`, with a debounced `requestAnimationFrame` evaluation to prevent flashing from paired elements toggling at slightly different subpixel times.

```ts
const activeFigures = new Set<HTMLElement>()
let evaluatePending = false

const scheduleEvaluate = () => {
  if (evaluatePending) return
  evaluatePending = true
  requestAnimationFrame(() => {
    evaluatePending = false
    evaluate()
  })
}

figures.forEach((figure) => {
  ScrollTrigger.create({
    trigger: figure,
    start: () => `top ${getButtonCenter()}`,
    end: () => `bottom ${getButtonCenter()}`,
    onToggle: (self: ScrollTriggerInstance) => {
      if (self.isActive) activeFigures.add(figure)
      else activeFigures.delete(figure)
      scheduleEvaluate()
    },
  })
})
```

Gate with `gsap.matchMedia()` to skip below breakpoints where the logic is irrelevant.

### 4. `autoAlpha` instead of `opacity` for hiding elements

Use `gsap.to(el, { autoAlpha: 0 })` rather than `opacity: 0`. `autoAlpha` sets `opacity` to the target value and, when that value is 0, also sets `visibility: hidden` and `pointer-events: none` — preventing invisible elements from intercepting clicks.

```ts
// Wrong — element is invisible but still clickable
gsap.to(el, { opacity: 0 })

// Correct — element is invisible and non-interactive
gsap.to(el, { autoAlpha: 0 })
```

### 5. Single-class theme toggling with safe defaults

When an element has a default visual state (e.g., a light-colored button), only toggle the opposite class. Use `classList.toggle('is-dark', condition)` so the element falls back to its default state if detection logic fails.

```ts
// Correct — default is light, only add is-dark when needed
button.classList.toggle('is-dark', isOverWhiteSpace)

// Wrong — toggling between two classes risks both being absent
button.classList.remove('is-light')
button.classList.add('is-dark')
```

### 6. `gsap.matchMedia()` keyed-object form for responsive animations

Use the keyed-object form when animations differ between breakpoints. This matches the project's `gsap.d.ts` type declarations and auto-reverts animations when the media query changes.

```ts
const mm = gsap.matchMedia()
mm.add(
  { isDesktop: '(min-width: 481px)', isMobile: '(max-width: 480px)' },
  (context) => {
    const { isMobile } = context.conditions
    if (isMobile) {
      // simpler animation — no SplitText, no pins
      gsap.from(heading, { y: 20, autoAlpha: 0 })
      return
    }
    // desktop — full SplitText word reveal, ScrollTrigger pins
  },
)
```

### 7. SplitText word reveal pattern

For text reveal animations, split into words and lines, mask the lines with `overflow: hidden` (never use `mask: 'lines'`), offset words downward, and animate to origin.

```ts
const split = new SplitText(heading, {
  types: 'words, lines',
  wordsClass: 'sticky-word',
})
gsap.set(split.lines, { overflow: 'hidden' })
gsap.set(split.words, { y: '110%' })
gsap.timeline().to(split.words, { y: '0%', stagger: 0.1 })
```

The `mask: 'lines'` option breaks inline word flow. Setting `overflow: hidden` on each line element manually achieves the same visual mask without layout side effects. (auto memory [claude])

### 8. Footer selector specificity

Use `.footer` (class selector) to target the site-level footer, never `footer` (HTML tag selector). The project's semantic HTML rules mandate `<footer>` elements on CTA wrappers throughout components, so `querySelector('footer')` matches the first CTA wrapper in DOM order, not the site footer.

```ts
// Wrong — matches first <footer> in DOM, which is a CTA wrapper
const siteFooter = document.querySelector('footer')

// Correct — targets the site-level footer by class
const siteFooter = document.querySelector<HTMLElement>('.footer')
```

## Why This Matters

- **ScrollSmoother pause/resume:** Without pausing, the page scrolls behind modals and nav overlays, making them unusable on touch devices. Resuming too early (before the close animation completes) causes visible scroll jumps.
- **allowNestedScroll:** ScrollSmoother's `normalizeScroll` intercepts all scroll events including those on nested scrollable containers. Without this flag, horizontal filter bars and scrollable lists become inoperable.
- **Debounced intersection theming:** ScrollTrigger `onToggle` callbacks for adjacent elements can fire at slightly different subpixel scroll positions within a single frame. Without the `Set` + `requestAnimationFrame` debounce, the element flashes between states.
- **autoAlpha:** Invisible-but-clickable elements cause mysterious interaction bugs where users click on hidden UI and nothing visible responds.
- **Single-class theming:** A single-toggle approach with a CSS-defined default state means failure is invisible to the user — if detection logic fails, the element stays in its most common state.
- **Footer selector specificity:** Direct consequence of the project's semantic HTML conventions — `<footer>` tags on CTA wrappers make the tag selector unreliable for the site footer.

## When to Apply

- **ScrollSmoother pause/resume:** Every overlay UI that should prevent background scroll
- **allowNestedScroll:** Any container with its own scroll behavior inside `#smooth-content`
- **Debounced intersection theming:** When an element's visual state depends on which content section it overlaps, and multiple triggers can be active simultaneously
- **autoAlpha:** Always when using GSAP to hide elements — there is no reason to use `opacity: 0` alone
- **Single-class theming:** Whenever toggling visual variants on elements with a sensible default state
- **matchMedia keyed-object form:** When desktop and mobile animations differ in structure, not just values
- **SplitText word reveal:** Any heading or text block reveal animation
- **Footer class selector:** Any module that references the site-level footer

## Examples

### Before/After: Nav overlay scroll bleed

**Before** — nav opens but page scrolls behind it on mobile:
```ts
const openNav = () => {
  navWrapper.classList.add('is-open')
  gsap.to(navWrapper, { autoAlpha: 1 })
}
```

**After** — page scroll is locked while nav is open:
```ts
import { stopSmoothScroll, startSmoothScroll } from '$utils/gsapSmoothScroll'

const openNav = () => {
  stopSmoothScroll()
  navWrapper.classList.add('is-open')
  gsap.to(navWrapper, { autoAlpha: 1 })
}

const closeNav = () => {
  gsap.to(navWrapper, {
    autoAlpha: 0,
    onComplete: () => {
      navWrapper.classList.remove('is-open')
      startSmoothScroll()
    },
  })
}
```

### Before/After: Floating button theme flash

**Before** — direct class toggle in each callback causes flash:
```ts
ScrollTrigger.create({
  trigger: figure,
  onEnter: () => button.classList.add('is-dark'),
  onLeave: () => button.classList.remove('is-dark'),
})
```

**After** — Set-based tracking with rAF debounce eliminates flash:
```ts
const active = new Set<HTMLElement>()
let pending = false
const evaluate = () => { pending = false; button.classList.toggle('is-dark', shouldBeDark()) }
const schedule = () => { if (!pending) { pending = true; requestAnimationFrame(evaluate) } }

ScrollTrigger.create({
  trigger: figure,
  onToggle: (self: ScrollTriggerInstance) => {
    self.isActive ? active.add(figure) : active.delete(figure)
    schedule()
  },
})
```

## Related

- [`../integration-issues/scrollsmoother-modal-paused-scroll-lock.md`](../integration-issues/scrollsmoother-modal-paused-scroll-lock.md) — Investigation trail for the pause/resume pattern (topic 1)
- [`../integration-issues/scrollsmoother-vs-lenis-cache-divergence.md`](../integration-issues/scrollsmoother-vs-lenis-cache-divergence.md) — ScrollSmoother adoption architecture and normalizeScroll origin (topic 2)
- [`../integration-issues/scrollsmoother-position-fixed-sticky-replacement.md`](../integration-issues/scrollsmoother-position-fixed-sticky-replacement.md) — ScrollTrigger pin utility context (topic 3)
- [`../integration-issues/scrolltrigger-mobile-premature-animations.md`](../integration-issues/scrolltrigger-mobile-premature-animations.md) — SplitText and eager-promote history (topic 4)
- [`../integration-issues/single-bundle-pier-point-migration.md`](../integration-issues/single-bundle-pier-point-migration.md) — Architectural foundation for the module pattern
