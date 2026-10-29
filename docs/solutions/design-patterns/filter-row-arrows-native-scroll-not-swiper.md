---
title: "Arrow controls for a scrolling row of filter dropdowns: native scroll, not Swiper"
date: 2026-10-29
category: design-patterns
module: works-filter
problem_type: design_pattern
component: frontend_stimulus
severity: medium
applies_when:
  - "A horizontally scrolling row holds dropdown toggles whose panels are absolutely positioned outside the row"
  - "The row needs back/forward arrows that step one item at a time"
  - "Someone proposes Swiper because the row looks like a slider"
  - "A chevron icon is reused for the opposite direction"
tags: [swiper, horizontal-scroll, arrows, filter-row, dropdown, svg, chevron, mobile]
---

# Arrow controls for a scrolling row of filter dropdowns: native scroll, not Swiper

## Context

The mobile Works filter row (767px and below) needed back/forward arrows, replacing a "scroll" hint. Swiper is already loaded site-wide, so it was the first choice. The row is unusual for a slider: each item is a toggle whose panel is `position: absolute` and anchored to the sticky filter section, so it drops full-width under the bar. And the row's taps rely on `filterPanels`' swipe guard (see the related doc), which assumes native scroll gestures.

## Guidance

Leave the row scrolling natively (`overflow-x: auto` on the row) and drive the arrows with a small module, `src/utils/filterSlider.ts`:

- Each tap scrolls to the left edge of the next or previous visible item (`offsetWidth > 0`, so hidden items such as Clear All are skipped).
- A tap during a smooth scroll steps on from that scroll's target, not its half-way position, so quick double taps never repeat a step.
- A step that would land within 24px of the end goes all the way, so the last tap is never a near-invisible nudge.
- Arrows get `is-disabled` at either end, updated on `scroll` and by a `ResizeObserver` on the row and its items (labels change width as filters are picked).

Draw a reversed chevron as its own SVG path. Do not flip the arrow with CSS. The site's chevron (`.news-filter_arrow`) is a down-pointing path turned with `rotate(-90deg)` and nudged with `margin-top: 3px; margin-left: 2px`. Flipping its wrapper with `rotate(180deg)` or `scale(-1)` flips those margins too, so the back arrow sits off-line. The back arrow uses the vertically mirrored path, `M1 9L7.5 2L14 9` (the forward arrow is `M1 1L7.5 8L14 1`), with the same class and no transform.

## Why This Matters

Swiper fails here in both of its modes:

- **Default (transform) mode clips the panels.** A transformed `.swiper-wrapper` becomes the containing block for absolutely positioned descendants, and `.swiper` has `overflow: hidden`, so the panels anchor to the wrapper and are cut off. `swiper-bundle.css` also gives `.swiper-slide` `position: relative`, which on its own re-anchors every panel to its toggle.
- **cssMode stops short of the end.** It keeps native scrolling, but works out stop positions from slide widths plus `spaceBetween` and ignores CSS `gap`. Swapping the gap for `spaceBetween` still left a trailing margin that Swiper's last stop did not reach (stops ended at 254px against a real maximum of 278px). Pointing Swiper at the existing Webflow classes (`wrapperClass`, `slideClass`) avoids its CSS, but then none of its cssMode scroll CSS applies either, so little of Swiper is left doing any work.

The native module is about 90 lines, keeps the panels and swipe guard untouched, and needs no Designer structure beyond two arrow elements and data attributes.

A testing trap: in a hidden or background browser pane, smooth `scrollTo` can take well over 700ms, so a test that taps and reads `scrollLeft` after a short wait sees "skipped" taps. That looked like a Swiper bug at first and showed up identically with the native module. Wait 1.5s or more between taps in automated checks.

## When to Apply

- Scrolling rows of dropdown toggles, tabs or chips that need arrow controls, especially when their panels or tooltips escape the row.
- Use Swiper for actual slide carousels (full-width slides, pagination, loop, effects), as in `swiperSliders.ts`.
- Reversing any icon whose base style already carries a transform or offset margins.

## Examples

DOM contract used on the Works page:

```text
[data-filter-slider]                                   news-filter_links u-main is-slider
  [data-filter-slider-prev]                            news-filter_arrow-wrapper ... is-slider is-prev
  .news-filter_form
    form.news-filter_links.u-dropdown-parents.is-slider   the scrolling row
      [data-filter-panel] ... / [data-filter-clear-all]
  [data-filter-slider-next]                            news-filter_arrow-wrapper ... is-slider
```

Step logic:

```ts
const target =
  direction === 1
    ? (offsets.find((offset) => offset > current + END_TOLERANCE_PX) ?? maxScroll())
    : (offsets.reverse().find((offset) => offset < current - END_TOLERANCE_PX) ?? 0)
const left = maxScroll() - target < END_SNAP_PX ? maxScroll() : Math.max(0, target)
```

## Related

- [../ui-bugs/mobile-swipe-opens-filter-dropdowns-normalizescroll.md](../ui-bugs/mobile-swipe-opens-filter-dropdowns-normalizescroll.md): why the filter toggles open on `click` only, which native scrolling preserves.
- [../ui-bugs/webflow-turnstile-empty-div-adds-flex-gap-in-forms.md](../ui-bugs/webflow-turnstile-empty-div-adds-flex-gap-in-forms.md): why this row spaces items with margins instead of `gap`.
- [../integration-issues/finsweet-search-input-outside-filter-form-mirror.md](../integration-issues/finsweet-search-input-outside-filter-form-mirror.md): the mobile search copy that sits beside this row.
- `docs/reference/swiper-slider-setup.md`: where Swiper is the right tool.
