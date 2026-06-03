---
title: "Nav brand logo shrinks when menu opens — flex sibling reflow needs flex-shrink: 0"
date: "2026-06-03"
category: "ui-bugs"
module: "nav-header-css"
component: "frontend_stimulus"
problem_type: "ui_bug"
symptoms:
  - "Logo SVG measures 464 × 40.2 with nav closed, shrinks to 388.88 × 33.69 (~84%) when nav opens"
  - "Uniform scale on both axes, no transform: scale() in computed styles"
  - "Effect only visible on viewports where the menu items are hidden by default and only appear on .is-nav-open"
root_cause: "logic_error"
resolution_type: "css_only"
severity: "low"
status: "resolved"
resolved_in: "v1.1.10"
tags:
  - flexbox
  - flex-shrink
  - webflow-custom-code
  - svg-sizing
  - nav-header
  - sibling-reflow
  - intrinsic-width
---

# Nav brand logo shrinks when menu opens — flex sibling reflow needs flex-shrink: 0

## Problem

The site logo SVG inside `.nav-brand_link` rendered at 464 × 40.2px with the nav closed, then shrank to 388.88 × 33.69px (~84%) when the nav opened. No `transform: scale()` was applied; no logo-specific `is-nav-open` rule existed. The shrink was uniform on both axes and reversed on close. Took non-trivial investigation to track down because the cause was structural (flexbox sibling reflow) rather than declared (CSS rule on the logo itself).

## Symptoms

- Logo width 464px → 388.88px and height 40.2px → 33.69px when `.is-nav-open` was added to `.header`.
- DevTools showed no `transform`, no `font-size` change, no logo-specific size override under `:is-nav-open`.
- Effect was viewport-conditional: on wide screens where the nav menu items were always visible, the logo didn't shrink. On screens where the menu was hidden by default and only appeared with `.is-nav-open` (the hamburger-style breakpoint), the shrink appeared.

## What Didn't Work

1. **Searched for explicit logo sizing rules under `.header.is-nav-open`.** Found `.header.is-nav-open .nav-custom_logo { color: var(--brand--neutral-0); }` — a colour change only, no size change. Dead end on that path.
2. **Considered: GSAP transform from `navToggle` or `navTheme` modifying the logo's transform.** `src/utils/logoAnimation.ts` does animate `yPercent` on the long/short logos, but only via scroll trigger past 100px — independent of nav-open state. Not the cause.
3. **Considered: Webflow component variant change on nav open** (the `data-wf--main-nav--variant` attribute). Inspecting confirmed the variant attribute didn't change between open and closed states; both showed `data-wf--main-nav--variant="base"`. Not the cause.

## Solution

One CSS rule, applied in Webflow Designer custom code (Site Settings → Custom Code → Head):

```css
.nav-brand_link {
  flex-shrink: 0;
}
```

That's the whole fix. Belt-and-braces version (also pins the SVGs themselves to their intrinsic dimensions in case the Webflow embed wrapper applies `width: 100%`):

```css
.nav-brand_link {
  flex-shrink: 0;
}
.nav-custom_logo.u-full svg,
.nav-custom_logo.u-icon svg {
  width: auto;
  height: 100%;
}
```

## Why This Works

The `.header` is a flex row containing `[brand link] [menu items] [hamburger toggle]`. On viewports where `.nav-custom_menu` is hidden by default and switches to `display: flex` only under `.header.is-nav-open .nav-custom_menu { display: flex; }`, the menu materializes as a new flex sibling when the nav opens. Default `flex-shrink: 1` lets every flex item compress proportionally to share the available horizontal space — so when the menu items appear, the brand container shrinks to make room. The SVG inside the brand container uses `width: 100%` (Webflow's default for SVG embeds), so it scales down with its parent.

The 84% scale factor is consistent with the brand container being compressed by ~16% of its original width to accommodate the menu items. Both axes scale uniformly because the SVG's intrinsic aspect ratio is preserved while its parent's width shrinks.

`flex-shrink: 0` pins the brand item to its content width. The flex algorithm allocates remaining space to siblings instead. The brand stays at its natural size regardless of which siblings are visible.

## Prevention

- **Default to `flex-shrink: 0` on flex items whose size matters visually.** Logos, icons, fixed-size CTAs, brand marks — anything where compression would degrade the design. The default `1` is a foot-gun in any flex container where siblings can appear/disappear dynamically (nav open/close, conditional menus, responsive item visibility).
- **When a child mysteriously resizes, look at its parent's flex context, not the child itself.** This bug had no rule on the logo, no rule on `.nav-brand_link` — the cause was the *absence* of `flex-shrink: 0`, combined with a sibling appearing. The diff is invisible in DevTools' "Styles" pane unless you specifically check the computed `flex-shrink` value.
- **Webflow Embed blocks apply `width: 100%` to inlined SVGs by default.** If you want an SVG to keep its intrinsic width (via its `width="X"` attribute), explicitly set `.svg-parent svg { width: auto; }` or set explicit pixel/rem width on the SVG via Designer.
- **Test nav/header layout at every breakpoint, with the nav both open and closed.** Sibling visibility under `.is-nav-open` is the most common source of nav-bar layout surprises.

## Related Issues

- [`docs/reference/component-patterns.md`](../../reference/component-patterns.md) — Wrapper-rules doc. Touches Webflow embed and SVG sizing patterns at a high level. Worth a one-line cross-reference from this fix for the broader "every element needs intentional sizing in a flex/grid context" principle. (auto memory — `feedback_wrapper_patterns.md` reinforces the same principle for headings/images/buttons.)
- [`docs/solutions/ui-bugs/css-attribute-selector-case-sensitivity-data-alignment.md`](./css-attribute-selector-case-sensitivity-data-alignment.md) — Sibling ui-bug also tagged `flexbox`. Useful as a "see also" for flex-related gotchas in this codebase.
- [`docs/solutions/ui-bugs/nav-theme-clone-snap-not-fade-on-close.md`](./nav-theme-clone-snap-not-fade-on-close.md) — Sibling nav-header fix from the same session. Shared `nav-header` tag for chained discovery.
