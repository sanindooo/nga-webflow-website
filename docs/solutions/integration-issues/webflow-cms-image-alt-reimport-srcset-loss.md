---
title: "Webflow Data API re-imports CMS images on every image-field write, dropping srcset variants"
date: 2026-09-17
category: integration-issues
module: "scripts/api/webflow (alt-text apply pipeline)"
problem_type: integration_issue
component: tooling
symptoms:
  - "PATCH /collections/{id}/items with { fileId, url, alt } returns 200 and sets alt, but the re-fetched item shows a new fileId and a double-id URL (<newId>_<oldId>_name.jpeg)"
  - "Sending { fileId, alt } without url returns 400 Expected value to have a 'url' field"
  - "Live project pages lost srcset and sizes on every CMS image after the write; a page went from about 1.5MB to 34MB of image bytes"
  - "Re-importing from the asset library S3 URL instead of the CDN URL produces the same double-id copy with no variants"
  - "Asset library records updated via PATCH /assets/{id} { altText } keep their file and variants"
root_cause: wrong_api
resolution_type: workflow_improvement
severity: high
related_components:
  - scripts/api/webflow/apply-alt-text.cjs
  - scripts/api/lib/webflow-client.cjs
  - scripts/api/anthropic/build-apply-payload.mjs
  - Webflow CMS Image and MultiImage fields
  - Webflow asset library
tags:
  - webflow-api
  - cms-image-field
  - alt-text
  - srcset
  - responsive-images
  - re-import
  - asset-library
  - data-api-v2
---

# Webflow Data API re-imports CMS images on every image-field write, dropping srcset variants

## Problem

Writing alt text to a Webflow CMS image field through the Data API v2 is not an in-place update. Every write to an Image or MultiImage field is treated as "upload from `url`": Webflow fetches the file, stores a new copy under a new `fileId`, and points the field at the copy. Copies created this way never receive Webflow's responsive `srcset` variants. A bulk alt-text pass over 687 project images therefore replaced every variant-bearing image on the Works pages with a full-size original, and the change was published before the verifier caught it.

## Symptoms

- `PATCH /v2/collections/{id}/items` with `{ fileId, alt }` and no `url` returns `400 Validation Error ... Expected value to have a 'url' field`. `fileId` is read-only on write; Webflow's field-types reference says only "To upload a new image, provide an object containing a `url`."
- After a write with `{ fileId, url, alt }` using the field's *current* `url`, the re-fetched item shows a new `fileId` and a filename of the form `<newId>_<oldId>_original-name.jpeg` (double id prefix, `.jpg` renamed to `.jpeg`). The bytes are identical to the original and the alt is applied.
- The same happens when `url` is an asset-library S3 `hostedUrl`: still a double-id copy, still no variants. The source of the URL makes no difference.
- Live HTML for the affected pages loses `srcset` and `sizes` entirely. Golden Tower: 7 of 7 images had `srcset` before, 0 of 7 after. F House: image payload went from roughly 1.5 MB (variants) to 34 MB (originals). A 4000 px hero now serves 3.1 MB where the `-p-500` to `-p-1600` variants weighed 25 to 250 KB.
- The apply script's post-write check reported `url changed (...)` for 82 of 83 project items, which is the fingerprint of a re-import (`scripts/api/webflow/apply-alt-text.cjs:56-58` now recognises it).

## What Didn't Work

- **`{ fileId, alt }` without `url`** — rejected with the 400 above. There is no alt-only write shape for image fields.
- **Re-import from the asset library's S3 URL** (upload the original via the presigned asset flow, then write its `hostedUrl` into the field) — tested live on the Golden Tower hero. Produced the same double-id copy with no `srcset`. Variants are decided by the import path, not by where the file came from.
- **Waiting for variants to appear** — CMS images this site imported through the API in April 2026 still had no `srcset` five months later. Webflow does not backfill variants for API-imported CMS images; Designer/Editor uploads (single-id filenames) get them, including AVIF (Process page: 70 of 75 Designer-uploaded AVIFs carry `srcset`).
- **Move alt into PlainText fields and bind the image element's alt to them in the Designer** — would have avoided touching the images, but Webflow's per-collection field cap was already reached on Projects (13 image slots, each with layout and alignment companions, plus metadata), per the client-side check in this session.
- **Resize before re-import** (2000 px AVIF at ~200 KB) to compensate for the missing variants — rejected on product grounds: the client reviews the site on a ~2500 px display and re-uploading photos through the Editor to fix perceived blur would strip the alt again.

## Solution

Split the work by where alt lives, and treat the two paths very differently.

**Asset library (static Designer images): safe.** `PATCH /v2/assets/{id}` with `{ altText }` changes the record without touching the file. Static Image elements inherit the library alt byte for byte (verified on `/process`: all 75 images matched their library `altText`). It reaches the live site only on a full site publish. The apply script writes this path per asset and asserts the response echoes the new text (`scripts/api/webflow/apply-alt-text.cjs:81-82`).

**CMS image fields: destructive to variants, so decide before writing.** Accept that the write re-imports, send the original file so nothing is resized, and verify the alt rather than the URL:

```js
// scripts/api/anthropic/build-apply-payload.mjs:62 — the only write shape the API accepts
item.fieldData[r.field] = { fileId: r.fileId, url: r.url, alt: r.alt }

// MultiImage is replaced wholesale, so rebuild the full array from the inventory (:65-68)
item.fieldData[r.field] = siblings.map(e => ({ fileId: e.fileId, url: e.url, alt: altByKey.get(e.key) ?? e.currentAlt ?? '' }))
```

```js
// scripts/api/webflow/apply-alt-text.cjs:54-58 — a re-import is expected; a *lost* image is not
const originalFileId = (url.match(/\/([0-9a-f]{24})_/) || [])[1]
const liveUrl = got.get(key) || ''
if (liveUrl !== url && !(originalFileId && liveUrl.includes(`_${originalFileId}_`))) problems.push(`${key}: url changed (${liveUrl || 'missing'})`)
```

The verifier still fails hard on `alt not applied` (`:60-63`), and drafts are updated but excluded from `publishItemIds` so they stay drafts (`build-apply-payload.mjs:83`).

**Rate limiting on the library path.** 821 sequential asset PATCHes (751 library plus 70 static, back to back) produced 13 `429 Too Many Requests` failures even though `WebflowClient` retries 429 five times with exponential backoff (`scripts/api/lib/webflow-client.cjs:19` and `scripts/api/lib/webflow-client.cjs:49-53`). A one-off retry with 1.5 s between calls cleared all 13 in this session; the apply script itself has no pacing yet. Space bulk asset writes rather than relying on the client's retry alone.

## Why This Works

Webflow keeps CMS images in a separate bucket from the site asset library, and the CMS field value is a pointer to a file in that bucket plus alt text. The Data API exposes only one mutation for that pointer, "import from URL", which always creates a new bucket object; `fileId` in the request body is informational. Responsive variants are generated by the Designer/Editor upload pipeline at upload time and are not produced for objects created by the API importer, so any API write permanently downgrades the image to a single-size file. Nothing in the v2 API can restore the original object once the pointer moves, because pointing back at the old URL is itself another import.

The asset library is different: `PATCH /v2/assets/{id}` mutates metadata on an existing object, so the file, its variants, and every static element that references it are untouched.

## Prevention

- **Patch one item first, then look at the live page.** Before any bulk CMS image write: PATCH a single item, re-fetch it, publish that item, and diff the live HTML for `srcset` presence and image byte size against the pre-write state. Only then run the rest. The 82-item verifier report was accurate but arrived after the publish; the one-item probe would have stopped the run at zero damage.
- **Write-order rule.** Library alt (`PATCH /assets/{id}`) is non-destructive and can be applied freely. CMS image alt is a re-import: treat it as an image replacement with all the consequences, and get an explicit decision on variants before touching it.
- **Decide the variant trade-off up front.** If `srcset` matters more than alt, set CMS alt through the Editor UI instead, or bind alt to a text field where the collection has fields to spare. If alt matters more, import the originals untouched (no resize) so the only loss is the variants, not image quality.
- **Verify alt, expect a new URL.** A CMS image verifier that asserts URL equality will fail on every write. Assert that the new URL embeds the original `fileId` and that `alt` matches; fail on anything else.
- **Rebuild MultiImage arrays completely.** An update replaces the whole array, so a partial write silently drops images.
- **Keep the generated lines in the repo.** `assets/alt-text/output/<tier>.json` holds every line keyed by image identity, so a later re-import or Editor re-upload can be re-applied without regenerating.

## Related Issues

- [mcp-api-gap-asset-pipeline.md](mcp-api-gap-asset-pipeline.md): origin of the REST asset pipeline and the library-only `update-metadata` script; this doc adds the CMS image-field slot and the re-import behaviour.
- [animated-gif-compression-webflow-4mb-cap.md](animated-gif-compression-webflow-4mb-cap.md): uses the same `{ fileId, url, alt }` shape as an intentional upload; the shape is an upload, never an in-place update.
- [scrolltrigger-mobile-premature-animations.md](scrolltrigger-mobile-premature-animations.md): its performance follow-up measured `/works` with zero `srcset` and proposed re-binding to the native CMS image picker; the absence is caused by API import, so re-binding alone cannot restore variants.
- Plan for the alt-text run: `docs/plans/2026-09-17-001-feat-context-aware-alt-text-plan.md`.
- Webflow field types reference: https://developers.webflow.com/data/reference/field-types-item-values
