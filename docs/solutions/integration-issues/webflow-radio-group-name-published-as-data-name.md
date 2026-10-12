---
title: "Webflow publishes every radio as name=\"radio\", so separate filter groups share one radio group"
date: 2026-10-12
category: integration-issues
module: works-filter
problem_type: integration_issue
component: frontend_stimulus
symptoms:
  - "Picking a location radio unchecks the selected typology radio"
  - "Finsweet still filters by both (both appear in the URL query) while only one looks selected"
  - "Published HTML shows name=\"radio\" on every radio; the Designer group name is only in data-name"
root_cause: config_error
resolution_type: code_fix
severity: medium
tags: [webflow, radio, group-name, data-name, finsweet, cms-filter, mcp]
---

# Webflow publishes every radio as name="radio", so separate filter groups share one radio group

## Problem

The Works filter has several single-select radio groups (typology, status, location, sort). Picking a radio in one group unchecked the radio in another, because the browser saw them all as one group. Finsweet kept filtering by both, so the visible selection and the actual filter disagreed.

## Symptoms

- Residential selected, then Lebanon picked: Residential visually unchecks, but the URL reads `?category=Residential&country=Lebanon`.
- In published HTML every radio has the same `name`:

  ```html
  <input type="radio" data-name="category" name="radio" ...>
  <input type="radio" data-name="country"  name="radio" ...>
  <input type="radio" data-name="status"   name="radio" ...>
  ```

## What Didn't Work

- **Setting the radio's Group Name (the `groupName` setting) through the Webflow MCP.** It saved, and showed in the Designer, but published only as `data-name`. `name` stayed `radio` (the input's Name field, default "Radio").

## Solution

Restore the real group name at runtime from `data-name` (`restoreRadioGroups`, `src/utils/worksFilter.ts:224`):

```ts
const restoreRadioGroups = () => {
  document
    .querySelectorAll<HTMLInputElement>(
      '[fs-cmsfilter-element="filters"] input[type="radio"][data-name], input[data-sort][data-name]',
    )
    .forEach((radio) => {
      radio.name = radio.dataset.name ?? radio.name
    })
}
```

It runs first in `worksFilter()`, inside `Webflow.push`. Browser radio grouping reads `name` live, so changing it after Finsweet has initialised is safe.

## Why This Works

Browsers group radios by `name` within a form. Webflow writes the Designer "Group Name" to `data-name` and the input's Name field to `name`. Every radio built by copying another keeps the default Name "Radio", so they all collide. Copying `data-name` into `name` gives each group its own name again.

## Prevention

- After building radios (Designer or MCP), check the published HTML for distinct `name` values per group, not just the Designer's Group Name.
- The alternative fix is setting each radio's Name field to the group name in the Designer; the runtime restore guards against new radios copied from old ones.
- This affects any Webflow form with more than one radio group, not only Finsweet filters.

## Related Issues

- `docs/solutions/integration-issues/finsweet-cms-filter-webflow-setup.md` (radio-based single-select filters)
- `docs/reference/finsweet-cms-filter.md`
