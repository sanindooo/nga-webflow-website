---
name: asset-metadata
description: >
  Generate and apply context-aware alt text for every image on the Webflow
  site: CMS image fields (alt lives on the field value) and asset library
  images (alt lives on the asset, inherited by static Designer images).
  Vision runs as a script against the Claude API (Sonnet 5, Batch API) with
  the CMS item's context injected; Webflow writes go through the MCP or the
  REST client. Triggers on "update alt text", "asset metadata", "generate alt
  text", or "asset audit".
allowed-tools:
  - Bash
  - Read
  - Write
  - Edit
  - Glob
  - mcp__webflow__data_assets_tool
  - mcp__webflow__data_cms_tool
  - mcp__webflow__data_sites_tool
---

# Asset Metadata

Alt text on this site has two separate slots, verified against live HTML:

| Image type | Where alt lives | How to write it | Goes live via |
|---|---|---|---|
| Static Designer image | Asset library record (`altText`) | `update_asset` (MCP) or `update-metadata.cjs` (REST) | Site publish |
| CMS-bound image | Field value `{ fileId, url, alt }` | `update_collection_items` with all three keys | `publish_collection_items` |

Library alt does **not** propagate to CMS images. The old `update-metadata.cjs` only writes the library slot.

## Prerequisites

- `ANTHROPIC_API_KEY` in `.env` (generation).
- Webflow MCP authorised for the site, or `WEBFLOW_API_TOKEN` + `WEBFLOW_SITE_ID` for REST.
- macOS `sips` (converts AVIF/GIF to JPEG and downsizes to 1200px before sending).

## Workflow

### 1. Raw dumps

Save the full asset list and every collection's items to `assets/alt-text/raw/assets.json` (array of assets) and `assets/alt-text/raw/cms.json` (`{ [CollectionLabel]: { items } }`). Via MCP: `list_assets` paginated at 100, `list_collection_items` per collection. Collection labels must match the keys in `build-alt-inventory.mjs` (Projects, News, Principals, Teams, LegalPartners, Awards, Publications, GreetingCards, HeroSlides, Categories, plus Countries, Roles, NewsCategories for lookups).

### 2. Inventory

```bash
pnpm run alt:inventory
```

Writes `assets/alt-text/inventory.json`: one entry per image with tier (`projects`, `people`, `news`, `static`, `other-cms`, `library`), entity context (project + city + country + category + year + description; person + title; news title + summary; etc.), and for library images which live page and section renders them. Archived items and File fields are excluded. Library images are matched to people and greeting cards by filename.

### 3. Calibrate, then generate

```bash
pnpm run alt:generate -- --tier people --sample 10 --direct     # show the user real output first
pnpm run alt:generate -- --tier projects --submit               # Batch API, one batch per tier
pnpm run alt:generate -- --tier projects --poll                 # when ended, writes output + review
```

Output: `assets/alt-text/output/<tier>.json` (apply input, `alt` is editable) and `assets/alt-text/review/<tier>.md` (table with image links, context, length, flags). Lines over 200 characters get an automatic text-only shortening pass. SVGs are flagged `needsManual` with a filename-based suggestion.

The prompt is the phone-description voice plus the context rule: project lines name the project and city (country on heroes only, "by Nabil Gholam Architects" on heroes only); portraits name the person and title; no entity context means no names invented.

### 4. Review

Present each tier's review file. Read every People line and every Project hero line in full; spot-check the rest. Edits go into the output JSON `alt` field. Do not write to Webflow until the user approves the tier.

### 5. Apply

```bash
pnpm run alt:payload -- --tier projects
```

Writes `assets/alt-text/apply/<tier>/<Collection>-NN.json` chunks of 20 items (`{ collectionId, items, publishItemIds, draftItemIds }`) and `assets-NN.json` chunks for library assets.

```bash
pnpm run alt:apply -- --tier projects --dry-run
pnpm run alt:apply -- --tier projects --publish     # REST: PATCH items, verify URLs unchanged, publish non-drafts
pnpm run alt:verify                                 # live alt counts per page vs the audit baseline
```

Without a REST token, feed each chunk to the MCP instead: `update_collection_items`, then `publish_collection_items` with `publishItemIds`; library chunks to `update_asset`. Library alt needs one site publish either way, after confirming with the client that the Designer has nothing unfinished.

### 6. Verify

Re-fetch the live pages and count `<img>` tags with non-empty alt against the baseline (Home 0/16, Studio 5/49, Process 11/75, Careers 2/7 on 2026-09-17). Re-fetch a sample of updated CMS items and confirm image URLs are unchanged.

## Alt Text Guidelines

- Describe information, not aesthetics; think about the function of the image.
- Under 200 characters, normal punctuation, no trailing full stop.
- Never "Image of" / "Photo of".
- Name the project and place, or the person and title, whenever the image belongs to one.
- Black and white photographs are described as such.
- Logos: include the brand name. Icons: describe the concept.
- Decorative images: empty alt (rare on this site).
