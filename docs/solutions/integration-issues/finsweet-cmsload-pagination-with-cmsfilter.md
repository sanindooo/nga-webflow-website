---
title: "Finsweet CMS Load v1 pagination breaks code that runs once at init"
date: 2026-11-05
category: integration-issues
module: works-filter
problem_type: integration_issue
component: frontend_stimulus
symptoms:
  - "Year range slider starts at 2007 although a 2004 project exists"
  - "Hover does nothing on cards from page 2 and 3"
  - "Works list fades in a second time a couple of seconds after first load (not on refresh)"
  - "Date filter before 2007 shows \"We couldn't find any results\" while a project is visible"
  - "Smooth scroll to top on page change works every other click"
root_cause: async_timing
resolution_type: code_fix
severity: medium
tags: [finsweet, cms-load, cms-filter, pagination, additems, renderitems, switchpage, scrollsmoother, webflow-100-item-limit]
---

# Finsweet CMS Load v1 pagination breaks code that runs once at init

## Problem

Webflow lists cap at 100 items, so Works got native pagination (50 per page) plus Finsweet CMS Load v1 in `fs-cmsload-mode="pagination"`. CMS Load fetches every other page in the background so CMS Filter sees all items. Anything in our bundle that read the DOM or bound listeners once at `Webflow.push` time now only saw page one.

## Symptoms

See frontmatter. All but the empty-state one disappear on a refresh, because CMS Load caches the fetched pages and they land before anything paints.

## What Didn't Work

- Reading slider bounds from `document.querySelectorAll` inside the list: later pages are never in the DOM, only in `listInstance.items`.
- Sorting by re-appending item elements to the list: that puts every item on one page and defeats pagination.
- `smoother.scrollTo(0, true)` in the `switchpage` handler: it was cut short on every other click. The handler runs before Finsweet renders, then the render, the `ScrollTrigger.refresh(true)` from `filterActiveState.ts` on `renderitems`, and the new page's image loads all land mid-scroll. Testing this in a hidden browser pane is useless: rAF is paused, so smooth scrolls never move.

## Solution

All in `src/utils/worksFilter.ts` and `src/utils/worksCardHover.ts` (v1.1.24 to v1.1.27):

- **Slider bounds**: `RangeSlider.setBounds()` recomputes lowest/highest from every `listInstance.items[].element`, run in the `cmsfilter` callback and again on each `additems`.
- **Sort**: sort `listInstance.items`, then `listInstance.renderItems()`. Finsweet renders in item order and keeps the page size. The active sort is re-applied on `additems`.
- **Per-card JS** (`worksCardHover`): set up cards on load, then in a `cmsload` callback set up `listInstance.items` already present and hook `additems` for later batches. A `WeakSet` stops double setup.
- **Second fade**: `renderitems` fires when each background page arrives even though page one is unchanged. The reveal handler compares the rendered elements with the last render and skips the fade when they match.
- **Page-change scroll**: flag on `switchpage`, act on the next `renderitems` in a `setTimeout`, then an instant `smoother.scrollTo(target, false)`. Target is the filter bar's natural top: `smoother.offset(sectionAbove, 'bottom top')` minus the bar's computed sticky `top` (66px, the nav height). The bar's own rect is useless because it is sticky. Landed under the nav on every click in staging tests.

## Why This Works

CMS Load v1 adds items through `ListInstance.addItems`, which emits `additems` and calls `renderItems(true)`. `renderItems` walks `items` in array order and only shows the current page's slice, so mutating `items` and re-rendering respects pagination. The `cmsfilter` and `cmsload` callbacks can fire before or after the background pages land, so every setup reads `items` at callback time and also listens for `additems`.

## Prevention

- Any module that touches Works items must read `listInstance.items`, not the DOM, and must handle `additems`. The same applies to News once it passes 100 articles.
- Every list that carries `fs-cmsfilter-element="list"` needs Webflow pagination on plus `fs-cmsload-element="list"`. Works has a row view and a grid view that share one `fs-cmsfilter-element="empty"` element; while the row view stayed unpaginated it held only the first 100 projects (oldest 2007), so any filter it could not match showed "no results" over the grid's results.
- CMS Load v1 needs Webflow's native pagination left on: it reads the Next link and the first page's item count. Use the v1 script (`@finsweet/attributes-cmsload@1`); v2 (`@finsweet/attributes@2` with `fs-list`) cannot run on the same page as our v1 filter.
- Staging only picks up a release once the site footer tag is bumped to the new version and the site is republished. Check the loaded bundle URL before debugging.

Setup steps: `docs/reference/finsweet-cms-filter.md`. Related: `finsweet-cmsfilter-double-flash-back-to-all.md` (the reveal-after-decode fade this builds on).
