# Gallery Layout System

Dynamic image gallery for the Works CMS template page. Layout and alignment are controlled per-image via CMS Option fields, applied at runtime by `galleryLayout.ts`.

## CMS Fields (per image slot, 1-12)

Each image slot has 3 fields:

| Field | Type | Purpose |
|---|---|---|
| Image N | Image | The gallery image |
| Image N - Layout | Option | Width + height preset |
| Image N - Alignment | Option | Horizontal alignment |

### Layout Options (8 total)

| Option | flex-basis | aspect-ratio | Pairs with |
|---|---|---|---|
| Full Width | 100% | 16/9 | Solo row |
| Full Width — Tall | 100% | 3/2 | Solo row |
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

## Webflow Template Wiring

Each `dynamic-image_item` element needs two custom attributes bound to CMS fields:

- `data-layout` → bound to "Image N - Layout"
- `data-alignment` → bound to "Image N - Alignment"

The script reads these values and applies inline styles.

## Adding/Modifying Layout Options

The Webflow Data API **cannot** modify existing Option field option lists. To add a new layout option:

1. Delete the affected "Image N - Layout" field in Webflow Designer
2. Recreate via API with the updated option list (use `create_collection_option_field`)
3. Re-bind `data-layout` attributes in the template
4. Update `layoutMap` in `scripts/src/components/galleryLayout.ts`
5. Rebuild: `pnpm run build`

## File Locations

- Script source: `scripts/src/components/galleryLayout.ts`
- Script dist: `scripts/dist/components/galleryLayout.js`
- Manifest entry: `components.galleryLayout` in `scripts/manifest.json`
