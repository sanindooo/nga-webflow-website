---
title: "Merging Webflow CMS option fields at the 60-field limit, with MCP rebinds"
date: 2026-10-08
module: works-gallery
component: tooling
problem_type: workflow_issue
severity: medium
applies_when:
  - "A Webflow collection is near its 60-field limit and new fields are needed"
  - "Two CMS fields need merging into one (e.g. Layout + Alignment into Settings)"
  - "CMS fields bound to custom attributes on a template must be deleted or rebound"
tags:
  - webflow-cms
  - webflow-mcp
  - field-limit
  - migration
  - custom-attributes
  - css-attribute-selectors
related_components:
  - frontend_stimulus
---

# Merging Webflow CMS option fields at the 60-field limit, with MCP rebinds

## Context

The Works collection was at 51 of Webflow's 60 fields. The client wanted a sort order per gallery image (12 new fields), so each slot's `Image N - Layout` and `Image N - Alignment` Option fields had to merge into one `Image N - Settings` field first. The original quote assumed "create 24 new fields, migrate, delete 24 old fields", which peaks at 75 fields and is impossible. Three further surprises shaped the working process: Webflow refuses to delete bound fields, the Webflow MCP can now do the template rebinds, and the merged option values needed CSS that matched old and new values identically.

Full record: `docs/plans/2026-10-08-001-feat-works-image-sort-order-plan.md`. Script: `scripts/api/webflow/migrate-gallery-settings.mjs`. Reference: `docs/reference/gallery-layouts.md`.

## Guidance

### 1. Rotate by field type, not create-then-delete

At the limit, free fields before creating them. Snapshot first, because one of the source fields is deleted before the merge runs:

1. Snapshot every item's old values to JSON (read-only).
2. Verify the snapshot still matches live data, then delete the first field type (Alignment, 51 to 39).
3. Create the merged fields and fill them from the remaining field plus the snapshot (39 to 51).
4. Delete the second field type (Layout, 51 to 39).
5. Create the new fields and fill them (Order, 39 to 51).

The peak never exceeds the starting count. Re-run `verify` immediately before every deletion.

### 2. Unbind before deleting: the API returns 409 on bound fields

`DELETE /collections/{id}/fields/{fieldId}` on a field still bound to an element fails with:

```
409: Conflict: Collection fields: "Image 1 - Alignment" currently being used in bindings.
```

Nothing is deleted, so it is a safe guard. Remove or rebind every binding first. Conditional visibility on the figures did not reference the deleted fields; if it had, the same 409 would have caught it.

### 3. Rebind custom attributes with the Webflow MCP (2.1+)

The MCP can read and write CMS-bound attributes, so no manual Designer pass is needed:

- Read: `data_element_settings_tool` > `get_settings` with `type: "all_raw_settings"`. Bound attributes appear under the `attributes` key as `{ sourceType: "cms", fieldId, fieldName }`. `query_elements` with `attribute_name` does **not** find bound attributes; find the elements by class instead.
- Remove one attribute: `data_element_tool` > `remove_attribute` (keeps the others).
- Rebind or add: `data_element_settings_tool` > `set_settings` with `key: "attributes"` and `value_binding: { source_type: "cms", collection_id, field_id }`. This **replaces the whole attribute list**, so read first and re-include static attributes (figure 3 kept `data-header-theme="dark"` this way).
- Test on one element and read it back before batching the other 11.

The gallery CSS lived in a component (`Custom Layout`), not on the page: query `ComponentInstance` elements, then read the embed's `code` setting with `scope_component_id`.

### 4. Merge option values as space-separated tokens, match with `~=`

Combined values like `w-1/2 full-height right` let one CSS rule per token cover old and new values:

```css
[data-layout~='w-1/2'] { flex-basis: calc(50% - 0.5rem); aspect-ratio: 4/3; }
[data-layout~='full-height'] { aspect-ratio: 3/4; }
[data-layout~='w-full'][data-layout~='full-height'] { aspect-ratio: 3/2; }
[data-layout~='right'] { margin-left: auto; }
```

Drop variants with no visible effect (`w-full right`, `Left` = `Default`) so the option list stays short (16, not 27).

### 5. Prove zero visual change two ways

- **Computed styles:** render every old value combination under the old CSS and its mapped value under the new CSS in Playwright, and diff `flex-basis`, `aspect-ratio`, `max-height` and `margin-left`. Include Webflow's `figure { margin: 0 0 10px }` reset in the harness, or `margin-left: auto` cases show false differences against the browser's 40px default figure margin.
- **Geometry:** after a staging publish, diff each gallery image's position and size on staging against production at 1440px for a sample of projects, including ones with right-aligned and `extended` images. Result here: 7 projects, 0 differences.

## Why This Matters

Create-then-delete fails outright at the limit, and discovering that mid-run leaves a half-migrated collection. Deleting a bound field is blocked, so a plan that skips unbinding stalls at the first destructive step. The token-plus-`~=` approach is what made the CSS safe to swap before the rebind and what made "no project looks different" provable rather than asserted.

## When to Apply

- Any Webflow schema change on a collection within ~25 fields of the limit.
- Any time CMS fields bound to custom attributes, text or images on a template must be renamed, merged or deleted.

## Examples

Item writes never send image fields. An image-field write re-imports the file and loses its srcset (see [webflow-cms-image-alt-reimport-srcset-loss.md](../integration-issues/webflow-cms-image-alt-reimport-srcset-loss.md)). After the one-item test, confirm the image `fileId`s still match the live page before running the bulk write.

Related: [css-attribute-selector-case-sensitivity-data-alignment.md](../ui-bugs/css-attribute-selector-case-sensitivity-data-alignment.md) covers the old `data-alignment` attribute this migration removed.
