---
title: "ScrollTrigger mobile premature animations: resolved by eager-promoting lazy images"
date: "2026-04-23"
category: "integration-issues"
component: "src/index.ts"
tags: [gsap, scrolltrigger, mobile, ios, safari, lazy-loading, images, layout-shift]
severity: "high"
status: "resolved"
resolved_in: "v1.0.13"
---

## Winning fix (v1.0.13)

In `src/index.ts`, before gating ScrollTrigger creation, promote every
`loading="lazy"` image to `eager` so the browser fetches them now instead of
on scroll. Then wait for **all** images (not just originally-eager ones) to
complete before creating any ScrollTrigger.

```ts
window.Webflow.push(() => {
  gsapSmoothScroll()
  // ...synchronous UI modules...

  document
    .querySelectorAll<HTMLImageElement>('img[loading="lazy"]')
    .forEach((img) => { img.loading = 'eager' })

  waitForAllImages(() => {
    gsapBasicAnimations()
    generalScrollTextReveal()
    // ...other ScrollTrigger-creating modules...
  })
})
```

**Why this worked when nothing else did:** Every prior attempt (refresh
hooks, soft refresh, normalizeScroll, disabling Lenis, invalidateOnRefresh)
was reactive — trying to correct stale positions *after* lazy images
shifted layout mid-scroll. On iOS Safari, `ScrollTrigger.refresh()` during
an active momentum scroll is fundamentally unreliable. The only
deterministic fix is to eliminate the layout shift entirely: force every
image to load upfront, wait for them, then measure.

**Trade-off:** ~all images download on first paint instead of on scroll.
For a portfolio/studio site this is acceptable; Webflow's auto-AVIF and
responsive sizes keep the bytes small. Would not scale to content-heavy
sites with hundreds of images.

**Diagnostic clue that cracked it:** user noticed the bug consistently
started "around Mona" — a CMS team member below the fold on /studio. That
pointed directly at lazy-loaded CMS images as the trigger, not a general
iOS quirk.

---


# ScrollTrigger animations firing prematurely on mobile

## Problem

On mobile devices (particularly iOS Safari), scroll-triggered animations fire before elements reach their trigger points. The issue is resolved on desktop but persists on mobile despite multiple fix attempts.

**Symptoms:**
- Animations fire early on mobile, especially on `/studio` page
- Desktop works correctly with the same code
- Issue is intermittent — varies by network/cache state
- Soft page refresh sometimes fixes it temporarily

**Root cause (suspected):**
Lazy-loaded images cause layout shifts after ScrollTrigger has cached trigger positions. Mobile browsers handle lazy loading and viewport calculations differently than desktop, and the refresh hooks that work on desktop aren't having the same effect on mobile.

---

## Fix attempts

### Attempt 1: Three-layer refresh hooks (desktop only)
**Commit:** `686ff97`
**What:** Scoped ResizeObserver + window.load + per-image listeners to desktop only, removed mobile refresh entirely.
**Result:** Desktop fixed, mobile broken (no refresh at all).
**Why it failed:** Mobile needs refresh too, just handled differently.

### Attempt 2: Soft refresh on mobile (wait for scrollEnd)
**Commit:** `733ba95` (v1.0.6)
**What:** Re-added mobile refresh with "soft" mode — if user is scrolling, wait for `scrollEnd` event before calling `ScrollTrigger.refresh()`. Uses `gsap.delayedCall(1, ...)` for 1-second debounce.
**Result:** Reduced scroll jank but animations still fire early.
**Why it failed:** The refresh is happening, but either too late or not addressing the actual mobile-specific issue.

### Attempt 3: ignoreMobileResize config
**Commit:** `733ba95`
**What:** Added `ScrollTrigger.config({ ignoreMobileResize: true })` to prevent address bar show/hide from triggering recalculations.
**Result:** Helped with scroll jank, didn't fix premature animations.
**Why it failed:** Different problem — this prevents unwanted refreshes, but we need the refresh to actually work.

### Attempt 4: normalizeScroll
**Date:** 2026-04-23
**Commit:** `v1.0.7` (reverted in v1.0.8)
**What:** Add `ScrollTrigger.normalizeScroll(true)` to normalize iOS Safari's erratic scroll position reporting.
**Hypothesis:** iOS Safari's rubber-banding and address bar behavior cause ScrollTrigger to receive inconsistent scroll positions, making triggers fire at wrong times.
**Code change:**
```ts
// src/utils/gsapSmoothScroll.ts line 42
ScrollTrigger.normalizeScroll(true)
```
**Result:** FAILED — caused jittery scrolling on both desktop and mobile. `normalizeScroll` conflicts with Lenis smooth scrolling. Did not fix the premature animation issue.
**Status:** REVERTED

---

### Attempt 5: Disable Lenis on mobile
**Date:** 2026-04-23
**Commit:** `v1.0.9`
**What:** Skip Lenis entirely on touch devices, use native scroll only.
**Hypothesis:** Lenis intercepts scroll on mobile and may give ScrollTrigger inconsistent position data. Native scroll should be more reliable.
**Result:** Scroll is smoother, but premature animations still occur in a narrower window (principals/associates section through to team members/administration). Issue partially improved but not resolved.
**Status:** KEPT (smoother scroll is beneficial)

### Attempt 6: invalidateOnRefresh on ScrollTriggers
**Date:** 2026-04-23
**Commit:** `v1.0.10` (reverted in v1.0.11)
**What:** Add `invalidateOnRefresh: true` to ScrollTrigger configs in `generalScrollTextReveal.ts`.
**Hypothesis:** `refresh()` recalculates start/end positions but not animation values. The `y: '110%'` from-value was captured when layout was different; `invalidateOnRefresh` forces re-recording on each refresh.
**Result:** FAILED — made it significantly worse. Animations that weren't bugging out before now showed visible text, then re-animated on scroll. The invalidation caused animations to re-trigger on every refresh event.
**Status:** REVERTED

---

## Not yet tried

### Safe refresh parameter in touch branch
Desktop uses `ScrollTrigger.refresh(true)` which waits for browser rendering. Touch branch currently uses `ScrollTrigger.refresh()` without the safe parameter.

### Delay ScrollTrigger creation to window.load
Currently triggers are created after `document.fonts.ready`, but images may still be loading. Could wait for `window.load` instead, though this delays all animations.

### Explicit width/height on CMS images
Aspect-ratio CSS is used where possible, but CMS images don't have explicit dimensions. Could add width/height attributes to reserve space before load.

---

## Testing checklist

When testing a fix:
1. Hard refresh on mobile (clear cache)
2. Test `/studio` page specifically (worst affected)
3. Scroll slowly through the page on first load
4. Check if text reveal animations fire at correct scroll positions
5. Test on both iOS Safari and Chrome for Android
6. Compare behavior between WiFi and throttled connection

---

## Related documentation

- [`scrolltrigger-stale-positions-late-image-loads.md`](./scrolltrigger-stale-positions-late-image-loads.md) — desktop fix documentation
- [`../../reference/js-loading-flash-prevention.md`](../../reference/js-loading-flash-prevention.md) — FOUC prevention for same elements
- Memory: `feedback_scrolltrigger_refresh_layers.md`
- Memory: `project_scrolltrigger_mobile_investigation.md`

## External references

- [GSAP Forum: ScrollTrigger.refresh() works incorrect on Mobile/iPhone](https://gsap.com/community/forums/topic/41094-scrolltriggerrefresh-works-incorrect-on-mobileiphone/)
- [GSAP Forum: loading="lazy" and ScrollTrigger.refresh()](https://gsap.com/community/forums/topic/36860-loadinglazy-and-scrolltriggerrefresh/)
- [GSAP Forum: Problem with ScrollTrigger and ScrollTrigger.refresh() on mobile](https://gsap.com/community/forums/topic/36585-problem-with-scrolltrigger-and-scrolltriggerrefresh-on-mobile/)
- [GSAP Docs: ScrollTrigger.normalizeScroll()](https://gsap.com/docs/v3/Plugins/ScrollTrigger/static.normalizeScroll())
