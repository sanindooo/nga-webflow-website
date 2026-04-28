---
title: "ScrollTrigger firing early: stale start/end positions from late image loads"
date: "2026-04-21"
category: "integration-issues"
component: "src/utils/gsapSmoothScroll.ts, src/utils/generalScrollTextReveal.ts"
tags: [gsap, scrolltrigger, lenis, split-text, race-condition, image-loading, layout-shift, refresh]
severity: "high"
root_cause: "ScrollTrigger caches each trigger's start/end pixel positions at creation time and only auto-refreshes on window resize / load / DOMContentLoaded. When an image (or any late-loading asset) finishes after ScrollTrigger has already measured, it pushes content below it downward — but the cached positions are now above the element, so the trigger fires early. Intermittent because it depends on whether the image finishes before or after measurement, which varies by network/cache state."
date_resolved: "2026-04-21"
superseded_by: "scrolltrigger-mobile-premature-animations.md (v1.0.13)"
---

> **Update (v1.0.13):** The three-layer refresh pattern documented below is
> correct and still shipped as defense-in-depth, but it is no longer the
> primary fix. The reactive approach failed on iOS Safari where refresh
> during momentum scroll is unreliable. The canonical first-line fix is now
> to eager-promote every `loading="lazy"` image and wait for all images to
> complete **before** creating any ScrollTrigger. See
> [`scrolltrigger-mobile-premature-animations.md`](./scrolltrigger-mobile-premature-animations.md)
> for the winning pattern. Reach for this doc's refresh layers only as
> fallback for late-injected DOM (CMS filter hydration, accordions, font
> swaps) that can't be gated upfront.

# ScrollTrigger firing early on [scroll-text-reveal] below a specific section

## Problem

On `/studio`, every `[scroll-text-reveal]` element below the "principal & associates" section fired its SplitText line-reveal *before* the element was actually in viewport. Key characteristics:

- Deleting the principals section made everything downstream fine.
- Refreshing or resizing the page fixed the animations instantly.
- Only `[scroll-text-reveal]` broke — `.slide-in` animations looked fine.
- **Intermittent across sessions on the same viewport** (fast load = fine, slow load = broken).
- Worse on larger monitors than laptops — more content visible, misfire more noticeable.
- Section-specific oddities: team leader section bad, team members further down fine (because enough time had passed / a refresh landed before the user scrolled there).

## Root cause

ScrollTrigger measures each trigger's `start` / `end` pixel positions **once**, at trigger creation. Its built-in `autoRefreshEvents` only cover window `resize`, `load`, and `DOMContentLoaded` — none of which fire for DOM-driven height changes that happen mid-paint (late image loads, font swaps, CMS hydration, layout settling).

On a slow load, images finish loading *after* `generalScrollTextReveal` has already created its ScrollTriggers inside `document.fonts.ready.then(...)`. The image pushes content below it down by N pixels. ScrollTrigger's cached `start` values for every element below that image are now N pixels too high, so every trigger fires N pixels too early.

Why it was section-specific: the shift happened *within or above* the team leader section. By the time the user scrolled to team members, some other event (likely `window.load` firing at some point) had already refreshed the affected triggers.

Why it was intermittent: on a fast load the image finished *before* ScrollTrigger measured → no stale positions → animations fine. Same browser, same viewport, different outcome depending purely on load timing.

Why `.slide-in` appeared unaffected: it uses `ScrollTrigger.batch()` which handles some refresh scenarios differently, AND its animation distance is small enough that an early firing is much less visually obvious than a `y: 110% → 0%` SplitText line reveal.

## Solution

Two parts: (a) retain the `document.fonts.ready` gate in `generalScrollTextReveal.ts` so SplitText measures against the final webfont; (b) add three redundant "re-measure now" hooks in `gsapSmoothScroll.ts`, all calling `ScrollTrigger.refresh()`:

```ts
// 1. body ResizeObserver — catches DOM-driven height changes.
//    Note: refresh(true) — truthy arg defers the refresh past Lenis momentum
//    so it doesn't fight a scroll-in-progress. Hooks 2/3 use bare refresh()
//    because they fire at known-quiet moments.
let pending = false
let lastHeight = document.body.offsetHeight
const refreshOnBodyResize = new ResizeObserver(() => {
  const height = document.body.offsetHeight
  if (height === lastHeight || pending) return
  lastHeight = height
  pending = true
  requestAnimationFrame(() => {
    ScrollTrigger.refresh(true)
    pending = false
  })
})
refreshOnBodyResize.observe(document.body)

// 2. window.load — canonical "all external resources finished"
window.addEventListener('load', () => ScrollTrigger.refresh(), { once: true })

// 3. per-image load listener — catches each lazy-loaded image individually
document.querySelectorAll('img').forEach((img) => {
  if (img.complete && img.naturalWidth > 0) return  // Safari quirk: check both
  img.addEventListener('load', () => ScrollTrigger.refresh(), { once: true })
})
```

The `document.fonts.ready` gate in `generalScrollTextReveal.ts` is **retained** alongside the three hooks — it's not removed. On its own it's insufficient (see "What didn't work" below), but it still guarantees SplitText measures against the final webfont rather than a fallback, which avoids a different class of split-then-resplit churn.

### Why all three

Any single hook can miss the problem moment:

- ResizeObserver fires only if the image *actually changes* body height. Images with `aspect-ratio` CSS reserve space correctly and don't change height when they load → observer doesn't fire. But a single image missing the reserved space will fire it.
- `window.load` is a single event at end of loading. If a late script injects a DOM node after `load`, this won't help.
- Per-image load listeners fire per image, but only for images in the DOM at init. A CMS list loaded later won't be caught.

Layered together they cover image races, font races, and DOM mutations with almost no overlap in weakness.

### What didn't work (and why)

1. **`document.fonts.ready.then(...)` gate around SplitText init** — necessary (so SplitText measures against final webfont) but insufficient. Fonts loading is only one of several causes of layout shift.
2. **`requestAnimationFrame(() => ScrollTrigger.refresh())` after split** — runs once at init. If the shift happens *later* (image load during scroll), this was already past.
3. **Body ResizeObserver alone** — doesn't fire when every image has `aspect-ratio` reserved correctly. Was covering the wrong failure mode.

### What to reach for next time

**Intermittent early-firing ScrollTriggers almost always = stale `start`/`end` from a late layout shift.** The fix is to identify *when* the shift happens and add a refresh hook there. Default to the three-layer pattern above; it covers the common cases without having to diagnose which specific asset is the culprit.

### Known weaknesses of the current fix

- **CMS lists hydrated after init are not caught by per-image listener (3).** If a Webflow/Finsweet CMS filter swaps in new collection items after `gsapSmoothScroll()` has run, their `<img>` elements never had a load listener attached. The body ResizeObserver (1) catches the height change only if `aspect-ratio` isn't reserved for those images. Workaround when this shape comes up: call `ScrollTrigger.refresh(true)` inline at the end of the filter result callback, or wire up a `MutationObserver` on the CMS list container that re-runs the per-image attach.
- **Triggers created inside later `async` callbacks bypass `window.load` (2).** Any `new ScrollTrigger(...)` or `gsap.to(..., { scrollTrigger: {...} })` that resolves *after* the single-fire `window.load` listener doesn't get that refresh. If a module adds triggers in a `fetch().then` or `setTimeout`, call `ScrollTrigger.refresh()` at the end of its own init.

## Prevention

Ranked by cost/value:

1. **Reserve image space with `aspect-ratio` or intrinsic width/height** on every `<img>`. This eliminates the layout shift at source, making the refresh hooks belt-and-braces rather than load-bearing. Zero runtime cost.
2. **Three-layer refresh pattern** (the fix above). Bake into every new Webflow bundle's `gsapSmoothScroll.ts` by default.
3. **`ScrollTrigger.config({ autoRefreshEvents: 'visibilitychange,DOMContentLoaded,load,resize' })`** — one-line extension to the built-in events. Cheap insurance for bfcache / tab-switch scenarios.
4. **Keep `document.fonts.ready` gating** around any SplitText creation that measures against custom fonts.

## PR review red flags

Patterns that make this bug more likely; worth calling out in review:

- `new ScrollTrigger(...)` or `{ scrollTrigger: {...} }` inside an `async` / `.then()` / `setTimeout` / `fetch().then` — creates triggers after the global refresh pass has run.
- New `<img>` without `width`/`height` attributes or CSS `aspect-ratio`, especially above-the-fold.
- CMS list rendering via custom JS that doesn't end with `ScrollTrigger.refresh(true)`.
- Any new animation module that instantiates its own ScrollTriggers without relying on the shared smooth-scroll init's refresh hooks.
- Calls to `ScrollTrigger.refresh()` from inside `lenis.on('scroll', ...)` or `gsap.ticker` — causes scroll lock. (Already in `CLAUDE.md`; worth restating.)

## Lessons for the starter template

Add the three-layer refresh pattern to `gsapSmoothScroll.ts` by default in the pier-point starter. ScrollTrigger's built-in `autoRefreshEvents` are not enough for any site with images and CSS animations below the fold.

## See also

- [`single-bundle-pier-point-migration.md`](./single-bundle-pier-point-migration.md) — architectural parent; explains why the fix is inlined into `gsapSmoothScroll` instead of a coordination event. The retired `data-lenis-resize` primitive is what this solution replaces at the concrete level.
- [`../reference/js-loading-flash-prevention.md`](../../reference/js-loading-flash-prevention.md) — companion FOUC solution for the same `[scroll-text-reveal]` selector; together they solve the visual (FOUC) and timing (stale positions) halves of late-load races.

## References

- Rodrigo (GSAP admin) recurring forum advice: "Call `ScrollTrigger.refresh()` once all the images/assets have finished loading."
- Memory: `feedback_safari_image_complete.md` — always check `naturalWidth > 0` alongside `.complete` for lazy-loaded images in Safari.
- Memory: `feedback_bundle_no_coordination.md` — the single-bundle architecture means we inline these dependencies (refresh hooks) directly where they're needed, not via a coordination primitive.
- Memory: `feedback_splittext_mask_lines.md` — related SplitText handling note: don't use `mask: 'lines'`; wrap manually with `overflow: hidden` on `self.lines` inside `onSplit`.
- Memory: `feedback_scrolltrigger_refresh_layers.md` — the three-layer pattern itself, captured for re-application in future bundles.
