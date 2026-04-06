# Gallery Layout System

Dynamic image gallery for the Works CMS template page. Layout and alignment are controlled per-image via CMS Option fields, applied by CSS attribute selectors (no JavaScript).

## CMS Fields (per image slot, 1-12)

Each image slot has 3 fields:

| Field | Type | Purpose |
|---|---|---|
| Image N | Image | The gallery image |
| Image N - Layout | Option | Width + height preset |
| Image N - Alignment | Option | Horizontal alignment |

### Layout Options (9 total)

| Option | flex-basis | aspect-ratio | Pairs with |
|---|---|---|---|
| Full Width | 100% | 16/9 | Solo row |
| Full Width — Tall | 100% | 3/2 | Solo row |
| Extra Large — Tall | calc(75% - 0.5rem) | 3/4 | Solo row (~25% whitespace) |
| Large | calc(66% - 0.5rem) | 4/3 | Small |
| Large — Tall | calc(66% - 0.5rem) | 3/4 | Small — Tall |
| Half | calc(50% - 0.5rem) | 4/3 | Half |
| Half — Tall | calc(50% - 0.5rem) | 3/4 | Half — Tall |
| Small | calc(34% - 0.5rem) | 4/3 | Large |
| Small — Tall | calc(34% - 0.5rem) | 3/4 | Large — Tall |

### Alignment Options (3 total)

| Option | Effect |
|---|---|
| Default | Left-aligned (flex-start) |
| Left | Left-aligned (explicit) |
| Right | `margin-left: auto` — pushes image right |

Alignment only matters when an image is **solo in its row** (unpaired). Paired images fill the row, so alignment has no visible effect.

## Row Pairing Rules

The container uses `display: flex; flex-wrap: wrap; gap: 1rem`. Any two images whose widths total ~100% form a row:

- Small (34%) + Large (66%) = 100%
- Half (50%) + Half (50%) = 100%
- Full Width (100%) = solo row
- Large (66%) alone = solo row with 34% whitespace (use alignment to position)

## CSS Implementation

Layouts are applied via CSS attribute selectors on `data-layout` and `data-alignment` attributes. The CSS is embedded as a `<style>` block on the CMS template page or in site-level custom code. No JavaScript is used.

## Webflow Template Wiring

Each `dynamic-image_item` element needs two custom attributes bound to CMS fields:

- `data-layout` → bound to "Image N - Layout"
- `data-alignment` → bound to "Image N - Alignment"

## Adding/Modifying Layout Options

The Webflow Data API **cannot** modify existing Option field option lists. To add a new layout option:

1. Delete the affected "Image N - Layout" field(s) in Webflow Designer
2. Recreate via API with the updated option list (use `create_collection_option_field`)
3. Re-bind `data-layout` attributes in the template
4. Add the new CSS rule for the new `data-layout` value
