---
title: "Modals under GSAP ScrollSmoother: scroll-lock, focus, and DOM placement"
date: "2026-04-30"
category: "integration-issues"
component: "modals.ts, gsapSmoothScroll.ts"
tags:
  - gsap
  - scrollsmoother
  - normalizescroll
  - modals
  - dialog
  - scroll-lock
  - focus-management
  - ios-safari
  - touch-events
  - position-fixed
  - transformed-ancestor
  - webflow
  - accessibility
severity: "high"
status: "resolved"
resolved_in: "v1.1.2"
---

## Symptom summary

Modals on a Webflow site running GSAP ScrollSmoother (`normalizeScroll: true`) exhibited a cascade of bugs: opening a modal double-shifted the page, the underlying page scrolled instead of the modal's `overflow-y: auto` container (worse on iOS Safari touch than macOS wheel), and the smoother jumped to the trigger's Y position because focus was applied mid-transition. Solved over v1.1.0 → v1.1.2 by (a) requiring modals to live OUTSIDE `#smooth-content` in Designer so `position: fixed` resolves against the viewport, (b) using GSAP's documented `smoother.paused(true)` / `paused(false)` to halt scroll instead of body offsets or wheel/touchmove blockers, and (c) deferring `firstFocusable.focus({ preventScroll: true })` until the CSS open transition completes (parsed from `transitionDuration` + `transitionDelay`).

## Root cause

Under ScrollSmoother with `normalizeScroll: true`, the smoother intercepts every wheel and touch event at the document level and translates `#smooth-content` via `transform: translate3d(...)` rather than letting the browser scroll natively. A side effect that traps every "obvious" scroll-lock approach: `window.scrollY` no longer reflects the document's scroll position — it returns the smoother's internal scroll value. The body itself has `overflow: hidden` and is height-locked to the viewport.

The classic body-scroll-lock pattern (`body.style.top = -window.scrollY` + a `.no-scroll` class that adds `position: fixed; width: 100%`) was designed for native scroll. When you apply it under `normalizeScroll`, you read the smoother's scroll value, then yank the body up by that amount, then make the body `position: fixed`. The visible content double-shifts: once because the smoother's transform is still applied to `#smooth-content`, and again because the body is now offset by the same Y value. The user sees the page jump up by hundreds of pixels at the moment the modal opens.

The reverse problem hits modal-internal scrolling. A modal with `overflow-y: auto` ought to scroll its own contents when the user wheels or drags inside it — but `normalizeScroll: true` captures the gesture at the document level before the modal's overflow container can claim it. On macOS this can be defeated with a `wheel` `stopPropagation` blocker on the modal subtree (wheel events bubble in event order). On iOS Safari, the touch model is different: the browser picks the scroll target at `touchstart` and locks it for the gesture's lifetime, so a `touchmove` blocker arrives too late — the smoother has already claimed the gesture and scrolls the page underneath.

The right primitive is the smoother's own pause API. `smoother.paused(true)` halts ScrollSmoother entirely, including its `normalizeScroll` event handlers. The smoother stops capturing wheel/touch events at the document level, which both stops page scrolling AND releases the modal's `overflow-y: auto` container to handle native scroll on every device. This is the [GSAP-documented modal pattern](https://gsap.com/docs/v3/Plugins/ScrollSmoother/paused()).

## Working solution

Two helpers in `src/utils/gsapSmoothScroll.ts` wrap the smoother's pause API:

```ts
// Pause/resume the smoother. Used by modals.ts to halt page scrolling while
// a modal is open — when paused, ScrollSmoother (including its normalizeScroll
// event handlers) stops processing scroll events entirely, releasing the
// modal's overflow-y:auto to handle native wheel/touch scrolling. This is the
// GSAP-documented modal pattern. Do NOT combine with body.style.top / a
// `no-scroll` body class — under normalizeScroll, window.scrollY returns the
// smoother's value and applying it as a body offset double-shifts the page.
export const stopSmoothScroll = () => smootherInstance?.paused(true)
export const startSmoothScroll = () => smootherInstance?.paused(false)
```

`modals.ts` calls them in `openModal` / `closeModal`:

```ts
function openModal(modal: HTMLElement, trigger: HTMLElement) {
  if (activeModal) closeModal()
  activeModal = modal
  activeTrigger = trigger
  modal.classList.add('is-open')
  modal.setAttribute('aria-hidden', 'false')
  trigger.setAttribute('aria-expanded', 'true')
  // ...overlay toggle...

  // GSAP-documented modal pattern: pausing the smoother halts page scrolling
  // (including normalizeScroll's wheel/touch interception) AND releases the
  // modal's overflow-y:auto for native scroll handling on every device.
  stopSmoothScroll()

  focusAfterTransition(modal)
}

function closeModal() {
  // ...class/aria flips...
  startSmoothScroll()
  trigger?.focus({ preventScroll: true })
  activeModal = null
  activeTrigger = null
}
```

**Designer placement is part of the solution, not optional.** ScrollSmoother applies `transform: translate3d(...)` to `#smooth-content`, which makes it a containing block for any descendant `position: fixed` element. A modal placed inside `#smooth-content` would resolve `inset: 0` against the transformed content layer rather than the viewport, so it would scroll with the page and visually offset.

| Modal type | Designer placement |
|---|---|
| Static one-off | Sibling of the page's main wrapper, outside `#smooth-content` |
| CMS collection | Build a SECOND Collection List bound to the same collection, sitting outside `#smooth-content`. The trigger card list stays inside; the modal list is its own outside-of-content sibling. Slug-based ids on the dialogs pair with `data-modal-open` values on the cards via `getElementById`. |
| Global overlay | Sibling of the main wrapper, outside `#smooth-content` |

`modals.ts` does NOT reparent at runtime — placement is a Designer-time structural decision. Triggers and dialogs find each other by id, so they can live anywhere in the DOM.

**Deferred focus.** Synchronously focusing the first focusable on `is-open` causes a different normalizeScroll bug: the modal is mid-transition, the focusable is still below the viewport edge, and the browser's focus-into-view request bypasses `preventScroll: true` because ScrollSmoother is the actual scroll author. The page scrolls to the trigger's Y position. Fix: read the modal's transition duration + delay from computed style and `setTimeout` the focus call until after the transition completes. By then the focusable is in the viewport, so there's nothing to scroll into view.

```ts
function focusAfterTransition(modal: HTMLElement) {
  const computed = getComputedStyle(modal)
  const duration = parseSecondsList(computed.transitionDuration)
  const delay = parseSecondsList(computed.transitionDelay)
  const waitMs = Math.max(50, (duration + delay) * 1000 + 50)
  window.setTimeout(() => {
    if (activeModal !== modal) return
    const focusable = getFocusableElements(modal)
    const firstFocusable = focusable[0] ?? modal
    firstFocusable.focus({ preventScroll: true })
  }, waitMs)
}
```

**Hard rule.** Do NOT combine `paused(true)` with `body.style.top = -window.scrollY` or a `.no-scroll` class that sets `position: fixed` on body. Under `normalizeScroll`, `window.scrollY` returns the smoother's value; applying it as a body offset double-shifts visible content. This is the page-shift bug originally (and incorrectly) blamed on `paused()` itself.

## What didn't work and why

1. **Reparent the modal to `<body>` on open + restore on close** (with a placeholder div, then a shallow-cloned placeholder). Sidesteps the containing-block issue without touching scroll lock — but moving the dialog out of its DOM home triggers layout shifts in adjacent flow content, breaks CSS transitions started immediately before the move (the moved node briefly remounts), and on CMS-bound modals the placeholder bookkeeping is fragile. Replaced by static Designer placement (modal sibling-of-main-wrapper) so no runtime DOM mutation is needed.

2. **Wheel + touchmove `stopPropagation` blocker on the modal/overlay subtree** (v1.1.1). Stops `wheel` events from bubbling out to ScrollSmoother's document-level listeners — works on macOS trackpad and mouse wheel. Fails on iOS Safari touch: the browser picks the scroll target at `touchstart` and locks it for the gesture's lifetime, so `touchmove.stopPropagation()` arrives after `normalizeScroll` has already claimed the gesture. The page scrolls underneath the open modal. Replaced in v1.1.2 by `smoother.paused(true)`, which disables `normalizeScroll` itself, releasing the modal's `overflow-y: auto` for native handling on every device.

3. **Synchronous `focus({ preventScroll: true })` on the first focusable in `openModal`.** The MDN-blessed hint that should suppress focus-into-view scrolling is bypassed under `normalizeScroll: true` — the actual scroll author is ScrollSmoother, not the browser, and the browser's focus-into-view request triggers a smoother scrollTo. Verified with a debug overlay: `scrollTop` jumped from 0 to ~the trigger's Y position. Fix is to defer focus until the open transition finishes (so the focusable is already inside the viewport — nothing to scroll to).

4. **body-scroll-lock pattern: `body.style.top = -window.scrollY` + `body.classList.add('no-scroll')`.** The default reflex from native-scroll projects. Under `normalizeScroll`, `window.scrollY` returns the smoother's scroll value, not 0; applying it as a body `top: -value` while the smoother's transform is still active produces a visible double-shift on open (page jumps up by hundreds of pixels). This was the bug initially blamed on `paused()` itself before the body-scroll-lock leftover was identified as the actual culprit.

## When to use which scroll lock

The right scroll lock depends on which library — if any — owns scroll events. The DOM contract for the modal stays the same; only the lock primitive changes.

| Stack | Scroll lock primitive | Notes |
|---|---|---|
| **Native scroll** (no smooth-scroll lib) | `document.body.classList.add('no-scroll')` where `.no-scroll { overflow: hidden; position: fixed; width: 100%; top: -<scrollY>px }` plus restore `window.scrollTo(0, scrollY)` on close | The classic pattern. Read `window.scrollY` once on open, write it back on close. iOS needs the `position: fixed` + negative-top trick to defeat momentum. |
| **Lenis** | `lenis.stop()` on open, `lenis.start()` on close. Mark the scrollable modal container with `data-lenis-prevent` so wheel/touch inside the modal isn't consumed by Lenis. | `data-lenis-prevent` is the per-element opt-out. Don't pair `lenis.stop()` with body-scroll-lock — Lenis manages its own `overflow` state. |
| **ScrollSmoother** (this project) | `smoother.paused(true)` on open, `smoother.paused(false)` on close. Modal must live outside `#smooth-content`. Defer focus until transition ends. | `paused(true)` halts the smoother including its `normalizeScroll` handlers, which both stops page scroll AND releases native wheel/touch for the modal's `overflow-y: auto`. Do NOT combine with body-scroll-lock — `window.scrollY` returns the smoother's value under `normalizeScroll` and double-shifts the page. |

**Rules that hold across all three:**

- The modal/dialog with `position: fixed; inset: 0` must not have a transformed ancestor. Under ScrollSmoother that means living outside `#smooth-content`. Under Lenis, transforms are typically applied per-section by GSAP not by Lenis itself, so placement is usually free — but check.
- Never call `element.focus()` (with or without `preventScroll: true`) while the modal is mid-transition under any smooth-scroll lib that owns scroll. Defer focus until after the open transition.
- Never read `window.scrollY` to compute a body offset under a smooth-scroll lib that virtualises scroll — the value reflects the lib's internal state, not the document's.
- One scroll lock primitive at a time. Stacking `lenis.stop()` + body-scroll-lock, or `paused(true)` + body-scroll-lock, produces page shifts that masquerade as the lock primitive being broken.

Reference: [GSAP ScrollSmoother `paused()` docs](https://gsap.com/docs/v3/Plugins/ScrollSmoother/paused()).

## Prevention checklist for future projects

A transferable checklist for any Webflow (or single-page-app) project that combines GSAP ScrollSmoother — or any transform-based smooth-scroll library — with accessible modal dialogs.

### Designer / DOM setup

- **DO** place every dialog OUTSIDE the transformed scroll container. For ScrollSmoother that means as a sibling of `#smooth-content` (i.e. inside `page-wrapper` but outside the smoother wrapper). `position: fixed` resolves against the nearest transformed ancestor, so a dialog nested inside `#smooth-content` will never cover the viewport reliably.
- **DON'T** nest a CMS dialog inside the same Collection Item as its trigger card. This is the #1 Webflow mistake. Instead, render two Collection Lists bound to the same collection: trigger list inside `#smooth-content`, modal list outside it. Pair them via the CMS Slug field bound to both `data-modal-open` and the dialog's native `id`.
- **DO** put all positioning on the dialog's BASE class: `position: fixed; inset: 0; opacity: 0; pointer-events: none; transition: opacity 0.4s ease;`. The `is-open` combo flips ONLY visual properties (`opacity`, `transform`, `pointer-events`). Never let `is-open` introduce `position` or `display` for the first time — the first frame will have no positioning context and the dialog will paint at the wrong place or not at all.
- **DON'T** toggle `display: none ↔ block`. That kills CSS transitions and forces a reflow on every open/close. Use opacity + pointer-events.
- **DO** set `overflow-y: auto` (or `scroll`) on the dialog body so long content scrolls natively while the page scroll is paused. Without this, taller-than-viewport content is unreadable.
- **DO** give the overlay its own `z-index` (e.g. 900) below the dialog (e.g. 1000), and place it as a sibling of the main wrapper with `data-modal-overlay` + `data-modal-close`.
- **DO** set the static a11y attributes in Designer once: `role="dialog"`, `aria-modal="true"`, `aria-hidden="true"`, `tabindex="-1"`. The script flips `aria-hidden` and wires `aria-labelledby` / `aria-describedby` at runtime.
- **DON'T** leave a stale `data-modal` attribute on the dialog wrapper — only the native `id` field is used by the script.

### JS implementation

- **DO** pause the smoother on open and resume on close. Pattern:
  ```ts
  smoother.paused(true)   // open
  smoother.paused(false)  // close
  ```
  Pausing halts page scrolling AND releases the modal's `overflow-y: auto` for native wheel/touch handling under `normalizeScroll`.
- **DON'T** combine `smoother.paused(true)` with `body.style.top = -window.scrollY` or a `body.no-scroll { position: fixed }` class. Under `normalizeScroll: true`, `window.scrollY` returns ScrollSmoother's internal scroll value, and applying it as a body offset double-shifts the page on open and again on close. The classic "scroll lock" recipe is actively harmful here.
- **DON'T** reparent the modal at runtime to escape the smoother (placeholder/clone tricks). Every variant we tried hit edge cases — transition timing breaks, CMS grid-cell fidelity is lost, focus order resets. Fix the DOM placement at design time instead.
- **DO** defer the focus call until after the open transition completes. Read the dialog's computed `transitionDuration` + `transitionDelay`, add a 50 ms buffer, then `focus({ preventScroll: true })`. Focusing while the dialog is mid-slide leaves the focusable target outside the viewport, which triggers a scroll-into-view.
- **DON'T** rely on `focus({ preventScroll: true })` alone under `normalizeScroll`. The hint is honoured by the browser but ScrollSmoother's normalized scroll model bypasses it — the page jumps to the trigger's Y position. Defer focus instead.
- **DO** keep the open-state signal as a CLASS (`is-open`), not an attribute. CSS combo classes are easier to author and the transition runs naturally in the same frame the class flips.
- **DO** discover dialogs via `document.getElementById(modalId)` at click time, not via DOM-tree relationship. Trigger and dialog can then live in different subtrees with zero coupling.

### Sanity-check snippet for any new project

Paste in the browser console after building a modal. One row per dialog should print as `position: "fixed"`, `inSmoothContent: false`, `overflowY: "auto"`/`"scroll"`, and matching `id`/`triggerValue`.

```js
const smoothContent = document.getElementById('smooth-content')
console.table([...document.querySelectorAll('[role="dialog"]')].map((d) => {
  const cs = getComputedStyle(d)
  const trigger = document.querySelector(`[data-modal-open="${d.id}"]`)
  return {
    id: d.id || '(missing)',
    triggerValue: trigger?.getAttribute('data-modal-open') ?? '(no trigger)',
    inSmoothContent: !!smoothContent && smoothContent.contains(d),
    position: cs.position,
    inset: `${cs.top}/${cs.right}/${cs.bottom}/${cs.left}`,
    overflowY: cs.overflowY,
    transitionMs: cs.transitionDuration,
  }
}))
```

Fail conditions: `inSmoothContent: true` (move the dialog out), `position` not `"fixed"` (move positioning to the base class), `overflowY: "visible"` (long content will overflow the viewport), `transitionMs: "0s"` (focus will fire too early — either add a transition or shorten the deferred-focus min).

### Library-agnostic notes

The pattern translates directly to other smooth-scroll setups, only the "pause" call changes:

- **Lenis:** call `lenis.stop()` on open, `lenis.start()` on resume. Optionally add `data-lenis-prevent` to the dialog so wheel/touch events on it bypass Lenis entirely (useful if you keep Lenis running). Do NOT also lock the body — Lenis's own `position: fixed` body lock + a manual lock will conflict.
- **Locomotive Scroll:** `locoScroll.stop()` / `locoScroll.start()`, plus the `data-scroll-prevent`-style attribute on the dialog if needed.
- **Native scroll (no smooth-scroll lib):** the simplest case — `document.body.style.overflow = 'hidden'` on open, restore on close. No transformed-ancestor problem, so dialogs can live anywhere in the tree.
- **Universal rule:** whatever the library, the dialog must NEVER live inside a transformed wrapper, the open class must only flip visual properties, and focus must be deferred until after the open transition. Those three rules are what make modals portable across scroll stacks.

## Cross-references

- [`./scrollsmoother-vs-lenis-cache-divergence.md`](./scrollsmoother-vs-lenis-cache-divergence.md) — architectural parent. Migration introduced the `normalizeScroll` event-capture and transformed-wrapper containing block that broke modal scroll-lock; section "Future strategy `[data-stick-viewport]`" (item 4, line 199) explicitly anticipated the `smoother.paused()` requirement for modal overlays.
- [`./scrollsmoother-position-fixed-sticky-replacement.md`](./scrollsmoother-position-fixed-sticky-replacement.md) — sibling utility doc; explains why modals must live outside `#smooth-content` (same containing-block reasoning) and is the proximate trigger for relocating modal markup in v1.1.0.
- [`../../reference/modal-setup.md`](../../reference/modal-setup.md) — the canonical contract doc. Updated as part of v1.1.0 to add the "ScrollSmoother constraint" section but does NOT yet document the `paused()` pattern (refresh candidate — see below).
- [`../../reference/scroll-pin.md`](../../reference/scroll-pin.md) — declarative pin utility, complementary surface that exposes the same containing-block rule.
- `CHANGELOG.md` v1.1.0 / v1.1.1 / v1.1.2 — three-step genealogy: v1.1.0 simplified `modals.ts` (removed body-scroll-lock + ScrollSmoother pause + DOM reparent), v1.1.1 added wheel/touchmove `stopPropagation` blocker, v1.1.2 reinstates `smoother.paused(true)` via re-exported `startSmoothScroll`/`stopSmoothScroll` from `gsapSmoothScroll.ts` and explicitly warns against `body.style.top = -scrollY` double-shift.

## Refresh candidates (post-this-doc)

The following docs now contain stale or contradictory guidance and should be refreshed:

- **`docs/reference/modal-setup.md`** — three issues:
  1. Lines 37–41 still recommend "no `paused`, no body lock, add a wheel/touchmove preventDefault on the overlay if needed" — directly contradicts the v1.1.2 canonical pattern. The wheel/touchmove preventDefault recommendation is exactly the v1.1.1 approach that v1.1.2 superseded for iOS touch reasons.
  2. Lines 130–135 describe the body-scroll-lock pattern (`body.no-scroll { overflow: hidden; position: fixed; width: 100%; }`) as part of the contract — the v1.1.2 changelog explicitly warns against pairing this with `paused()` (causes the open-shift bug under `normalizeScroll`).
  3. No mention anywhere of `smoother.paused(true)` / `startSmoothScroll` / `stopSmoothScroll`. Needs a new "Scroll lock under ScrollSmoother" subsection.
- **`docs/solutions/integration-issues/scrollsmoother-vs-lenis-cache-divergence.md`** — line 199 claims "modals.ts already pauses ScrollSmoother via `smoother.paused()` when a dialog opens." That was true at write time, became false in v1.1.0 (pause was removed), and is true again as of v1.1.2. Re-anchor or footnote.

Recommended scope hint: `/ce:compound-refresh modal-scroll-lock` — narrow refresh covering `docs/reference/modal-setup.md` (primary), `docs/solutions/integration-issues/scrollsmoother-vs-lenis-cache-divergence.md` (line 199), and a one-liner addition in `CLAUDE.md` Modals bullet.
