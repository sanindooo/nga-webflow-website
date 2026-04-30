---
date: 2026-04-28
topic: scrolltrigger-site-wide-stability
---

# ScrollTrigger Site-Wide Stability — Requirements

## Problem Frame

Site-wide intermittent ScrollTrigger failures across multiple pages (careers, /studio, /works detail, /process). Two distinct symptom families have appeared, and the fix must address the current dominant one without regressing the previously-resolved one:

- **Currently dominant:** scroll gets stuck mid-pin on pages with pinned/scrubbed ScrollTriggers — user cannot scroll past or escape the pinned section. Worst on Mac Chrome and Safari (trackpad/Magic Mouse momentum). Intermittent across sessions.
- **Previously resolved (must not regress):** scroll-text-reveal and section-reveal animations firing prematurely (before element in viewport), particularly on iOS Safari. Resolved in v1.0.13 by eager-promoting every `loading="lazy"` image and waiting for all images to complete before creating any ScrollTrigger.

The constraint set rules out the cheapest source-level fix on the current asset path:

- All CMS assets on this site are uploaded via the Webflow v2 Data API (`scripts/api/lib/webflow-client.js → uploadAsset`). Per Webflow Help Center: API-uploaded assets do **not** receive Webflow's responsive-variant pipeline — no `srcset`, no `sizes`. Verified against actual emitted HTML on the site (plain `<img src>` with no responsive attrs).
- Webflow does **not** auto-emit `width` / `height` HTML attributes on CMS-bound `<img>` elements at all, regardless of upload path. Documented platform limitation; multiple Webflow Wishlist items open against it. Static (non-CMS) Image elements have dimension controls; CMS-bound ones do not.
- Per-item `aspect-ratio` CSS would require per-CMS-item authoring or CMS-bound CSS variables; rejected as inconsistent with natural image sizes.
- Fixed widths / heights rejected as visually inappropriate.

Therefore: **layout shifts will continue to occur during page life**, and the bundle must catch every one and refresh ScrollTrigger reliably without ever fighting Lenis momentum scroll, on every page, every browser, every navigation type (initial load, bfcache restore, CMS filter, accordion expand, font swap, viewport resize).

This is being shipped today — clients are waiting for the site.

## Requirements

### Code-level (the bundle, src/)

- **R1.** Every `pin: true` ScrollTrigger using viewport-relative `start` or `end` literals must be converted to function form so positions recompute on `ScrollTrigger.refresh()`. Audit covers all of `src/utils/`. Known instance: `careersStackingCards.ts` `end` is a string literal. Likely additional instances: `homeTextSticky`, `proccessSlider`, any other pinned trigger.
- **R2.** All scrubbed pins must include `invalidateOnRefresh: true` so animation from/to values re-record on refresh, matching the (already-corrected) trigger positions.
- **R3.** Desktop branch of `gsapSmoothScroll.ts` must use `ScrollTrigger.refresh(true)` (deferred past Lenis momentum) in both the `window.load` listener and per-image load listeners. Mobile branch already does this; desktop currently uses bare `refresh()`, which under Lenis momentum scroll can lock the user mid-scroll. This is exactly the pattern `CLAUDE.md` warns against, currently violated on desktop.
- **R4.** A `pageshow` event handler must call `ScrollTrigger.refresh(true)` when `event.persisted === true` (bfcache restoration). Affects Safari/Chrome back-forward navigation; currently unhandled.
- **R5.** A `MutationObserver` on Finsweet CMS list containers (and any other dynamically hydrated list) must (a) re-attach the per-image load listener to newly-injected `<img>` elements and (b) call `ScrollTrigger.refresh(true)` after the mutation settles. Closes the documented "CMS lists hydrated after init are not caught" weakness in `scrolltrigger-stale-positions-late-image-loads.md`.
- **R6.** Existing eager-promote-all + `waitForAllImages` gate in `src/index.ts` (the v1.0.13 fix) must remain unchanged. All R1–R5 changes are additive layers; none replace this guard.
- **R7.** Any module creating ScrollTriggers inside an async callback (`setTimeout`, `.then`, `fetch`) must call `ScrollTrigger.refresh(true)` at the end of its own init, since such triggers bypass the global `window.load` refresh.
- **R8.** Webflow IX2 audit: identify whether IX2 is firing scroll-triggered effects on the affected pages. If yes, document conflicts and either move those interactions into the GSAP bundle or confirm they don't race with our pins. Behavior change deferred to a follow-up unless a concrete conflict is found during Pass 1.

### Diagnostic (dev-only, gated behind `?debug=1`)

- **R9.** A dev-mode overlay rendering live state for in-flight diagnosis: every ScrollTrigger's `id`, `start`, `end`, `progress`, `isActive`, and `pin?`; Lenis state (`scroll`, `targetScroll`, `velocity`, `isScrolling`); layout-shift events via `PerformanceObserver({ type: 'layout-shift' })`; image still-loading count; and a `ScrollTrigger.refresh` monkey-patch that logs caller stack trace + scroll-active state on every refresh. Must not ship to production builds.
- **R10.** The overlay must be used to reproduce the stuck state on careers, /studio, /works detail, and /process before declaring the issue resolved, with screenshots captured per page confirming pin positions are stable through the user's full scroll path.

## Success Criteria

- Stuck-mid-pin reproduces zero times across 10 hard-reload sessions per affected page (careers, /studio, /works detail, /process), tested on macOS Chrome (trackpad), macOS Safari (trackpad), and macOS Chrome (Magic Mouse).
- Stuck-mid-pin reproduces zero times after bfcache navigation (browser back from another page → return).
- Premature scroll-text-reveal animations do not return on /studio (the original v1.0.13 regression site). Specifically: the "around Mona" diagnostic case still behaves correctly.
- Pin behavior remains stable through Safari URL bar collapse/expand and viewport resize within a single session (no re-stuck state after resize).
- After Finsweet CMS filter interaction on /works listing, scrolling below the filtered list works without stale ScrollTrigger positions.

## Scope Boundaries

- **In scope:** every change inside the bundle (`src/`), the dev overlay, all the R1–R10 items above.
- **Out of scope today:** Webflow Designer changes (e.g. switching CMS Image elements to native binding to reserve space per item). Recommended as a parallel structural fix but not required for today's ship.
- **Out of scope today:** Webflow Site Settings `<head>` CSS for aspect-ratio reservation. Documented as P0 in `scrolltrigger-mobile-premature-animations.md` follow-up; defer.
- **Explicitly rejected:** Barba.js / SPA migration. Does not address any of failure modes R1–R8. Adds 2–3 weeks of new bug surface (Webflow IX2 re-init, ScrollTrigger.killAll/recreate per route, scroll restoration, bfcache compatibility). Zero progress on the actual issue.
- **Held in reserve (not implementing today):** two escape hatches if R1–R10 do not fully resolve the issue.
  1. Architectural replacement of pinned ScrollTriggers with `position: sticky` + IntersectionObserver-driven progress. Eliminates pin-spacing measurement entirely.
  2. CMS dimension-fields pipeline (described below under "Last-Ditch Structural Fallback") — addresses layout-shift at source rather than reactively.

## Key Decisions

- **Diagnose before fixing all of it.** Pass 1 (instrument) runs first to confirm which failure modes are actually firing on which pages. R1–R5 are uncontroversial and apply regardless, but the order of attention and the decision about R8 (Webflow IX2) and the held-in-reserve architectural fallback depend on Pass 1 findings.
- **Additive, not replacement.** All bundle changes are added on top of the existing eager-promote-all + `waitForAllImages` guard. The premature-animation regression risk is therefore structurally low — Pass 2 closes documented gaps in the existing guard rather than replacing it.
- **`refresh(true)` everywhere on desktop.** Aligns desktop behavior with mobile, matches the project's own `CLAUDE.md` guidance, and is strictly safer under Lenis momentum.
- **bfcache must be handled.** Browser back/forward without a hard reload is a normal user path; ScrollTrigger doesn't auto-refresh on `pageshow`.

## Dependencies / Assumptions

- Lenis remains in place on desktop. (Mobile already opts out per existing logic.)
- The existing eager-promote-all + `waitForAllImages` gate is preserved unchanged.
- Webflow CMS pages currently use Webflow's Image element with CMS binding *or* hand-written `<img>` in Custom Embed — which one is in use on each affected page is not yet confirmed. Affects whether the parallel structural recommendation (Designer-side) is viable. Verify during Pass 1.
- `ScrollTrigger.config({ ignoreMobileResize: true })` is already set in `gsapSmoothScroll.ts`; this protects against Safari URL-bar resize triggering ScrollTrigger refreshes. No change needed.

## Last-Ditch Structural Fallback (NOT implementing today; reserved for if R1–R10 don't fully resolve the issue)

**Add per-item dimension fields to CMS collections + bind via `data-width` / `data-height` + promote to HTML attrs at runtime.**

Because Webflow does not auto-emit `width` / `height` on CMS-bound images (documented limitation, regardless of upload method) and because all assets here are uploaded via the v2 Data API (which bypasses Webflow's responsive-variant pipeline entirely — no `srcset` either), the only viable path to per-item layout-space reservation on this site is to ship dimensions as CMS data.

**Important:** dimensions are written *automatically* by the upload pipeline reading intrinsic image headers — there is no manual per-item authoring by an end user. Even so, this is held as a fallback because (a) Designer template edits are required across multiple collections and (b) any new template/collection added later must remember the binding step.

1. Add `imageWidth` and `imageHeight` Number fields to affected collections (Works, News, Process — and any other collection with hero/card images).
2. Extend the asset upload pipeline (`scripts/api/lib/webflow-client.js` → `uploadAsset` and the create-* scripts) to read each image's intrinsic dimensions at upload time (Node's `image-size` library reads JPEG/PNG headers in milliseconds) and write them into the CMS Number fields when creating/updating items. One-time backfill script for existing items.
3. In Designer, bind `data-width` and `data-height` custom attributes on each Image element to those number fields.
4. Add a ~5-line snippet to `src/index.ts` (inside `Webflow.push`) that walks `[data-width][data-height]` images and promotes those data-attrs to real `width` / `height` HTML attrs.

The browser then computes per-item aspect-ratio reservation from the resulting `width="X" height="Y"` HTML attrs (spec'd browser behavior since Chrome 79 / Safari 14, Dec 2019), without forcing fixed sizes and without `aspect-ratio` CSS. Eliminates the *source* of layout shifts on CMS-heavy pages.

Effort: a few hours pipeline work + Designer template edits + bundle snippet. Reserve until needed.

**Handling client-side image edits (Designer uploads, not API):** the upload pipeline only runs on items created via API scripts. If a client edits an item in Designer and uploads a new image, the dimension fields would go stale. Three combinable options to handle this if/when this fallback is implemented:
1. **Webflow webhook on `collection_item_changed`** — endpoint fetches the new image, reads dimensions, PATCHes the item. Client-transparent.
2. **Scheduled backfill** — nightly routine via `/schedule` re-fills any empty/stale dimension fields.
3. **Bundle graceful degrade** — if `data-width` / `data-height` missing on an `<img>`, the snippet attaches an `img.onload` handler, reads `naturalWidth` / `naturalHeight`, sets the attrs, and calls `ScrollTrigger.refresh(true)`. Doesn't prevent the shift but keeps the system honest.

Recommended combo for production: webhook + bundle graceful degrade.

## Outstanding Questions

### Resolve Before Planning
*(none — proceed to /ce:plan)*

### Deferred to Planning
- [Affects R1][Technical] Full inventory of pinned/scrubbed triggers in `src/utils/` and which use viewport-relative `start`/`end` literals — produced during Pass 2 audit.
- [Affects R5][Technical] Exact selector(s) for Finsweet CMS list containers on this site (likely `[fs-cmsfilter-element="list"]` or similar). Confirm during Pass 1.
- [Affects R8][Needs research] Whether Webflow IX2 is firing scroll-triggered effects on careers/studio/works/process. Confirm via Designer panel + Pass 1 overlay observation.
- [Affects R9][Technical] Where to mount the dev overlay (likely a `?debug=1` URL gate inside `src/index.ts`, rendering a fixed-position panel). Implementation detail for planning.

## Next Steps

→ `/ce:plan` for structured implementation planning. Pass 1 (instrument) → Pass 2 (universal hardening, R1–R7) → Pass 3 (held in reserve: architectural fallback, only if needed). Validation against Success Criteria on macOS Chrome trackpad, Chrome Magic Mouse, and Safari trackpad before ship.
