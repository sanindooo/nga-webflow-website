---
title: Context-Aware Alt Text - Plan
type: feat
date: 2026-09-17
topic: context-aware-alt-text
artifact_contract: ce-unified-plan/v1
artifact_readiness: requirements-only
product_contract_source: ce-brainstorm
execution: code
---

# Context-Aware Alt Text - Plan

## Goal Capsule

**Objective.** Close finding F2 of the NGA Discoverability Audit (2026-09-12): populate alt text on every image the site holds, with lines that name the project or person and the place whenever the image belongs to one.

**Product authority.** Stephen Anindo (Granite Marketing), on behalf of Studio Circa for the NGA Website. Omar (Studio Circa) is not involved in the run; he is consulted only before the closing site publish.

**Open blockers.** An Anthropic API key for the generation step is not yet in `.env`. Webflow access is via the MCP OAuth grant (NGA Website, site `69be96472fedf400438234fd`); the REST token in `.env` is expired.

---

## Product Contract

### Summary

Generate alt text for every image the NGA Webflow site holds (973 CMS image field values and 821 asset library images, 1,794 in total), using Sonnet 5 on the Batch API with the item's CMS context injected into the prompt. Review happens per tier before anything is written; CMS tiers go live by item publish, the asset library tier by one coordinated site publish at the end.

---

### Problem Frame

The audit found alt text absent site-wide: Home 0/16, Studio 5/49, Process 11/75, Careers 2/7, project pages 0 to 1 alt per 7 to 13 images. Inventory on 2026-09-17 confirms this: 973 CMS image values with 52 alts (all on Awards, Publications, Greeting Cards), 821 library images with 67 alts.

Webflow holds alt in two separate places. Static Designer images inherit alt from the asset library record (verified: all 75 `/process` images match their library alt). CMS-bound images carry alt on the field value itself, and the library alt does not propagate (verified: a Teams photo with library alt renders `alt=""` on `/studio`). The existing `update-metadata` script only writes the library slot through the REST API, so it reaches none of the CMS images and needs a token that no longer works.

The current in-session vision workflow describes an image well but does not know whose photo it is. A portrait of Youssef Nour came back as "middle-aged man with short hair, glasses, and a beard"; the audit wants "Golden Tower lobby, travertine and onyx interior, Jeddah" and its equivalent for people.

---

### Key Decisions

- **Every image gets alt, rendered or not** (session-settled: user-directed, chosen over "rendered images only": an unrendered asset becomes a rendered one the moment someone places it, and the marginal cost is under $2). The 690 library images no page currently uses are in scope with the lightest review.
- **Existing alt is regenerated too** (session-settled: user-directed, chosen over leaving the 119 existing lines: they came from the earlier run of the library-only script and predate the context rule, so they get the same treatment as everything else).
- **Hybrid prompt: phone-description voice plus the audit pattern** (session-settled: user-directed, chosen over the audit pattern alone or a fixed template). The generator keeps the existing "describe it to someone over the phone" discipline (functional, information not aesthetics, under 200 characters, no credits) and adds a hard rule: when the image belongs to a project or person, the line names the entity and the place.
- **Context comes from the CMS item, and by filename match for library images.** Projects supply name, city, country, primary category, year, description. People supply name and title. News supplies title, summary, date. Library images that match a CMS item by filename (team portraits, greeting cards) borrow that item's context; the rest get the page and section they appear on, or no entity context at all.
- **Sonnet 5 on the Batch API** (session-settled: user-directed, chosen over Opus 5: the user accepts the cheaper model, and Haiku 4.5's further saving is about a dollar).
- **Spot-check per tier, then bulk apply** (session-settled: user-approved, chosen over full line-by-line sign-off: 1,650 lines is hours of reading; the lines with a name attached get read in full instead).
- **Webflow reads and writes go through the MCP.** No REST token exists and Omar stays out of the loop. The REST scripts remain as a fallback path for when a token is available. Generation runs as a standalone script against the Anthropic API so the vision work never enters a session's context.
- **Item publish per collection, site publish once at the end** (session-settled: user-approved, chosen over one big-bang site publish or handing publishing to Omar). CMS alt reaches the live site without touching Designer state; the library tier needs a site publish, which fires only after Omar confirms the Designer has nothing half-finished in it.

---

### Requirements

**Inventory**

- R1. The run starts from a saved inventory of every image on the site: each CMS image field value (collection, item, field, fileId, url, current alt) and each asset library image (id, display name, url, current alt).
- R2. The inventory records, for every library image, whether any live page renders it and on which page and section.
- R3. Images that already have alt are regenerated and overwritten; the previous value is kept in the inventory for reference.
- R4. Draft CMS items are included; archived CMS items are excluded.
- R5. Non-image assets (video, PDF) are excluded.

**Generation**

- R6. Each image is described by a vision model with the phone-description prompt and the entity rule, receiving the context the inventory holds for it.
- R7. When the image belongs to a project, the line names the project and its city or country.
- R8. When the image is a portrait, the line names the person and their title at Nabil Gholam Architects.
- R9. When the image belongs to a news item, publication, award, or greeting card, the line names that item.
- R10. When no entity context exists, the line describes the image on its own and names no entity.
- R11. Every line is under 200 characters, uses normal punctuation, contains no "image of" or "photo of" opener, and carries no copyright or credit.
- R12. Generation runs through the Batch API in tiers, and the output is saved to the repo as the review artifact, keyed by image identity, before anything is written to Webflow.

**Review and apply**

- R13. Tiers are reviewed in this order: Projects, People, News, static on-page library images, remaining CMS collections, unrendered library images.
- R14. A tier is applied only after review: every People line and every Project hero line is read in full; other lines are spot-checked.
- R15. Reviewed lines can be edited in the review artifact before apply, and the edited value is what gets written.
- R16. CMS alt is written on the field value, preserving fileId and url, and the items are then published with `publish_collection_items`.
- R17. Library alt is written with `update_asset`, and goes live with one site publish after the Designer-clean check with Omar.
- R18. After each tier is applied, the live HTML is re-fetched and the alt count per page is reported against the audit's baseline.

---

### Acceptance Examples

- AE1. Given Projects item "Golden Tower" (Jeddah, Saudi Arabia, residential, 2021) and its `hero---image`, the line reads like "Golden Tower residential high-rise seen from the street at dusk, Jeddah" and never like "A tall building at dusk".
- AE2. Given Teams item "Youssef Nour" with title "Principal" and its `photo`, the line reads like "Youssef Nour, Principal at Nabil Gholam Architects, black and white portrait in a dark shirt".
- AE3. Given library asset `Youssef Nour BW for web.avif`, unrendered, the generator matches it to the Teams item by name and produces the same style of line as AE2.
- AE4. Given library asset `snake-skeleton-5.avif`, rendered on `/process` in the inspiration section, the line describes the skeleton and names no project or person.
- AE5. Given Awards item with `award-logo` alt already set, the image is regenerated with the award name and year as context and the old value is recorded in the inventory.
- AE6. Given an archived Projects item, none of its images are generated or written.

---

### Success Criteria

- Live HTML after the run: Home 16/16, Studio 49/49, Process 75/75, Careers 7/7, and every project page 100% of its images with non-empty alt.
- No CMS image value loses its fileId or url in the write (verified by re-fetch and URL diff).
- Total generation spend under $10 (estimate on Sonnet 5 Batch: about $4.50 for 1,794 images).

---

### Scope Boundaries

- Audit findings F1 (done) and F3 to F8, which are the client's responsibility from here.
- Making alt a required field in Webflow (the CMS has no such setting for image alt).
- Secondary locales.
- Any Designer structural change.

---

### Dependencies / Assumptions

- The Webflow MCP grant on this machine covers the NGA Website; a site publish through it is permitted on this plan.
- Image `url` values are publicly fetchable, so the generator can read them without Webflow credentials.
- Batch API turnaround is well under the 24-hour ceiling for a few hundred requests per tier.
- An Anthropic API key is available for this project.

---

### Outstanding Questions

**Resolve before planning**

- Which Anthropic API key funds the run: a Granite key, or one issued for the NGA project.

**Deferred to planning**

- Whether the `images` collection field type requires re-sending unchanged sibling fields on `update_collection_items`, or a partial fieldData patch is enough.
- How to batch item publishes so a tier goes live in one operation per collection.

---

### Sources / Research

- Audit: `~/Downloads/NGA-Discoverability-Audit_20260912.pdf`, finding F2.
- Existing library-only writer: `scripts/api/webflow/update-metadata.cjs`; skill `.claude/skills/asset-metadata/SKILL.md`.
- Webflow IDs: `docs/reference/webflow-ids.md`.
- Image field PATCH shape (fileId + url + alt required): memory note `feedback_webflow_image_patch`.
- Alt text voice: memory note `feedback_alt_text_prompt`.
- Inventory of 2026-09-17: 845 assets (821 images, 67 with alt); CMS image values by collection: Projects 692, News 113, Publications 36, Greeting Cards 44, Teams 29, Awards 24, Hero Slides 7, Principals 6, Categories 6, Legal Partners 3.
