# Content Ingestion — Outstanding TODOs

Action list for things the content pipeline could NOT automate. Organised by
category. Cross-references `docs/content-map.md` for the full context.

**Last updated:** 2026-04-27

## Ingestion summary — what was created

- **Works CMS** — 46 new project items (drafts), 1 skipped due to slug collision (Regenerative Dome — see §0.1). Each has name, slug, year, city, country ref, primary + multi category, description RichText, area RichText, hero + up to 12 gallery images.
- **News CMS** — 6 news items (drafts) with publication date, hero image, body, tag→category.
- **Principals CMS** — 6 existing items UPDATED with real bios, titles, emails, B&W photos from the Team docx.
- **Teams CMS** — 30 new items across Team Leader / Member / Administration categories (drafts), with fuzzy-matched B&W photos from the photo folder. 27 old template duplicates remain — see §0.2.
- **Consultants CMS** — 18 new collaborator entries (drafts) with empty country/service. 7 pre-existing International Consultants items kept.
- **Legal Partners** — kept 3 pre-existing template items (correct spellings "Semaan Gholam & Co"). 3 duplicates I created with worse spelling were self-deleted.
- **Hero Slides CMS** — 6 tagline items (drafts) without background-image (schema gap — see §4).
- **Publications CMS** — 1 new item: "Works 2025" (drafts).
- **Awards CMS** — 2 seed items: WAF 2018 Finalist (J House), LEED Gold (AUB IOEC).
- **Countries CMS** — 10 new country references seeded.
- **News Categories CMS** — 2 new categories: "Latest News", "Awards".

## 0. Cleanup — delete template placeholders (user required)

The harness blocked bulk-delete of pre-existing shared CMS items. Run these deletions in the Webflow Editor or grant the agent permission and re-run. All items below are template scaffolding that is now superseded by real content.

### 0.1 Works CMS — 6 placeholders to delete

| ID | Name |
|---|---|
| `69dfad6fd91314d92fbbd9b4` | Sky Bar |
| `69d391778ce41cd923247c03` | Qortuba Oasis |
| `69d391778ce41cd923247c01` | Skylife |
| `69d391778ce41cd923247bff` | Arabian Peninsula |
| `69d391778ce41cd923247bfd` | Regenerative Dome (template) — blocks my real Regenerative Dome project from being created. Delete then re-run `node scripts/api/webflow/create-projects.mjs`. |
| `69d391778ce41cd923247bfb` | Maritime City |

### 0.2 Teams CMS — 27 template duplicates to delete

All 27 have IDs starting with `69c14004`, `69c14018`, or `69c1403f`. They are duplicates of people now represented by the 30 new docx-aligned items. The template had 5 people mis-categorised as "Administration" (Rebecca Bakhos, Elie Fadel, Cristina Fernandez, Lina Hammoud, Hanna Nassar) — those are actually Team Members.

Full ID list: `69c1403fd73231b959ec6fd7 69c1403fd73231b959ec6fd5 69c1403fd73231b959ec6fd3 69c1403fd73231b959ec6fd1 69c1403fd73231b959ec6fcf 69c14018fb18c6841edee402 69c14018fb18c6841edee400 69c14018fb18c6841edee3fe 69c14018fb18c6841edee3fc 69c14018fb18c6841edee3fa 69c14018fb18c6841edee3f8 69c14018fb18c6841edee3f6 69c14018fb18c6841edee3f4 69c14018fb18c6841edee3f2 69c14018fb18c6841edee3f0 69c14018fb18c6841edee3ee 69c14018fb18c6841edee3ec 69c14004018ce1f0782e50ad 69c14004018ce1f0782e50ab 69c14004018ce1f0782e50a9 69c14004018ce1f0782e50a7 69c14004018ce1f0782e50a5 69c14004018ce1f0782e50a3 69c14004018ce1f0782e50a1 69c14004018ce1f0782e509f 69c14004018ce1f0782e509d 69c14004018ce1f0782e509b`

### 0.3 News CMS — 4 placeholder items to delete

| ID | Name |
|---|---|
| `69bfd1659622a35a0bb721ef` | Beach Club Townhouses Featured in Dezeen |
| `69bfd1659622a35a0bb721ed` | Exploring Dubai's Vertical Living Revolution |
| `69bfd1659622a35a0bb721eb` | Dubai's Vertical Living: A New Architectural Trend |
| `69bfd1659622a35a0bb721e9` | Innovative Skyscraper Designs Transforming Dubai's Skyline |

### 0.4 Other collections with template scaffolding

- **Hero Slides** — 4 template items to remove (keep my 6 new taglines)
- **Awards** — 22 template items to review (keep my 2 + real awards from `nabilgholam.com`)
- **Publications** — 5 template items to remove (keep my "Works 2025" + seed real publications list)

These can be cleaned up when you do the content sourcing for §1 below.


---

## 1. Content not yet supplied

These sections are called out in the client docx but the actual content is
missing from the folder (`"List from actual website"`, `"Same as website"`,
or "waiting for photo"). Need to source from `nabilgholam.com` or re-ask the
client.

| Section | Current state | Action |
|---|---|---|
| Awards list | 2 seed items created (WAF Finalist for J House, LEED Gold for AUB IOEC) — the rest is missing | Scrape `nabilgholam.com` awards section and backfill the `🏆 Awards` CMS |
| International consultants | Docx says "Same as website: https://www.nabilgholam.com/about.consultants" | Scrape that URL → create `🌐 Consultants` items (currently only 18 collaborators seeded with blank country/service) |
| Collaborator country + service | 18 collaborator names seeded with blank `country` / `service` | Enrich each with country + service — needs client or manual lookup |
| Publications (except "Works 2025") | 1 seed item — "Works 2025" | Scrape or re-ask for the full monograph + works list |
| Greeting Cards | Intro paragraph supplied but no card items | Ask client for images/URLs for each year's card since 1997 |
| December 2025 Seville gathering photo | Docx says "Add 1 photos of the gathering in Beirut, waiting for the Seville photo" | Chase the Seville photo and add to the News hero slider |

## 2. Pages that don't exist

The live site has no page at these slugs. Create them in Designer (can't be
done via MCP/Data API — Designer required).

- **`/privacy`** — body is `Content/CONTENT-2/Privacy Policy - Terms and Conditions/PRIVACY POLICY.docx`, 13k chars. Long-form legal RichText — paste into a RichText element in Designer.
- **`/terms`** — body is `TERMS AND CONDITIONS.docx`, 6.8k chars. Same pattern.

Both likely want to sit under the footer alongside the existing Contact page.

## 3. Static page copy — needs Designer (companion app)

The Webflow Data API's `update_static_content` only supports **secondary
locales**, not the default locale. Updates to default-locale page text need
`element_tool.set_text`, which requires the Webflow Designer desktop app to
be open with the MCP companion running. Items below are ready to paste once
the Designer is open.

### 3.1 Publications page (`/publications`)

| Node ID | Field | Current text | New text (from docx) |
|---|---|---|---|
| `1f1f50fd-1cae-bffb-c989-7f63ae587c47` | Intro paragraph | "This section gathers a selection of publications..." | "Over three decades, we've documented our journey through carefully curated publications. These monographs capture not just buildings, but the ideas, contexts, and narratives that informed them—architecture as a continuous dialogue between place, memory, and future." |

### 3.2 Process page (`/process`)

**Values section — 5 values** (docx says 4, page has 5 × 3 copies of "Life / Simplicity / Serenity / Human-Centered / Lasting Impact"). Decide: docx wants 4 values:

1. "Where simplicity meets serenity"
2. "Human-centered design, lasting impact"
3. "Challenging formats, honoring scale"
4. "Efficient. Evolutionary. Lasting."

Current page rendering of 5-value cards doesn't map 1:1 to the docx. Needs a layout decision before text updates.

**Process steps section —** docx has 4 steps (Investigate, Design, Build, Live), page has 4 component instances labelled 01 Define / 02 Define / 03 Develop / 04 Delivery. Rename + update descriptions:

| Step | Title | Description |
|---|---|---|
| 01 | Investigate | Reading the landscape, defining opportunities. Exploring both the physical and intangible qualities. |
| 02 | Design | Translating vision into form. Creating a narrative linked to the site. Ecological sensitivity, adaptive systems. Shaping communities, connecting spaces. |
| 03 | Build | Guiding vision from ground to completion. Responding precisely and economically to market demands, ensuring unique solutions delivered within budget and on time. |
| 04 | Live | Building for lives, not just buildings. Spaces that breathe, adapt, improve quality of life at every occasion. |

### 3.3 Careers page (`/careers`)

Add a 1st card "Inspiring space" ahead of the current 3 ("meaningful work / creativity incentives / positive energy") — docx has 4 cards:

| # | Title | Text |
|---|---|---|
| 01 | Inspiring space | We strive to design spaces that foster community, promote inclusivity and celebrate the diversity of human experiences |
| 02 | Meaningful work | Aware of our role as catalysts, our design process prioritizes the needs of the clients while integrating the broader social and environmental impact of the project today and tomorrow. |
| 03 | Creativity incentives | We champion innovation, ensuring our architectural designs are always relevant and forward thinking |
| 04 | Team building | We cultivate a vibrant atmosphere, fueling creativity and passion in every project, ensuring our team thrives on innovation and inspiration |

Current page has cards 02/03/04 matching — add card 01 in Designer.

**Empty-state copy for Roles listing** (when no roles open):
> "While we don't have any job openings at the moment, you can still send us your resume, portfolio and a cover letter outlining your qualifications and career goals to jobs@nabilgholam.com in view of any future career openings. We look forward to hearing from you!"

### 3.4 News page (`/news`)

Add these static sections per the docx — current page is mostly CMS-driven:

- **Greeting cards intro** (needs a container in Designer, none exists yet):
  > "Since 1997, Nabil Gholam Architects has marked every New Year, Christmas, Ramadan, and Eid with a personal greeting. First in print, now in motion. What began as a small tradition has grown into a signature gesture: a moment each season to pause, connect, and wish our friends, clients, and collaborators well. The medium may have changed, but the intention never has."
- Add heading + intro blocks for Awards list and Publications list if the designer wants them on the News page (docx structure is ambiguous — Greeting Cards intro sits in the Publications docx section, but both Publications and News pages have `greeting-cards` elements; designer call).

### 3.5 Studio page (`/studio`)

- **Tagline** (first heading): "Architecture is a human endeavor." — already seems to be a component title, verify override.
- **Intro paragraph**: "The practice today comprises over sixty multinational professionals and a global network of engineers and consultants."
- **Section heading**: "Thirty years. One conviction."
- **Body**: "Thirty years is long enough to learn what you believe in, and to have tested those beliefs against projects of every scale and complexity; from private houses in Lebanon to urban planning across the Middle East, to work that now extends into Europe, the Americas, and the Far East."
- **Pull quote**: "Buildings are only as good as the lives they make possible" — currently in the page? Not visible in the element snapshot — needs a block built if absent.

### 3.6 Homepage (`/`)

Homepage is 100% component-instances — no raw text nodes at the top level. All edits need to happen inside the component editor in Designer. Content from docx:

- **About nga** paragraph:
  > "Throughout our work of the past 30 years we have learned that the subtle qualities of each project, sometimes physical, sometimes symbolic, most often complex reflective combinations of both require what we can broadly describe as a humanistic approach. In this way our designs offer buildings as simple and condensed distillations of the realities of the building program, site and inhabitants. Our efforts have continuously strived to improve the quality of people's lives by being aware of how and where they live in the dimensions of time and space."
- **Selected projects** (6 featured) — verify on homepage: Orise, Doha Oasis, Geode, The House with Two Lives (J House), Lagoon Mansion, Art Hub. Whether this is a hand-picked list or a CMS-driven "featured" switch is unclear — inspect Designer.

## 4. Schema gaps (Webflow collections)

Fixes needed to fully represent the client content:

- **Hero Slides collection** — add a `background-video` field (File or VideoLink). Currently only `background-image` (Image) exists; docx says "nature videos" for the 5 taglines. 6 Hero Slides items were created with tagline names only; the video (or image) slot needs populating per-item in Designer or an asset upload + assignment pass.
- **Teams schema doesn't include Previous Members** — 200+ previous team members exist on the Studio page as a static RichText block (`A — F`, `G — K`, `L — Q`, `R — Z`). These are already in the page as a single rich-text element. Options:
  - (a) Leave as-is (acceptable — current page already renders them)
  - (b) Add a new Option value `Previous Member` to Teams and bulk-import the ~200 names
  - **Recommended: (a)** — no action. If future filtering is needed, revisit.
- **New team photos without docx mention** — 2 team members have photos but aren't in the docx roster (see §6). Add to docx or discard.

## 5. Decisions needed — project year conflicts

Where folder-year and docx-year disagree. All 4 items were uploaded using the **folder year** as canonical. Confirm:

| Project | Folder year | Docx year | Uploaded as | Confirm? |
|---|---|---|---|---|
| Golden Tower | 2021 | 2016 | 2021 |  |
| The House with Two Lives — The Chapel | 2017 | 2014 | 2017 |  |
| Dalfa Seafront | 2016 | 2017 | 2016 |  |
| Doha Oasis | 2016 | 2020 | 2016 |  |

## 6. Team photo — unmatched names

36 photos live in `Team section/Team individual photos B&W/`. After fuzzy-matching against the Principals + Teams docx roster:

- **Docx roster names NOT in photos:** Nathalie Mahfoud, Wissam Sader, Georges Gemayel — 3 people missing headshots.
- **Photos NOT in docx roster:** Christopher Maalouf, Cynthia Gereige — 2 people without a docx entry (maybe new hires?).

Plus filename→docx name drift (fuzzy match handled these, but confirm):
- `Chika Kaludura BW for web.jpg` ↔ docx name `Chintaka Kaludura`
- `Nabil Alamuddine BW for web.jpg` ↔ docx name `Nabil Alameddine`
- `Mohammad El Zein BW for web.jpg` ↔ docx name `Mohamad El Zein`

## 7. Cross-category duplicate image sources

4 projects cross-listed between two category folders were collapsed into one CMS item. The image set used was whichever folder has more images:

| Project | Image source used | Alt source had |
|---|---|---|
| Pyrite (2020, Seoul) | `03-Residential/2020-PYRITE/` (13 imgs) | `06-Interior Design/2020-Pyrite/` (10 imgs) |
| Geode (2023, Dubai) | `06-Interior Design/2023-Geode/` (20 imgs) | `03-Residential/2023-Geode/` (8 imgs) |
| Nautile (2023, Dubai) | `06-Interior Design/2023-Nautile/` (19 imgs) | `03-Residential/2023-Nautile/` (6 imgs) |
| CMA-CGM HQ Refurbishment (2021, Beirut) | `05-Corporate/2021-CMA-CGM Headquarters refurbishment/` (12 imgs) | `06-Interior Design/2021 CMA-CGM refurbishment/` (10 imgs) |

If the alt source contains different/better images, manually upload extras and add to the CMS item's gallery fields.

## 8. Static page → Image element assignments (Designer)

Some page sections have image placeholders that need filling with assets from
the uploaded content manifest (`assets/content-manifest.json`). Per
[previous feedback](../.claude/projects/-Users-sanindo-nga-webflow-website/memory/feedback_asset_mcp_limitation.md),
REST-uploaded assets can't be assigned to static page image elements via
MCP — this must happen in Designer.

- **Studio page** — Office photos: 17 images in `Content/CONTENT-2/Office photos/` ready to be placed in the Studio page gallery (docx: "Selection of Studio photos – divided between Studio and Career sections")
- **Process page** — 7 images in `Content/CONTENT-2/PROCESS-photos/` for the 4-step section
- **Studio page team group photos** — 5 images in `Content/CONTENT-2/Team section/Team group photos/`
- **Careers page** — split of Office photos per docx note
- **Inspiration photos folder** — 46 images, not referenced in any docx. **Decide: discard, or assign somewhere?**

## 9. Project area text — markup fidelity

Projects `area` field is RichText. The ingestion wraps the area block in a
single `<p>` with `<br>` separators. A few projects have multi-paragraph area
blocks (e.g. AUB IOEC: "educational, laboratory building / 6 floors, 10000
m² / 2 basements, 6000 m²") that may render better as separate paragraphs.
Visual QA in Designer preview, adjust if needed.

## 10. Known-bad local scripts (separate from content)

Ran into these while working — not blockers for the current task but worth cleaning up:

- `scripts/api/webflow/parse-copy.js` — fails with `ReferenceError: require is not defined in ES module scope` because package.json has `"type": "module"` but the script uses CJS. Rename to `.cjs` or port to ESM.
- `scripts/api/lib/webflow-client.js`, `scripts/api/lib/manifest.js`, `scripts/api/webflow/upload-assets.js`, `scripts/api/webflow/update-metadata.js`, `scripts/api/webflow/update-seo.js` — same issue. The new `*.mjs` scripts I added work around this.

## 11. Publish

All CMS items created this pass are saved as **drafts**. Nothing is published
yet. When the review above is done and the Designer work (§3, §8) complete:

1. Verify everything in Webflow Editor
2. Run `publish_collection_items` per collection (API) or bulk-publish in Editor
3. `sites_publish` the whole site — use the `webflow-skills:safe-publish` skill

## 12. Post-ingest enhancements — finalisation plan

Audited 2026-04-27. State of the two skill passes called out at ingest time:

### 12.1 SEO — mostly done, one bug

All 8 static pages already have SEO titles + descriptions (Home, Works, News,
Studio, Process, Careers, Contact, Publications). Both CMS templates (Works,
News) bind SEO from CMS fields. Works (46 items, see `assets/works-seo-patched.json`)
and News (6 items, see `assets/news-seo-patched.json`) CMS items are SEO-patched.

**Bug to fix:** `/works` page SEO description is a copy of the `/news` description
("Latest news, awards, lectures, and publications…"). Needs a Works-specific
description before publish.

**Still missing:**
- `/privacy` and `/privacy-policy-and-terms-of-service` style routes — see §2 (page doesn't exist yet, Designer required to create).
- `/terms` — same.

### 12.2 Asset metadata — the remaining big task

`assets/content-manifest.json` shows **722 content assets** uploaded via REST
on 2026-04-23. None have alt text or clean display names — they shipped with
raw filenames (`751_PA~1.jpg`, `JO-COURT.jpg`, `BW for web.jpg`, etc.). On
top of that, ~few hundred original Relume template + Figma export assets to
audit (the Figma exports already have alt text in `assets/asset-manifest.json`,
but verify it was applied to Webflow).

**Proposed three-pass plan (run in order, stop after any pass):**

1. **Audit pass (free).** List every Webflow asset, bucket by:
   - (a) missing alt text
   - (b) ugly auto-filename display name (regex `[A-Z]{2,}[0-9]+`, `~`, `IMG_`, etc.)
   - (c) already clean
   Output a JSON report under `assets/asset-audit-<date>.json` so the count is
   visible before any vision calls fire.
2. **Vision pass (paid).** Run `/asset-metadata` on buckets (a) + (b). Per
   `feedback_alt_text_prompt.md`: under 200 chars, functional, not decorative.
   Generates clean display names too. Batched with MD5 dedup. Estimate
   ~$5–10 in Claude vision API + ~45 min wall time for ~700 assets.
3. **Works SEO bug fix.** Rewrite `/works` page SEO description, re-publish
   page metadata via `data_pages_tool.update_page_metadata`.

After all three passes, log residual gaps below into a "Designer session"
checklist and run `webflow-skills:safe-publish`.

### 12.3 Designer-only items still pending (companion app required)

These are blocked on having Webflow Designer + companion app open — the
Data API can't reach them. Not blocked by the asset/SEO passes:

- §2: Create `/privacy` and `/terms` pages (paste docx body into RichText element).
- §3.1: Publications page intro paragraph swap.
- §3.2: Process page values (5→4 decision) + 4 process steps text rewrite.
- §3.3: Careers page — add card #01 "Inspiring space"; update empty-state copy.
- §3.4: News page — Greeting Cards intro block.
- §3.5: Studio page — tagline / intro / "Thirty years…" body / pull quote.
- §3.6: Homepage — `About nga` paragraph inside component instance.
- §8: Static page image-element assignments (Studio office photos, Process step photos, Studio team group photos, Careers split).

### 12.4 Notes

- Review Urban Design doc wording — folder says "urban planning" but the Category is `Urban Design`. All items mapped correctly to the `Urban Design` category via folder prefix; docx label ignored.
