---
title: "navTheme dark-overlay clone must snap (not fade) on nav close, with mask refresh first"
date: "2026-06-03"
category: "ui-bugs"
module: "navTheme"
component: "frontend_stimulus"
problem_type: "ui_bug"
symptoms:
  - "Visible double-logo on desktop nav-open on pages with data-header-theme=\"dark\" sections (e.g. /publications)"
  - "White flash on nav close as the dark-blue logo clone fades back in over the real logo"
  - "Residual dark strip at the top of the viewport while scrolling after nav close"
root_cause: "logic_error"
resolution_type: "code_fix"
severity: "medium"
status: "resolved"
resolved_in: "v1.1.10"
tags:
  - navTheme
  - cloned-overlay
  - mask-image
  - transition-flash
  - dark-theme-sections
  - publications-page
  - nav-header
  - css-mask
---

# navTheme dark-overlay clone must snap (not fade) on nav close, with mask refresh first

## Problem

`src/utils/navTheme.ts` creates a fixed-position dark-blue clone of the site logo + hamburger, layered over the real header. A `mask-image` gradient reveals only the portion of the clone overlapping `data-header-theme="dark"` sections behind the header — so over dark sections the user sees the dark-blue clone, over light sections they see the real (white) logo. Two bugs surfaced when opening/closing the nav on pages with dark sections: a visible **double-logo overlay** on desktop, and a **white flash** as the clone faded back in on close.

## Symptoms

- **Issue 1 (overlap):** On `/publications` (and any page with `data-header-theme="dark"` sections in markup), opening the nav on desktop showed the dark-blue clone logo overlaid on top of the real logo — visible as smeared, doubled text in the header.
- **Issue 2 (residual strip):** Even after partial dismissal, a faint dark strip remained visible at the top while scrolling, because the dark overlay's mask was frozen in its last state from before nav-open.
- **Issue 3 (white flash):** On close, the clone faded in over 0.4s. During the fade the half-transparent dark-blue clone showed the real logo behind it — and the real logo was simultaneously transitioning from blue (its `.is-nav-open` color) back to white (its default on dark sections). The composite was a white-then-blue flash.

## What Didn't Work

1. **Initial fix attempt: remove the `if (isMobile())` gate on the clone hide/show in the `MutationObserver`.** This made the clone hide on every viewport when nav opens — solving the overlap (Issue 1). **But** it introduced the white flash (Issue 3) because the same code path also restored the clone with an `opacity 0 → 1` 0.4s transition on close.
2. **Considered: extend the existing `updateMask` debounce / let the rAF tick recompute the mask naturally on close.** Wouldn't have worked — `updateMask` itself bails out while `is-nav-open` is on the header (`if (headerElement.classList.contains('is-nav-open')) return`), so the mask was frozen at whatever state it was in when nav opened. The rAF tick would only refresh AFTER the class was removed, which races the clone's opacity transition.

## Solution

Two changes inside the close branch of the `MutationObserver` in `src/utils/navTheme.ts`:

```ts
const navOpenObserver = new MutationObserver(() => {
  const isOpen = headerElement.classList.contains('is-nav-open')
  if (isOpen) {
    toggleClone.style.transition = 'none'
    toggleClone.style.opacity = '0'
    toggleClone.style.display = 'none'
    logoClone.style.transition = 'none'
    logoClone.style.opacity = '0'
    logoClone.style.display = 'none'
  } else {
    // 1. Force mask recompute BEFORE revealing the clone.
    //    `lastGradient = ''` busts the dedup guard inside updateMask;
    //    otherwise the first painted frame after close uses the
    //    stale mask from before nav-open.
    lastGradient = ''
    updateMask()

    // 2. Logo clone snaps in — no fade. The clone exists ONLY to
    //    recolor the real logo through the mask; any opacity
    //    transition on the clone exposes the real logo's own
    //    color transition underneath and produces a white flash.
    logoClone.style.transition = 'none'
    logoClone.style.display = ''
    logoClone.style.opacity = '1'

    // 3. Hamburger clone keeps its short fade — it sits over
    //    actively rotating lines and the fade reads as part of
    //    the same motion rather than a separate event.
    toggleClone.style.display = ''
    void toggleClone.offsetHeight
    toggleClone.style.transition = 'opacity 0.4s ease'
    toggleClone.style.opacity = '1'
  }
})
```

## Why This Works

The clone is a **visual mirror** of the real logo through a mask. Its job is to recolor whatever the mask reveals — not to be its own animated element. Three principles:

1. **A mirror that mirrors a transitioning thing must not have its own transition.** Both the real logo and the clone want to express the same "instantaneous correct colour at this scroll position." If the clone fades, the user sees the real underlying element's transitioning state through the half-opacity clone for the duration of the fade. The fade was inherited from the hamburger pattern (where the underlying element is geometrically transforming, so a fade reads naturally) but doesn't generalize to colour-mirroring overlays.
2. **The dedup guard in `updateMask` only helps the steady-state rAF tick.** When the mask is intentionally stale (frozen during nav-open), the dedup guard prevents recomputation even if the underlying state changed. Resetting `lastGradient = ''` busts that guard for one call, forcing a fresh paint with the correct mask for the current scroll position.
3. **Pre-reveal the correct mask, then snap.** Order matters: `updateMask()` must run before `display = ''` so that when the browser paints the now-displayed clone, the mask is already set correctly. Otherwise there's a one-frame window where the clone paints with stale mask.

## Prevention

- **Default: cloned overlays that mirror live elements through a mask should snap, not transition.** If you find yourself reaching for `opacity 0 → 1` on a clone, ask: is the underlying element also changing during the transition window? If yes, the clone's transition will reveal that change as a visible flash. Snap the clone, let the underlying element's own transition (if any) carry the visual continuity.
- **`gsap.ticker` / `requestAnimationFrame` loops with dedup guards need an escape hatch.** Any code path that intentionally freezes the loop's output (here: `if (is-nav-open) return`) must include a way to force-recompute on the next tick after the freeze lifts. The simplest hatch is resetting the dedup-state variable to a sentinel (`lastGradient = ''`).
- **Order display changes after state preparation.** When restoring a hidden element, prepare its visual state (mask, colour, transform) FIRST, then `display = ''` LAST. The browser paints the element using its current style on the next frame; if state isn't ready by then, you get a one-frame flash.
- **Test on every viewport, not just one.** This bug only showed on desktop because the original code had `if (isMobile())` around the clone hide/show — the mobile path was correct, the desktop path was missing. Defensive: when a fix uses a viewport gate, ask whether the gate is correctly named (i.e. whether the un-gated path is what you want by default).
- **Test on a page that genuinely exercises the feature.** This bug needed a page with `data-header-theme="dark"` sections (e.g. `/publications`). Pages without dark sections hit the `darkThemeSections.length === 0` early-return and never build the clone at all — so the bug is invisible. Always test theme-conditional features on a page where the theme branch fires.

## Related Issues

- [`docs/reference/js-loading-flash-prevention.md`](../../reference/js-loading-flash-prevention.md) — Sibling pattern for the other class of init flashes (CSS-first opacity hiding). Contrast: that one hides on load, this one prevents a flash on a runtime transition. (auto memory — `feedback_js_loading_pattern.md` reinforces the CSS-first FOUC prevention principle.)
- [`docs/solutions/integration-issues/scrollsmoother-position-fixed-sticky-replacement.md`](../integration-issues/scrollsmoother-position-fixed-sticky-replacement.md) — Explains why fixed-position overlays (including this nav clone) must live outside `#smooth-content`. Relevant architectural context for where the clone is mounted.
- [`docs/solutions/integration-issues/scrollsmoother-modal-paused-scroll-lock.md`](../integration-issues/scrollsmoother-modal-paused-scroll-lock.md) — Companion "overlay element lives outside smooth-content" pattern from the same architectural family.
- Auto memory `feedback_nav_simplicity.md`: "Nav JS should ONLY toggle a class — CSS handles display, colours, transitions via Webflow combo classes." This bug is the inverse warning — when JS *does* own a visual layer (the cloned overlay), its transitions need to be deliberately reasoned about, not inherited by reflex from a similar-looking pattern (the hamburger clone).
