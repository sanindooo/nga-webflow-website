---
title: "feat: Client Feedback Batch — ScrollSmoother Fixes, Project Button, Footer Animation, Column Order"
type: feat
status: active
date: 2026-05-28
origin: docs/brainstorms/2026-05-28-client-feedback-batch-requirements.md
---

# Client Feedback Batch — ScrollSmoother Fixes, Project Button, Footer Animation, Column Order

## Summary

Six changes to the NGA custom code bundle addressing client feedback. Three fix ScrollSmoother interaction conflicts (mobile menu scroll, filter horizontal scroll, project button intersection hide). Two add new behavior (project button color theming, footer sticky text animation with mobile breakpoint). One corrects layout reading order on project/team pages. Each change follows existing codebase patterns — `modals.ts` pause/resume for the menu, `navTheme.ts`-style section detection for the button, `homeTextSticky.ts` extension for the footer, and CSS or lightweight JS for column reorder.

---

## Problem Frame

Three of the six items stem from ScrollSmoother's `normalizeScroll: true` intercepting all touch/scroll events — the mobile nav menu can't scroll overflow content, the filter tag bar can't scroll horizontally, and the fixed project info button can't be hidden via z-index alone against the contact footer. The remaining items are a color adaptation for readability, a new scroll animation, and a CSS layout correction. (See origin: `docs/brainstorms/2026-05-28-client-feedback-batch-requirements.md`)

---

## Requirements

- R1. When the contact footer section enters the viewport, the fixed project info button fades out and becomes non-interactive.
- R2. When the contact footer section leaves the viewport, the button fades back in and becomes interactive.
- R3. The button toggles an `is-light` class when it overlaps dark-background sections.
- R4. Color detection reuses `data-header-theme` section attributes but operates independently from `navTheme.ts`.
- R5. Both behaviors live in a single module sharing one detection mechanism.
- R6. When the mobile nav opens, ScrollSmoother pauses and `normalizeScroll` disables so menu overflow content scrolls natively.
- R7. When the mobile nav closes, ScrollSmoother resumes and `normalizeScroll` re-enables.
- R8. The fix follows the same pause/resume pattern as `modals.ts`.
- R9. The filter tag bar on listing pages scrolls horizontally on touch devices.
- R10. The filter element is exempted from `normalizeScroll` touch capture without disabling it globally.
- R11. The footer CTA section uses a sticky text reveal animation matching `homeTextSticky.ts`.
- R12. Below 480px width, the sticky animation disables entirely; a simple fade-in replaces it.
- R13. The breakpoint gate uses GSAP `matchMedia` for clean revert/re-apply on resize.
- R14. Project detail page multi-column description reads top-to-bottom within each column.
- R15. Team member descriptions follow the same top-to-bottom reading order.
- R16. If CSS-only works, no JS module is needed; otherwise a lightweight JS utility handles it.

**Origin acceptance examples:** AE1 (covers R1, R2 — button fades on contact footer intersect), AE2 (covers R3, R4 — button color adapts independently of nav), AE3 (covers R6, R7 — mobile menu scrolls overflow), AE4 (covers R9 — filter bar horizontal swipe), AE5 (covers R12, R13 — mobile breakpoint fallback)

---

## Scope Boundaries

- No changes to `navTheme.ts` — project button is fully independent.
- `stickyFilter.ts` reactivation is a separate concern.
- No new CDN dependencies — all fixes use GSAP APIs already loaded.

### Deferred to Follow-Up Work

- Webflow Designer DOM changes (user handles manually — class additions, attribute placement, element restructuring for column layout if needed).

---

## Context & Research

### Relevant Code and Patterns

- `src/utils/modals.ts` — `stopSmoothScroll()`/`startSmoothScroll()` pause/resume pattern for full-viewport overlays. Exact model for nav menu fix.
- `src/utils/gsapSmoothScroll.ts` — ScrollSmoother config (`normalizeScroll: true`), exports `getSmoother()`, `stopSmoothScroll()`, `startSmoothScroll()`.
- `src/utils/navTheme.ts` — rAF-based section detection using `getBoundingClientRect()` against elements with `data-header-theme` attributes. Reference for the project button's color detection, but the button's version should be simpler (class toggle, not mask gradient).
- `src/utils/homeTextSticky.ts` — Sticky text reveal with SplitText word animation, pin via ScrollTrigger, touch vs desktop branching. Direct template for footer animation.
- `src/utils/navToggle.ts` — Current nav open/close logic. Needs `stopSmoothScroll()`/`startSmoothScroll()` calls added.
- `src/utils/filterActiveState.ts` — Existing filter logic. Targets `[fs-cmsfilter-element="filters"]`. The filter bar selector lives near this code.
- `src/index.ts` — Module registration order. New modules must be inserted at the correct position.

### External References

- GSAP `normalizeScroll` supports `allowNestedScroll: true` as a config object property — detects scrollable children and relinquishes touch control. First-pass fix for filter bar.
- Per-element exemption via `stopImmediatePropagation` on `touchstart` + `wheel` — GSAP-recommended fallback when `allowNestedScroll` has edge cases (e.g., slight page leakage on iOS).
- `smoother.paused(true)` is all-or-nothing — appropriate for full-viewport overlays (nav menu, modals) but NOT for the filter bar where page scroll should continue.

---

## Key Technical Decisions

- **`normalizeScroll` config change from `true` to `{ allowNestedScroll: true }`:** Global config update in `gsapSmoothScroll.ts`. This is the minimal fix for the filter bar — if `allowNestedScroll` fully resolves horizontal scroll, no per-element workaround is needed. Low risk: `allowNestedScroll` only activates when the touch target is inside a scrollable container, so non-scrollable elements behave identically. Fallback: add `stopImmediatePropagation` on the filter element if testing reveals edge cases.
- **Nav menu uses pause/resume, not `allowNestedScroll`:** The menu is a full-viewport overlay — all page scroll should stop when it's open. `allowNestedScroll` would let the page scroll leak through behind the menu. The proven modal pattern (`smoother.paused(true)`) is the right primitive.
- **Project button color detection uses ScrollTrigger callbacks, not rAF masking:** `navTheme.ts` uses per-frame `getBoundingClientRect` + CSS mask gradients because the nav spans the full viewport width and the dark/light transition can split the nav vertically. The project button is a single point — a simple ScrollTrigger `onToggle` per themed section, toggling a class, is sufficient and far cheaper.
- **Footer sticky animation via `gsap.matchMedia`:** GSAP's `matchMedia` cleanly reverts all ScrollTriggers and tweens when the media query stops matching, then re-creates them when it matches again. This handles the 480px breakpoint without manual cleanup.

---

## Open Questions

### Resolved During Planning

- **Does `normalizeScroll` support element-level exemptions?** Yes — `allowNestedScroll: true` as a config option, plus `stopImmediatePropagation` on `touchstart`/`wheel` as a per-element fallback. Both are GSAP-documented.
- **Should the mobile menu use `allowNestedScroll` or `paused(true)`?** `paused(true)` — the menu is a full-viewport overlay where all page scroll should stop. `allowNestedScroll` would leak page scroll behind the open menu.

### Deferred to Implementation

- **Exact selector for the project info button:** Needs DOM inspection via Webflow MCP or browser DevTools. The button is visible in the screenshots as "PROJECT" text at the bottom-right corner.
- **Exact selector for the contact footer section:** Needs DOM inspection. Likely has a `section_contact` or `section_footer` class.
- **Footer CTA section class structure:** Needs verification of whether it uses `.section_sticky-text` / `.sticky-text_component` or a different naming convention. Determines whether `homeTextSticky.ts` can be extended or a new module is needed.
- **Project/team page column DOM structure:** Needs DOM inspection to determine if description text is in a single rich text block (CSS `column-count` fix) or separate grid cells (JS reorder or Webflow restructure). Webflow MCP is now available to investigate this.
- **`allowNestedScroll: true` sufficiency for filter bar:** May need the `stopImmediatePropagation` fallback if testing on iOS reveals edge cases (slight page leakage or failure to recognize horizontal overflow). Implementation should test the simple approach first.

---

## Implementation Units

### U1. Enable `allowNestedScroll` in ScrollSmoother config

**Goal:** Change `normalizeScroll` from a boolean `true` to a config object with `allowNestedScroll: true`. This is the prerequisite for the filter bar fix and may also benefit other scrollable containers site-wide.

**Requirements:** R9, R10

**Dependencies:** None

**Files:**
- Modify: `src/utils/gsapSmoothScroll.ts`

**Approach:**
- Change `normalizeScroll: true` to `normalizeScroll: { allowNestedScroll: true }` in `ScrollSmoother.create()`.
- The `stopSmoothScroll()`/`startSmoothScroll()` exports remain unchanged — `smoother.paused(true/false)` is unaffected by the config shape change.

**Patterns to follow:**
- `src/utils/gsapSmoothScroll.ts` — existing ScrollSmoother config

**Test scenarios:**
- Happy path: Filter tag bar on `/works` scrolls horizontally on touch devices after the config change.
- Happy path: Vertical page scrolling continues to work normally on all pages.
- Edge case: Scrollable modal content (existing `modals.ts` pattern) still works when smoother is paused.
- Edge case: Filter bar on a viewport where all tags fit (no overflow) — no behavioral change.
- Integration: `stopSmoothScroll()` / `startSmoothScroll()` still correctly pause/resume the smoother (modals, and later nav menu).

**Verification:**
- Filter tag bar horizontally scrollable on touch devices on `/works` page.
- No regression in vertical scroll behavior, modal scroll, or any existing ScrollTrigger animations.

---

### U2. Fix mobile menu scroll under ScrollSmoother

**Goal:** Pause ScrollSmoother when the mobile nav menu opens so overflow content inside the menu scrolls natively. Resume on close.

**Requirements:** R6, R7, R8

**Dependencies:** None (uses existing `stopSmoothScroll`/`startSmoothScroll` exports)

**Files:**
- Modify: `src/utils/navToggle.ts`

**Approach:**
- Import `stopSmoothScroll` and `startSmoothScroll` from `gsapSmoothScroll.ts`.
- Call `stopSmoothScroll()` at the start of the `open()` function, after adding `is-nav-open` class.
- Call `startSmoothScroll()` in the `close()` function's `onComplete` callback, after removing `is-nav-open` class.
- This mirrors the exact pattern in `modals.ts` lines 96 and 148.

**Patterns to follow:**
- `src/utils/modals.ts` — `stopSmoothScroll()` on open (line 96), `startSmoothScroll()` on close (line 148)

**Test scenarios:**
- Covers AE3. Happy path: Open mobile menu on a page with overflow content → menu content scrolls vertically via native touch.
- Happy path: Close mobile menu → page scrolling resumes normally, ScrollSmoother re-engages.
- Edge case: Open menu, scroll within it, close menu → page scroll position is preserved (no jump).
- Edge case: Open menu, press Escape → smoother resumes (Escape triggers `close()`).
- Edge case: Open menu, click a nav link → smoother resumes (nav link click triggers `close()`).
- Integration: Open a modal from within the nav menu (if possible) → modal close resumes smoother correctly (no double-resume conflict).

**Verification:**
- Mobile menu overflow content scrolls natively when open on iPhone 12 Pro viewport (390px).
- Page scroll works normally after closing the menu.

---

### U3. Filter bar horizontal scroll fallback

**Goal:** If U1's `allowNestedScroll: true` doesn't fully resolve horizontal scroll on the filter bar (iOS edge cases), add a per-element `stopImmediatePropagation` fallback.

**Requirements:** R9, R10

**Dependencies:** U1 (test U1 first; skip U3 if U1 is sufficient)

**Files:**
- Create: `src/utils/filterBarScroll.ts` (only if needed)
- Modify: `src/index.ts` (only if new module created)

**Approach:**
- Query the filter bar element (selector to be confirmed via DOM inspection — likely `.works-filter_list` or the parent wrapper of the Finsweet filter checkboxes).
- Add `stopImmediatePropagation` on `touchstart` and `wheel` events on the filter bar element.
- This releases the element from `normalizeScroll`'s touch capture entirely — vertical swipes starting on the narrow filter bar will also bypass normalizeScroll, which is acceptable for a single-row horizontal element.
- The module follows the standard selector-guard pattern: query element, return early if not found.

**Patterns to follow:**
- `src/utils/eagerImages.ts` — minimal utility module pattern (query, guard, do work)

**Test scenarios:**
- Covers AE4. Happy path: Swipe left/right on filter tags on mobile → tags scroll horizontally.
- Edge case: Vertical swipe starting on the filter bar → page scrolls (acceptable; normalizeScroll released for this element).
- Edge case: Filter bar with no overflow (all tags visible) → no behavioral change.

**Verification:**
- Filter tags on `/works` page are horizontally scrollable on iOS Safari and Chrome Android.

---

### U4. Project info button module

**Goal:** New `projectInfoButton.ts` module that (a) hides the fixed button when the contact footer is visible, and (b) toggles an `is-light` class based on underlying section background.

**Requirements:** R1, R2, R3, R4, R5

**Dependencies:** None

**Files:**
- Create: `src/utils/projectInfoButton.ts`
- Modify: `src/index.ts`

**Approach:**

*Contact footer intersection (R1, R2):*
- Query the contact footer section (selector TBD via MCP — likely `section.section_contact` or `[data-section="contact"]`).
- Create a ScrollTrigger on the contact section. On `onToggle: (self) => { ... }`, when `self.isActive` is true, fade the button out (`gsap.to(button, { autoAlpha: 0, duration: 0.3 })` — `autoAlpha` handles both opacity and visibility/pointer-events). When false, fade it back in.

*Color detection (R3, R4):*
- Query all sections with `data-header-theme="dark"` and `data-header-theme="white"` (same attributes `navTheme.ts` uses).
- For each themed section, create a ScrollTrigger that fires when the section overlaps the button's vertical position. Use `start`/`end` values calculated relative to the button's fixed position on screen (bottom-right corner).
- `onToggle` callback adds/removes `is-light` class on the button.
- Since the button is at a fixed position, the trigger start/end can be calculated once on init and updated on resize.

*Module registration:*
- Add import and call in `src/index.ts` after `navTheme()` (the button depends on sections having `data-header-theme` attributes, which are static DOM attributes set in Webflow — no runtime dependency, but grouping with nav-related modules is logical).

**Patterns to follow:**
- `src/utils/navTheme.ts` — section querying with `data-header-theme` attributes (lines 21-26)
- `src/utils/scrollPin.ts` — ScrollTrigger-based utility module pattern

**Test scenarios:**
- Covers AE1. Happy path: Scroll to contact footer on project page → button fades out. Scroll back up → button fades back in.
- Covers AE2. Happy path: On a project page with dark hero image → button has `is-light` class. Scroll past hero into light section → `is-light` removed.
- Edge case: Page with no contact footer section → module returns early, no error.
- Edge case: Page with no `data-header-theme` sections → hide-on-contact still works, color toggle simply doesn't activate.
- Edge case: Rapid scrolling through multiple theme transitions → class toggles cleanly without flicker (ScrollTrigger handles this via `toggleActions`).
- Edge case: Window resize → button position recalculated, ScrollTrigger refreshed.

**Verification:**
- Button invisible and non-interactive when contact footer is in view on desktop and mobile.
- Button color adapts correctly on project pages with dark hero images.
- No interference with `navTheme.ts` behavior.

---

### U5. Footer sticky text animation

**Goal:** Apply the `homeTextSticky` sticky-pin + word-reveal animation to the footer CTA section, with a 480px mobile breakpoint that falls back to a simple fade-in.

**Requirements:** R11, R12, R13

**Dependencies:** None

**Files:**
- Create: `src/utils/footerTextSticky.ts`
- Modify: `src/index.ts`

**Approach:**
- The footer CTA section (visible in screenshots as "follow our story on" with "instagram" / "linkedin" links over a cloud background image) needs DOM inspection to confirm its class structure. If it uses `.section_sticky-text` and `.sticky-text_component`, the existing `homeTextSticky.ts` will already pick it up. More likely it uses a different section class — in that case, create a dedicated `footerTextSticky.ts`.
- Wrap the entire animation setup in `gsap.matchMedia` using the **keyed-object form** (the current `GsapMatchMedia` type in `src/types/gsap.d.ts` only supports `Record<string, string>`, not the plain string overload — use `mm.add({ isDesktop: '(min-width: 481px)', isMobile: '(max-width: 480px)' }, (context) => { ... })` to pass strict typecheck). Alternatively, add a string overload to the `GsapMatchMedia` interface in `src/types/gsap.d.ts`.
  - `isDesktop` context — full sticky pin + SplitText word reveal, mirroring `homeTextSticky.ts` desktop flow.
  - `isMobile` context — simple `gsap.from(element, { opacity: 0, y: 20 })` with a ScrollTrigger at `start: 'top 80%'`.
- `matchMedia` handles cleanup automatically — when the breakpoint changes, all ScrollTriggers and tweens created inside the context are reverted, and the matching context's setup function re-runs.

**Patterns to follow:**
- `src/utils/homeTextSticky.ts` — SplitText + ScrollTrigger pin pattern (entire file)
- `gsap.matchMedia` — GSAP's responsive animation primitive

**Test scenarios:**
- Happy path: On desktop (1440px), footer CTA text pins and words reveal on scroll, matching the homepage sticky text behavior.
- Covers AE5. Happy path: On mobile (375px), footer CTA text fades in on scroll without pinning.
- Happy path: On tablet (768px), sticky pin animation plays normally.
- Edge case: Resize from mobile to desktop → sticky animation activates cleanly (matchMedia revert + re-create).
- Edge case: Resize from desktop to mobile → sticky animation reverts, fade-in takes over.
- Edge case: Footer section has no matching elements → module returns early.

**Verification:**
- Footer CTA section has a working sticky text reveal on desktop, matching the homepage pattern.
- Below 480px, text fades in without pinning or layout issues.
- Resize between breakpoints transitions cleanly with no orphaned ScrollTriggers.

---

### U6. Column reading order fix

**Goal:** Correct the multi-column description text on project detail pages and team member bios to read top-to-bottom within each column instead of left-to-right across columns.

**Requirements:** R14, R15, R16

**Dependencies:** None (but requires DOM inspection to determine approach)

**Files:**
- Modify: Webflow custom code embed or CSS (if CSS `column-count` works)
- Create: `src/utils/columnReadingOrder.ts` (only if JS reordering is needed)
- Modify: `src/index.ts` (only if new module created)

**Approach:**

The fix depends on the current DOM structure, which needs MCP/DevTools inspection:

*Scenario A — Text is in a single container styled with CSS Grid or Flexbox (most likely):*
Webflow's default grid and flex layouts flow items left-to-right. The fix is CSS `column-count: 2` (or 3) on the container, which naturally flows text top-to-bottom within each column. This can be applied via a Webflow combo class or a global embed style targeting the specific section.

*Scenario B — Text is split across separate div cells in a Webflow grid:*
CSS `column-count` won't work because the content is already pre-split into grid cells. Options:
1. Restructure in Webflow Designer — merge the cells into a single container and use `column-count` (user handles this manually).
2. JS reorder — read the grid items, sort them into column-first order, and re-append them. This is fragile and a last resort.

The user should inspect the DOM first. Scenario A (CSS fix) is preferred and likely.

For team member bios, the same approach applies — inspect whether bios are in a grid or a single container.

**Patterns to follow:**
- CSS `column-count` / `break-inside: avoid` — standard multi-column layout

**Test scenarios:**
- Covers R14. Happy path: Project description text on `/works/trilliant` reads top-to-bottom within each column.
- Covers R15. Happy path: Team member descriptions read top-to-bottom within each column.
- Edge case: Single paragraph of text → no column break, reads normally.
- Edge case: Mobile viewport where columns stack to single column → reading order is naturally correct.

**Verification:**
- Reading order on project detail pages and team bios is top-to-bottom within columns across desktop, tablet, and mobile.

---

## System-Wide Impact

- **Interaction graph:** U1 changes the global `normalizeScroll` config — affects every scrollable element on the site. Low risk since `allowNestedScroll` only activates when the touch target is inside a scrollable container. U2 adds smoother pause/resume to nav toggle — potential interaction with `modals.ts` if a modal opens/closes while the nav is open (edge case, unlikely in practice).
- **State lifecycle risks:** U2 introduces a second consumer of `stopSmoothScroll()`/`startSmoothScroll()` alongside `modals.ts`. If both are open simultaneously (nav menu + modal), the second `startSmoothScroll()` call will re-enable scrolling even though one overlay is still open. This is an acceptable edge case for now — the nav menu closes on link click, and modals are unlikely to be triggered from within the nav.
- **Unchanged invariants:** `navTheme.ts` is not modified. Existing `homeTextSticky.ts` behavior on the homepage is not modified. Modal scroll-lock behavior is not modified.

---

## Risks & Dependencies

| Risk | Mitigation |
|------|------------|
| `allowNestedScroll: true` insufficient for filter bar on iOS | U3 provides a per-element `stopImmediatePropagation` fallback. Test U1 on actual iOS device before implementing U3. |
| Nav pause/resume conflicts with modal pause/resume | Edge case (both open simultaneously). Accept for now; if it surfaces, add a reference-counting wrapper around smoother pause/resume. |
| Footer CTA section uses non-standard class structure | DOM inspection via MCP will confirm. If classes differ from `homeTextSticky` pattern, `footerTextSticky.ts` uses its own selectors — no coupling. |
| Column layout is pre-split into grid cells (Scenario B) | User restructures in Webflow Designer. JS reorder is a last resort only if Designer restructuring isn't feasible. |

---

## Sources & References

- **Origin document:** [docs/brainstorms/2026-05-28-client-feedback-batch-requirements.md](docs/brainstorms/2026-05-28-client-feedback-batch-requirements.md)
- Related code: `src/utils/gsapSmoothScroll.ts`, `src/utils/navToggle.ts`, `src/utils/modals.ts`, `src/utils/navTheme.ts`, `src/utils/homeTextSticky.ts`, `src/utils/filterActiveState.ts`
- External docs: GSAP ScrollTrigger.normalizeScroll() — `allowNestedScroll` config, Observer `ignore` property
- External docs: GSAP ScrollSmoother — `smoother.paused()` modal pattern
- GSAP community: `stopImmediatePropagation` on `touchstart`/`wheel` as per-element normalizeScroll exemption
