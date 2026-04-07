# Finsweet CMS Filter v1 (Legacy) — Setup Reference

## CDN Script

```html
<script async src="https://cdn.jsdelivr.net/npm/@finsweet/attributes-cmsfilter@1/cmsfilter.js"></script>
```

No companion scripts needed. Add CMS Load separately if >100 items:
```html
<script async src="https://cdn.jsdelivr.net/npm/@finsweet/attributes-cmsload@1/cmsload.js"></script>
```

## Core Attributes

| Attribute | Value | Applied To |
|---|---|---|
| `fs-cmsfilter-element` | `list` | Collection List Wrapper |
| `fs-cmsfilter-element` | `filters` | Form Block wrapping all filter UI |
| `fs-cmsfilter-field` | `"IDENTIFIER"` | Filter UI labels AND CMS-bound text inside items |
| `fs-cmsfilter-element` | `clear` | Reset all filters button (inside form) |
| `fs-cmsfilter-element` | `empty` | Empty state element (hidden by default) |
| `fs-cmsfilter-element` | `results-count` | Text showing filtered count |
| `fs-cmsfilter-element` | `items-count` | Text showing total count |

## Multi-Reference Field Setup

1. Inside CMS item, add **nested Collection List** bound to multi-ref field
2. Inside nested item, add Text Block bound to referenced item's Name
3. Apply `fs-cmsfilter-field="Category"` to that Text Block
4. Can hide nested list with `display: none` — filter still reads DOM text
5. **Limit:** Webflow caps nested lists at 5 items

## Single-Select / Dropdown Field Setup

1. Inside CMS item, add Text Block bound to the option field
2. Apply `fs-cmsfilter-field="Category"` to the Text Block
3. Can hide with `display: none`

## Filter UI (Buttons/Labels)

- **Checkboxes:** `fs-cmsfilter-field="Category"` on the **label** (not input). Label text must exactly match CMS values.
- **Radio buttons:** Same as checkboxes. Add `checked="checked"` for pre-selected.
- **Select dropdown:** `fs-cmsfilter-field="Category"` on the `<select>` element. Option text = filter values.
- **"All" button:** Static radio/checkbox with label "All" + same `fs-cmsfilter-field`. Place in same radio group.

### IDENTIFIER Rules

- Arbitrary string (e.g. `"Category"`, `"Type"`)
- Must match exactly between filter UI and CMS item elements (case-sensitive)
- For multi-ref: matches against the text content of the nested collection list items

## Behavioral Attributes

| Attribute | Values | Purpose |
|---|---|---|
| `fs-cmsfilter-active` | CSS class name | Active state class (default: `fs-cmsfilter_active`) |
| `fs-cmsfilter-match` | `all` / `any` | AND vs OR logic (default: `any`) |
| `fs-cmsfilter-showquery` | `true` | Persist filter in URL params |
| `fs-cmsfilter-duration` | ms (e.g. `200`) | Animation speed |
| `fs-cmsfilter-easing` | `ease`, `linear`, etc. | Animation easing |
| `fs-cmsfilter-hideempty` | `true` | Hide filter options with zero results |
| `fs-cmsfilter-debounce` | ms (e.g. `200`) | Delay before filter triggers on text input |

## Multiple Instances

Append a number suffix: `fs-cmsfilter-element="list-2"`, `fs-cmsfilter-element="filters-2"`, etc.

## JavaScript API

```javascript
window.fsAttributes = window.fsAttributes || [];
window.fsAttributes.push([
  'cmsfilter',
  (filterInstances) => {
    const [filterInstance] = filterInstances;
    // Custom code after filter initializes
  },
]);
```

## Documentation

- v1 docs: https://finsweet.com/attributes/v1/cms-filter
- v1 API: https://finsweet.com/attributes/v1/api/cms-filter
- Multi-ref setup: https://forum.finsweet.com/t/multi-reference-field-cms-filter/985
- npm CDN: https://www.jsdelivr.com/package/npm/@finsweet/attributes-cmsfilter

## v2 Note

v2 uses `fs-list-*` prefix instead of `fs-cmsfilter-*`. Single universal script with `type="module"`. Both versions are free. v1 and v2 CANNOT coexist on same page.
