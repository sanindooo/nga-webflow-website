---
title: "Showing a Finsweet CMS Filter search box outside its form: mirror it, don't move it"
date: 2026-10-29
category: integration-issues
module: works-filter
problem_type: integration_issue
component: frontend_stimulus
symptoms:
  - "The design puts the search box in a different row from the filter form (mobile Works: next to sort, grid and list)"
  - "Moving the search visually with absolute positioning left a zero-width flex item in the filter row, adding dead space at its end"
root_cause: wrong_api
resolution_type: code_fix
severity: medium
tags: [finsweet, cms-filter, search, form-block, mirror, mobile, works-filter]
---

# Showing a Finsweet CMS Filter search box outside its form: mirror it, don't move it

## Problem

The mobile Works design puts "search" in the top row beside sort, grid and list, while the other filters scroll in the row below. The search input has to stay inside the Finsweet filter form, because Finsweet CMS Filter v1 wires up the inputs inside the element carrying `fs-cmsfilter-element="filters"` (see `docs/reference/finsweet-cms-filter.md`). The top row is outside that form, and Webflow does not allow one form inside another, so the sort row cannot simply join the form.

## Symptoms

- First attempt: the in-form search toggle was taken out of flow with `position: absolute` and placed over the top row. It looked right, but its wrapper stayed in the filter row as a zero-width flex item, so the row ended with an extra gap of dead space.
- The approach also needed a negative-margin hack and several single-purpose combo classes to line up, which is fragile to maintain in the Designer.

## What Didn't Work

- **Absolute positioning the in-form toggle.** It works visually only because the filter panels are positioned against the sticky filter section, not their wrapper. But the wrapper still takes a slot in the flex row, and the layout depends on nothing between the toggle and the section ever becoming positioned.
- **Making the sort row part of the filter form.** The sort controls live in their own Webflow Form Block, and Form Blocks cannot be nested.

## Solution

Keep the Finsweet search input where it is, hide it on mobile, and add a plain copy of the search panel in the sort row that writes into it.

Designer:

- In-form search panel: combo `news-filter_dropdown-wrapper u-search-desktop` (`display: none` at mobile landscape and below). Its input gets `data-filter-search-source`.
- Mobile copy at the start of the sort row: `news-filter_dropdown-wrapper u-search-mobile` (`display: none` by default, `flex` at mobile landscape), with the same `[data-filter-panel]` / `[data-filter-panel-toggle]` / `[data-filter-panel-content]` contract so `filterPanels` opens and closes it like any other panel. Its input is a plain DOM `<input>` (a Webflow form input cannot live outside a Form Block) with `data-filter-search-mirror`.

Code, `src/utils/filterSearchMirror.ts`:

```ts
mirror.addEventListener('input', () => {
  source.value = mirror.value
  source.dispatchEvent(new Event('input', { bubbles: true }))
  syncActive()
})

source.addEventListener('input', pullFromSource)
// Finsweet resets the source on Clear All without an input event.
document.querySelectorAll('[fs-cmsfilter-element="clear"]').forEach((clear) => {
  clear.addEventListener('click', () => requestAnimationFrame(pullFromSource))
})
window.fsAttributes ||= []
window.fsAttributes.push(['cmsfilter', pullFromSource])
```

`syncActive` toggles `fs-cmsfilter_active` on the copy's toggle, because `filterActiveState` only marks panels inside the filter form.

Verified on staging at 375px (v1.1.22): typing "dubai" in the mobile copy filtered the list from 194 to 28 items and put `?name=dubai` in the URL, and Clear All emptied the copy.

## Why This Works

Finsweet still sees exactly one search input inside its form and reacts to its `input` event as if the user typed there, so filtering, `showquery` URL sync and Clear All all keep working unchanged. Hiding the original with `display: none` removes it from the flex row entirely, so it adds no space. The copy is an ordinary panel in a row that does not scroll, so it needs no positioning tricks.

## Prevention

- When a design moves a Finsweet filter control outside the filter form, add a mirrored copy and hide the original at that breakpoint. Do not move the original visually.
- Keep the copy's input free of `fs-cmsfilter-*` attributes so Finsweet does not treat it as a second field.
- Anything that writes to the source without an `input` event (Clear All, URL params on load) must be copied back to the mirror, or the two drift apart.

## Related Issues

- [finsweet-cms-filter-webflow-setup.md](finsweet-cms-filter-webflow-setup.md): Finsweet attribute wiring and active-state handling.
- [../ui-bugs/webflow-turnstile-empty-div-adds-flex-gap-in-forms.md](../ui-bugs/webflow-turnstile-empty-div-adds-flex-gap-in-forms.md): the other source of dead space in the same filter row.
