# Scroll Pin Utility

Declarative ScrollTrigger pin utility for elements that previously relied on
CSS `position: fixed` or `position: sticky`. Both CSS values break under
ScrollSmoother because the transformed `#smooth-content` wrapper creates a
new containing block — see
[`scrollsmoother-position-fixed-sticky-replacement.md`](../solutions/integration-issues/scrollsmoother-position-fixed-sticky-replacement.md)
for the architectural explanation.

Module: `src/utils/scrollPin.ts`. Wired into `src/index.ts` after
`gsapSmoothScroll()` so `#smooth-content` exists before pin creation.

## Two pin types

### `data-pin="fixed"` — pinned to viewport for a scroll range

Element pins to viewport from `data-pin-start` (default: element top reaches
viewport top, offset by `data-pin-top`) until `data-pin-end` (default: end
of page). Replaces use cases that previously used CSS `position: fixed` for
a temporary, scroll-anchored UI element.

For elements that should stay fixed for the *entire* page lifecycle (nav
bar, page-wide overlay, w-webflow-badge), use the `[data-stick-viewport]`
reparent utility instead — that's a different pattern with no scroll range.

### `data-pin="sticky"` — pinned within parent wrapper bounds

Element pins to viewport when its top reaches viewport top (offset by
`data-pin-top`), releases when its parent's bottom reaches viewport bottom.
Equivalent to native `position: sticky; top: <data-pin-top>` but bounded by
the parent. Use when an element should stick while its parent section is in
view, then scroll away with the parent.

## Attribute reference

| Attribute | Applies to | Description |
|-----------|------------|-------------|
| `data-pin` | both | `"fixed"` or `"sticky"` — required |
| `data-pin-top` | both | Viewport offset from top while pinned. Bare numbers get `px`; CSS lengths (`1rem`, `2vh`, `calc(...)`) pass through |
| `data-pin-left` | both | Viewport offset from left |
| `data-pin-right` | both | Viewport offset from right |
| `data-pin-bottom` | both | Viewport offset from bottom |
| `data-pin-z` | both | z-index while pinned |
| `data-pin-mobile-top` | both | Override `data-pin-top` at `(max-width: 991px)` |
| `data-pin-mobile-left` | both | Mobile override |
| `data-pin-mobile-right` | both | Mobile override |
| `data-pin-mobile-bottom` | both | Mobile override |
| `data-pin-mobile-z` | both | Mobile z-index override |
| `data-pin-disable-mobile` | both | Skip pin entirely below breakpoint (boolean — presence enables) |
| `data-pin-parent` | sticky | Closest matching ancestor used as end trigger. Defaults to `parentElement` |
| `data-pin-start` | fixed | ScrollTrigger position string for pin start (e.g. `"top top"`, `"top 50%"`, `"+=200"`) |
| `data-pin-end` | fixed | ScrollTrigger position string for pin end. Defaults to `"max"` (end of page) |

## Examples

### Sticky sidebar within an article

```html
<article class="article_layout">
  <aside data-pin="sticky"
         data-pin-top="6rem"
         data-pin-z="10"
         class="article_sidebar">
    Table of contents...
  </aside>
  <div class="article_body">...</div>
</article>
```

Sidebar sticks 6rem below viewport top while `.article_layout` is in view,
releases when the article scrolls past.

### Floating CTA pinned during a section

```html
<section class="section_pricing">
  <div class="pricing_grid">...</div>
  <a data-pin="fixed"
     data-pin-bottom="2rem"
     data-pin-right="2rem"
     data-pin-z="50"
     data-pin-end="bottom bottom"
     data-pin-disable-mobile
     class="pricing_cta">
    Get started
  </a>
</section>
```

CTA pins at bottom-right of viewport for the duration of `.section_pricing`,
disabled on mobile.

### Sticky element with explicit parent

```html
<div class="layout_outer">
  <div class="layout_inner">
    <h2 data-pin="sticky"
        data-pin-top="0"
        data-pin-parent=".layout_outer"
        class="section_label">
      Chapter 1
    </h2>
    ...
  </div>
</div>
```

Heading sticks at viewport top until `.layout_outer` (not the immediate
parent) scrolls past.

### Mobile-specific offsets

```html
<nav data-pin="fixed"
     data-pin-top="0"
     data-pin-z="100"
     data-pin-mobile-top="0.5rem"
     data-pin-mobile-z="200"
     class="floating_nav">
  ...
</nav>
```

## Common mistakes

### Pinning an element with no parent

`data-pin="sticky"` requires a parent element to compute the end trigger.
The utility logs `[scrollPin] sticky element has no parent` if the element
is at the document root with no parent. Place sticky elements inside a
container.

### Forgetting `data-pin-end` on a fixed pin

`data-pin="fixed"` defaults `end` to `"max"` (end of page). If the element
should release earlier, set `data-pin-end` explicitly:

```html
<div data-pin="fixed" data-pin-end="bottom bottom">...</div>
```

### Trying to pin nav, badge, or modal overlay

These elements need to stay fixed for the *entire* page life — they don't
have a scroll range. Use `[data-stick-viewport]` (reparent utility — to be
built) which moves them out of `#smooth-content` so native `position: fixed`
resolves to the viewport again. `[data-pin]` is the wrong tool.

### Offset values without unit

Bare numeric strings get `px` appended (`data-pin-top="20"` → `20px`). CSS
lengths pass through verbatim (`data-pin-top="1rem"`, `data-pin-top="2vh"`).
Calc expressions also work: `data-pin-top="calc(100vh - 4rem)"`.

### Mobile breakpoint hardcoded at 991px

Matches Webflow's tablet/mobile boundary and the rest of the project's
responsive convention (see `randomImagesFadeIn.ts`, `homeTextSticky.ts`).
If a future design needs a tablet split, extend the suffix vocabulary
(`-tablet-`, `-mobile-landscape-`) rather than introducing a generic
media-query attribute.

### Re-applying on breakpoint cross

Pin is killed and recreated when the viewport crosses 991px. Inline
positional styles (top/left/right/bottom/z-index) are also cleared and
re-applied. ScrollTrigger.refresh() is implicit in the recreation.

## Distinct from `[data-stick-viewport]` (planned, not built yet)

| Use case | Tool |
|----------|------|
| Element pinned to viewport for a scroll range, then releases | `[data-pin="fixed"]` |
| Element pinned within parent wrapper, releases at parent end | `[data-pin="sticky"]` |
| Element fixed to viewport for entire page life (nav, badge, modal overlay) | `[data-stick-viewport]` (reparents out of `#smooth-content`) |

`[data-pin]` uses ScrollTrigger pin (the element stays inside `#smooth-content`
and ScrollTrigger applies viewport-correct positioning per frame).
`[data-stick-viewport]` reparents the element to be a sibling of
`#smooth-wrapper` so native `position: fixed` works again. Different
mechanisms, different use cases — don't conflate.
