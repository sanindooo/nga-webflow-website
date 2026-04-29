---
title: "ScrollTrigger pin desync and premature animations: Lenis to ScrollSmoother migration"
date: "2026-04-28"
category: "integration-issues"
component: "src/utils/gsapSmoothScroll.ts, src/utils/debugOverlay.ts, src/index.ts"
tags: [gsap, scrolltrigger, scrollsmoother, lenis, smooth-scroll, pin-spacer, lazy-images, scroll-dimension-cache, containing-block, fixed-positioning]
severity: "high"
status: "resolved-with-followup"
resolved_in: "fix/scrolltrigger-site-wide-stability commit 2764bb7"
followup: "Reparent position:fixed/sticky elements (Webflow nav, w-webflow-badge, modal overlays) out of #smooth-content — ScrollSmoother's transformed wrapper creates a new containing block that breaks viewport-relative positioning"
---

## Symptom summary

Site-wide intermittent ScrollTrigger failures on `/careers`, `/studio`, `/works`, and `/process`: scroll became stuck mid-pin on pages with pinned scrubbed ScrollTriggers (user could not escape the pin), worst on macOS Chrome/Safari with trackpad/Magic Mouse, and premature animations fired on lazy-image-heavy pages as document height grew during scroll. Root cause was Lenis maintaining a separate scroll-dimension cache that diverged from ScrollTrigger's view of `document.scrollHeight` once pin-spacers were inserted, so Lenis clamped `targetScroll` at a stale max. A first-pass fix (calling `lenisInstance.resize()` from a `ScrollTrigger` refresh listener) resolved `/process` and `/careers`, but residual `refresh(true)` deferral and lazy-image growth left `/studio` and `/works` broken — final resolution was swapping Lenis for GSAP ScrollSmoother, which shares ScrollTrigger's internal scroll model and eliminates the desync class entirely.

## Root cause

Lenis and GSAP ScrollTrigger maintain two independent runtime models that communicate via event sync. Lenis tracks its own `scroll`, `targetScroll`, and `velocity`, and caches its own dimensions (scrollHeight, viewport, max). ScrollTrigger reads scroll position from Lenis through `lenis.on('scroll', ScrollTrigger.update)` but maintains its own separate cache of trigger positions, pin-spacer offsets, and document length. Two sources of truth means drift is inevitable — whenever the document changes shape, both systems must independently re-measure, and any window where they disagree produces broken behavior.

The drift becomes visible specifically around pinned ScrollTriggers. When ScrollTrigger creates a pin with `pinSpacing: true`, it injects a `.pin-spacer` div with `padding-bottom: <pin distance>`, growing document height by hundreds or thousands of pixels. Lenis's internal `ResizeObserver` is supposed to catch this, but on real Webflow pages with multiple pins, font swaps, CMS hydration, and lazy media, Lenis's cached max value stays stale. Lenis clamps `targetScroll` at its cached max — so the user physically cannot scroll past that point, even though `document.scrollHeight` (which ScrollTrigger uses) reports a taller document. Pins get stuck. Animations on later sections never receive their start trigger because momentum scroll terminates short of them.

The class of fixes attempted earlier (`refresh(true)`, function-based pin `end`, `invalidateOnRefresh`, MutationObserver hooks, and finally `lenisInstance.resize()` from the ScrollTrigger refresh listener) all chip at the symptom — forcing the two caches to reconcile at specific moments. They cannot eliminate the root condition: there are still two caches, and any moment between divergence and reconciliation is a moment with broken scroll.

GSAP ScrollSmoother is built by the same team as ScrollTrigger and shares its internal scroll model. ScrollTrigger does not poll ScrollSmoother through an event bus — it reads from the same source. Pin-spacer creation, scrub progress, refresh cycles, and dimension measurement all share one model. The `lenis.resize()` sync isn't needed because there is nothing to sync. Eliminating the second cache eliminates the drift, which eliminates the entire class of intermittent stuck-pin and premature-animation bugs without heavy-handed gates like eager-promoting every lazy image upfront (auto memory [claude]: the eager-promote+waitForAllImages guard from v1.0.13 is therefore now superseded for the initial-load case — ScrollSmoother handles dynamic page-height natively).

## Working solution

Replace Lenis with `ScrollSmoother.create()` so that ScrollTrigger and the smooth-scroller share one scroll model. Preserve the existing defense-in-depth refresh hooks (ResizeObserver on body height, window load, per-image load, bfcache `pageshow`) — they still earn their keep against font swaps, CMS hydration, and accordion expansion (auto memory [claude]: per `feedback_scrolltrigger_refresh_layers.md`, the three-layer pattern remains load-bearing post-migration).

Before (Lenis as a separate scroll layer synced into ScrollTrigger via events):

```ts
let lenisInstance: LenisInstance | null = null

export const gsapSmoothScroll = () => {
  ScrollTrigger.config({ ignoreMobileResize: true })

  if (ScrollTrigger.isTouch) {
    // mobile branch — native scroll, three-layer refresh hooks
  } else {
    const lenis = new Lenis({
      prevent: (node) => node.getAttribute('data-prevent-lenis') === 'true',
    })
    lenisInstance = lenis
    lenis.on('scroll', ScrollTrigger.update)
    gsap.ticker.add((time) => lenis.raf(time * 1000))
    gsap.ticker.lagSmoothing(0)
    // ... ResizeObserver, window.load, per-image load — all calling refresh(true)
  }

  // The fix that didn't fully resolve everything:
  ScrollTrigger.addEventListener('refresh', () => lenisInstance?.resize())
}
```

After (ScrollSmoother as the scroller, sharing ScrollTrigger's internal model):

```ts
let smootherInstance: ScrollSmootherInstance | null = null

export const gsapSmoothScroll = () => {
  ScrollTrigger.config({ ignoreMobileResize: true })
  gsap.registerPlugin(ScrollSmoother)

  smootherInstance = ScrollSmoother.create({
    smooth: 1.2,
    effects: true,
    smoothTouch: false,         // native momentum on touch
    normalizeScroll: true,
  })

  // Defense-in-depth refresh hooks preserved (font swaps, CMS hydration, accordions)
  let pending = false
  let lastHeight = document.body.offsetHeight
  new ResizeObserver(() => {
    const h = document.body.offsetHeight
    if (h === lastHeight || pending) return
    lastHeight = h
    pending = true
    requestAnimationFrame(() => {
      ScrollTrigger.refresh(true)
      pending = false
    })
  }).observe(document.body)

  window.addEventListener('load', () => ScrollTrigger.refresh(true), { once: true })
  document.querySelectorAll('img').forEach((img) => {
    if (img.complete && img.naturalWidth > 0) return
    img.addEventListener('load', () => ScrollTrigger.refresh(true), { once: true })
  })
  window.addEventListener('pageshow', (e) => {
    if (e.persisted) ScrollTrigger.refresh(true)
  })
}
```

The diff is small but architectural: no `lenis.on('scroll', ScrollTrigger.update)`, no `gsap.ticker.add(lenis.raf)`, no `lenisInstance.resize()` sync from a refresh listener. ScrollSmoother *is* the scroller, and ScrollTrigger reads from the same internal model.

One new constraint comes with auto-wrap mode. ScrollSmoother creates `<div id="smooth-wrapper"><div id="smooth-content">…</div></div>`, applies `position: fixed` to the wrapper, and updates `transform: translate3d(...)` on the content every frame. Per CSS spec, a transformed ancestor establishes a new containing block, so any `position: fixed` or `position: sticky` element inside `#smooth-content` becomes positioned relative to the transformed content rather than the viewport. The Webflow nav, the w-webflow-badge, and modal overlays all visibly break (they scroll with the content instead of staying pinned to the viewport). The fix is to reparent affected elements out of `#smooth-content` to a sibling of `#smooth-wrapper` — ScrollSmoother does not auto-handle this; it must be done explicitly in consuming code. See "Future strategy" below.

## What didn't work and why

1. **Bare `ScrollTrigger.refresh()` during Lenis momentum** — Caused full scroll lock when refresh executed mid-momentum. CLAUDE.md already warned against calling `refresh()` from a scroll handler, ticker callback, or `lenis.on('scroll', …)`.
2. **`refresh(true)` everywhere on desktop** — Eliminated the scroll lock by deferring until scrollEnd, but introduced a new symptom: during momentum scroll, animations fire on stale trigger positions before the deferred refresh runs.
3. **Function-based pin `end`** (`end: () => '+=' + window.innerHeight * N`) — Necessary for any pin whose distance depends on viewport height, and it fixed the careersStackingCards stuck-pin specifically. Other stuck-pins on different pages persisted, so this was a local fix, not the root cause.
4. **`invalidateOnRefresh: true` on scrubbed pins** — Necessary for re-recording animation values when refresh runs, but does nothing for the underlying position calculation that depends on Lenis's cached dimensions.
5. **`pageshow` bfcache handler** — Necessary and effective for the bfcache restoration class of bugs (back/forward navigation), but unrelated to the momentum-scroll/dimension-drift issues that motivated the migration.
6. **MutationObserver + `ScrollTrigger.sort()` + `refresh(true)` on Finsweet `[fs-cmsfilter-element="list"]`** — Necessary for CMS hydration after filter changes, but specific to CMS lists and didn't address the broader cache-drift problem.
7. **`lenisInstance.resize()` from `ScrollTrigger.addEventListener('refresh', ...)`** — Forced Lenis to re-measure dimensions whenever ScrollTrigger refreshed, so pin-spacer DOM changes propagated into Lenis's max value. Resolved /process and /careers stuck-pins. Still left residual /studio premature-animation issues and /works browser-native-lazy-load gating, because the two caches still existed and could still drift between sync points.
8. **Eager-promote all lazy images + `waitForAllImages` gate (the v1.0.13 fix)** — Would deterministically resolve the layout-shift race that drove premature animations, and is the only reactive fix iOS Safari respects mid-momentum. Tanked page load: 50+ MB upfront fetch on the /works listing. Acceptable as a last resort with Lenis; unnecessary with ScrollSmoother because the shared scroll model handles dynamic page-height natively.

## When to use which smooth-scroll layer

**Native scroll is the right default.** It has zero runtime overhead, no dimension cache to desync, no transformed ancestor to break `position: fixed`/`sticky`, no IX2 fallout, and no library to update. ScrollTrigger works against the browser's own scroll model with full fidelity, pins behave correctly out of the box, and CSS `scroll-behavior: smooth` plus modern trackpad/momentum scrolling already feel reasonable on most devices. Pick native unless the design brief explicitly calls for lerp-smoothed inertial scrolling as a brand feel, or unless there's a creative-direction requirement (parallax with `data-speed`-style effects across long sections, deep horizontal-scroll modules) that genuinely needs sub-frame interpolation. "It feels nicer" is not enough — every smooth-scroll layer is a structural commitment, and the cheapest one is none.

**Lenis is the wrong pick on any pin-heavy page.** Lenis runs as a parallel scroll layer that translates the body via `transform` while ScrollTrigger reads positions from its own cached `getBoundingClientRect` snapshots taken at refresh time. That's two sources of truth, and the desync is structural — it cannot be fully fixed by listener wiring. The bugs we hit on NGA (pinned section stops releasing at the correct scroll position, `ScrollTrigger.refresh()` mid-scroll causing scroll lock, manual `lenis.resize()` calls scattered across modules) trace to GitHub issues #103, #237, #389, all documented for years and unresolved. Lenis is fine on a static, lightweight page with no pins, no `invalidateOnRefresh`, and no CMS-driven content shifts — i.e. the simplest possible case, where you also least need it. As soon as ScrollTrigger pins enter the picture, Lenis is a liability.

**GSAP ScrollSmoother is the right pick when smooth-scroll is required and the page has any ScrollTrigger pins.** It shares ScrollTrigger's internal scroll model — one source of truth, dynamic page-height recalculation, first-class pin support, no separate dimension cache to drift. The `data-speed` and `data-lag` effect attributes are a bonus for parallax-style work without per-element JS. The cost is structural: auto-wrap injects `<div id="smooth-wrapper"><div id="smooth-content">…</div></div>` with a `transform` on `#smooth-content`, which per CSS spec creates a new containing block for descendants — so `position: fixed`/`sticky` inside the content tree position relative to the content layer, not the viewport. On a Webflow project this hits the nav, the `w-webflow-badge`, modal overlays, cookie banners, and any IX2-driven sticky reveal. The mitigations are well-defined (a `[data-stick-viewport]` utility, eventually an explicit wrapper/content structure) but they need to exist before the migration ships. Pick ScrollSmoother when (a) the design genuinely requires smooth scroll, AND (b) the page uses ScrollTrigger pins or `invalidateOnRefresh`, AND (c) you have time to build/maintain the viewport-stick utility. If any of those is false, drop back to native.

## Future strategy: `[data-stick-viewport]` utility for ScrollSmoother

### Pattern overview

A single declarative attribute marks any element that must position relative to the viewport rather than the smooth-scrolled content layer. The utility runs once at boot, after `ScrollSmoother.create()` has built `#smooth-wrapper`/`#smooth-content`, and reparents every marked element out of `#smooth-content` into `#smooth-wrapper` as a sibling layer. It then applies `position: fixed` with the requested offsets and z-index.

```html
<nav class="navbar"
     data-stick-viewport
     data-stick-top="0"
     data-stick-left="0"
     data-stick-right="0"
     data-stick-z="100">
  ...
</nav>

<div data-modal-overlay
     data-stick-viewport
     data-stick-top="0"
     data-stick-left="0"
     data-stick-right="0"
     data-stick-bottom="0"
     data-stick-z="200">
</div>

<a class="w-webflow-badge"
   data-stick-viewport
   data-stick-bottom="1rem"
   data-stick-right="1rem"
   data-stick-z="50">
</a>
```

Offset attribute values are passed through verbatim — accept any valid CSS length (`0`, `1rem`, `2vh`, `calc(...)`). Bare numeric strings get a `px` suffix appended for ergonomic parity with the existing project conventions; rem/percent/calc values pass through untouched. `data-stick-z` is plain integer, defaulted to `auto` if absent.

The module lives at `src/utils/stickViewport.ts` and exports a `stickViewport()` named function, matching the project's module pattern. It is called once from `src/index.ts` inside the `Webflow.push` callback.

### Responsive support

Breakpoint-suffixed attributes override the bare attributes at the matched media query, consistent with `randomImagesFadeIn.ts` precedent. Single mobile breakpoint at `(max-width: 991px)` matches Webflow's tablet/mobile boundary and the project's existing responsive convention.

```html
<nav data-stick-viewport
     data-stick-top="0"
     data-stick-left="0"
     data-stick-right="0"
     data-stick-z="100"
     data-stick-mobile-top="0"
     data-stick-mobile-left="0"
     data-stick-mobile-right="0"
     data-stick-mobile-z="200">
</nav>
```

Implementation reads both sets at boot, caches them per element, and uses `matchMedia('(max-width: 991px)')` with a `change` listener to re-apply the active set on breakpoint crossings. Don't recompute on every resize event — only on breakpoint transitions, and only the inline-style write, never reparenting. Reparenting happens once per element, period.

If a future design needs a tablet split, extend the suffix vocabulary (`-tablet-`, `-mobile-landscape-`) rather than introducing a generic media-query attribute — keep the API constrained and consistent.

### Implementation considerations

**1. Webflow IX2 bindings survive reparenting.** IX2 binds event listeners (click, hover, scroll-trigger) directly to DOM nodes during `Webflow.ready()`, before the bundle runs. Moving a node with `parentNode.appendChild(otherParent, node)` preserves the node identity and its attached listeners — IX2 hover/click effects continue to fire on the moved nav. What it *does* break is any IX2 effect that targets descendants via a parent-relative selector or that reads a parent's class as a trigger. For NGA, audit each `[data-stick-viewport]` candidate against the IX2 panel in Designer before adding the attribute. Nav and badge are safe (self-contained interactions); modal overlay is safe (no IX2 on it); cookie banners and any IX2-driven sticky reveal need verification. Document each one in `docs/reference/component-patterns.md` as it's added.

**2. Reparenting timing slots in `src/index.ts` between ScrollSmoother and pin creation.** Order is load order:

```ts
window.Webflow.push(() => {
  // 1. debugOverlay() — gated by ?debug=1
  // 2. gsapSmoothScroll() — creates ScrollSmoother, builds #smooth-wrapper / #smooth-content
  // 3. stickViewport() — reparents [data-stick-viewport] elements out of #smooth-content
  // 4. All other UI modules
  // 5. Animation modules (gsapBasicAnimations, generalScrollTextReveal, pins, etc.)
})
```

Reparenting must happen *after* ScrollSmoother creates the wrappers (otherwise there is no `#smooth-wrapper` to move into) and *before* any ScrollTrigger pin is created against an element that might itself be inside the moved subtree (otherwise the pin is created against stale geometry). In practice no marked element should also be a pin target — but ordering this strictly avoids the foot-gun. Add a console warning in `stickViewport()` if it finds zero `#smooth-wrapper` (smooth-scroll module hasn't run, or auto-wrap was disabled).

**3. The utility exposes `position: fixed` only — true `position: sticky` is impossible inside a transformed ancestor and the scrollable parent in ScrollSmoother is `window`, not `#smooth-wrapper`. Sticky-like behavior under ScrollSmoother is what ScrollTrigger pins are for.** Don't confuse the two. The name `data-stick-viewport` describes the *outcome* (the element sticks to the viewport) not the CSS mechanism. If a component needs sticky-like behavior tied to a section (stay sticky while parent section scrolls, release at section end), build it as a ScrollTrigger pin in its own module — that's `gsapSmoothScroll`'s domain, not this utility's. Keep `stickViewport.ts` strictly fixed-positioning. Document this clearly in the module's leading comment so the next person doesn't try to extend it into pin territory.

**4. Modal overlay specifically needs `data-stick-viewport` plus the existing `stopSmoothScroll()` route.** `modals.ts` already pauses ScrollSmoother via `smoother.paused()` when a dialog opens, which freezes the content transform — but the overlay element itself is still inside `#smooth-content` and would render at whatever frozen transform offset is current. With `[data-stick-viewport]` on the overlay, it sits in `#smooth-wrapper` directly and `position: fixed` resolves to the actual viewport, so the dim backdrop covers correctly regardless of scroll position at open time. Add `data-stick-viewport` to the global `[data-modal-overlay]` element in the Webflow Designer template, plus offset attrs covering full viewport. Update `docs/reference/modal-setup.md` to make this part of the contract — overlay in Designer must carry both `data-modal-overlay` and `data-stick-viewport`.

**5. Edge case: dynamically-inserted elements.** If a CMS-driven modal or banner gets injected after boot, it won't go through `stickViewport()`'s one-shot pass. Two options: (a) re-run `stickViewport()` after any DOM injection (cheap, idempotent if guarded with a `data-stuck="true"` marker after first reparent); (b) require all `[data-stick-viewport]` elements to exist in the static template. Prefer (b) — the use cases (nav, badge, modal overlay, cookie banner, footer reveal) are all static template elements. If a future feature genuinely needs late injection, add the idempotent re-run then, not preemptively.

### Long-term architectural alternative

The auto-wrap + utility pattern is a workaround. The architecturally clean state is to skip auto-wrap entirely by passing `wrapper` and `content` explicitly to `ScrollSmoother.create()`:

```ts
ScrollSmoother.create({
  wrapper: 'body',
  content: '.page-wrapper',
  smooth: 1,
  effects: true,
})
```

with the Webflow Designer template restructured so that `.page-wrapper` contains only the scrollable page body, and nav, `w-webflow-badge`, modal overlays, footer-fixed elements, cookie banners all live as siblings of `.page-wrapper` directly under `<body>`. No transform is applied to those siblings, so `position: fixed` on the nav resolves to the viewport natively, no reparenting needed, no utility needed. ScrollTrigger pins inside `.page-wrapper` continue to work because the smooth-scrolled tree is still ScrollSmoother-managed.

When is this worth doing? Three triggers:

- **Trigger 1:** The list of `[data-stick-viewport]` elements crosses ~5–6 distinct components, or a third Webflow project adopts the same utility. At that point the per-project Designer-restructure cost is amortised by no longer maintaining `stickViewport.ts`, no longer auditing IX2 fallout per element, no longer documenting reparent timing.
- **Trigger 2:** A future Webflow template ships with `.page-wrapper` semantics native (Relume or similar adopting the convention). Migrating to the explicit structure becomes nearly free at that point — adopt it on the next greenfield project, then backport to existing projects opportunistically.
- **Trigger 3:** A `[data-stick-viewport]` element ends up needing IX2 interactions that break under reparenting. That's the architectural smell — at that point, restructuring the Designer template is cheaper than fighting IX2 on a moved node.

Until one of those triggers, the utility is the right answer: lower upfront cost, contained surface area, easy to remove later by deleting the module and the attributes once the Designer template is restructured. The migration path is non-destructive — restructuring the template doesn't break anything that the utility was already handling, since `position: fixed` resolves the same way once the transformed ancestor is removed.

## Cross-references

- [`scrolltrigger-mobile-premature-animations.md`](./scrolltrigger-mobile-premature-animations.md) — direct predecessor. Documents the v1.0.13 eager-promote + `waitForAllImages` fix that was REMOVED in this migration. Header banner needed: superseded for the initial-load failure mode (ScrollSmoother handles dynamic page-height natively). The six failed reactive attempts on iOS remain valuable historical context — that genealogy explains why a single-source-of-truth scroll model was needed.
- [`scrolltrigger-stale-positions-late-image-loads.md`](./scrolltrigger-stale-positions-late-image-loads.md) — canonical "three-layer refresh hooks" pattern. Defense-in-depth pattern is preserved post-migration; the new doc covers the post-init layout-shift class (CMS hydration, accordions, font swaps) that ScrollSmoother does NOT subsume.
- [`single-bundle-pier-point-migration.md`](./single-bundle-pier-point-migration.md) — architectural parent. "No coordination primitives" and `Webflow.push` ordering rules; ScrollSmoother slots into the same single-bundle init shape.
- [`../../brainstorms/2026-04-28-scrolltrigger-site-wide-stability-requirements.md`](../../brainstorms/2026-04-28-scrolltrigger-site-wide-stability-requirements.md) — pre-migration thinking; planned to keep Lenis. Snapshot.
- [`../../plans/2026-04-28-001-fix-scrolltrigger-site-wide-stability-plan.md`](../../plans/2026-04-28-001-fix-scrolltrigger-site-wide-stability-plan.md) — implementation plan. Phase 2 surfaced Lenis's diverging cache as the actual root cause; Phase 2 reversed the keep-Lenis decision.
- `CLAUDE.md` — project router. Contains Lenis-specific guidance that needs swapping to ScrollSmoother equivalents (refresh-call warning, lazy-image pre-init bullet, plus a new bullet for the position:fixed/sticky containing-block gotcha).
- `src/types/gsap.d.ts` — `LenisInstance`/`LenisConstructor` ambient types retained as deprecated for backward compat. Intentional dead-code-eliminated declaration retention.

## Refresh candidates (post-migration drift)

The migration from Lenis to ScrollSmoother creates a documented-knowledge cluster that's now partially stale. A targeted `/ce:compound-refresh` pass should sweep:

- **`CLAUDE.md` lines 155–171** — ScrollTrigger.refresh warning still mentions `lenis.on('scroll', …)`; lazy-images-pre-init bullet documents the v1.0.13 eager-promote pattern that was removed. Both mislead post-migration. Add new bullet for ScrollSmoother containing-block gotcha.
- **`scrolltrigger-mobile-premature-animations.md`** — frontmatter needs `superseded_by` pointer; "Winning fix" section describes code that no longer exists; performance follow-up is overtaken by events. Genealogy of six failed iOS attempts and "around Mona" diagnostic clue remain valuable.
- **`scrolltrigger-stale-positions-late-image-loads.md`** — three-layer pattern accurate; line 55 code comment ("defers past Lenis momentum") and line 126 PR review red flag mention Lenis specifically; reword to ScrollSmoother. Tags add `scrollsmoother`.
- **`single-bundle-pier-point-migration.md`** — line 81 lists Lenis among CDN globals (now stale, ScrollSmoother is part of GSAP Club); line 117 references "Lenis smooth scroll setup" as the only legitimate coordinator. Annotate with migration note; core thesis unchanged.
- **`docs/reference/modal-setup.md`** line 36 — "Locks body scroll and pauses Lenis smooth scroll" — reword to ScrollSmoother; add overlay `[data-stick-viewport]` requirement once utility ships.
- **Brainstorm and plan docs (2026-04-28)** — leave bodies as-is (dated snapshots), add top-of-file post-script noting the mid-execution decision to migrate to ScrollSmoother.

Recommended scope hint for `/ce:compound-refresh`: `scroll-engine` cluster — `CLAUDE.md`, `scrolltrigger-mobile-premature-animations.md`, `scrolltrigger-stale-positions-late-image-loads.md`, `modal-setup.md`, and `single-bundle-pier-point-migration.md`.

## See also

- GSAP ScrollSmoother docs: https://gsap.com/docs/v3/Plugins/ScrollSmoother/
- Lenis open issues that the migration sidesteps: [#103 macOS Safari position:fixed jitter](https://github.com/darkroomengineering/lenis/issues/103), [#237 disable smooth scroll on trackpad](https://github.com/darkroomengineering/lenis/issues/237), [#389 ScrollTrigger snap issues](https://github.com/darkroomengineering/lenis/issues/389)
- CSS Containing Block spec — transformed ancestor creates new containing block for fixed/absolute descendants: https://www.w3.org/TR/css-position-3/#containing-block-details
