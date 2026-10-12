# Works filter: Clear All, wider search, custom filter panels

**Date:** 2026-10-12
**Scope:** Works page only (`69cbd0b99ea71e2c7d058007`). The News filter is not touched.
**Status:** plan, not started

## Requests

1. Clear All button in the filter bar.
2. Search covers name, year, category and location.
3. Panels must not open when the filter row is swiped sideways on mobile.
4. A panel closes once an option in it is picked.

## 1. Clear All

Finsweet v1 clears every filter when an element has `fs-cmsfilter-element="clear"` and no `fs-cmsfilter-clear` value.

- **Designer (Stephen):** add a "clear all" link in the filter bar. Place it inside the filters form so it sits in the same scroll row; class it to match the other filter labels.
- **Attributes (Claude):** `fs-cmsfilter-element="clear"` on it.
- **Script:** `worksFilter.ts` already resets every slider when a clear without a field is clicked. `filterActiveState.ts` gets one change: Clear All is shown only while any filter is set (`is-hidden` class toggled), so it is not dead UI on a fresh page.
- **Decided (2026-10-12):** Clear All does not reset the sort. Sort is not a filter, and it has its own panel.

## 2. Search fields

Attribute change only, on the search input:

`fs-cmsfilter-field="Name, Year, Category, City, Country"`

Every identifier already exists inside each project (Category through the hidden nested list of categories, capped at Webflow's 5 nested items, which no project exceeds). Location means city plus country, so "beirut" and "lebanon" both match. The URL query parameter stays `name=` (Finsweet uses the first identifier).

## 3 and 4. Panels: replace the Webflow Dropdown

**Why not the native Dropdown.** Webflow's dropdown opens on its own touch handling, which fires after a horizontal swipe ends on the toggle. That cannot be switched off. Closing on select could be done natively (triggering `w-close` on the dropdown through jQuery), but item 3 needs the custom element anyway, so both are solved together.

**Native browser behaviour does the swipe fix for free:** a `click` event does not fire when the finger moved enough to scroll. Listening for `click` on a plain `<button>` instead of Webflow's touch events stops the accidental opening.

### DOM contract (per panel, 7 panels: typologies, status, date, location, area, search, sort by)

```
div.news-filter_dropdown-wrapper        [data-filter-panel]
  button.news-filter_link-dropdown      [data-filter-panel-toggle]   (type="button")
    div.button-square
    div  label text                     ([data-filter-label] stays on typologies)
  div.news-filter_dropdown-nav          [data-filter-panel-content]  (existing contents moved in unchanged)
```

- Same classes as today, so most styling carries over. Two things change in the Designer:
  - The content div is no longer positioned by Webflow. It needs the absolute positioning and full-width layout the dropdown list has now, hidden by default, shown by an `is-open` combo class.
  - Embed CSS keyed on Webflow's `w--open` (the blue square on the open toggle) changes to `.is-open`.
- The element IDs of the radios, inputs, clears and range parts stay the same if their contents are moved, not rebuilt, so the Finsweet attributes survive.

### Script: new `src/utils/filterPanels.ts`

- `click` on a toggle opens its panel and closes any other (one open at a time); a second click closes it.
- Picking a radio, or clicking a panel's "all", closes the panel (request 4). Range drags, typing in search, and sort changes:
  - range and search stay open while in use and close on outside click;
  - sort radios close the panel like filter radios.
- Outside click and Escape close the open panel. Focus returns to the toggle on Escape.
- `aria-expanded` and `aria-controls` on the toggle; the content gets an id.
- Selector-presence guard on `[data-filter-panel]`, so other pages are untouched.

### Script changes elsewhere

`filterActiveState.ts` lines 89, 90 and 108 select `.w-dropdown` / `.w-dropdown-toggle`. They switch to `[data-filter-panel]` / `[data-filter-panel-toggle]`. Nothing else references the Webflow dropdown classes.

### Who does what

| Step | Who |
|---|---|
| Rebuild the 7 panels as div / button / div, moving contents across | Claude via MCP (decided 2026-10-12; the moves keep IDs; 14 new wrapper elements) |
| Position and `is-open` styles for the content div, embed CSS swap | Stephen |
| Data attributes, search field, Clear All attribute | Claude via MCP |
| `filterPanels.ts`, `filterActiveState.ts` selectors, Clear All visibility | Claude |
| Test desktop and mobile on a local copy of staging, then staging | Claude, then Stephen on a phone |
| Release v1.1.17 | Claude, after Stephen's go |

## Test plan

- Mobile: swipe the filter row sideways starting on each toggle; no panel opens.
- Tap a toggle: opens. Tap a radio: filter applies and the panel closes. Tap the same toggle twice: opens then closes.
- Range: drag both handles; the panel stays open; tap outside closes it.
- Clear All: hidden on load, shown after any filter, resets radios, sliders, search and URL, then hides.
- Search "2019", "residential", "beirut", "lebanon" each return matches.
- News page: filter unchanged.
