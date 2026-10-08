---
title: "feat: Works gallery image sort order (combined Settings field + Order field)"
type: feat
status: active
date: 2026-10-08
branch: dev
quote: 8h (approved by client)
---

# Works Gallery Image Sort Order

## Summary

Let the client set the display order of the 12 gallery images on each Works project. The Works collection is at 51 of Webflow's 60-field limit, so the 12 new Order fields only fit if each image's Layout and Alignment fields are merged into one Settings field first (51 - 24 + 12 settings + 12 order = 51).

Everything stays unpublished until the client signs off. No `sites-publish`, no item publish, no Designer publish.

## Baseline (read-only audit, 2026-10-08)

- Works collection `69bfbc30efadacd9ad9e3d7a`: 51 fields, 84 items (1 draft, 1 archived, 0 with unpublished changes).
- Per slot today: `image-N` (Image), `image-N---layout-3` (slots 1-9) or `image-N---layout-2` (slots 10-12) (Option), `image-N---alignment` (Option).
- Layout options (identical on all 12 slots): `w-full`, `w-full full-height`, `w-3/4 extended`, `w-2/3`, `w-2/3 full-height`, `w-1/2`, `w-1/2 full-height`, `w-1/3`, `w-1/3 full-height`.
- Alignment options: `Default`, `Left`, `Right`. Only `Right` has a CSS rule (`margin-left: auto`). `Left` and `Default` render identically.
- 609 filled image slots, every one with a layout set. 109 slots have a layout but no image (ignored, hidden by CSS).
- Gallery CSS lives in an Embed element (`.custom-layout`) on the Works Template page, desktop only (`min-width: 768px`).
- Empty image slots are not rendered at all, so a project with 8 images has 8 figures (no `:nth-child` fallbacks possible).
- `src/utils/projectInfoButton.ts` reads `data-layout` (`w-full*` covers right) and `data-alignment` (`Right` covers right).

## Decisions

### D1. Combined Settings option list (16 options)

| Settings value | From layout | From alignment |
|---|---|---|
| `w-full` | `w-full` | any |
| `w-full full-height` | `w-full full-height` | any |
| `w-3/4 extended` / `w-3/4 extended right` | `w-3/4 extended` | Default/Left/none / Right |
| `w-2/3` / `w-2/3 right` | `w-2/3` | Default/Left/none / Right |
| `w-2/3 full-height` / `w-2/3 full-height right` | `w-2/3 full-height` | Default/Left/none / Right |
| `w-1/2` / `w-1/2 right` | `w-1/2` | Default/Left/none / Right |
| `w-1/2 full-height` / `w-1/2 full-height right` | `w-1/2 full-height` | Default/Left/none / Right |
| `w-1/3` / `w-1/3 right` | `w-1/3` | Default/Left/none / Right |
| `w-1/3 full-height` / `w-1/3 full-height right` | `w-1/3 full-height` | Default/Left/none / Right |

`w-full` + `Right` (54 slots) maps to plain `w-full`: `margin-left: auto` on a 100% item has no visible effect, and `projectInfoButton` already treats `w-full*` as covering the right. The mapping produces zero visual change.

### D2. Token-based CSS selectors

Rewrite selectors with `~=` (whitespace token match) instead of exact `=`: `[data-layout~='w-1/2']`, `[data-layout~='full-height']`, `[data-layout~='right']`. These match both the old values and the new ones, so the CSS can be swapped in before the rebind without breaking any live page, and the old `[data-alignment='right' i]` rule stays alongside until cleanup.

### D3. Order semantics

- New field per slot: `Image N - Order`, Number, integer, 1-12, not required.
- CSS `order` from `[data-order='1']` ... `[data-order='12']`. Ties keep slot order (flex default).
- Images with no order value get `order: 13`, so they fall to the end in slot order rather than jumping to the top.
- Migration sets Order = slot number on all 609 filled slots, so nothing moves until the client changes a value.
- The sort must work on mobile too, so the gallery container becomes `display: flex; flex-direction: column` below 768px with the existing mobile spacing preserved.

### D4. Staging, not publishing

- Webflow: field creation and item writes go to staged (draft) data only. Template changes are Designer edits only. Nothing is published.
- Code: work on git branch `dev`. Test the bundle via `pnpm run dev` loaded into Webflow custom code, as before. No tag or release until sign-off.
- Client review needs a rendered page. Showing it to the client means at least a publish to the `webflow.io` staging domain, which is a publish: that needs a separate explicit go from Stephen.

## Implementation Units

### U1. Create fields (API) [Webflow change, needs go]
- Create 12 `Image N - Settings` Option fields (D1 list, same order on every slot) and 12 `Image N - Order` Number fields, rolled per slot as described in "Sequencing problem" below (51 + 24 = 75 would exceed the 60-field limit).
- Record new field IDs and slugs in `docs/reference/webflow-ids.md`.
- Done when: schema shows 12 Settings + 12 Order fields and no old Layout/Alignment fields (52 total with the project-level `sort-order` field Stephen added on 2026-10-08).

### U2. Migration script
- `scripts/api/webflow/migrate-gallery-settings.mjs`, `--dry-run` by default, `--item <slug>` for a single item, `--apply` for all.
- Reads old layout + alignment option IDs by name, maps per D1, writes Settings option ID and Order = slot number. Writes only filled slots. Never sends image fields (avoids re-import, see memory on CMS image writes).
- Writes a before/after JSON snapshot to `assets/migrations/` for rollback.
- Done when: dry run report shows 609 mappings and 0 unmapped; 1 test item checked in the Designer preview; full run reports 609 writes, 0 errors; a re-run of the audit shows every Settings value matches its mapping.

### U3. CSS (template Embed)
- Replace the `.custom-layout` Embed contents per D2 and D3. Keep a copy in `docs/reference/gallery-layouts.md`.
- Done when: old and new attribute values render identically in Designer preview on 3 sample projects.

### U4. Template rebind (Designer, manual by Stephen)
- On each of the 12 `dynamic-image_item` figures: `data-layout` bound to `Image N - Settings`, add `data-order` bound to `Image N - Order`, remove `data-alignment` (after U5 is live in the dev bundle).
- If a Number field can't be bound to a custom attribute, fall back to an Option field `1`..`12` (still 1 field per slot).

### U5. projectInfoButton.ts
- `coversRight`: layout token `w-full` or token `right`, with `data-alignment === 'Right'` kept as a fallback until U7 removes the old fields.
- `pnpm run check` and `pnpm run build` pass. No release until sign-off.

### U6. Works settings guide page (`/work-settings`, draft)
- Update the placeholders to the 16 Settings values and add a sort order section (how to set it, ties, empty = last).

### U7. QA, sign-off, cleanup
- Sample projects on desktop and mobile, including Right-aligned pairs, `w-3/4 extended`, and one project with a changed sort order.
- Check the Webflow lightbox: its prev/next follows DOM (slot) order, not visual order. If the client cares, fix with a DOM reorder in the bundle (out of quote, flag it).
- After client sign-off only: delete the 24 old fields (ask first), drop the `data-alignment` fallback, release the bundle, update `gallery-layouts.md`, publish on Stephen's go.

## Sequencing problem (field limit)

The quote assumed creating the 24 new fields first and deleting the 24 old ones after sign-off. At 51 fields that peaks at 75, over Webflow's 60. Even the 12 Settings fields alone (63) don't fit. So some old fields must be deleted before the new ones exist.

**Approach: rotate by field type** (Stephen's call, 2026-10-08). Peak stays at 51.

1. Snapshot every item's Layout + Alignment values to JSON (read-only).
2. Verify the snapshot still matches live data, then delete the 12 Alignment fields (39).
3. Create the 12 Settings fields and fill them from Layout + the snapshot (51).
4. Delete the 12 Layout fields (39).
5. Create the 12 Order fields and set Order = slot number (51).

Script: `scripts/api/webflow/migrate-gallery-settings.mjs` (`snapshot`, `verify`, `plan`, `settings`, `order` commands; writes are dry-run unless `--apply`). Field deletions and creations go through the API with Stephen's go per step. Snapshot lives in `assets/migrations/` (gitignored, local only).

Consequences:
- The old fields are gone before client sign-off, which changes the quote's "delete once confirmed" step. Rollback is recreating the old fields from the U2 snapshot (scripted, about 30 minutes), not just unbinding.
- The live site is unaffected: it keeps serving the last publish until someone publishes. The Designer template bindings for the old fields break until U4, so **nobody may publish** (site or items) between U1 and U4.
- Before deleting anything, take a Webflow site backup and a full JSON export of all 84 items.

This needs Stephen's decision before U1.

## Progress (2026-10-08)

- Done: snapshot (84 items, 718 slots), Alignment fields deleted, Settings created and filled (0 mismatches), Layout fields deleted, Order created and filled (0 mismatches). Collection at 52 fields.
- Done via Webflow MCP (not Designer by hand): removed `data-alignment`, rebound `data-layout` to Settings, added `data-order` on all 12 figures; Custom Layout embed CSS replaced; guide page demos and Right Alignment copy updated.
- Done in code: `projectInfoButton.ts` token-based check with legacy `data-alignment` fallback; `pnpm run check` and `build` pass. Not committed or released.
- Verified: 36/36 old combinations compute identical styles under the new CSS; Marfaa image fileIds unchanged after item writes.
- Open: sort order section on the guide page (Stephen, Designer); Designer visual check; staging publish for client review (needs Stephen's go); bundle release; production publish.

## Risks

- Edit freeze: the client must not edit Works items from U1 until U4 is done.
- Unbound fields: if anyone publishes the site while the template still binds old fields that have been deleted, those figures lose their layout. No publishing until U4 is done.
- Screen readers and lightbox follow slot order (CSS `order` is visual only).
