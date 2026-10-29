---
title: "Webflow's Turnstile spam check adds an invisible flex item that eats a gap at the end of a form row"
date: 2026-10-29
category: ui-bugs
module: works-filter
problem_type: ui_bug
component: frontend_stimulus
symptoms:
  - "A horizontally scrolling flex row inside a Webflow Form Block ends with dead space after its last visible item"
  - "The extra space equals one or more column-gap widths and is invisible in the Designer"
  - "scrollWidth of the row is larger than the right edge of its last visible child"
root_cause: logic_error
resolution_type: code_fix
severity: low
tags: [webflow, forms, turnstile, spam-protection, flex, gap, horizontal-scroll, filter-row]
---

# Webflow's Turnstile spam check adds an invisible flex item that eats a gap at the end of a form row

## Problem

The Works filter row on mobile is the Finsweet filter `<form>` itself, laid out as a horizontally scrolling flex row. Scrolled to the end, it showed about 48px of empty space after the last filter ("area"), so the forward arrow sat far from the content.

## Symptoms

- Dead space at the end of the scrolling row, only on the published page.
- Measured on staging at 375px: last visible filter ended at 448px, `form.scrollWidth` was 496px.
- Nothing in the Designer Navigator accounts for the extra width.

## What Didn't Work

- Looking for the culprit in the Designer. The extra element is not in the Designer tree; Webflow injects it when the published page loads.
- Assuming only our own hidden items were responsible. A zero-width item we had added (the in-form search panel, with its toggle absolutely positioned elsewhere) did add one gap, but removing its share still left one gap's worth of dead space.

## Solution

List the row's children in the published page, not the Designer:

```js
const row = document.querySelector('.news-filter_form form')
const rowLeft = row.getBoundingClientRect().left - row.scrollLeft
;[...row.children].map((child) => [child.className, child.getBoundingClientRect().left - rowLeft, child.offsetWidth])
```

The last child was Webflow's Cloudflare Turnstile container, injected into every Form Block when the site's form spam protection is on:

```html
<div><div><div></div><input type="hidden" name="cf-turnstile-response" ...></div></div>
```

It is zero width but still a flex item, so `column-gap` puts a gap before it.

Fix: inside a form, space items with margins instead of `gap`. On the Works filter row (mobile landscape and below):

- `.news-filter_links.u-dropdown-parents.is-slider` sets `column-gap: 0`.
- Every filter after the first, and Clear All, gets an `is-slider` combo with `margin-left: 1.5rem`.

After the fix, `scrollWidth` equals the right edge of the last visible filter (448px) and the row ends flush against the arrow.

## Why This Works

`gap` is applied between every pair of flex items, including empty or zero-width ones. A margin lives on a specific element, so an element with nothing styling it (the Turnstile wrapper) adds no space. Elements hidden with `display: none` drop out of flex layout entirely, so they need no special handling.

Leading margins (`margin-left` on all but the first) rather than trailing ones also keep the row from ending in a margin, which would add scrollable space after the last item.

## Prevention

- Any flex or grid layout that is the direct parent of form children (the `<form>` inside a Webflow Form Block) should not rely on `gap` when the end of the row is visible, as in a scrolling row or a right-aligned group. Use per-item margins.
- When layout looks right in the Designer but not on the published page, list the element's children on the live page before searching the Designer.
- The Turnstile element is present only while spam protection is enabled on the site, so a layout that relies on it being absent can break when the setting is toggled.

## Related Issues

- [mobile-swipe-opens-filter-dropdowns-normalizescroll.md](mobile-swipe-opens-filter-dropdowns-normalizescroll.md): the same mobile filter row; covers why its panels open on `click` only.
- [../integration-issues/finsweet-cms-filter-webflow-setup.md](../integration-issues/finsweet-cms-filter-webflow-setup.md): Finsweet filter form wiring.
