---
title: "ScrollSmoother breaks CSS position:fixed and position:sticky inside #smooth-content — declarative pin utility as replacement"
date: "2026-04-29"
category: "integration-issues"
component: "src/utils/scrollPin.ts, src/utils/gsapSmoothScroll.ts"
tags: [gsap, scrollsmoother, scrolltrigger, position-fixed, position-sticky, containing-block, pin, declarative-attributes]
severity: "medium"
status: "resolved"
resolved_in: "fix/scrolltrigger-site-wide-stability — scrollPin utility"
---

## Symptom summary

After migrating from Lenis to GSAP ScrollSmoother (see
[`scrollsmoother-vs-lenis-cache-divergence.md`](./scrollsmoother-vs-lenis-cache-divergence.md)),
elements that previously relied on CSS `position: fixed` or `position: sticky`
inside the page body stopped behaving correctly. Fixed elements scrolled with
content instead of staying anchored to the viewport. Sticky elements either
never stuck or stuck to the wrong reference point. The visual symptom was
identical to the broader nav/badge breakage, but it affected content-area
elements that didn't fit the "always fixed for the page lifecycle" pattern
that `[data-stick-viewport]` (reparent utility) is designed for.

## Root cause

ScrollSmoother in auto-wrap mode injects `<div id="smooth-wrapper"><div id="smooth-content">…</div></div>`
around the page body and applies `transform: translate3d(...)` to
`#smooth-content` every frame to drive the smooth scroll. Per the CSS
[Containing Block spec](https://www.w3.org/TR/css-position-3/#containing-block-details),
a transformed ancestor establishes a new containing block for descendants
positioned with `fixed` or `absolute`. The transform also breaks `position: sticky`
because sticky positioning is defined relative to the nearest scrollable
ancestor — under ScrollSmoother, the page no longer scrolls in the
conventional sense (the body has `overflow: hidden`, scrolling is simulated
via the transform on `#smooth-content`), so sticky doesn't activate against
viewport position the way it did under Lenis.

The class of elements that breaks is wider than just nav and badges:
- Sidebars that should stick within an article body
- Floating CTAs that should pin during a specific section
- Section labels or category indicators that should stick within their parent
- Any UI element whose previous CSS was `position: fixed` or `position: sticky`
  inside the main content area

The `[data-stick-viewport]` reparent utility (planned in
[`scrollsmoother-vs-lenis-cache-divergence.md`](./scrollsmoother-vs-lenis-cache-divergence.md))
solves the **always-fixed** case (nav, badge, modal overlay, cookie banner)
by moving those elements out of `#smooth-content` so native `position: fixed`
resolves to the viewport. It does not solve the **scroll-range pinned** or
**sticky-within-parent** cases — those need the element to remain inside
`#smooth-content` (so it returns to flow when the pin/stick releases) and to
appear fixed-to-viewport only during a defined range. That requires
ScrollTrigger pinning, not reparenting.

## Working solution

A new declarative attribute-driven module: `src/utils/scrollPin.ts`. Two pin
types map to the two original CSS use cases:

```html
<!-- replaces CSS: position: sticky; top: 6rem; (within parent bounds) -->
<aside data-pin="sticky"
       data-pin-top="6rem"
       data-pin-z="10"
       class="article_sidebar">
  ...
</aside>

<!-- replaces CSS: position: fixed; bottom: 2rem; right: 2rem; (during a section) -->
<a data-pin="fixed"
   data-pin-bottom="2rem"
   data-pin-right="2rem"
   data-pin-z="50"
   data-pin-end="bottom bottom"
   data-pin-disable-mobile
   class="pricing_cta">
  Get started
</a>
```

Under the hood, both types create a `ScrollTrigger.create({ pin: true, pinSpacing: false, … })`.
ScrollTrigger pin works correctly under ScrollSmoother because it accounts
for the `#smooth-content` transform when computing fixed positions — the
element is wrapped, kept at the correct viewport position via the same
transform-aware mechanism ScrollTrigger uses for all pinned content.

Differences from the underlying ScrollTrigger API:
- **Declarative**: configured via Webflow Designer custom attributes, no
  per-element JS. One module discovers all `[data-pin]` elements at boot.
- **Responsive**: `data-pin-mobile-*` overrides apply at `(max-width: 991px)`,
  `data-pin-disable-mobile` skips pin entirely below the breakpoint. Pin is
  killed and recreated on breakpoint crossings via `matchMedia` listener.
- **Flexible offsets**: bare numbers get `px`, CSS lengths pass through
  (`1rem`, `2vh`, `calc(100vh - 4rem)`). Same convention as
  `[data-stick-viewport]` for ergonomic parity.
- **Auto positioning fix**: any element with offset attributes gets
  `position: relative` applied inline so the offsets resolve. ScrollTrigger
  captures the offset position at pin activation.

Sticky end resolution: `data-pin="sticky"` uses `endTrigger: parentElement`
with `end: 'bottom bottom'`. The user can override via `data-pin-parent="<selector>"`
to point at any ancestor (closest match). This handles cases where the
immediate parent is a flex/grid wrapper but the meaningful boundary is a
section above it.

Fixed end resolution: `data-pin="fixed"` defaults `end` to `'max'` (end of
page). Most use cases override via `data-pin-end="bottom bottom"` (for
section-bound floating CTAs) or `data-pin-end="+=400"` (for fixed-distance
pins).

## What didn't work and why

1. **Toggling CSS `position: fixed` via inline style on ScrollTrigger
   onEnter/onLeave callbacks** — broken under ScrollSmoother for the same
   reason the original CSS was broken: the transformed `#smooth-content`
   ancestor creates a new containing block. `position: fixed` applied at
   any time inside that subtree positions relative to the transformed
   content, not the viewport.

2. **Reparenting the element to `#smooth-wrapper` on pin enter, back to
   original parent on pin leave** — works for positioning but breaks layout
   flow. The element's original slot in flow disappears during the pinned
   range, so content above shifts. CSS `position: sticky` preserves flow
   space (the element stays in flow, just visually pinned). Reparenting
   doesn't replicate that. Also at risk for IX2 listener desync if the
   element has Webflow interactions bound to a parent-relative selector.

3. **Using `position: sticky` natively on the element with an `overflow-y: auto`
   override on body** — would require disabling ScrollSmoother selectively,
   which is the opposite of the migration goal. Sticky positioning needs a
   specific scroll context that ScrollSmoother's `overflow: hidden` body
   doesn't provide.

4. **Wrapping the element in a custom div that does its own
   IntersectionObserver-based positioning** — reinvents what ScrollTrigger
   pin already does correctly. Per-element JS state, no shared lifecycle
   with the rest of the animation system, no ScrollTrigger refresh
   propagation. Worse on every axis.

The chosen solution (ScrollTrigger pin via declarative attributes)
piggy-backs on the existing animation lifecycle: the same `refresh()` cycle
that updates all other ScrollTriggers updates the pin positions, the same
breakpoint conventions apply, and there's no per-element JS scattered
through the bundle.

## Distinct from `[data-stick-viewport]`

These two utilities are conceptually distinct and complementary:

| Pattern | Tool | Mechanism |
|---------|------|-----------|
| Element pinned to viewport for a scroll range, then releases | `[data-pin="fixed"]` | ScrollTrigger pin inside `#smooth-content` |
| Element pinned within parent wrapper bounds | `[data-pin="sticky"]` | ScrollTrigger pin with `endTrigger: parent` |
| Element fixed to viewport for entire page life (nav, badge, modal overlay) | `[data-stick-viewport]` (planned) | Reparent to sibling of `#smooth-wrapper` |

`[data-pin]` keeps the element inside `#smooth-content` and uses
ScrollTrigger to manage viewport-correct positioning per frame.
`[data-stick-viewport]` moves the element out of `#smooth-content` entirely
so native `position: fixed` works against the viewport. Don't conflate the
two — applying `[data-stick-viewport]` to a content-area element would make
it sit on top of all other content for the entire page; applying
`[data-pin]` to a nav bar would only work if the nav fits a defined scroll
range, which it doesn't.

## Cross-references

- [`scrollsmoother-vs-lenis-cache-divergence.md`](./scrollsmoother-vs-lenis-cache-divergence.md) — architectural parent. ScrollSmoother migration that introduced the transformed-wrapper containing-block constraint. Includes the full design for `[data-stick-viewport]` (still to be implemented).
- [`docs/reference/scroll-pin.md`](../../reference/scroll-pin.md) — full attribute reference and usage examples for `[data-pin]`.
- `src/utils/scrollPin.ts` — implementation.
- `src/utils/gsapSmoothScroll.ts` — ScrollSmoother init. Defense-in-depth refresh hooks (now observing `#smooth-content`, not `document.body`) catch late layout shifts that pin recalculation depends on.
