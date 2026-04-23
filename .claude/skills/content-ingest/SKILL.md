---
name: content-ingest
description: >
  Ingest a bulk content drop (folders of docx + images) into a Webflow site.
  Audits the folder against live CMS state, resizes oversized images, uploads
  assets with dedup, batch-creates CMS items for Works / News / Team / etc.,
  inherits fields from archived template items, generates SEO copy from
  client-approved body text, and flags everything that needs manual Designer
  work into a TODO. Project-configurable via a single config file. Triggers
  on "ingest content", "bulk upload", "process client content", "import
  projects folder", or when the user points to a folder of project docx +
  image subfolders.
allowed-tools:
  - Bash
  - Read
  - Write
  - Edit
  - Grep
  - Glob
  - Skill
  - mcp__webflow__data_cms_tool
  - mcp__webflow__data_pages_tool
  - mcp__webflow__data_sites_tool
---

# Content Ingest

A multi-phase pipeline for taking a messy client content drop (Word docs,
thousands of images, nested folders with inconsistent naming) and turning it
into a populated Webflow CMS with SEO, image layouts, and a punch-list of
what still needs human action.

Designed to be copied into any Webflow project that follows the
`docs/reference/webflow-ids.md` + `assets/asset-manifest.json` conventions
used on Granite Marketing builds.

## When to use

- Client has handed over a `Content/` folder with docx + image subfolders
- The site's CMS collections already exist (Works, News, Principals, Teams,
  Categories, Countries, News Categories, etc.) — usually because a Relume
  template or an earlier `/upload-copy --scaffold` run created them
- You want the bulk of the ingest done as **drafts** so you can QA in Editor
  before publishing

Do NOT use for:
- Creating new CMS collections from scratch — use `/upload-copy --scaffold`
- Updating copy on static pages only — use `/upload-copy`
- Single-item edits — use the Webflow Editor or direct MCP calls

## Prerequisites

1. `.env` with `WEBFLOW_API_TOKEN` and `WEBFLOW_SITE_ID`
2. `docs/reference/webflow-ids.md` populated with collection + page IDs
3. `sharp` and `mammoth` installed as devDependencies
   ```
   pnpm add -D sharp mammoth
   pnpm approve-builds   # approve sharp's native build
   ```
4. A `.claude/skills/content-ingest/config.json` that maps source folders →
   CMS IDs (see `config.example.json`)
5. **A Webflow backup.** This pipeline creates a lot of draft items. Users
   must confirm they have a backup before Phase 3 runs.

## Mode selection

The skill runs as a sequence of independent phases. Each phase is idempotent
and re-runnable. Invoke with the phase name:

| Phase | Command | What it does |
|---|---|---|
| 1. Audit | `/content-ingest audit` | Walk content folder, parse docx, pull live CMS, emit `docs/content-map.md` + `assets/projects.json`. Read-only — touches nothing in Webflow. |
| 2. Prep | `/content-ingest prep` | Resize images >4MB (long-edge 2560, aspect preserved, originals backed up to `…-originals/`). Rename any malformed folders (e.g. `21-YM HOUSE` → `2021-YM HOUSE`). |
| 3. Seed | `/content-ingest seed` | Create missing Countries, News Categories, Roles referenced by the parsed docx. **Requires user confirmation.** |
| 4. Upload | `/content-ingest upload` | Walk folder, MD5-dedup against site assets, upload everything. Writes `assets/content-manifest.json`. Resumable. |
| 5. CMS | `/content-ingest cms [works\|news\|team\|misc]` | Batch-create CMS items as drafts. Sub-phase can target one collection. |
| 6. Inherit | `/content-ingest inherit` | For each new Team / Principals item, copy `title` + `role` ref from the archived template duplicate (matched by name). |
| 7. Layouts | `/content-ingest layouts` | Apply one of several rhythmic image-layout templates to each Works item (deterministic by slug hash). |
| 8. SEO | `/content-ingest seo` | Draft SEO meta-title + meta-description per CMS item, pulling phrasing close to the client body + an optional CTA. |
| 9. TODO | `/content-ingest todo` | Emit / update `docs/content-todo.md` listing everything that needs manual Designer work, missing source content, cleanup of template placeholders, etc. |
| All | `/content-ingest all` | Orchestrate phases 1→9 with a confirmation prompt before 3 and 5. |

No-arg invocation defaults to `all` but pauses for confirmation at each destructive phase.

## Config file schema

`.claude/skills/content-ingest/config.json` drives all per-project knobs.
Copy `config.example.json` and fill in:

```json
{
  "sourceRoot": "Content/CONTENT-2",
  "backupRoot": "Content/CONTENT-2-originals",

  "collections": {
    "works":           "69bfbc30efadacd9ad9e3d7a",
    "news":            "69bfd12acb21ae530fc28b7a",
    "principals":      "69c13d17a4363aea1815b371",
    "teams":           "69c13d1707bd300137cddff1",
    "legalPartners":   "69c13d19bde732776d6027fc",
    "consultants":     "69c13d1a722721b63cae60f3",
    "roles":           "69c1416e722721b63cafda6f",
    "publications":    "69c2160184f6875b5af9be2e",
    "greetingCards":   "69c21602e1d0bea9a19b0853",
    "heroSlides":      "69d67b80d7fc5b0a878583d5",
    "workCategories":  "69d391322d74e768b7f530fb",
    "newsCategories":  "69d500138e25cedac5625829",
    "countries":       "69de1399c71af6b802640ff6",
    "awards":          "69c13d198466a337c8edf490"
  },

  "categoryFolders": {
    "01-URBAN DESIGN":                   { "name": "Urban Design",            "itemId": "69d3914aaee6eb59178cbe31" },
    "02-High-Rise":                      { "name": "High-Rise",               "itemId": "69d3914aaee6eb59178cbe33" },
    "03-Residential":                    { "name": "Residential",             "itemId": "69d3914aaee6eb59178cbe35" },
    "04-Mixed-Use":                      { "name": "Mixed-Use",               "itemId": "69d3914aaee6eb59178cbe37" },
    "05-Corporate and Institutional":    { "name": "Corporate & Institutional","itemId": "69d3914aaee6eb59178cbe39" },
    "06-Interior Design":                { "name": "Interior Design",         "itemId": "69d3914aaee6eb59178cbe3b" }
  },

  "countryAliases": {
    "kingdom of saudi arabia": "Saudi Arabia",
    "uae":                     "United Arab Emirates"
  },

  "forceUpperCase": ["CMA", "CGM", "YM", "MV", "AY", "AZ", "AUB", "IOEC", "UK", "DC", "II", "III"],

  "nameOverrides": {
    "zeebox-guadeloupe": "Zebox Guadeloupe",
    "zeebox-washington": "Zebox Washington",
    "nga-office":        "ngª Office"
  },

  "imageResize": {
    "maxMB": 4,
    "longEdgePx": 2560,
    "jpegQuality": 88
  },

  "seo": {
    "maxTitleChars": 75,
    "maxDescriptionChars": 150,
    "descriptionTone": "Pull phrasing directly from client-approved body text. Make a small tweak for readability and add a soft CTA/intrigue if room ('— discover the project', 'explore the design', etc.). Stay close to source."
  }
}
```

## Per-phase playbook

Each phase is implemented by a script in `scripts/`. The SKILL invocation
shells out with `node` after sourcing `.env`. All scripts are ESM (`.mjs`)
to match projects with `"type": "module"` in `package.json`.

### Phase 1 — Audit (read-only)

Walk `sourceRoot`, classify every folder and file:
- `NN-Name/YYYY-Project/*.{docx,jpg}` → project CMS item
- `NEWS/*.docx` + `NEWS/*.jpg` → News items (date-parsed from filenames)
- `Team section/*.docx` + `Team section/*/*.jpg` → Principals + Teams
- `Privacy Policy - …/*.docx` → static page bodies
- `Office photos/`, `Inspiration photos/`, `PROCESS-photos/` → asset-only folders

Parse each docx with mammoth (`extractRawText`). Split project docx on
labelled headers (`Category`, `Location`, `Area`, `Year`, `Team`, `Awards`).
Parse News docx on date regex (`/^([A-Za-zÀ-ÿ]+)\s+(\d{4})$/` — handles
English + French months).

Cross-reference with live Webflow:
- `data_cms_tool → get_collection_list + get_collection_details` for every
  collection in `config.collections`
- `data_cms_tool → list_collection_items` for reference collections
  (Countries, News Categories, Roles, Categories)
- `data_pages_tool → list_pages` for page IDs

Emit `docs/content-map.md` with:
- Routing table per source file → target collection/page + writability flag
  (✅ API-writable, ⚠️ RichText container needs Designer, ❌ manual only)
- Gaps: missing pages, missing countries, missing roles, year conflicts,
  cross-category duplicates, folders with no docx, docx with no folder
- Counts per collection

Emit `assets/projects.json` — canonical source-of-truth for Phase 5,
with cleaned display names (strip YYYY-/NN- prefixes, title-case excluding
SMALL_WORDS, honour NAME_OVERRIDES), slugs, city/country normalised,
body/area/team/awards extracted, images array.

### Phase 2 — Prep

Run `scripts/resize-oversized.mjs` on `sourceRoot`. For each image >4MB:
1. Check metadata with sharp
2. Back up original to `backupRoot/<relative-path>`
3. Resize long-edge to `longEdgePx` (default 2560), preserve aspect ratio,
   re-encode JPEG at quality 88 (mozjpeg) or PNG at level 9
4. If still >cap, try progressively smaller edges (2200, 1920, 1600, 1400,
   1200) before giving up

Webflow auto-converts uploads to AVIF on delivery, so we only need to fit
the 4MB upload cap — don't over-compress the source.

Also in this phase: rename any malformed folders detected by the audit
(`scripts/normalize-folders.mjs`) — the common case is a year-prefix missing
its century (`21-YM HOUSE` → `2021-YM HOUSE`).

### Phase 3 — Seed reference data (requires user confirmation)

Read `assets/projects.json`, diff against live reference collections, create
missing items in:
- **Countries** — any country mentioned in a project's Location that isn't
  already in the Countries collection. Slug: lowercase-kebab.
- **News Categories** — any tag referenced by news docx that isn't already
  a category (e.g. "latest news", "awards").
- **Roles** — any role text appearing on a Team item that doesn't match an
  existing Role item exactly.

Don't create Categories (Works typology) — those are a stable set defined
in config.

**User gate:** always show a dry-run list of items that would be created
and ask "Proceed? (y/n)". No exceptions. Creation is not reversible — if
a country is added and the client decides on a different spelling, they
have to rename manually.

### Phase 4 — Upload assets

Run `scripts/upload-content-assets.mjs`:
1. Walk `sourceRoot` for all `.{jpg,jpeg,png}`
2. `listAssets` on the Webflow site → build MD5 → existing asset map
3. Per image: compute MD5; if already present, record the existing asset ID;
   else `uploadAsset` via the presigned-URL flow
4. Save `assets/content-manifest.json` every 5 uploads (resumable)
5. Report counts: uploaded, deduped (already on site), cached (same mtime as
   previous run), failed

The manifest maps every source path to `{webflowAssetId, webflowUrl, hash,
mtime, sizeBytes}`. Downstream phases depend on this file.

### Phase 5 — Create CMS items as drafts

Per-collection sub-scripts, each idempotent (dedup by slug against existing
items):

- **`scripts/create-works.mjs`** — reads `assets/projects.json`, for each
  project sets `name`, `slug`, `year`, `city`, `country-2` (reference),
  `primary-category` + `category` (multi-ref), `description` (RichText
  HTML from body paragraphs), `area` (RichText from multi-line area),
  `hero---image`, `image-1`..`image-12` (gallery), all as drafts.
  Cross-category projects: the richer image folder wins.

- **`scripts/create-news.mjs`** — reads News docx, splits on date headers,
  derives title from first sentence, sets `publication-date` to first of
  month, matches hero image by month+year keyword overlap in
  `Content/…/NEWS/` filenames.

- **`scripts/create-team.mjs`** — parses Team section docx into 8 sections
  (`1-Principal & Associates`, `2-Team Leaders`, etc.). For Principals:
  use the **known-roster-as-anchors** strategy (see pitfall below) instead
  of blank-line splitting — and UPDATE existing items rather than creating
  duplicates. For Teams / Legal Partners / Consultants: create new items
  (duplicates if the template seeded some — cleaned up in Phase 6 /
  follow-up TODO).

- **`scripts/create-misc.mjs`** — Hero Slides (from taglines in the home
  docx), Publications (from "Publication of X" news items + explicit list
  if present), Awards (seed from Team/Awards sections inside project
  docx).

### Phase 6 — Inherit from archived template items

Many Relume-style templates seed CMS collections with placeholder items
(generic names + role strings + template images). After Phase 5 we often
have two items per person: the template's and ours.

Workflow: the user ARCHIVES the template items in Editor (harness blocks
bulk-deleting pre-existing shared items). Then run
`scripts/patch-inherit.mjs`:

1. List all items including archived
2. For each new (non-archived, post-ingest) item, find archived counterpart
   by name (prefer category-match on duplicates)
3. PATCH new item with any non-empty fields from archived (`title`, `role`
   reference, sort order, etc.) — don't overwrite what we just set

### Phase 7 — Layouts

`scripts/patch-layouts.mjs` fetches the Works schema to extract every
`image-N---layout-*` and `image-N---alignment` option ID, then applies one
of three rhythmic templates (magazine / editorial / cinematic) chosen by
`md5(slug)[0] % 3`:

- **Magazine** — tall hero, half-half pairs, full-width breaks
- **Editorial** — full-width hero, tall left/right, large narrative breaks
- **Cinematic** — large-tall hero, xlarge-tall left+right, full-width
  cinematic beats

Only applies to slots that have images — empty slots untouched.

### Phase 8 — SEO (important — project-specific voice)

`scripts/patch-seo.mjs` generates:

**Titles** — formulaic `"{Name} — {Category} in {City}, {Country}"` with
progressive fallback if over 75 chars:
1. Full form
2. Shorter category label (`Corporate & Institutional` → `Institutional`)
3. Drop country, keep city
4. Name + short category only
5. Truncated name with ellipsis

**Descriptions** — client-copy voice. The tone setting in config (above) is
load-bearing. Default approach:
1. Load project body from `assets/projects.json`
2. Pull a distinctive 1–2 sentence excerpt (not just "first N chars")
3. Keep the client's phrasing verbatim where possible
4. Slight edit for flow + intriguing tone
5. Optional soft CTA: "— discover the project", "explore the design", etc.
6. Cap at `maxDescriptionChars` (default 150) at a word boundary

Do not paraphrase aggressively. Client-approved copy is the source of
truth; the description is a re-arrangement, not a rewrite. Verify each
description has at least one phrase lifted verbatim from the body.

For a one-off touch-up of a few specific items, don't re-run the whole
phase — edit the hand-drafted `DESCRIPTIONS` map inside the script and
re-run; it's idempotent.

### Phase 9 — TODO

`scripts/write-todo.mjs` writes `docs/content-todo.md` covering:
1. Ingestion summary — what was created, counts per collection
2. Cleanup — template placeholder item IDs to delete (with full lists so
   the user can batch-delete in Editor)
3. Content not yet supplied — "List from actual website" / "Same as
   website" references in docx that need scraping
4. Pages that don't exist — static pages referenced but not in
   `webflow-ids.md` (commonly `/privacy`, `/terms`)
5. Designer-only static page copy — ready-to-paste text per page
6. Schema gaps — missing fields (e.g. Hero Slides needs a
   `background-video` field)
7. Year conflicts — folder vs docx year mismatch
8. Team photo unmatched — names in docx with no photo and photos with no
   docx entry
9. Cross-category duplicates — which folder's images were used
10. Image element assignments — REST-uploaded assets can't be assigned to
    static page image elements via MCP; list the pages + folders needing
    manual work

## Known pitfalls (learned the hard way)

### Principals / Teams parser
Blank-line heuristics split mid-bio when the docx uses single blanks
between paragraphs AND a name. The fix is to use a **known roster of
principal names as anchors** — find each canonical name's line index in
the text, slice between anchors. Keeps bios intact even when paragraph
separators are inconsistent. (Never rely on just blank-line run length.)

### Create-vs-update on seeded collections
Templates seed collections with placeholder items (Principals has 6,
Teams has 27, Works has ~6, News has ~4). Creating new items with the
same `name` produces duplicates. Strategy:
- **Principals / Works / News**: check for existing items by slug or name
  BEFORE creating. Update existing if a match exists; create only new.
- **Teams / Consultants / Legal Partners**: the archived template items
  usually have different-enough data that cleaning them up later (Phase 6
  inherit, then archive+delete) is simpler than trying to update in place.

### MCP response parsing
The Webflow v2 `POST /collections/:id/items` returns the created item
directly, NOT wrapped in `items: [...]`. Grab `r.id`, not `r.items?.[0]?.id`.
(Previous runs stored undefined IDs that failed to delete later.)

### File-size resize flow
Don't re-encode as AVIF or WebP — Webflow does that automatically on
delivery. Just shrink dimensions + use mozjpeg q88 / PNG compress. Keep
originals; clients sometimes need print-resolution versions later.

### Harness guardrails on shared data
The permission harness will block bulk-delete of items created before this
session. Self-created drafts can be deleted individually. Anything that
touches pre-existing template items must go through user-confirmed batch
ops in Editor, or be flagged into the TODO.

### Fuzzy photo matching
Team photo filenames (`Cristina Fernandez  BW for web.jpg`) drift from docx
names (`Cristina Fernández`). Normalise both with:
```
s.toLowerCase()
 .normalize('NFKD').replace(/[̀-ͯ]/g, '')
 .replace(/[^a-z]/g, '')
```
then match. Fall back to first+last name only. Report unmatched names in
the TODO — don't silently skip.

### Zebox / brand spelling
Folders may say `Zeebox Guadeloupe` but the company body text calls itself
`Zebox`. Use `nameOverrides` in config to force the correct brand spelling
without losing the folder-based slug disambiguation.

## Adapting to a new project

The bundled scripts were written against the NGA site's IDs. Before running
on a new project:

1. **Copy the skill folder** to the new repo: `cp -r .claude/skills/content-ingest /new-repo/.claude/skills/`
2. **Update `config.json`** with the new site's collection + category IDs (lookup from `docs/reference/webflow-ids.md` on the new project, or run `data_cms_tool → get_collection_list`).
3. **Constants at the top of each script** need swapping — current state is that the scripts contain hardcoded IDs for readability; `config.json` is the future source of truth but scripts don't yet read from it. Per-script fields to update:
   - `create-projects.mjs` — `PROJECTS_COLLECTION`, `CATEGORY_IDS`, `COUNTRY_IDS`
   - `create-news.mjs` — `NEWS_COLLECTION`, `NEWS_CATEGORY_IDS`
   - `create-team.mjs` — `PRINCIPALS`, `TEAMS`, `LEGAL_PARTNERS`, `CONSULTANTS`, `TEAM_CATEGORY` (option IDs)
   - `update-principals.mjs` — `PRINCIPALS`, `PRINCIPAL_IDS` (roster-to-id map)
   - `create-misc-cms.mjs` — `HERO_SLIDES`, `PUBLICATIONS`, `AWARDS`, Publications category option IDs
   - `patch-admin-roles.mjs` — `ROLES`, `TEAMS`, `EXISTING_ROLES`, `ASSIGNMENTS`
   - `patch-teams-roles.mjs` — `TEAMS`, `TEAM_MEMBER`, `ADMINISTRATION` option IDs
   - `patch-remaining-fields.mjs` — `CONSULTANTS`, `HERO_SLIDES`, `HERO_SLIDE_TO_PROJECT`, `CONSULTANT_COUNTRY`
   - `patch-category-heroes.mjs` — `CATEGORIES`, `CATEGORY_FLAGSHIP`
   - `patch-project-layouts.mjs` — `WORKS` collection ID
   - `patch-works-seo-v2.mjs` — `WORKS`, `DESCRIPTIONS` object (per-project client copy)
   - `patch-news-seo.mjs` — `NEWS`, `SEO` object (per-project copy)
4. **Skim the audit output first** (`content-ingest audit`) — if the client's folder structure doesn't match the NGA convention (`NN-CATEGORY/YYYY-Project/`), `build-projects-json.mjs` needs its walker updated.

Future work: migrate the scripts to read every ID from `config.json` so a
new project just needs the config filled in. For now treat the scripts as
editable templates.

## Files produced per run

- `docs/content-map.md` — audit report (Phase 1)
- `docs/content-todo.md` — outstanding manual actions (Phase 9)
- `docs/reference/webflow-ids.md` — updated with any new references seeded
  in Phase 3
- `assets/projects.json` — canonical project source-of-truth (Phase 1)
- `assets/content-manifest.json` — path → Webflow asset map (Phase 4)
- `assets/*-created.json` + `assets/*-patched.json` — per-phase logs

Keep all under version control — they document what was actually written
and make re-runs surgical.
