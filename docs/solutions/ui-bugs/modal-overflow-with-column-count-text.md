---
title: "Modal with column-count text won't scroll — needs max-height: 100dvh + overflow-y: auto + overscroll-behavior: contain"
date: "2026-06-03"
category: "ui-bugs"
module: "modals"
component: "frontend_stimulus"
problem_type: "ui_bug"
symptoms:
  - "studio-team_modal clipped text at the bottom of the viewport on tablet/desktop when content was long"
  - "Right column showed mid-paragraph cutoff (e.g. \"ha...\") with no scrollbar"
  - "Same modal scrolled fine on mobile (single-column flow)"
  - "Pulling down inside the modal sometimes scrolled the locked page underneath"
root_cause: "logic_error"
resolution_type: "css_only"
severity: "medium"
status: "resolved"
resolved_in: "v1.1.10"
tags:
  - modals
  - css-columns
  - column-count
  - overflow-scroll
  - dvh
  - dynamic-viewport-height
  - overscroll-behavior
  - scrollsmoother
  - webflow-custom-code
---

# Modal with column-count text won't scroll — needs max-height + overflow + overscroll-behavior

## Problem

The `studio-team_modal` displayed CMS rich-text body content split into two columns via `column-count: 2`. When the content was long, the bottom of both columns clipped against the viewport with no scrollbar — content was unreachable. The modal worked fine on mobile (where the column rule collapsed to single-column flow) but broke on tablet/desktop with the split layout.

## Symptoms

- On `/studio` → opening any Team Leader / Principal modal with long bio content, the right column showed mid-paragraph cutoff (e.g. `"ha..."`) at the bottom of the viewport.
- No scrollbar appeared inside the modal — wheel events did nothing, touch drag did nothing useful.
- Mobile (narrow viewport): worked fine because the column-count rule didn't apply and the text became a single tall flow that scrolled with the existing modal scroll mechanism.
- Desktop/tablet split layout: clipped without scroll.

## What Didn't Work

1. **Initial assumption: the modals.ts script needed to handle scroll for this modal.** Reading the file revealed that `src/utils/modals.ts` lines 23-27 explicitly document the design intent — "ScrollSmoother is paused on open... this halts page scrolling AND releases the modal's overflow-y:auto for native wheel/touch handling. No body styles or scrollTo are touched." So the JS was already correct; the missing piece was the CSS on the modal element to opt into native scroll.
2. **Considered: adding a height constraint to the `.studio-modal_text` element itself.** Doesn't work with CSS columns — `column-count` plus a constrained height makes content flow into ADDITIONAL columns (horizontally), not into a vertical scrollbar. CSS columns and inner-element vertical scroll don't compose.

## Solution

Pure CSS on the modal class, applied in Webflow Designer (or via a `<style>` block in custom code):

```css
.studio-team_modal {
  max-height: 100dvh;
  overflow-y: auto;
  overscroll-behavior: contain;
}
```

Three properties, each load-bearing. The whole modal scrolls as a unit — the columned text balances naturally into two columns of equal block-height, and when their combined height exceeds the modal's `max-height`, the modal's own scrollbar takes over.

## Why This Works

- **`max-height: 100dvh`** — pins the modal to viewport height. Without it, the modal grows to fit its content and never triggers its own overflow rule. `dvh` (dynamic viewport height) over `vh` matters for mobile Safari/Chrome: on those browsers the URL bar collapses on scroll, and `vh` is the *larger* value (URL bar hidden), so a `100vh` modal still clips when the URL bar is showing. `dvh` tracks the actually-visible viewport.
- **`overflow-y: auto`** — actually opts into native scroll. The existing `src/utils/modals.ts` pauses ScrollSmoother on open (`smoother.paused(true)`) specifically to release native wheel/touch handling for elements inside the modal — but only if those elements declare `overflow-y: auto`. The modal was missing this declaration; the JS half of the contract was already correct.
- **`overscroll-behavior: contain`** — prevents scroll-chaining. When the user hits the top or bottom of the modal's scroll, the browser by default starts scrolling the body underneath. ScrollSmoother is paused so the body wouldn't move, but on iOS Safari the gesture can trigger the pull-to-refresh chrome or feel weird. `contain` tells the browser to stop the scroll at this element's boundary.

**Why CSS columns balance correctly inside the constrained modal:** CSS `column-count: 2` with default `column-fill: balance` produces two columns of roughly equal height based on the content's natural block-height. The text element itself is auto-height — it expands to fit the columns. The modal wrapper around it has `max-height: 100dvh`; when the columns' combined height exceeds that, the modal scrolls. Both columns scroll together as one unit, which is what a reader wants for a balanced two-column read.

## Prevention

- **Modals with internal scroll need an explicit CSS opt-in alongside the JS scroll-lock pattern.** The two halves — `smoother.paused(true)` and `overflow-y: auto; max-height: 100dvh` — must travel together. Easy to write one without the other and assume the system works.
- **`dvh` is the right default for any "100% of viewport" modal/overlay.** `vh` overshoots on mobile during URL-bar transitions and produces clipping. Use `dvh` (dynamic), `svh` (smallest), or `lvh` (largest) per intent; `dvh` is the closest match to "what the user can actually see right now."
- **`overscroll-behavior: contain` is the default for any internal scroll container under a body scroll lock.** Otherwise gestures escape into the locked layer and feel broken on touch devices.
- **CSS columns + vertical scroll do NOT compose at the column container itself.** If you need vertical scroll over columned content, the scroll container must be a wrapper *around* the columned element, not the columned element. The columned element stays auto-height; the wrapper has the height constraint.
- **Test theme/breakpoint-conditional layout features at every breakpoint.** This bug was invisible on mobile because the `column-count: 2` rule wasn't active there. Pages that "work" on one breakpoint and break on another tend to involve a CSS rule that activates under a media query — find that rule, test both sides.

## Related Issues

- [`docs/solutions/integration-issues/scrollsmoother-modal-paused-scroll-lock.md`](../integration-issues/scrollsmoother-modal-paused-scroll-lock.md) — **Primary cross-link.** Explains the JS half of the contract: ScrollSmoother is paused on open precisely to release native wheel/touch handling for inner scroll containers. This new doc is the missing CSS half — without `overflow-y: auto` and a height constraint, there's nothing for the pause to release. Read them together. (auto memory — `feedback_modal_focus_normalizescroll.md` and `feedback_modal_reparent_on_open.md` are part of the same modal-architecture family.)
- [`docs/reference/modal-setup.md`](../../reference/modal-setup.md) — Canonical modal contract reference. Lines 37–40 hedge "If wheel-scroll-behind becomes a real issue... add a `wheel`/`touchmove` `preventDefault` listener" — that fallback is now superseded by the `overscroll-behavior: contain` pattern documented here. Worth a one-line update pointing readers to this doc as the "long content" recipe.
- [`docs/solutions/integration-issues/scrollsmoother-position-fixed-sticky-replacement.md`](../integration-issues/scrollsmoother-position-fixed-sticky-replacement.md) — Confirms `dvh` is safe under ScrollSmoother's `overflow: hidden` body setup; no layout-shift concerns from using it on modals.
