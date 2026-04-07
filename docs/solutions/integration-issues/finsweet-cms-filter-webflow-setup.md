---
title: "Finsweet CMS Filter v1 — attribute wiring and active state management in Webflow"
date: "2026-04-07"
category: "integration-issues"
component: "Webflow MCP, scripts/src/global/filterActiveState.ts"
tags: [finsweet, cms-filter, webflow, active-class, url-params, multi-reference, single-reference, showquery, checkbox, form-block]
severity: "medium"
root_cause: "Finsweet CMS Filter v1 requires specific attribute placement on Webflow elements (form blocks, checkbox labels, collection list wrappers), applies active classes to the wrong DOM level for our design, and uses lowercase query param keys that must match custom link scripts."
date_resolved: "2026-04-07"
commit: "0400ce6"
---

# Finsweet CMS Filter v1 — Attribute Wiring and Active State Management

## Problem

Needed to add category filtering to Works and News listing pages using Finsweet CMS Filter v1 (free/legacy version). Three specific challenges:

1. **Attribute placement** — Which Webflow elements get which `fs-cmsfilter-*` attributes, especially with multi-reference vs single-reference CMS fields
2. **Active state class** — Finsweet adds `fs-cmsfilter_active` to checkbox labels, but the design needs it on the parent wrapper element
3. **URL query params** — Deep-linking from the homepage typology grid to pre-filtered works page, with correct encoding and casing

## Investigation

### Multi-reference field limitation

Webflow limits pages to 2 nested Collection Lists. The Works page needed:
- Filter bar categories (nested list from Categories collection) — slot 1
- Row view category display (nested list from multi-ref Category field) — slot 2
- Grid view category display — **no slot available**

Multi-reference fields CANNOT be bound to plain text elements — they require a nested Collection List. This meant the grid view couldn't show categories for filtering.

### Solution: Primary Category reference field

Added a single Reference field ("Primary Category") to the Projects collection pointing to the same Categories collection. Single references CAN be bound to plain text elements without a nested collection. Both grid and row views now have a hidden text element with `fs-cmsfilter-field="Category"`.

### Filter UI structure

Finsweet v1 requires the filter controls inside a **Form Block** (`fs-cmsfilter-element="filters"`). The original design used Link elements — these don't work as filter triggers. Replaced with:
- Form Block wrapper → `fs-cmsfilter-element="filters"`
- Checkboxes inside CMS collection items (categories) → `fs-cmsfilter-field="Category"` on the **label**
- Static "All" link → `fs-cmsfilter-element="clear"`

### Active class promotion

Finsweet applies `fs-cmsfilter_active` to the element with `fs-cmsfilter-field` (the checkbox label). Our design structure:

```
news-filter_link (wrapper) ← needs the active class HERE
  ├── button-square
  ├── checkbox input (hidden)
  └── Checkbox Label ← Finsweet puts it here
```

Required a custom script to promote the class to the parent wrapper.

### URL param casing

Finsweet's `fs-cmsfilter-showquery` writes lowercase query params (e.g., `?category=Residential`), regardless of the `fs-cmsfilter-field` identifier casing (`"Category"`). Custom link scripts must use lowercase to avoid duplicate params.

## Solution

### 1. Attribute placement map

| Element | Attribute |
|---|---|
| Form Block | `fs-cmsfilter-element="filters"` |
| "All" link | `fs-cmsfilter-element="clear"` |
| Checkbox label (CMS-bound) | `fs-cmsfilter-field="Category"` |
| Collection List Wrapper(s) | `fs-cmsfilter-element="list"` |
| Category text inside CMS items | `fs-cmsfilter-field="Category"` |
| List wrappers (for URL params) | `fs-cmsfilter-showquery="true"` |

Multiple collection lists with the same `"list"` identifier are filtered simultaneously by one `"filters"` form.

### 2. Active state script (filterActiveState.ts)

Key patterns:
- Uses `window.fsAttributes.push(['cmsfilter', callback])` to sync state after Finsweet initializes (handles URL-restored filter state)
- Listens to form `change` events and promotes `fs-cmsfilter_active` from checkbox labels to parent `.news-filter_link` wrappers
- Manages clear button wrapper state inversely (active when nothing checked)

### 3. Deep-link URL encoding

```typescript
link.href = '/works?category=' + encodeURIComponent(categoryName).replace(/%20/g, '+')
```

- Lowercase `category` to match Finsweet's showquery output
- `encodeURIComponent` for special chars (`&` → `%26`)
- Replace `%20` with `+` for space encoding consistency

## Prevention

1. **Always use Form Block + checkboxes** for Finsweet filter UI — links/buttons don't work as filter triggers
2. **Check nested collection list limits** before planning multi-ref filter setups — Webflow caps at 2 per page. Use single Reference fields as a workaround for additional views.
3. **Use lowercase query param keys** in any custom scripts that build Finsweet filter URLs — Finsweet normalizes to lowercase regardless of field identifier casing
4. **Use the Finsweet JS API callback** (`window.fsAttributes.push`) when custom scripts need to sync with Finsweet's initialization — DOMContentLoaded alone may fire before Finsweet processes URL state
5. **Reference doc**: Full attribute reference at `docs/reference/finsweet-cms-filter.md`
