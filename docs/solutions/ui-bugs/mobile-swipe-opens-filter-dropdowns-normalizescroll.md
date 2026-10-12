---
title: "Swiping the mobile filter row opens filter dropdowns under ScrollSmoother normalizeScroll"
date: 2026-10-12
category: ui-bugs
module: works-filter
problem_type: ui_bug
component: frontend_stimulus
symptoms:
  - "Swiping the horizontally scrolling mobile filter row opens whichever dropdown the finger lifts on"
  - "Intermittent, more likely right after a filter has been applied"
  - "Never reproduces on desktop"
root_cause: wrong_api
resolution_type: code_fix
severity: medium
tags: [mobile, touch, swipe, dropdown, normalizescroll, scrollsmoother, gsap, click, filter-panels]
---

# Swiping the mobile filter row opens filter dropdowns under ScrollSmoother normalizeScroll

## Problem

On mobile the Works filter toggles sit in a horizontally scrolling row. Swiping the row to reach the later toggles opened a dropdown, so the client could not browse the options without panels popping open.

## Symptoms

- A horizontal swipe that ends on a toggle opens that toggle's panel.
- Intermittent; most noticeable after a filter has just been applied.
- Desktop (mouse) never shows it.

## What Didn't Work

- **Webflow's Dropdown element.** It opens from its own touch handling, which fires after a swipe ends on the toggle. There is no setting to turn that off.
- **Replacing it with a plain `<button>` listening for `click`** (`src/utils/filterPanels.ts`, released in v1.1.17). Browsers normally do not fire `click` after a scroll gesture, which fixed most cases, but not all.

## Solution

Ignore any click that ends a touch which travelled more than 10px, whatever the browser decided (`src/utils/filterPanels.ts`, released in v1.1.18):

```ts
const TAP_SLOP_PX = 10
const touchGesture = { startX: 0, startY: 0, travelled: 0 }

// capture + passive: unaffected by normalizeScroll's preventDefault
document.addEventListener('touchstart', (event) => {
  const [touch] = event.touches
  touchGesture.startX = touch.clientX
  touchGesture.startY = touch.clientY
  touchGesture.travelled = 0
}, { capture: true, passive: true })

document.addEventListener('touchmove', (event) => {
  const [touch] = event.touches
  const distance = Math.hypot(touch.clientX - touchGesture.startX, touch.clientY - touchGesture.startY)
  touchGesture.travelled = Math.max(touchGesture.travelled, distance)
}, { capture: true, passive: true })

const isSwipe = () => touchGesture.travelled > TAP_SLOP_PX

toggle.addEventListener('click', () => {
  if (isSwipe()) return
  // open / close panel
})
```

The same guard sits on the outside-click close handler, so a swipe does not close an open panel either. Mouse and keyboard clicks never follow a `touchmove`, so `travelled` stays 0 for them.

## Why This Works

The site creates ScrollSmoother with `normalizeScroll: { allowNestedScroll: true }` (`src/utils/gsapSmoothScroll.ts`). On touch devices normalizeScroll takes over `touchmove` and is meant to hand gestures on nested scroll areas back to the browser. When it does not (seen intermittently, likely while layout is settling after a filter render), it prevents the native horizontal scroll. To the browser the gesture then never scrolled, so it is a tap, and `click` fires on the element under the finger. Measuring the finger's travel ourselves does not depend on how the browser or GSAP classified the gesture.

## Prevention

- Any tap target inside a nested horizontal scroller on a page with normalizeScroll needs a travel guard; do not rely on "click never fires after a scroll".
- Track touches on `document` with `capture: true, passive: true` so the listener sees every gesture and cannot be blocked or slow scrolling.
- Test on a real phone after applying a filter; simulated clicks in a desktop browser cannot reproduce this.

## Related Issues

- `docs/solutions/integration-issues/finsweet-cmsfilter-double-flash-back-to-all.md` (same filter panels)
- `docs/plans/2026-10-12-002-feat-works-filter-panels-clear-all-plan.md` (why the Webflow Dropdown was replaced)
