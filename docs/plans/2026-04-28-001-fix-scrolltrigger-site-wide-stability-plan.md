---
title: "fix: ScrollTrigger site-wide stability — instrument, harden, validate"
type: fix
status: active
date: 2026-04-28
origin: docs/brainstorms/2026-04-28-scrolltrigger-site-wide-stability-requirements.md
---

# fix: ScrollTrigger site-wide stability — instrument, harden, validate

## Overview

Site-wide intermittent ScrollTrigger failures across `/careers`, `/studio`, `/works/<detail>`, and `/process`. Currently dominant symptom: scroll gets stuck mid-pin on pinned/scrubbed sections, worst on macOS Chrome and Safari (trackpad/Magic Mouse momentum). Previously resolved (v1.0.13) symptom: premature scroll-text-reveal animations on iOS Safari — must not regress.

Root cause is not one bug; it is the union of seven distinct failure modes that all express the same surface symptom. The current shipped guard (eager-promote all `loading="lazy"` images + `waitForAllImages` before any ScrollTrigger is created) handles initial-load layout shifts only. It does nothing for viewport changes after init, momentum-scroll-vs-refresh races on desktop, bfcache restoration, late CMS hydration via Finsweet, async trigger creation, or Webflow IX2 conflicts.

This plan ships **today** as a single bundle release. It is structured as three phases: instrument first (a debug overlay gated behind `?debug=1` that exposes live ScrollTrigger and Lenis state), then apply universal hardening (seven targeted code changes), then validate against a 5-criteria × 3-browser × 4-page matrix before tagging a release. No Webflow Designer changes, no architectural rewrites, no new dependencies.

## Problem Statement

### Symptoms

- **Currently dominant — stuck mid-pin scroll** (cannot scroll past or escape pinned section). Worst on macOS Chrome and Safari with trackpad/Magic Mouse. Intermittent across sessions.
- **Previously resolved — premature scroll-text-reveal animations** on iOS Safari, particularly /studio, fixed in v1.0.13 by eager-promoting every lazy image and waiting for all images to complete before creating any ScrollTrigger. Must not regress.

### Affected pages

- `/careers` — `careersStackingCards.ts` pinned scrubbed timeline (3+ benefit cards, ~5400px pin distance at 900vh)
- `/studio` — `homeTextSticky.ts` desktop pin (no scrub), `randomImagesFadeIn.ts` desktop pinned scrub
- `/works/<detail>` — pinned reveals + Finsweet CMS-list hydration on listing
- `/process` — `proccessSlider.ts` pinned scrubbed horizontal-scroll timeline

### Why prior reactive attempts failed

Recorded in `docs/solutions/integration-issues/scrolltrigger-mobile-premature-animations.md`. Six prior attempts (`normalizeScroll`, soft-refresh-on-scrollEnd, `ignoreMobileResize`, disable-Lenis-on-mobile, three-layer refresh hooks alone, and `invalidateOnRefresh: true` on text reveals) each fixed a slice and either failed entirely or were reverted. The breakthrough in v1.0.13 was eliminating the *source* layout shift via eager-promote-all + `waitForAllImages` — which fixed initial-load races but cannot prevent shifts that happen *after* init.

### Constraint set (forced JS-only solution)

Per the origin requirements doc (see origin: `docs/brainstorms/2026-04-28-scrolltrigger-site-wide-stability-requirements.md`):

- All CMS assets are uploaded via Webflow v2 Data API (`scripts/api/lib/webflow-client.js → uploadAsset`). Webflow's responsive-variant pipeline does not run on API uploads — no `srcset`, no `sizes`. Verified against emitted HTML.
- Webflow does **not** auto-emit `width`/`height` HTML attributes on CMS-bound `<img>` elements at all, regardless of upload path. Documented platform limitation.
- Per-item `aspect-ratio` CSS rejected as inconsistent with natural image sizing.
- Fixed widths/heights rejected as visually inappropriate.

Therefore: **layout shifts will continue to occur during page life**, and the bundle must catch every one and refresh ScrollTrigger reliably without ever fighting Lenis momentum scroll.

## Proposed Solution

Three-phase delivery in a single working session, all under `src/`:

1. **Phase 1 — Instrument.** Add a dev-only overlay (gated behind `?debug=1`) that exposes live ScrollTrigger state, Lenis state, layout-shift events, refresh-call instrumentation, and image-load progress. Used during Phase 3 to confirm fixes are working, and reserved as a permanent diagnostic tool for future regressions.

2. **Phase 2 — Universal hardening.** Seven targeted code changes (R1–R7 from the origin doc) that close documented gaps in the v1.0.13 guard. All additive — none replace the existing eager-promote + `waitForAllImages` gate.

3. **Phase 3 — Validate.** Manual reproduction matrix against 5 success criteria × 3 macOS browser configurations × 4 affected pages. No ship without green matrix.

R8 (Webflow IX2 audit) is treated as a Phase 1 observation task — the overlay surfaces IX2-driven scroll effects when they fire. Behavior changes only if Phase 1 reveals concrete conflicts.

## Technical Approach

### Architecture

The bundle is delivered via a single `<script src>` from jsDelivr (`cdn.jsdelivr.net/gh/sanindooo/nga-webflow-website@vX.Y.Z/dist/index.js`), loaded after the GSAP/Lenis/SplitText/Swiper CDN tags in Webflow Site Settings footer. All modules run inside `window.Webflow.push(() => {...})`, after DOMContentLoaded and after Webflow.js init — every CDN global is resolved.

This plan introduces no new modules at the orchestration level. It modifies:
- `src/index.ts` — adds the `?debug=1` overlay mount, adds the `pageshow` handler for bfcache restoration. The eager-promote + `waitForAllImages` gate at lines 62–106 is preserved verbatim.
- `src/utils/gsapSmoothScroll.ts` — converts desktop branch's bare `refresh()` calls (lines 86, 90) to `refresh(true)`, matching the existing mobile branch.
- `src/utils/careersStackingCards.ts` — converts the literal `end` string at line 93 to a function form, adds `invalidateOnRefresh: true`.
- `src/utils/proccessSlider.ts`, `src/utils/randomImagesFadeIn.ts`, `src/utils/publicationsGridFade.ts` — add `invalidateOnRefresh: true` to their scrubbed pins (the pins themselves use viewport-independent literals, so no `end` change needed).
- `src/utils/generalScrollTextReveal.ts:96` — converts bare `refresh()` to `refresh(true)` (only async trigger creator on the project).
- `src/utils/filterActiveState.ts` — extends the existing `cmsfilter` callback hook (line 58) to call `ScrollTrigger.sort()` then `ScrollTrigger.refresh(true)` after Finsweet rehydrates the list. Adds a scoped `MutationObserver` on `[fs-cmsfilter-element="list"]` for safety in case `fsAttributes` callback is bypassed.
- `src/types/gsap.d.ts`, `src/types/webflow.d.ts` — extend ambient declarations for `ScrollTrigger.getAll()`, the instance type with `id`/`start`/`end`/`progress`/`isActive`/`pin`, `ScrollTrigger.addEventListener`, and Lenis instance properties (`scroll`, `targetScroll`, `velocity`, `isScrolling`).
- `src/utils/debugOverlay.ts` (new) — the dev-mode overlay. ~150 lines, ESBuild dead-code-elimination verified (gated by `URLSearchParams` check, tree-shakable if needed).

No new runtime dependencies. No changes outside `src/`.

### Implementation Phases

#### Phase 1: Instrument the Bundle (1–1.5 hrs)

**Goal:** make the bundle's runtime ScrollTrigger and Lenis state observable so Phase 3 validation is grounded in evidence, not feel.

**1.1 — Type extensions** (`src/types/gsap.d.ts`)

The current ambient declaration lists `ScrollTrigger` as `ScrollTriggerStatic` with `update`, `refresh`, `config`, `normalizeScroll`, `batch`, `create`, `isInViewport`, `isTouch`, `isScrolling`, `addEventListener`, `removeEventListener`. Required additions:
- `getAll(): ScrollTriggerInstance[]` on the static.
- `ScrollTriggerInstance` interface with `id?: string`, `start: number`, `end: number`, `progress: number`, `isActive: boolean`, `pin?: HTMLElement`, `vars: Record<string, unknown>`, `trigger?: HTMLElement | string`, `getVelocity(): number`.
- Extend `LenisInstance` to expose `scroll: number`, `targetScroll: number`, `velocity: number`, `isScrolling: boolean`.

These are read-only diagnostic properties on the GSAP and Lenis runtime objects; they exist already, only the types are missing.

**1.2 — Debug overlay module** (`src/utils/debugOverlay.ts`, new file)

Single named export `debugOverlay()`. Selector-presence guard: gate on `new URLSearchParams(location.search).get('debug') === '1'`. If not set, return immediately — ESBuild eliminates the rest as dead code via the early return.

When active, mount a fixed-position panel (top-right, `pointer-events: none` on the panel root, `pointer-events: auto` on a small toggle button) that renders:

- **ScrollTriggers table** — every entry of `ScrollTrigger.getAll()` with columns: `id` (or trigger tagName/class fallback), `start` (px), `end` (px), `progress` (0–1, formatted to 3 dp), `isActive`, `pin?`, `scrub?`. Updated on `requestAnimationFrame` loop, throttled to 4Hz.
- **Lenis state** — `scroll`, `targetScroll`, `velocity`, `isScrolling`. Same loop, same throttle.
- **Image-load progress** — count of `document.images` where `!(complete && naturalWidth > 0)`. Updates every 250ms.
- **Layout-shift log** — `PerformanceObserver({ type: 'layout-shift', buffered: true })`. Renders a scrolling list of `value` + `sources[0].node.tagName + className` for entries where `hadRecentInput === false`. Feature-detect guard via `'PerformanceObserver' in window && PerformanceObserver.supportedEntryTypes?.includes('layout-shift')` — Chromium-only in 2026 per MDN, gracefully no-ops on Safari/Firefox.
- **Refresh log** — `ScrollTrigger.addEventListener('refreshInit', cb)` and `ScrollTrigger.addEventListener('refresh', cb)`. Records timestamp, `ScrollTrigger.isScrolling()` at fire time, and a `console.trace`-equivalent stack via `new Error().stack` parse. **Use the documented event hooks; do NOT monkey-patch `ScrollTrigger.refresh`** — best-practices research confirmed addEventListener is cleaner and survives GSAP version bumps.
- **Markers toggle** — when `?debug=1` is set, also call `ScrollTrigger.defaults({ markers: true })` once at boot so visual start/end lines are drawn on every trigger.

The panel's layout uses `position: fixed; inset: 0.5rem 0.5rem auto auto; z-index: 999999; font: 11px/1.4 ui-monospace; background: rgba(0,0,0,0.85); color: #fff; padding: 0.75rem; max-width: 22rem; max-height: 80vh; overflow: auto; border-radius: 0.25rem`. No external CSS.

**1.3 — Mount in `src/index.ts`**

Insert the call near the top of `Webflow.push`, before any other module — so `addEventListener('refreshInit', ...)` is registered before any trigger creation:

```ts
// src/index.ts (pseudocode showing position only)
window.Webflow.push(() => {
  debugOverlay()  // new — gated by ?debug=1, no-op otherwise
  gsapSmoothScroll()
  // ...rest unchanged
})
```

**1.4 — Verification before Phase 2**

Hard-reload `?debug=1` on each affected page on a known-good and known-broken build. Confirm overlay reads sane values; confirm `refreshInit`/`refresh` events fire at expected moments; confirm layout-shift entries appear in Chromium and silently absent in Safari. **Do not begin Phase 2 changes until the overlay is providing actionable signal.**

**Success criteria for Phase 1:**
- Overlay renders on every affected page when `?debug=1` is in the URL.
- Overlay does not appear in production builds (verified by checking `dist/index.js` for the overlay code paths after a release-mode build with `?debug=` *not* set in the URL — note: it'll be in the bundle, but the early-return path means zero runtime cost).
- ScrollTrigger and Lenis state values match what `console.log(ScrollTrigger.getAll())` would show.
- Refresh log captures every `refreshInit`/`refresh` event with timestamp and scroll-active state.
- Layout-shift log accumulates entries on Chromium when scrolling pages with lazy CMS images.

#### Phase 2: Universal Hardening (2–3 hrs)

**Critical safety rail:** preserve `src/index.ts` lines 62–106 (the eager-promote loop and `waitForAllImages` gate) verbatim. R6. Every change below is additive.

##### R1 — Function-based pin position in `careersStackingCards.ts`

Current state (`src/utils/careersStackingCards.ts:90–98`):
```ts
ScrollTrigger.create({
  trigger: wrapper,
  start: 'top top',
  end: `+=${(sections.length - 1) * SEGMENT * window.innerHeight * 0.4}`,
  pin: true,
  pinSpacing: true,
  animation: tl,
  scrub: true,
})
```

Issue: The `end` string is interpolated at module init time. Once captured, `window.innerHeight` is baked in. Subsequent refreshes (resize, font load, address-bar collapse) do not recompute it. On a viewport that grows or shrinks, the pin's `end` is numerically stale — even though ScrollTrigger's *position* (start) is re-measured during refresh.

Per GSAP documentation: function-based `start`/`end` are re-evaluated on every refresh. Per project research: only `careersStackingCards.ts:93` exhibits this pattern across the codebase — `proccessSlider`, `randomImagesFadeIn`, `publicationsGridFade` all use viewport-*independent* pixel literals (e.g. `sections.length * 600`), which are refresh-safe values.

Change:
```ts
ScrollTrigger.create({
  trigger: wrapper,
  start: 'top top',
  end: () => '+=' + ((sections.length - 1) * SEGMENT * window.innerHeight * 0.4),
  pin: true,
  pinSpacing: true,
  animation: tl,
  scrub: true,
  invalidateOnRefresh: true,  // R2 (see below)
})
```

`SEGMENT` is a module-scope constant (`5`), captured in the closure. `sections` is the `NodeListOf<HTMLElement>` queried at module init, also captured. Both are stable.

**R1 verification:** open `?debug=1` on `/careers`, note the `end` value in the overlay, resize the window vertically, observe the `end` value updates after the next refresh fires.

##### R2 — `invalidateOnRefresh: true` on scrubbed pins ONLY

**Critical safety rail.** A prior attempt added `invalidateOnRefresh: true` to non-pinned `[scroll-text-reveal]` triggers (v1.0.10) and was reverted in v1.0.11 because text re-animated on every refresh, producing visible flicker. The behavior was confirmed against community examples (CodePen "Animation with ScrollTrigger breaks when activating invalidateOnRefresh") and forum thread 28019.

R2 applies *only* to the four scrubbed pins:
- `careersStackingCards.ts:90` (wrapping the long stacking-cards timeline)
- `proccessSlider.ts:116` (horizontal scrub through process steps)
- `randomImagesFadeIn.ts:61` (desktop branch only — mobile is non-scrubbed)
- `publicationsGridFade.ts:37` (scrubbed grid fade — note: not pinned but is scrubbed, monitor in Phase 3 for whether `invalidateOnRefresh` flickers it; if so, omit and rely on default behavior)

Do NOT add `invalidateOnRefresh` to:
- `gsapBasicAnimations.ts` `.slide-in` / `.fade-in` batch triggers (no pin, no scrub).
- `generalScrollTextReveal.ts` text reveal triggers — this was the v1.0.10 regression site.
- `homeTextSticky.ts:71` — pure pin, no scrub, no animation values to invalidate.
- `gsapBasicAnimations.ts` batch reveals — non-scrubbed, no value to invalidate.

The reason `invalidateOnRefresh` is safe on scrubbed pins specifically: a scrubbed pin's animation values are tied to the pin's `end` value (which we just made function-based in R1). When `end` changes on refresh, the timeline's relative tween durations need to reflect the new pin distance. Without `invalidateOnRefresh`, the function-based `end` updates but the inner timeline's recorded values don't — producing a mismatch where the scrub progress hits 1 before the pin releases (or vice versa). On non-scrubbed reveals, there is no equivalent value to invalidate; flipping it on caused the v1.0.10 regression.

**R2 verification:** in `?debug=1`, scroll fully through `/careers` stacking cards, resize the window mid-pin, scroll back up and through again. The card animations should match the new viewport without re-firing visibly on the previous scroll position.

##### R3 — Desktop branch `refresh(true)` in `gsapSmoothScroll.ts`

Current state (`src/utils/gsapSmoothScroll.ts`):
- Line 86: `window.addEventListener('load', () => ScrollTrigger.refresh(), { once: true })`
- Line 90: `img.addEventListener('load', () => ScrollTrigger.refresh(), { once: true })`

Both use bare `refresh()`. Mobile branch (lines 50, 54) already uses `refresh(true)`. The desktop asymmetry is a documented violation of `CLAUDE.md` line 155 ("For a deliberate, discrete content-size change, call `ScrollTrigger.refresh(true)` inline; it defers until momentum scroll settles"). Best-practices research confirmed: under Lenis on macOS trackpad, bare `refresh()` while a momentum scroll is in flight causes a synchronous DOM thrash (pin-spacer remove + re-measure + re-insert) that fights the Lenis lerp and can lock the user mid-scroll.

Change both to `refresh(true)`:
```ts
window.addEventListener('load', () => ScrollTrigger.refresh(true), { once: true })

document.querySelectorAll('img').forEach((img) => {
  if (img.complete && img.naturalWidth > 0) return
  img.addEventListener('load', () => ScrollTrigger.refresh(true), { once: true })
})
```

Per GSAP docs: `refresh(true)` waits at least one rAF tick and up to ~200ms when a scroll is active, deferring via a one-shot `scrollEnd` listener. The cost of the truthy form when no scroll is in flight is one rAF tick — negligible.

**R3 verification:** in `?debug=1`, the refresh log should show `refresh(true)` calls deferring to known-quiet moments rather than firing synchronously mid-scroll. No more pin-stuck reproduction on macOS Chrome trackpad after a CMS image loads mid-scroll.

##### R4 — `pageshow` handler for bfcache restoration

GSAP's default `autoRefreshEvents` is `'visibilitychange,DOMContentLoaded,load,resize'`. `pageshow` is not in the default list. Per MDN: when a page restores from bfcache, `DOMContentLoaded` and `load` do *not* fire — only `pageshow` (with `event.persisted === true`) and `visibilitychange`.

Best-practices research surfaced that `visibilitychange` *might* cover bfcache on most browsers but ordering is per-implementation (WHATWG issue 7), and config-string custom-event support is undocumented. Safer path: install a separate listener.

Add to `src/utils/gsapSmoothScroll.ts` at the end of `gsapSmoothScroll()` (outside the touch/desktop branch, applies to both):

```ts
window.addEventListener('pageshow', (event) => {
  if (event.persisted) ScrollTrigger.refresh(true)
})
```

`event.persisted === true` only fires on bfcache restoration (initial load is `false`). Use `refresh(true)` because the user may have been mid-scroll when they navigated away.

**R4 verification:** open `?debug=1` on `/careers`, scroll mid-pin, navigate to another page, click browser back. Refresh log should show one `pageshow`-triggered refresh. No stuck-pin on the restored page.

##### R5 — MutationObserver + ScrollTrigger.sort() for CMS hydration

`src/utils/filterActiveState.ts:58` already registers a Finsweet `cmsfilter` callback hook via `window.fsAttributes.push(['cmsfilter', cb])`. Currently does not call `ScrollTrigger.refresh(true)` when the list rehydrates. Selectors confirmed: `[fs-cmsfilter-element="list"]`, `[fs-cmsfilter-element="filters"]` (per `docs/reference/finsweet-cms-filter.md`).

Best-practices research surfaced a critical refinement not in the brainstorm doc: **`ScrollTrigger.sort()` must be called BEFORE `refresh(true)` after dynamic content load**. Out-of-order trigger creation is the #1 documented cause of stuck pins (forum 34996). When CMS items appear with their own ScrollTriggers (from `[scroll-text-reveal]` elements inside news/works cards), they're created *after* existing ones and end up out of source order.

Implementation in `filterActiveState.ts`:

```ts
// inside the existing fsAttributes['cmsfilter'] callback at L58
window.fsAttributes ||= []
window.fsAttributes.push([
  'cmsfilter',
  (filterInstances) => {
    // ...existing active-state logic...

    filterInstances.forEach((inst) => {
      inst.listInstance.on('renderitems', () => {
        // re-attach per-image load listeners on newly injected images
        inst.listInstance.items.forEach((item) => {
          item.element.querySelectorAll<HTMLImageElement>('img').forEach((img) => {
            if (img.complete && img.naturalWidth > 0) return
            img.addEventListener('load', () => ScrollTrigger.refresh(true), { once: true })
          })
        })

        // re-order, then refresh
        ScrollTrigger.sort()
        ScrollTrigger.refresh(true)
      })
    })
  },
])
```

Belt-and-braces: also add a scoped `MutationObserver` on `[fs-cmsfilter-element="list"]` for any rehydration path that bypasses the `fsAttributes` callback (e.g., direct DOM manipulation by Webflow):

```ts
document.querySelectorAll<HTMLElement>('[fs-cmsfilter-element="list"]').forEach((listEl) => {
  let pending = false
  const observer = new MutationObserver(() => {
    if (pending) return
    pending = true
    requestAnimationFrame(() => {
      ScrollTrigger.sort()
      ScrollTrigger.refresh(true)
      pending = false
    })
  })
  observer.observe(listEl, { childList: true, subtree: false })
})
```

**Critical:** `subtree: false` to avoid the documented infinite-refresh-loop risk (refresh inserts pin-spacers, which can be observed as mutations if `subtree: true` were used on a parent). Pin-spacers attach at the pin's parent — usually well outside the `[fs-cmsfilter-element="list"]` container.

**R5 verification:** load `/works` listing with `?debug=1`. Apply a category filter. Refresh log should show one `sort` + `refresh(true)` pair after rehydration. Scroll below the filtered list — no stale positions.

##### R6 — Preserve `waitForAllImages` gate verbatim

No code change. `src/index.ts:62–106` is the v1.0.13 fix. Defense-in-depth requirement: every other change in Phase 2 must be additive on top of this, not replacing it. Future maintainers reading this plan: the eager-promote loop at lines 67–71 and the `waitForAllImages` definition at lines 87–106 are load-bearing for the iOS Safari premature-animation fix. Modify only with full context (see origin: `docs/solutions/integration-issues/scrolltrigger-mobile-premature-animations.md`).

##### R7 — Convert `generalScrollTextReveal.ts:96` bare `refresh()` to `refresh(true)`

This is the only async ScrollTrigger creator in the project (gated by `document.fonts.ready.then(...)` at line 30). Currently calls bare `refresh()` inside a `requestAnimationFrame` at line 96. Following the same logic as R3.

Change line 96 from `requestAnimationFrame(() => ScrollTrigger.refresh())` to `requestAnimationFrame(() => ScrollTrigger.refresh(true))`.

**R7 verification:** in `?debug=1`, the post-fonts-ready refresh fires after font load completes. With `refresh(true)`, the call defers if the user is mid-scroll at the moment fonts settle (rare but observable on slow connections).

##### R8 — Webflow IX2 audit (Phase 1 observation, not Phase 2 code change)

No source-code IX2 references exist (audited via grep). IX2 audit is performed during Phase 1 with the overlay open: visit each affected page in Designer Preview mode with `?debug=1`, scroll through pinned sections, observe whether IX2-driven scroll effects fire alongside our triggers. If concrete conflicts are observed (e.g., IX2-pinned element overlapping a GSAP pin, or IX2 scroll-into-view animations racing with our reveals), document the conflict in `docs/solutions/integration-issues/` and either disable the IX2 interaction in Designer or refactor it to use the GSAP bundle.

**R8 explicit no-go:** do not blanket-disable IX2 across the site. Webflow's hover transitions and dropdown animations rely on it. R8 is a targeted audit.

#### Phase 3: Validate (1 hr)

Validation matrix below. **No release tag, no jsDelivr URL update, no commit, until every cell is green.** Per project memory `feedback_no_deploy_without_consent.md`: build → ready to test → user verification → deploy.

**Test browser configurations:**
- C1: macOS Chrome 13X+, trackpad
- C2: macOS Chrome 13X+, Magic Mouse (or wheel-emulating mouse)
- C3: macOS Safari 18+, trackpad

**Test pages:**
- P1: `/careers`
- P2: `/studio`
- P3: `/works/<any detail page>`
- P4: `/process`

**Success criteria** (from origin doc):
- SC1: Stuck-mid-pin reproduces zero times across 10 hard-reload sessions per page × browser.
- SC2: Stuck-mid-pin reproduces zero times after bfcache navigation (back from another page).
- SC3: Premature scroll-text-reveal animations do not return on /studio (the v1.0.13 regression site, "around Mona" diagnostic case still correct).
- SC4: Pin behavior remains stable through Safari URL-bar collapse/expand and viewport resize within a single session (no re-stuck after resize).
- SC5: After Finsweet CMS filter interaction on /works listing, scrolling below the filtered list works without stale ScrollTrigger positions.

**Matrix size:** SC1 alone is 4 pages × 3 browsers × 10 sessions = 120 reloads. Treat as time-boxed — if first 3 sessions per cell are clean, accept the cell as green and move on. If any session reproduces, halt validation, capture overlay state, return to Phase 2 root-cause.

**Capture protocol:** for each cell, screenshot the overlay state at: (a) initial load, (b) start of pin engagement, (c) inside pin mid-scroll, (d) pin release. Save to `/tmp/scrolltrigger-validation/<page>-<browser>/<scenario>.png`. These are throwaway artefacts — do not commit.

**Then:** present matrix results to the user. Wait for explicit go-ahead before commit + tag + jsDelivr URL update.

### Module-by-module change summary

| File | Lines | Change | Requirement |
|---|---|---|---|
| `src/index.ts` | new before line 39 | add `debugOverlay()` call | R9 mount |
| `src/index.ts` | 62–106 | preserve verbatim | R6 |
| `src/types/gsap.d.ts` | extend `ScrollTriggerStatic` | add `getAll()`, instance type, `addEventListener` overloads | R9 type-safety |
| `src/types/gsap.d.ts` | extend `LenisInstance` | add `scroll`, `targetScroll`, `velocity`, `isScrolling` | R9 type-safety |
| `src/utils/debugOverlay.ts` | new file | dev overlay implementation | R9 |
| `src/utils/gsapSmoothScroll.ts` | 86, 90 | bare `refresh()` → `refresh(true)` | R3 |
| `src/utils/gsapSmoothScroll.ts` | end of fn | add `pageshow` listener | R4 |
| `src/utils/careersStackingCards.ts` | 93 | string literal `end` → function form | R1 |
| `src/utils/careersStackingCards.ts` | 95 | add `invalidateOnRefresh: true` | R2 |
| `src/utils/proccessSlider.ts` | 116 | add `invalidateOnRefresh: true` | R2 |
| `src/utils/randomImagesFadeIn.ts` | 61 | add `invalidateOnRefresh: true` | R2 |
| `src/utils/publicationsGridFade.ts` | 37 | add `invalidateOnRefresh: true` (monitor for flicker; revert if observed) | R2 |
| `src/utils/generalScrollTextReveal.ts` | 96 | bare `refresh()` → `refresh(true)` | R7 |
| `src/utils/filterActiveState.ts` | 58 | extend cmsfilter cb with `sort()` + `refresh(true)` + relisten images | R5 |
| `src/utils/filterActiveState.ts` | new at end | scoped MutationObserver belt-and-braces | R5 |

## Alternative Approaches Considered

### Barba.js / SPA migration (rejected outright in origin doc)

Does not address any of failure modes R1–R7. Adds 2–3 weeks of new bug surface: ScrollTrigger.killAll/recreate per route, Webflow IX2 doesn't re-init on Barba transitions (forms, dropdowns, hover interactions break), scroll restoration becomes manual, bfcache compatibility breaks, analytics breaks. Zero progress on the stuck-pin issue. See origin: `docs/brainstorms/2026-04-28-scrolltrigger-site-wide-stability-requirements.md`.

### Architectural replacement: `position: sticky` + IntersectionObserver-driven progress (held in reserve)

Replace pinned ScrollTriggers with CSS sticky + manual scrub progress driven by IntersectionObserver. Eliminates pin-spacing measurement entirely — no cached pin positions exist to go stale. Bigger change (rewrites `careersStackingCards`, `homeTextSticky`, `randomImagesFadeIn`, `proccessSlider`); only triggered if Phase 2 + 3 do not green-light the validation matrix.

Trade-off: GSAP scrub timelines are tighter integrated with ScrollTrigger; reimplementing as IO-driven manual progress loses some fidelity (scrub momentum, snap behavior). Worth the trade only if needed.

### CMS dimension-fields pipeline (held in reserve, last-ditch)

Per origin doc and updated parallel recommendation: add `imageWidth`/`imageHeight` Number fields to CMS collections, extend the upload pipeline to populate them automatically from JPEG/PNG headers (Node `image-size`), bind `data-width`/`data-height` custom attributes on Image elements in Designer, promote to real `width`/`height` HTML attrs in `src/index.ts`. Browser then computes per-item aspect-ratio reservation from the resulting attrs.

Eliminates the *source* of layout shifts on CMS-heavy pages, turning everything else in this plan into belt-and-braces. Held as last-ditch because (a) Designer template edits required across multiple collections, (b) any new collection added later must remember the binding step, (c) client-side image edits in Designer (not via API) need supplementary handling — webhook on `collection_item_changed` + bundle graceful-degrade fallback. See origin doc for the three-option client-edit handling.

### Drop Lenis on macOS trackpad (NEW — surfaced from research, not in origin doc)

Lenis GitHub issues #237 ("disable smooth scroll on trackpad") and #103 ("macOS Safari position:fixed jitter") are open, blocked, no upstream fix. Community consensus: detect macOS + trackpad (`(pointer: fine) and (any-pointer: fine)` + UA macOS), drop Lenis on those configurations. The bundle already does this for touch devices via `ScrollTrigger.isTouch`. Extending the carve-out to Mac trackpads would eliminate Lenis-vs-pin conflicts entirely for the most-affected user segment.

Held in reserve because: (a) loses smooth scroll on the largest user segment, (b) visually inconsistent if not all pages need it, (c) UA sniffing is brittle. Reach for only if Phase 2's `refresh(true)` migration + R5 `sort()` pattern do not resolve macOS reproductions in the validation matrix.

## System-Wide Impact

### Interaction Graph

Two-level trace of the chain reaction when this code runs:

**Initial load:**
1. Webflow Site Settings footer loads `https://cdn.jsdelivr.net/.../dist/index.js` → registers Webflow.push callback.
2. `Webflow.push` callback fires after DCL + Webflow.js init.
3. `debugOverlay()` checks `?debug=1`; if absent, returns immediately. If present, mounts panel + registers `addEventListener('refreshInit', ...)`, `addEventListener('refresh', ...)`, `PerformanceObserver` (Chromium only).
4. `gsapSmoothScroll()` configures `ignoreMobileResize: true`, branches on `isTouch`. Desktop branch instantiates Lenis with `prevent: data-prevent-lenis`, wires `lenis.on('scroll', ScrollTrigger.update)`, `gsap.ticker.add(lenis.raf)`, `gsap.ticker.lagSmoothing(0)`. Both branches register ResizeObserver + window.load + per-image-load listeners (now uniformly `refresh(true)`). New: `pageshow` listener.
5. Synchronous UI modules run (nav, hover, modals, accordion, etc.).
6. Eager-promote loop: every `img[loading="lazy"]` set to `eager`. Browser begins fetching all images.
7. `waitForAllImages(onReady)` registers per-image `load`/`error` listeners; when count hits zero, fires `onReady`.
8. `onReady` callback runs animation modules: `gsapBasicAnimations`, `generalScrollTextReveal` (gated on `document.fonts.ready` internally), `homeTextSticky`, `publicationsGridFade`, `randomImagesFadeIn`, `careersStackingCards`, `proccessSlider`.
9. Each animation module creates ScrollTriggers. Pins get pin-spacers. Function-based `end` (R1) is evaluated against current viewport.
10. `window.load` fires (often before step 8 if all images cached). Triggers `ScrollTrigger.refresh(true)` (R3) — first global refresh.
11. `document.fonts.ready` resolves inside `generalScrollTextReveal`. Triggers created. `requestAnimationFrame(() => ScrollTrigger.refresh(true))` (R7) fires.
12. User starts scrolling. Lenis intercepts wheel/trackpad on desktop, lerps target. ScrollTrigger.update fires per Lenis scroll event. Pins engage at their `start`.

**CMS filter on /works:**
1. User clicks filter button. Finsweet sorts/filters the Collection List.
2. `inst.listInstance.on('renderitems')` callback fires.
3. (R5) Per-image listeners attached to new images. `ScrollTrigger.sort()` re-orders triggers by source position. `ScrollTrigger.refresh(true)` defers past any momentum scroll, then re-measures all triggers.
4. New image `load` events fire as cards render. Each calls `ScrollTrigger.refresh(true)` again. The `(true)` argument coalesces multiple calls — only the last fires.
5. ResizeObserver on body may also fire if list height changes. ResizeObserver path also calls `refresh(true)`. Same coalescing.
6. Pin positions update, scrub timelines stay aligned.

**bfcache restore (back-button on Safari from /works to /careers):**
1. `pageshow` event fires with `event.persisted === true`.
2. (R4) `ScrollTrigger.refresh(true)` fires. Re-measures all triggers from cached DOM state.
3. Pin engages correctly at restored scroll position.

### Error & Failure Propagation

**ScrollTrigger creation errors:** ScrollTrigger silently warns on missing trigger elements (returns a no-op trigger). Modules already use selector-presence guards (`if (!wrapper || sections.length === 0) return`). No change in error model.

**Lenis instantiation failure:** if Lenis CDN doesn't load, `new Lenis()` throws; the bundle relies on Webflow's footer script tag order. Existing pattern, not changed by this plan. If we wanted to harden, wrap in try/catch and fall through to native scroll — out of scope today.

**`waitForAllImages` deadlock:** if any image fires neither `load` nor `error`, `onReady` never fires and animation modules don't run. Existing risk. The `error` listener handles 404s; `complete && naturalWidth > 0` upfront-check handles cached. The deadlock vector is browser-bug-level rare; not mitigated by this plan.

**`PerformanceObserver({ type: 'layout-shift' })` on Safari/Firefox:** `PerformanceObserver.supportedEntryTypes` is checked first; if `'layout-shift'` is absent, the call is skipped. No throw.

**MutationObserver loops:** scoped to `[fs-cmsfilter-element="list"]` with `subtree: false`. Pin-spacers attach at the pin's parent, outside the CMS list. No mutation feedback loop.

**`pageshow` listener firing on initial load:** guarded by `event.persisted === true`. Initial load is `false`. No double-refresh.

**`ScrollTrigger.sort()` failure:** if any trigger lacks `getBoundingClientRect()` (shouldn't happen with our triggers, all have real DOM elements), sort throws. Wrap in try/catch in the cmsfilter handler — log to overlay refresh log, continue with unsorted refresh.

### State Lifecycle Risks

**Pin-spacers accumulating across CMS filters:** ScrollTrigger.refresh re-measures, but if old triggers from filtered-out items aren't killed, their pin-spacers persist. Finsweet re-renders the list DOM in place — old elements are removed from DOM, so their triggers become orphaned but ScrollTrigger doesn't auto-kill them. **Risk identified, not addressed by this plan.** Mitigation today: scoped to /works listing where no pinned triggers exist (only `[scroll-text-reveal]` reveals); a future CMS-filter-with-pins page would need explicit `trigger.kill()` on `renderitems`. Document as deferred follow-up.

**Layout-shift log unbounded growth:** the overlay's layout-shift list grows for every non-input shift. Cap at last 50 entries with sliding-window pruning. Implementation detail in `debugOverlay.ts`.

**ResizeObserver `pending` flag stuck `true`:** if `ScrollTrigger.refresh(true)` throws inside the `requestAnimationFrame` callback, `pending` never resets. Wrap the inner call in try/finally to guarantee reset. Both branches of `gsapSmoothScroll.ts`.

### API Surface Parity

Internal-only plan. No public API surface (no exports beyond what's already in the bundle), no external integrations, no third-party consumers. The bundle is consumed by exactly one Webflow site via one `<script src>` tag.

### Integration Test Scenarios

(Manual — Phase 3 validation matrix; no automated test harness for this codebase.)

1. **Stuck-pin reproduction on macOS Chrome trackpad, /careers:** hard-reload, scroll into stacking cards section using trackpad two-finger drag with momentum. Expected: scroll progresses through all 4 cards, pin releases naturally, page continues. Failure mode pre-fix: scroll halts mid-card, infinite momentum doesn't escape pin.

2. **bfcache restore, Safari, /studio → /works → back:** load /studio, scroll into team section, click into a /works detail, click browser back. Expected: page restores at scroll position, pin behavior intact, no stuck. Failure mode pre-fix: pin-stuck at restored position because triggers cached against pre-navigation layout.

3. **Premature animation regression check, iOS Safari, /studio:** hard-reload over a slow connection (network throttle: 3G fast). Scroll past principals/associates section into team members. Expected: every text reveal fires at element entering viewport. Failure mode pre-v1.0.13: text revealed before element in viewport.

4. **CMS filter rehydration, /works listing, any browser:** load /works, click a category filter, scroll past filtered grid into footer. Expected: filtered cards render, scroll continues normally, any below-grid reveals fire at correct positions. Failure mode pre-fix: cards render but scroll positions of below-grid triggers are stale; reveals fire too early.

5. **Viewport resize mid-pin, macOS Chrome, /careers:** hard-reload, scroll into pin, resize browser window to a different height (drag the corner). Expected: pin's `end` recomputes, pin releases at correct position. Failure mode pre-R1: pin's `end` is stale, page can't scroll past where the original `end` was.

## Acceptance Criteria

### Functional Requirements

- [ ] R1: `careersStackingCards.ts:93` `end` is a function returning `'+=' + ...`
- [ ] R2: `invalidateOnRefresh: true` on `careersStackingCards`, `proccessSlider`, `randomImagesFadeIn` desktop, `publicationsGridFade` (last one monitored for flicker)
- [ ] R3: `gsapSmoothScroll.ts:86`, `gsapSmoothScroll.ts:90` desktop branch use `refresh(true)`
- [ ] R4: `pageshow` listener with `event.persisted === true` guard installed in `gsapSmoothScroll`
- [ ] R5: Finsweet `cmsfilter` callback in `filterActiveState.ts` calls `ScrollTrigger.sort()` then `ScrollTrigger.refresh(true)` after rehydration; per-image listeners re-attached to new images; scoped MutationObserver belt-and-braces installed on `[fs-cmsfilter-element="list"]`
- [ ] R6: `src/index.ts:62–106` preserved verbatim (eager-promote + `waitForAllImages`)
- [ ] R7: `generalScrollTextReveal.ts:96` uses `refresh(true)`
- [ ] R8: IX2 audit observation captured during Phase 1; if conflicts found, documented in `docs/solutions/integration-issues/`
- [ ] R9: `debugOverlay.ts` mounted on `?debug=1`, exposes ScrollTrigger getAll, Lenis state, layout-shift log (Chromium feature-detected), refresh log via `addEventListener`, image-load count
- [ ] R10: Validation matrix completed across 3 browsers × 4 pages × 5 success criteria with no failures (Phase 3)

### Non-Functional Requirements

- [ ] **Bundle size impact:** debugOverlay code present in production bundle but tree-shakable on dead-code elimination via the early-return `?debug=1` check. Acceptable: under 4 KB minified gzipped overhead.
- [ ] **Runtime cost:** zero on production (overlay returns immediately when `?debug=1` is absent). Negligible on `?debug=1` (rAF-throttled to 4Hz, scoped event listeners).
- [ ] **TypeScript:** `pnpm run check` passes with no new errors. New ambient declarations in `src/types/gsap.d.ts` are exhaustive enough that no `// @ts-ignore` is needed in the new code.
- [ ] **Build:** `pnpm run build` produces a working `dist/index.js`. Manual sanity-check of the IIFE wrapper.
- [ ] **No new dependencies:** `package.json` unchanged.
- [ ] **No Webflow Designer changes:** zero edits to the live Designer for this ship. R8 audit may surface follow-ups, but they're separate work.

### Quality Gates

- [ ] No commit until validation matrix is green AND user confirms reproductions are clean.
- [ ] No release tag (changeset bump + git tag + jsDelivr URL update) until user explicitly approves the diff.
- [ ] `.js-loading` FOUC behavior unchanged. The Webflow-side `<head>` script that toggles `.js-loading` off is the user's responsibility (per memory `feedback_js_loading_decoupled.md`); this plan does not touch it.
- [ ] No use of MCP `element_builder` (per memory `feedback_no_dom_additions.md`). All DOM additions are in TypeScript source, not Webflow Designer.

## Success Metrics

- **Primary:** zero stuck-pin reproductions in the Phase 3 validation matrix.
- **Secondary:** zero premature-animation regressions on /studio (the v1.0.13 site).
- **Operational:** dev overlay is reusable for future regressions — first time we hit a similar issue post-ship, we open `?debug=1`, look at the refresh log, and have the answer in minutes instead of days.
- **Carrying cost:** all changes are localized within `src/`, no Designer dependency, no new runtime libs, no test infrastructure to maintain. Maintenance cost = zero ongoing; one-time understanding cost amortized through `docs/solutions/` write-up post-ship.

## Dependencies & Prerequisites

- **GSAP 3.13+** loaded via Webflow Site Settings footer CDN tag. Existing.
- **Lenis (current Studio Freight version)** loaded via Webflow Site Settings footer CDN tag. Existing.
- **SplitText** GSAP plugin loaded. Existing. Not modified by this plan, but `generalScrollTextReveal` is touched at line 96.
- **Finsweet CMS Filter v1** loaded. Existing. `window.fsAttributes` queue pattern used.
- **Webflow** site is currently live; all changes are bundle-only via jsDelivr URL update.
- **No new npm packages.**

## Risk Analysis & Mitigation

### High

1. **R2 `invalidateOnRefresh` causing flicker on `publicationsGridFade`.** The grid fade is scrubbed but not pinned — the failure profile differs from the four pinned scrubs. Risk: enabling `invalidateOnRefresh` re-records `from` values mid-scroll, producing visible flicker similar to the v1.0.10 regression on text reveals.
   **Mitigation:** during Phase 3 validation, specifically observe `/news` listing (or wherever `publicationsGridFade` runs) on hard-reload. If any visible re-render is observed mid-scroll, omit `invalidateOnRefresh` for this one trigger only and accept that its scrub values may be slightly off after refresh (the `start`/`end` are still safe).

2. **`ScrollTrigger.sort()` reordering live pins.** If `sort()` is called while a pin is actively engaged, the resulting refresh re-measures and the user may observe a layout snap.
   **Mitigation:** Finsweet filters typically fire from a click (no scroll momentum) and `refresh(true)` defers past any active momentum. Phase 3 validation explicitly tests scroll-immediately-after-filter to confirm no snap.

### Medium

3. **MutationObserver scoped to `[fs-cmsfilter-element="list"]` missing edge cases.** If Webflow somehow replaces the list container itself (rather than mutating its children), the observer detaches.
   **Mitigation:** observer is registered on every matching list at init. If a new list element is created later (we have no evidence this happens), the observer would miss it. Backup: `fsAttributes['cmsfilter']` callback covers the documented Finsweet rehydration path; the MutationObserver is redundant insurance.

4. **TypeScript ambient declarations diverge from runtime reality.** Adding `getAll()` and instance properties to `ScrollTriggerStatic` requires accuracy against the GSAP runtime API.
   **Mitigation:** declarations match GSAP's official TypeScript types (available at `gsap/types`). Sanity check by importing one of GSAP's official type declarations once at a `// @ts-check` comment in the dev overlay file (not in production bundle); confirm shape matches.

### Low

5. **`PerformanceObserver` shape changes in future browsers.** API has been stable since 2020.
   **Mitigation:** feature-detect guard. If support flips off, overlay layout-shift section silently empty.

6. **Bundle size growth from debugOverlay.** ~150 lines TypeScript + 30 lines of inline CSS. Estimated <4 KB minified gzipped.
   **Mitigation:** if bundle size becomes a concern post-ship, gate the entire `debugOverlay.ts` import under a build-time flag. Today: ship it.

7. **Webflow IX2 surfaces an actual conflict during R8 audit.** Concrete IX2-vs-GSAP race seen on a page.
   **Mitigation:** documented as deferred follow-up if found. Plan does not block on R8 for ship.

## Resource Requirements

- **Time:** 5–6 hours total estimate, single session today.
  - Phase 1 (instrument): 1.5 hrs
  - Phase 2 (universal hardening): 2.5 hrs
  - Phase 3 (validate): 1 hr
  - Buffer: 1 hr for surprises in Phase 3 reproduction
- **People:** one engineer (Claude Code session), one user-side validator (the user, who runs the validation matrix on their macOS hardware).
- **Infrastructure:** no new infra. Existing build + jsDelivr CDN delivery.
- **Hardware required for validation:** macOS with Chrome (trackpad + Magic Mouse) and Safari. iOS Safari device for SC3 verification (existing user hardware).

## Future Considerations

### Held in reserve (escape hatches)

If Phase 3 validation matrix does not go green, in priority order:
1. **Drop Lenis on macOS trackpad.** UA + media-query detect, fall to native scroll on macOS. Lenis still applies on iOS (already disabled there) and on macOS with Magic Mouse. Half-day of work, surface-level change.
2. **Architectural sticky+IO replacement.** Rewrite the four scrubbed pins as CSS `position: sticky` + IntersectionObserver-driven scrub progress. Bigger change (~1-2 days), eliminates pin-spacing measurement.
3. **CMS dimension-fields pipeline.** Extend asset upload to populate `imageWidth`/`imageHeight` Number fields, bind via `data-width`/`data-height`, promote to HTML attrs in bundle. Half-day pipeline + Designer template work + ~5-line bundle snippet. Eliminates layout shifts at source on CMS-heavy pages. Requires webhook (or scheduled backfill) for client-side image edits.

### Post-ship cleanup

- Document the win in `docs/solutions/integration-issues/scrolltrigger-stuck-pin-resolution.md` summarizing which of R1–R7 mattered most, what the overlay revealed, and what remains as deferred follow-up.
- Update `CLAUDE.md` "ScrollTrigger.refresh" guidance section to reflect that `refresh(true)` is now uniformly used across both desktop and mobile branches.
- Consider scheduling a 1-week-out retrospective (`/schedule`) to re-run the validation matrix over a fresh set of 10 sessions per cell, confirming the fix is durable and not just initial-load-coincidence.

### Pier-point starter template

Per memory `feedback_track_learnings.md` and the existing `single-bundle-pier-point-migration.md` — these patterns should feed back into the project starter:
- Function-based pin `end` for any viewport-derived value (R1)
- Universal `refresh(true)` across both branches of `gsapSmoothScroll` (R3)
- `pageshow` bfcache handler in `gsapSmoothScroll` (R4)
- `MutationObserver + sort + refresh` pattern for any CMS-filter integration (R5)
- `debugOverlay` shipped as opt-in dev tool (R9, R10)

## Documentation Plan

Files to update or create as part of this ship:
- `docs/solutions/integration-issues/scrolltrigger-stuck-pin-resolution.md` — post-ship write-up of what R1–R7 actually solved, what the overlay revealed, what stayed broken (if anything). Include the validation matrix outcome per cell.
- `CLAUDE.md` — update the ScrollTrigger.refresh guidance section to reflect uniform `refresh(true)` and the `pageshow` handler. One-paragraph addition.
- `docs/reference/scrolltrigger-debug-overlay.md` — usage doc for `?debug=1`. What each panel shows, how to read the refresh log, common patterns to look for.
- `docs/reference/finsweet-cms-filter.md` — append a section on the ScrollTrigger refresh contract after Finsweet rehydration.

Memory updates:
- Update `feedback_scrolltrigger_refresh_layers.md` to reflect that desktop branch now uniformly uses `refresh(true)`.

No README changes. No public-facing release notes (this is a bundle hot-fix, ships via tag bump + jsDelivr URL update in Webflow Site Settings).

## Sources & References

### Origin

- **Origin document:** [docs/brainstorms/2026-04-28-scrolltrigger-site-wide-stability-requirements.md](../../brainstorms/2026-04-28-scrolltrigger-site-wide-stability-requirements.md). Key decisions carried forward:
  - JS-only solution (Webflow Designer constraints rule out source-level CLS fixes)
  - Existing v1.0.13 eager-promote guard preserved verbatim (R6)
  - Barba.js explicitly rejected; sticky+IO replacement and CMS dimension-fields pipeline reserved
  - Three-pass structure: instrument → harden → validate

### Internal References

- `src/index.ts:62–106` — eager-promote + `waitForAllImages` v1.0.13 guard (R6)
- `src/utils/gsapSmoothScroll.ts:86,90` — desktop bare `refresh()` violations (R3)
- `src/utils/careersStackingCards.ts:93` — viewport-derived literal `end` (R1)
- `src/utils/filterActiveState.ts:58` — existing `cmsfilter` callback (R5 extension site)
- `src/utils/generalScrollTextReveal.ts:96` — only async-deferred trigger creator (R7)
- `src/types/gsap.d.ts` — ambient ScrollTrigger and Lenis types (R9 extension site)
- `CLAUDE.md:155–168` — project's existing ScrollTrigger / Lenis / lazy-image guidance
- `docs/solutions/integration-issues/scrolltrigger-mobile-premature-animations.md` — six prior failed attempts including the `invalidateOnRefresh` regression site (Attempt 6)
- `docs/solutions/integration-issues/scrolltrigger-stale-positions-late-image-loads.md` — three-layer refresh pattern, documented R5/R7 weaknesses
- `docs/solutions/integration-issues/single-bundle-pier-point-migration.md` — architectural constraint: no coordination primitives, no readyState checks, no `__layoutReadyQueue`
- `docs/reference/finsweet-cms-filter.md` — Finsweet `[fs-cmsfilter-element="list"]` selector reference
- Memory entries: `feedback_no_changes_without_permission.md`, `feedback_no_deploy_without_consent.md`, `feedback_no_dom_additions.md`, `feedback_eager_promote_lazy_images.md`, `feedback_scrolltrigger_refresh_layers.md`, `feedback_safari_image_complete.md`, `feedback_splittext_mask_lines.md`, `feedback_bundle_no_coordination.md`, `feedback_js_loading_decoupled.md`, `feedback_webflow_cms_image_emission.md`

### External References

- [GSAP `ScrollTrigger.refresh()` docs](https://gsap.com/docs/v3/Plugins/ScrollTrigger/static.refresh()) — `safe` argument semantics (200ms defer)
- [GSAP `ScrollTrigger.config()` docs](https://gsap.com/docs/v3/Plugins/ScrollTrigger/static.config()) — `autoRefreshEvents` defaults
- [GSAP `ScrollTrigger.addEventListener()` docs](https://gsap.com/docs/v3/Plugins/ScrollTrigger/static.addEventListener()) — `refreshInit` / `refresh` event hooks (R9 instrumentation)
- [GSAP common ScrollTrigger mistakes](https://gsap.com/resources/st-mistakes/) — function-based positions, refresh during scroll
- [GSAP forum 41094](https://gsap.com/community/forums/topic/41094-scrolltriggerrefresh-works-incorrect-on-mobileiphone/) — refresh during momentum scroll
- [GSAP forum 40584](https://gsap.com/community/forums/topic/40584-scrolltriggerrefresh-doesnt-do-anything-after-pinned-sections-are-dynamically-loaded/) — `ScrollTrigger.sort()` before refresh after dynamic load
- [GSAP forum 34996](https://gsap.com/community/forums/topic/34996-scrolltrigger-pinning-sections-unknown-order/) — out-of-order pin creation as #1 stuck-pin cause
- [Lenis discussion #320](https://github.com/darkroomengineering/lenis/discussions/320) — canonical 2024–2025 GSAP integration pattern with `autoRaf: false`
- [Lenis issue #237](https://github.com/darkroomengineering/lenis/issues/237) — disable smooth scroll on trackpad (open, blocked)
- [Lenis issue #103](https://github.com/darkroomengineering/lenis/issues/103) — macOS Safari `position: fixed` jitter (open, blocked)
- [MDN `pageshow` event](https://developer.mozilla.org/en-US/docs/Web/API/Window/pageshow_event) — `event.persisted === true` only on bfcache restore
- [MDN `LayoutShift`](https://developer.mozilla.org/en-US/docs/Web/API/LayoutShift) — entry shape: `value`, `hadRecentInput`, `lastInputTime`, `sources`. Chromium-only support in 2026.
- [MDN `MutationObserver.observe()`](https://developer.mozilla.org/en-US/docs/Web/API/MutationObserver/observe) — `subtree` cost
- [WHATWG HTML §4.8.3](https://html.spec.whatwg.org/multipage/embedded-content.html#attr-img-loading) — `img.loading = 'eager'` immediately resumes load (spec-mandated)
- [GSAP 3.13 release notes](https://gsap.com/blog/3-13/) — SplitText `autoSplit` + responsive re-splitting

### Related Work

- v1.0.13 winning fix (eager-promote + waitForAllImages) — see `scrolltrigger-mobile-premature-animations.md`
- v1.0.10 / v1.0.11 reverted attempt (`invalidateOnRefresh` on text reveals) — same doc, Attempt 6
- Performance follow-up paused 2026-04-27 — same doc, Performance follow-up section
