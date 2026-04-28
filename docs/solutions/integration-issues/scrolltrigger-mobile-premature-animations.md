---
title: "ScrollTrigger mobile premature animations: resolved by eager-promoting lazy images"
date: "2026-04-23"
category: "integration-issues"
component: "src/index.ts"
tags: [gsap, scrolltrigger, mobile, ios, safari, lazy-loading, images, layout-shift, performance, lighthouse, cls, lcp]
severity: "high"
status: "resolved-with-followup"
resolved_in: "v1.0.13"
followup_investigation: "2026-04-27 — eager-promote causing client-perceived slowness; bundle-only optimisations insufficient, see 'Performance follow-up' section"
---

## Performance follow-up (2026-04-27) — investigation paused, NOT shipped

### Why we re-opened this

Client reported the site felt slow. Suspicion was that the v1.0.13 fix
(eager-promoting *every* lazy image + waiting for all of them before creating
ScrollTriggers) was forcing too much bandwidth upfront, choking initial
paint. Goal was to find a less heavy-handed image-loading strategy that
preserved the iOS premature-animation guard.

### What we measured (Lighthouse mobile, 5 runs each variant, run 1 discarded)

Tested variants on `https://nga-website-bc5fa0.webflow.io/studio` and `/works`:

| Variant | What | studio | works LCP | works CLS | works score |
|---|---|---|---|---|---|
| A | wave logic (geometry-based above-fold/near-fold/far-below classification) | 81 | 38326ms | 0.674 | 19 |
| C | original v1.0.14 (eager-promote-all + waitForAllImages) | 82 | 38297ms | 0.674 | 21 |
| F | wave + `fetchpriority="high"` on first `.works_image` | 79 | 12705ms | 0.674 | 16 |
| D | minimal + fetchpriority + JS-injected aspect-ratio CSS in `Webflow.push` | 79 | 12672ms | 0.674 | 21 |
| E | D but CSS injected at very top of bundle (pre-Webflow.push) | 82 | 12728ms | 0.674 | 18 |
| **B** | minimal: native lazy + fetchpriority + window.load gate | **81** | **12656ms** | 0.674 | 20 |

### Findings — what actually moves the needle vs what doesn't

1. **`fetchpriority="high"` on the first `.works_image` cut /works LCP 67%
   (38s → 12s).** This is the *one* bundle-level lever that genuinely
   improved Lighthouse. The browser deprioritises lazy images by default;
   without an explicit hint, the LCP image competes equally with 49 other
   1.7 MB thumbnails for bandwidth.

2. **Wave logic (variant A) was unnecessary complexity.** Its LCP matched
   variant C (the original) at ~38s — both bottleneck on the same problem
   (no fetchpriority + 50 images competing for bandwidth). The
   per-image `getBoundingClientRect()` loop also adds main-thread work
   under Lighthouse's 4× CPU throttle.

3. **JS-injected `<style>` cannot fix CLS from the footer bundle.** Tested
   in variants D (CSS injected inside `Webflow.push`) and E (injected at
   the very top of the bundle, before `Webflow.push`). Both stayed at
   CLS 0.674 because by the time the footer script runs, browser layout
   has already committed without aspect-ratio reservation. The CLS fix
   *must* live in `<head>` via Webflow Site Settings or as inline
   `width`/`height` attrs on the `<img>` tag (Webflow Designer).

4. **Studio is bundle-immune.** All variants score 79–82 on /studio
   (within Lighthouse run-to-run variance of ±3 across 4 stable runs).
   The remaining studio headroom is render-blocking `<head>` scripts
   (Swiper 1491ms, jQuery 1342ms, Lenis 833ms wasted FCP — total ~1.5s).

5. **The real /works problem is image weight (53.8 MB transferred).**
   49 work-card thumbnails averaging 1.1 MB each, several over 4 MB. Zero
   `srcset` on the entire page (template renders plain `<img src>` with
   no responsive sizes). On simulated 4G, no JS can compensate for that.

### Lighthouse vs reality

Confirmed Lighthouse on the test machine has high run-to-run variance on
`/studio` (we saw 61–81 score swings on identical code in early runs).
Single Lighthouse runs are not signal — minimum 4–5 runs needed to detect
real bundle changes against the noise floor. On the user's local
Lighthouse runs after this investigation, the improvement still felt
insufficient — partly because the western audience has fast internet
(LCP and CLS are less perceptible at home-fibre speeds), partly because
the dominant constraint is the 53 MB image weight which no amount of
`fetchpriority` can mask.

### Decision: revert to v1.0.13/v1.0.14 behaviour, do not ship Variant B

Variant B's measured win (LCP 38s → 12s on /works) was real but not
sufficient to justify shipping given:
- The structural fix (Webflow Designer template + image upload sizes) is
  the only path to genuinely fast /works.
- Variant B drops the eager-promote-everything safety net for the iOS
  Safari premature-animation bug. While the head CSS aspect-ratio fix
  *would* solve that too (no shift means no momentum-scroll vulnerability),
  it depends on the user implementing the Site Settings change first.
  Shipping bundle B without the CSS would risk regressing v1.0.13.

Per user direction (2026-04-27, Stephen): revert source to HEAD state
(eager-promote + waitForAllImages), document the investigation, pick up
later when the structural Webflow Designer / CMS image work can be
addressed in tandem.

### Action items pending (in priority order)

**P0 — instant CLS win, ~5 min** (Webflow Site Settings → Custom Code → Inside `<head>` tag):
```html
<style>
  .works_image,
  .news-card_image {
    aspect-ratio: 3 / 2;
    width: 100%;
    height: auto;
    object-fit: cover;
  }
</style>
```
Fixes /works CLS from 0.674 → ~0. Inherently re-secures the iOS
premature-animation guard for /works (no shift means no bug).

**P1 — image weight, ~30 min** (Webflow Designer):
Re-bind the works thumbnail to use Webflow's native CMS image picker
(provides `srcset` + `sizes` + `width` + `height` automatically), or
replace 1.7–4 MB source uploads with ~300–500 KB versions. This is the
*real* fix for /works — turns a 53.8 MB page into a few MB.

**P2 — head scripts, ~5 min** (Webflow Site Settings → Custom Code → Head):
Add `defer` to `<script>` tags for Swiper, jQuery, Lenis. ~1.5s FCP win
across the whole site. (Defer maintains execution order, and our footer
bundle uses `Webflow.push` which fires after DCL anyway.)

**P3 — re-evaluate Variant B** (after P0 + P1 ship):
Once head CSS reserves space and image weights are reasonable, the
eager-promote-everything safety net is no longer needed (lazy images
loading mid-scroll won't shift layout). Variant B (or a similar minimal
intervention with `fetchpriority="high"` on listing-page LCP) should
become viable. Lighthouse retest required.

### Test artefacts

Lighthouse JSON outputs and variant source files were saved to `/tmp/lh/`
during investigation (gone on reboot — re-run if needed). Variant
source files (variant-A.ts through variant-F.ts) preserved approach
permutations so the experiment can be replayed.

### Why doesn't this section's title say "resolved" — what changed about iOS?

Nothing changed about iOS. The v1.0.13 fix is still the live behaviour on
production (v1.0.14 ships identical image-loading logic). The reason this
section exists is performance, not correctness — the fix works, but it's
expensive in bandwidth. Future work should solve performance *without*
regressing the iOS guard, ideally by combining minimal-bundle (Variant B)
with head-CSS aspect-ratio reservation.

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
