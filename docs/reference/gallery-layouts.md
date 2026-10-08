# Gallery Layout System

Dynamic image gallery for the Works CMS template page. Each image's size, alignment and position are set per slot in the CMS and applied by CSS attribute selectors (no JavaScript for layout).

## CMS Fields (per image slot, 1-12)

| Field | Slug | Type | Purpose |
|---|---|---|---|
| Image N | `image-N` | Image | The gallery image |
| Image N - Settings | `image-N---settings` | Option | Width, aspect ratio and alignment in one value |
| Image N - Order | `image-N---order` | Number (integer) | Display position, 1 shows first |

Field IDs are cached in `webflow-ids.md`. Until 2026-10-08 each slot had separate `Layout` and `Alignment` Option fields; they were merged into Settings to stay under Webflow's 60-field limit (plan: `docs/plans/2026-10-08-001-feat-works-image-sort-order-plan.md`).

### Settings values (16)

A value is space-separated tokens: one width, plus optional `full-height`, `extended` and `right`.

| Value | flex-basis | aspect-ratio | Right version |
|---|---|---|---|
| `w-full` | 100% | 16/9 | none |
| `w-full full-height` | 100% | 3/2 | none |
| `w-3/4 extended` | calc(75% - 0.5rem) | 3/4 | `w-3/4 extended right` |
| `w-2/3` | calc(66% - 0.5rem) | 4/3 | `w-2/3 right` |
| `w-2/3 full-height` | calc(66% - 0.5rem) | 3/4 | `w-2/3 full-height right` |
| `w-1/2` | calc(50% - 0.5rem) | 4/3 | `w-1/2 right` |
| `w-1/2 full-height` | calc(50% - 0.5rem) | 3/4 | `w-1/2 full-height right` |
| `w-1/3` | calc(34% - 0.5rem) | 4/3 | `w-1/3 right` |
| `w-1/3 full-height` | calc(34% - 0.5rem) | 3/4 | `w-1/3 full-height right` |

Full-width values have no right version: `margin-left: auto` on a 100% item has no visible effect.

`right` adds `margin-left: auto`, so it only shows when an image is alone in its row. Paired images fill the row.

### Order

- `data-order="1"` to `"12"` maps to CSS `order: 1` to `12`, at all breakpoints (the container is flex on mobile too).
- Images with no order get `order: 13`, so they go last, in slot order. Equal orders also keep slot order.
- `order` is visual only: screen readers and the Webflow lightbox's next/previous follow slot (DOM) order.

## Row Pairing Rules

The container uses `display: flex; flex-wrap: wrap; gap: 1rem` (1.25rem below 768px, from the class style). Any images whose widths total about 100% form a row:

- `w-1/3` + `w-2/3` = 100%
- `w-1/2` + `w-1/2` = 100%
- `w-full` = solo row
- `w-2/3` or `w-3/4 extended` alone = solo row with whitespace (use a `right` value to push it right)

Pairing follows the display order, so changing Order can change which images share a row.

## CSS Implementation

The CSS lives in the **Custom Layout** component (an HTML Embed, class `custom-layout`), placed on the Works Template and the Works Settings guide page. It matches tokens with `~=`, so `[data-layout~='w-1/2']` covers `w-1/2`, `w-1/2 full-height` and `w-1/2 right`.

```css
.dynamic-image_item { order: 13; }
.dynamic-image_item[data-order='1'] { order: 1; }
/* ... through 12 */

@media (min-width: 768px) {
  .dynamic-image_component { display: flex; flex-wrap: wrap; gap: 1rem; }
  .dynamic-image_item { overflow: hidden; }
  .dynamic-image_image { width: 100%; height: 100%; object-fit: cover; }

  [data-layout~='w-full'] { flex-basis: 100%; aspect-ratio: 16/9; max-height: calc(100vh - 2rem); }
  [data-layout~='w-2/3'] { flex-basis: calc(66% - 0.5rem); aspect-ratio: 4/3; max-height: calc(100vh - 2rem); }
  [data-layout~='w-1/2'] { flex-basis: calc(50% - 0.5rem); aspect-ratio: 4/3; max-height: calc(100vh - 2rem); }
  [data-layout~='w-1/3'] { flex-basis: calc(34% - 0.5rem); aspect-ratio: 4/3; max-height: calc(100vh - 2rem); }

  [data-layout~='full-height'] { aspect-ratio: 3/4; }
  [data-layout~='w-full'][data-layout~='full-height'] { aspect-ratio: 3/2; }
  [data-layout~='extended'] { flex-basis: calc(75% - 0.5rem); aspect-ratio: 3/4; }

  [data-layout~='right'] { margin-left: auto; }

  .dynamic-image_item:not([data-layout]),
  .dynamic-image_item[data-layout=''] { display: none; }
}
```

Verified on 2026-10-08: all 36 old Layout x Alignment combinations compute identical flex-basis, aspect-ratio, max-height and margin under the new CSS with their mapped Settings value.

## Webflow Template Wiring

Each of the 12 `dynamic-image_item` figures on the Works Template has:

- `data-layout` bound to `Image N - Settings`
- `data-order` bound to `Image N - Order`
- Figure 3 also has a static `data-header-theme="dark"`.

`src/utils/projectInfoButton.ts` reads `data-layout`: a `w-full` or `right` token means the image covers the right side, so the info button stays light.

## Adding or Changing Settings Options

The Webflow Data API cannot edit an existing Option field's option list. To add a value:

1. Add the option to all 12 Settings fields in the CMS settings (Designer), in the same position, or
2. Recreate the fields via API: unbind `data-layout` on the figures, delete the fields, recreate with the new list (`scripts/api/webflow/migrate-gallery-settings.mjs` holds the list), rebind, then re-run the migration from a fresh snapshot.
3. Add CSS for any new token.

Webflow refuses to delete a field that is still bound to an element (409 "currently being used in bindings"), so always unbind first.
