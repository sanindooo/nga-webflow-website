---
title: "ScrollTrigger mobile premature animations: ongoing investigation"
date: "2026-04-23"
category: "integration-issues"
component: "src/utils/gsapSmoothScroll.ts"
tags: [gsap, scrolltrigger, mobile, ios, safari, lazy-loading, images, layout-shift]
severity: "high"
status: "in-progress"
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

## Not yet tried

### invalidateOnRefresh on individual ScrollTriggers
`refresh()` recalculates start/end positions but not animation values. If SplitText's `y: '110%'` was captured against wrong layout, that value stays wrong even after refresh.
```ts
scrollTrigger: {
  trigger: element,
  start: 'top 80%',
  invalidateOnRefresh: true,  // <-- add this
}
```

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
