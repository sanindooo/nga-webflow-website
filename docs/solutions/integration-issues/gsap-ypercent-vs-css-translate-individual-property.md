---
title: "GSAP yPercent silently no-ops when CSS rest state uses the translate individual property"
date: "2026-06-04"
category: "integration-issues"
module: "logoAnimation"
component: "tooling"
problem_type: "integration_issue"
severity: "high"
status: "resolved"
resolved_in: "v1.1.12"
root_cause: "wrong_api"
resolution_type: "code_fix"
symptoms:
  - "Icon logo (.nav-custom_logo.u-icon) does not animate on scroll despite ScrollTrigger firing"
  - "GSAP tween to yPercent: 0 produces no visible movement; inline transform ends up as translate(0px, 43.4664px) — absolute px, not percent"
  - "Icon drifts down on viewport resize, leaking past the wordmark edge"
  - "Resizing from desktop into mobile range leaves the icon hidden until a page refresh"
  - "Adding transform: translateY(115%) as a custom property while the Designer Move is still set stacks to 230% down"
tags:
  - gsap
  - scrolltrigger
  - webflow-designer
  - css-translate
  - ypercent
  - matchmedia
  - logo-animation
  - transform-shorthand
related_components:
  - development_workflow
---

# GSAP yPercent silently no-ops when CSS rest state uses the translate individual property

## Problem

`logoAnimation.ts` swaps two superimposed logos inside `.nav-brand_link` on scroll — wordmark (`.u-full`) slides up and out, icon (`.u-icon`) slides up into the slot it just vacated. The icon's rest position (`yPercent: 115`, parked below the slot) was set via Webflow Designer's **2D & 3D transforms → Move: 0px, 115%, 0px** panel. GSAP's tween to `yPercent: 0` produced no movement at all, and crossing the 992px breakpoint at runtime left the icon stuck off-screen until a hard refresh.

## Symptoms

- Icon never lands in its slot on scroll past the trigger — stays at the rest position despite ScrollTrigger firing.
- DevTools shows the icon's inline style as `transform: translate(0px, 43.4664px)` — absolute pixels, not the percent the tween was supposed to produce.
- Hand-typing `transform: translate(0px, -11%)` in DevTools fixes it at one viewport, but breaks on resize as element height changes.
- Resizing across 992px (desktop ↔ mobile) leaves a stale inline `transform` from GSAP, hiding the icon below the mobile breakpoint until refresh.
- Adding `transform: translateY(115%)` as a Webflow custom property while the Designer Move panel is still set pushes the icon to 230% down (both `translate` and `transform` apply, composing).

## What Didn't Work

1. **Symmetric `yPercent: -101 / -101`** for both logos. Both ended hidden above the slot — icon never appeared.
2. **Asymmetric `yPercent: -101` (long) / `0` (short).** Semantically correct, but the inline transform stayed at `translate(0px, 43.4664px)` — the tween to `yPercent: 0` was a no-op because GSAP's internal state thought yPercent was already 0.
3. **Hand-typed `transform: translate(0px, -11%)` compensation in DevTools.** Worked at the test viewport only; element height changes on resize broke the math.
4. **Adding `transform: translateY(115%)` as a Webflow custom property while the Designer Move was still active.** Both `translate: 0px 115% 0px` (from Designer) and `transform: translateY(115%)` (from custom property) applied simultaneously and composed — icon at 230% down.
5. **`gsap.set(shortLogo, { yPercent: 115 })` without the matchMedia wrap.** Fixed desktop animation, but the one-shot `if (window.matchMedia('(max-width: 991px)').matches) return` guard only ran at init — resizing into mobile left GSAP's inline transform in place, hiding the icon.
6. **One-shot init check.** `if (window.matchMedia('(max-width: 991px)').matches) return` only fires once at load. It does not re-evaluate on resize and does not tear down the animation when the viewport crosses the breakpoint.

## Solution

The fix is four-part. Each part addresses a distinct contributor to the visible bug.

### 1. CSS rest state must be on `transform`, not `translate`

In Webflow Designer, on `.nav-custom_logo.u-icon` → **Style panel → Custom properties**, add:

```
translate: none
transform: translateY(115%)
```

`translate: none` overrides the Designer's individual `translate: 0px 115% 0px` (which the "2D & 3D transforms → Move" panel writes). `transform: translateY(115%)` re-expresses the same rest position on the property GSAP actually writes to. Now there is one source of transform truth, and it's the shorthand GSAP knows how to read.

### 2. Pre-declare GSAP's rest state in percent

```ts
// Before the timeline:
gsap.set(shortLogo, { y: 0, yPercent: 115 })
```

This tells GSAP "current state is `y: 0, yPercent: 115`" before it has a chance to read the computed matrix and store the resolved pixel value.

### 3. `invalidateOnRefresh: true` on the ScrollTrigger

```ts
ScrollTrigger.create({
  start: 100,
  animation: tl,
  toggleActions: 'play none none reverse',
  invalidateOnRefresh: true,
})
```

Re-reads the tween's from/to values on every `ScrollTrigger.refresh()` so percent units resolve against the current element height.

### 4. Wrap the entire setup in `gsap.matchMedia`

```ts
export const logoAnimation = () => {
  const wrapper = document.querySelector<HTMLElement>('.nav-brand_link')
  const longLogo = document.querySelector<HTMLElement>('.nav-custom_logo.u-full')
  const shortLogo = document.querySelector<HTMLElement>('.nav-custom_logo.u-icon')

  if (!wrapper || !longLogo || !shortLogo) return

  const mm = gsap.matchMedia()

  mm.add({ isDesktop: '(min-width: 992px)' }, () => {
    gsap.set(wrapper, { overflow: 'clip', position: 'relative' })
    gsap.set(shortLogo, { y: 0, yPercent: 115 })

    const tl = gsap.timeline()
    tl.to(longLogo, { yPercent: -114, duration: 0.4, ease: 'power2.inOut' }, 0)
      .to(shortLogo, { yPercent: 0, duration: 0.4, ease: 'power2.inOut' }, 0)

    ScrollTrigger.create({
      start: 100,
      animation: tl,
      toggleActions: 'play none none reverse',
      invalidateOnRefresh: true,
    })
  })
}
```

`gsap.matchMedia` automatically reverts every tween and ScrollTrigger created inside the callback when the `(min-width: 992px)` query stops matching — and crucially, it removes the inline styles GSAP wrote. Crossing into mobile clears the inline `transform`, letting the Designer's mobile-breakpoint stylesheet (which has its own rest state for the icon) take over with no manual cleanup.

## Why This Works

**(a) `translate` and `transform` are separate properties that compose.** CSS's modern `translate`, `rotate`, and `scale` individual properties are applied **on top of** the `transform` shorthand by the browser, not as a substitute for it. Webflow Designer's "Move" panel writes `translate: 0px 115% 0px`; GSAP writes `transform: translate(0px, 0px)`. Both apply — the visual position is the sum. A perfect `yPercent: 0` tween still leaves the element +115% down because the `translate` longhand is untouched. Forcing `translate: none` via Webflow's custom-property field hands sole control to `transform`, where GSAP operates.

**(b) GSAP reads the computed matrix in pixels, not percent.** When GSAP's CSSPlugin first touches an element, it calls `getComputedStyle(el).transform`, which always returns a resolved 6-value matrix (`matrix(1, 0, 0, 1, 0, 43.4664)`). The browser has already converted `translateY(115%)` of a 37.8px-tall element into `43.4664px`. GSAP has no way to know that 43.4664px originated as 115% — it stores `y: 43.4664px` and treats `yPercent` as 0. The subsequent tween target `yPercent: 0` is then "satisfied" without animating, and 43.4664px gets baked into the inline `transform` forever. Pre-declaring `gsap.set({ y: 0, yPercent: 115 })` overwrites GSAP's internal cache with explicit percent units before it has a chance to read the matrix, so the timeline animates `115 → 0` in percent space.

**(c) `gsap.matchMedia` is the only safe way to scope GSAP to a breakpoint.** A one-shot `if (matchMedia.matches) return` only checks at init. It never tears down the animation if the viewport later crosses the breakpoint, so the inline `transform` GSAP wrote on desktop persists into mobile and blocks the stylesheet's mobile-breakpoint `transform: none` rule. `gsap.matchMedia` registers a query, runs the callback when it matches, and on un-match it automatically:

- kills every tween created inside the callback
- kills every ScrollTrigger created inside the callback
- reverts the inline styles those tweens wrote

This is the project convention for any responsive animation — see [`docs/solutions/conventions/gsap-scrollsmoother-module-conventions.md`](../conventions/gsap-scrollsmoother-module-conventions.md) §6.

**(d) `invalidateOnRefresh` keeps percent units honest on resize.** ScrollTrigger caches the resolved pixel values of any tween's from/to at creation time. On resize, the element's height changes, so `yPercent: 115` resolves to a different pixel value. Without `invalidateOnRefresh: true`, the tween still targets the original cached pixels — a sliver of the wordmark leaks in at the bottom of the slot, or the icon ends up slightly mis-positioned. `invalidateOnRefresh` re-reads from/to values from current computed styles on every refresh.

## Prevention

- **Never use Webflow Designer's "2D & 3D transforms → Move" panel on an element GSAP will animate.** Designer writes to `translate`; GSAP writes to `transform`. They compose, not override. For rest transforms on GSAP-driven elements, use Webflow's custom-property field (`transform: translateY(115%)`) instead — or `translate: none; transform: translateY(115%);` if you cannot remove the Designer Move setting.
- **Pair every breakpoint-scoped GSAP animation with `gsap.matchMedia`.** A one-shot `if (matchMedia.matches) return` guard only catches the initial load. It does not tear down the inline styles GSAP leaves behind when the viewport later crosses the breakpoint. `gsap.matchMedia` handles both setup and revert. See `docs/solutions/conventions/gsap-scrollsmoother-module-conventions.md` §6 for the keyed-object form (`mm.add({ isDesktop: '(min-width: 992px)' }, () => { ... })`).
- **When inheriting a percent rest state from CSS, pre-declare it with `gsap.set({ y: 0, yPercent: N })`** before any tween touches the element. This stops GSAP from caching the computed pixel matrix and animating in absolute pixels.
- **Add `invalidateOnRefresh: true` to any ScrollTrigger whose tween uses percent units on an element whose size changes responsively.**
- **DevTools verification.** After the animation runs, inspect the element's inline `style` attribute:
  - `transform: translate(0%, 0%)` (or matching percent) → GSAP is in percent mode, will not drift on resize.
  - `transform: translate(0px, <some-baked-px>px)` → GSAP is in pixel mode, will drift on resize. Add the pre-tween `gsap.set` re-declaration.

## Related

- [`docs/solutions/conventions/gsap-scrollsmoother-module-conventions.md`](../conventions/gsap-scrollsmoother-module-conventions.md) — §6 documents the `gsap.matchMedia` keyed-object form as the project convention for responsive animations. This fix is a worked example of why that convention exists.
- [`docs/solutions/ui-bugs/nav-brand-flex-shrink-on-menu-open.md`](../ui-bugs/nav-brand-flex-shrink-on-menu-open.md) — Sibling `nav-brand_link` logo bug, different root cause (flexbox sibling reflow). Resolved in the same v1.1.10 release cluster as the earlier iterations of this fix.
- [`docs/solutions/ui-bugs/nav-theme-clone-snap-not-fade-on-close.md`](../ui-bugs/nav-theme-clone-snap-not-fade-on-close.md) — Sibling `nav-header` fix from the same session arc.
- [`docs/solutions/integration-issues/scrollsmoother-position-fixed-sticky-replacement.md`](./scrollsmoother-position-fixed-sticky-replacement.md) — Another case where `gsap.matchMedia` breakpoint teardown is the right pattern for ScrollSmoother-adjacent code.
