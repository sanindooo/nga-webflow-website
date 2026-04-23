# Content Map

One-off audit of `Content/` folder against the live Webflow site. Maps every
source file to a destination (static page, CMS collection, asset library) and
flags MCP-writability + gaps that need manual Designer work.

- **Source tree:** `Content/CONTENT-2/` (canonical — supersedes `Content/CONTENT/`)
- **CONTENT-2 differences:** adds every `.docx` + extends several category folders. CONTENT retains some image-only project folders that CONTENT-2 has emptied (see [§Asset gaps](#asset-gaps-content-only-folders))
- **Parsed on:** 2026-04-23
- **Docx files:** 48 total | **Project docx:** 51 (some cross-listed) | **Images:** ~757
- **Read-only audit** — no Webflow changes were made.

## Writability legend

| Symbol | Meaning |
|---|---|
| ✅ | Fully writable via Webflow MCP or Data API |
| ⚠️ | Partially writable — specific nested content must be edited manually in Designer |
| ❌ | Not writable via MCP — manual Designer work required |

---

## 1. Projects CMS (`🏗️ Works`) — batch-uploadable

Collection ID `69bfbc30efadacd9ad9e3d7a` | Template `/works/{slug}` (page `69bfbc30efadacd9ad9e3d80`)

**Schema fit:** project docx files have a uniform header (`Name → Category → Location → Area → Year → Body → Team → Awards`) matching CMS fields 1:1 except `Team` and `Awards` are not on the Projects schema (Awards is its own collection).

**Per-project mapping:** every docx becomes one CMS item. Images in the same folder fill `hero-image` + `image-1..image-12` (layout/alignment per image defaulted; tune in Designer). `description` RichText receives the body paragraphs. `area` RichText receives the multi-line area block.

**Writability:** ✅ `name`, `slug`, `year`, `city`, `country-2`, `primary-category`, `category`, `description`, `area`, `hero-image`, `image-*` — all API writable.

### 1.1 Dependencies to seed before batch upload

1. **Add 11 missing Countries** to `Countries` collection (only Lebanon + UAE seeded):
   France, Jordan, Kuwait, Montenegro, Qatar, Saudi Arabia, South Korea, Turkey, United Kingdom, United States of America.
   *(2 projects have no country — use Arabian Peninsula placeholder or leave null: Fish Market, Regenerative Dome.)*
2. **Normalize the Urban Design docx category** — docs say `urban planning`, CMS Category is `Urban Design`. Ignore the docx value; use folder prefix (`01-URBAN DESIGN` → `Urban Design`) for mapping.
3. **Confirm year conflicts** between folder year and docx year (see [§Year conflicts](#year-conflicts)).

### 1.2 Project batch (51 items, 4 duplicated across categories → 47 unique)

| Folder (category) | Name | Slug (suggested) | Year (folder/docx) | City | Country | Body chars | Has team? | Has awards? | Images in folder | Notes |
|---|---|---|---|---|---|---|---|---|---|---|
| 01-URBAN DESIGN / 2000-JABAL OMAR | jabal omar | `jabal-omar` | 2000 | mecca | saudi arabia | 414 | ✓ | — | **0** (6 in CONTENT) | Asset gap ↓ |
| 01-URBAN DESIGN / 2005-DOHA GARDENS | doha gardens | `doha-gardens` | 2005 | al khobar | saudi arabia | 2287 | — | ✓ | 5 | — |
| 01-URBAN DESIGN / 2010-CLOUDS | clouds | `clouds` | 2010 | faqra | lebanon | 549 | ✓ | — | 5 | — |
| 01-URBAN DESIGN / 2013-ALMOST INVISIBLE RESORT | almost invisible resort | `almost-invisible-resort` | 2013 | bodrum | turkey | 1654 | ✓ | ✓ | 11 | — |
| 01-URBAN DESIGN / 2017-BRAMIEH VILLAGE | bramieh village I and II | `bramieh-village` | 2017 | bramieh | lebanon | 1391 | — | — | 9 | Two phases in one item |
| 01-URBAN DESIGN / 2019-REGENERATIVE DOME | regenerative dome | `regenerative-dome` | 2019 | arabian peninsula | *(none)* | 1593 | — | — | **0** (5 in CONTENT) | Asset gap ↓; no country |
| 01-URBAN DESIGN / 2019-SEAFRONT ENTERTAINMENT CENTER | seafront entertainment center | `seafront-entertainment-center` | 2019 | al khobar | saudi arabia | 1304 | — | — | **0** (7 in CONTENT) | Asset gap ↓ |
| 01-URBAN DESIGN / 2019-TIVAT HOTEL AND BEACH RESORT | tivat hotel and beach resort | `tivat-hotel-and-beach-resort` | 2019 | tivat | montenegro | 1311 | — | — | 12 | — |
| 01-URBAN DESIGN / 2022-AL ZORAH SHORES | al zorah shores | `al-zorah-shores` | 2022 | ajman | united arab emirates | 1332 | — | — | 1 | Single image only — sparse |
| 02-High-Rise / 2009-Platinum Tower | platinum tower | `platinum-tower` | 2009 | beirut | lebanon | 2671 | ✓ | — | 15 | — |
| 02-High-Rise / 2015-Skygate | skygate | `skygate` | 2015 | beirut | lebanon | 1300 | ✓ | — | 8 | — |
| 02-High-Rise / 2016-Hessah al Mubarak | hessah al mubarak | `hessah-al-mubarak` | 2016 | kuwait city | kuwait | 1524 | — | — | 11 | — |
| 02-High-Rise / 2021-Golden Tower | golden tower | `golden-tower` | **2021/2016** | jeddah | saudi arabia | 1850 | ✓ | — | 11 | Year conflict ↓ |
| 02-High-Rise / 2022-Tour de Nice | tour de nice | `tour-de-nice` | 2022 | nice | france | 1574 | — | — | 13 | — |
| 02-High-Rise / 2024-Orise | orise | `orise` | 2024 | dubai | united arab emirates | 959 | — | — | 13 | — |
| 02-High-Rise / 2025-Echo | echo | `echo` | 2025 | dubai | united arab emirates | 1990 | — | — | 14 | — |
| 02-High-Rise / 2025-Trilliant | trilliant | `trilliant` | 2025 | dubai | united arab emirates | 2094 | — | — | 11 | — |
| 03-Residential / 2004-F HOUSE | f house | `f-house` | 2004 | Dahr el sawan | lebanon | 1712 | ✓ | — | 25 | Most images |
| 03-Residential / 2010-FOCH 94 | foch 94 | `foch-94` | 2010 | beirut central district | lebanon | 1024 | ✓ | — | 13 | — |
| 03-Residential / 2015-AZ HOUSE | az house | `az-house` | 2015 | adma | lebanon | 1355 | ✓ | ✓ | 15 | — |
| 03-Residential / 2016-AY HOUSE | ay house | `ay-house` | 2016 | yarze | lebanon | 1390 | ✓ | — | 11 | Has PDF |
| 03-Residential / 2017-THE HOUSE WITH TWO LIVES | the house with two lives | `the-house-with-two-lives` | 2017 | Bois de boulogne | lebanon | 1690 | ✓ | — | 23 | — |
| 03-Residential / 2017-THE HOUSE WITH TWO LIVES CHAPEL | the house with two lives — the chapel | `the-house-with-two-lives-the-chapel` | **2017/2014** | Bois de boulogne | lebanon | 1150 | — | — | 8 | Year conflict ↓; companion project |
| 03-Residential / 2020-PYRITE | pyrite | `pyrite` | 2020 | seoul | south korea | 974 | ✓ | — | 13 | Cross-listed ↓ |
| 03-Residential / 2022-Beach Club Villas | beach club villas | `beach-club-villas` | 2022 | dubai | united arab emirates | 1375 | ✓ | — | 10 | — |
| 03-Residential / 2022-BUYUT | buyut | `buyut` | 2022 | al ula | saudi arabia | 1693 | — | — | 7 | "Kingdom of Saudi Arabia" → normalize |
| 03-Residential / 2023-Geode | geode | `geode` | 2023 | dubai | united arab emirates | 705 | — | — | 8 | Cross-listed ↓ |
| 03-Residential / 2023-Lagoon Mansion | lagoon mansion | `lagoon-mansion` | 2023 | dubai | united arab emirates | 1507 | — | — | 16 | — |
| 03-Residential / 2023-MV 33 | mv 33 | `mv-33` | 2023 | dubai | united arab emirates | 928 | — | — | 13 | — |
| 03-Residential / 2023-Nautile | nautile | `nautile` | 2023 | dubai | united arab emirates | 853 | — | — | 6 | Cross-listed ↓ |
| 03-Residential / 21-YM HOUSE | ym house | `ym-house` | 2021 | deir el qamar | lebanon | 1653 | — | — | 11 | Folder mis-prefixed `21-` → rename `2021-` |
| 04-Mixed-Use / 2009-Kempinski Hotel | kempinski aqaba | `kempinski-aqaba` | 2009 | aqaba | jordan | 1920 | ✓ | — | 7 | — |
| 04-Mixed-Use / 2016-Dalfa Seafront | dalfa seafront | `dalfa-seafront` | **2016/2017** | beirut | lebanon | 1602 | ✓ | — | 9 | Year conflict ↓ |
| 04-Mixed-Use / 2016-Doha Oasis | doha oasis | `doha-oasis` | **2016/2020** | doha | qatar | 830 | ✓ | — | 9 | Year conflict ↓ |
| 04-Mixed-Use / 2019-Fish Market | fish market | `fish-market` | 2019 | arabian peninsula | *(none)* | 936 | — | — | 9 | No country in doc |
| 04-Mixed-Use / 2021-Serenity Beach Club | serenity beach club | `serenity-beach-club` | 2021 | dubai | united arab emirates | 608 | — | — | 10 | Shortest body |
| 04-Mixed-Use / 2023-Art Hub | art hub | `art-hub` | 2023 | beirut | lebanon | 1182 | — | — | 17 | — |
| 05-Corporate and Institutional / 2011-CMA-CGM Headquarters | cma-cgm headquarters | `cma-cgm-headquarters` | 2011 | beirut | lebanon | 2233 | — | — | 14 | — |
| 05-Corporate and Institutional / 2014-AUB IOEC Engineering Labs | aub ioec engineering laboratories | `aub-ioec-engineering-laboratories` | 2014 | beirut | lebanon | 3660 | ✓ | ✓ | 24 | LEED Gold |
| 05-Corporate and Institutional / 2018-Lots Road | 78-89 lots road | `78-89-lots-road` | 2018 | chelsea, london | united kingdom | 1437 | — | — | 8 | — |
| 05-Corporate and Institutional / 2019-AUB Faculty of Arts and Science | faculty of arts and science | `aub-faculty-of-arts-and-science` | 2019 | beirut | lebanon | 1785 | ✓ | — | 18 | — |
| 05-Corporate and Institutional / 2019-Saifi Plaza | saifi plaza | `saifi-plaza` | 2019 | beirut | lebanon | 2685 | ✓ | — | 14 | — |
| 05-Corporate and Institutional / 2021-CMA-CGM Headquarters refurbishment | cma-cgm headquarters refurbishment | `cma-cgm-headquarters-refurbishment` | 2021 | beirut | lebanon | 1275 | ✓ | — | 12 | Cross-listed ↓ |
| 06-Interior Design / 2012-nga office | nga office | `nga-office` | 2012 | beirut | lebanon | 891 | ✓ | — | 17 | Has PDF |
| 06-Interior Design / 2020-Pyrite | *(duplicate)* | — | 2020 | seoul | south korea | 974 | ✓ | — | 10 | **Duplicate of 03-Residential/2020-PYRITE** |
| 06-Interior Design / 2021 CMA-CGM refurbishment | *(duplicate)* | — | 2021 | beirut | lebanon | 1275 | ✓ | — | 10 | **Duplicate of 05-Corporate/2021-CMA-CGM Refurbishment** |
| 06-Interior Design / 2021-Lot 114 | lot 114 | `lot-114` | 2021 | beirut | lebanon | 1541 | — | — | 8 | — |
| 06-Interior Design / 2021-Zeebox Guadeloupe | zebox guadeloupe | `zebox-guadeloupe` | 2021 | guadeloupe | france | 1244 | — | — | 10 | — |
| 06-Interior Design / 2021-Zeebox Washington | zebox washington | `zebox-washington` | 2021 | washington D.C. | united states of america | 1308 | ✓ | — | 10 | — |
| 06-Interior Design / 2023-Geode | *(duplicate)* | — | 2023 | dubai | united arab emirates | 705 | — | — | 20 | **Duplicate of 03-Residential/2023-Geode** — 06 has more images |
| 06-Interior Design / 2023-Nautile | *(duplicate)* | — | 2023 | dubai | united arab emirates | 853 | — | — | 19 | **Duplicate of 03-Residential/2023-Nautile** — 06 has more images |

**Total unique projects:** 47 (after collapsing 4 cross-category duplicates).

### 1.3 Cross-category projects — use `primary-category` + multi-ref `category`

| Project | Primary | Also in | Image source preference |
|---|---|---|---|
| Pyrite (2020, Seoul) | Residential | Residential, Interior Design | 03-Residential/ (13 imgs) + 06-Interior Design/ (10 imgs) — merge or pick |
| Geode (2023, Dubai) | Residential | Residential, Interior Design | 06-Interior Design/ (20 imgs) > 03-Residential/ (8 imgs) |
| Nautile (2023, Dubai) | Residential | Residential, Interior Design | 06-Interior Design/ (19 imgs) > 03-Residential/ (6 imgs) |
| CMA-CGM Refurbishment (2021, Beirut) | Corporate & Institutional | Corporate & Institutional, Interior Design | 05-Corporate/ (12 imgs) + 06-Interior Design/ (10 imgs) — merge or pick |

**Decision needed:** for each duplicate, which folder is canonical for images, and does the body text differ between the two copies? (Byte-identical docx suspected but not verified.)

### 1.4 Year conflicts (folder vs docx)

| Project | Folder year | Docx year | Likely canonical |
|---|---|---|---|
| Golden Tower | 2021 | 2016 | Docx (2016) — folder probably "shipped" year |
| The House With Two Lives — Chapel | 2017 | 2014 | Unsure — chapel is companion project, may predate |
| Dalfa Seafront | 2016 | 2017 | Unsure |
| Doha Oasis | 2016 | 2020 | 2020 likely = Doha Quest opening — flag |

### 1.5 Asset gaps (CONTENT-only folders)

These project folders in `CONTENT-2` have **no images** (only docx). The older `CONTENT/` folder has images for them — pull from there before upload:

| Project | Images in CONTENT/ | Has PDF |
|---|---|---|
| 2000-JABAL OMAR | 6 jpg | — |
| 2019-REGENERATIVE DOME | 5 jpg | 1 pdf |
| 2019-SEAFRONT ENTERTAINMENT CENTER | 7 jpg | 1 pdf |

**Also:** 5 projects have PDFs (drawings/plans) that are **not upload-ready** for image fields — flag for manual review or conversion to raster.

---

## 2. News CMS (`📰 News`)

Collection ID `69bfd12acb21ae530fc28b7a` | Source: `NEWS/News for website with tags.docx` + dated images

**Writability:** ✅ all fields (name, slug, publication-date, summary, body, news-category-2, hero-image, hero-slider) are API writable.

### 2.1 Dependency to seed

**Add News Category:** currently only `Publications` + `Lectures/Awards` exist. The docx uses tags `latest news` and `awards` — need to add a `Latest News` category (or rename/retag).

### 2.2 News items (5)

| Pub date | Name | Tag | Hero image in NEWS/ | Body chars | Linked project |
|---|---|---|---|---|---|
| 2026-04 | Archello Awards 2026 | awards | `Avril 2026-Archello.png` | ~340 | — |
| 2026-04 | VAND Design awards submission (J House) | awards | `Avril 2026 - VAND design awards.png` | ~690 | → The House with Two Lives |
| 2025-12 | End of year gathering — Seville & Beirut | latest news | `December 2025 Beirut .jpeg` (Seville photo pending) | ~140 | — |
| 2025-12 | Publication of Works 2025 | latest news | `December 2025- Works.jpeg` | ~320 | → Publications item (to create) |
| 2023-11 | Completion of Pyrite, Seoul | latest news | `November 2023-Pyrite.jpg` | ~90 | → Pyrite |
| 2021-08 | Reviving Beirut — CMA CGM rehabilitation | latest news | `August 2021-CMA-CGM Headquarters.jpg` | ~300 | → CMA-CGM HQ Refurbishment |

**News category rename needed:** `Lectures/Awards` → either `Awards` (matching docx tag) or add separate `Latest News`. Ask user which.

---

## 3. Static page content — `2026 04 21 Text for website.docx`

Master copy doc covering 5 pages. Each page section calls out existing Webflow pages from `webflow-ids.md`. Routing per section:

### 3.1 Homepage (`/` — `69be96492fedf40043823625`)

| Section | Content | Target | Writability |
|---|---|---|---|
| Hero tag lines (5) | Rotating nature-video taglines | `🏞️ Hero Slides` CMS (5 items, `name` field) + hero videos as `background-image` (or new video field) | ⚠️ CMS writable, but collection only has `background-image` (Image). **Schema gap: needs `background-video` field** if videos are the primary asset. |
| Selected projects (6) | Orise, Doha Oasis, Geode, J House, Lagoon Mansions, Arthub | Homepage element — list of 6 featured-project refs | ❌ Unknown — depends on how homepage selects featured projects (static refs vs CMS-driven). Needs Designer inspection of `/` element tree. |
| Typologies | List of 6 typologies (empty in doc — present in CMS) | Homepage element referencing `🗂️ Works Categories` | ✅ (CMS already seeded) |
| About nga body | 1-paragraph intro | Heading + paragraph element on Home | ✅ `element_tool → set_text` |

### 3.2 Studio (`/studio` — `69c12e24e452f2d60c26e390`)

| Section | Content | Target | Writability |
|---|---|---|---|
| Tagline | "Architecture is a human endeavor." | Heading element | ✅ |
| Intro | Multinational professionals... | Paragraph element | ✅ |
| "Thirty years. One conviction." | Heading + paragraph | Heading + paragraph elements | ✅ |
| Quote | "Buildings are only as good as the lives they make possible" | Quote/blockquote element | ⚠️ If in RichText container → manual |
| Studio photos | From `Office photos/` (17 imgs) | Studio page image gallery **or** asset library only | ❓ Depends on Studio page element types |
| Principal & Associates | *See §4 — Team section docx, not this doc* | `👤 Principals` CMS | ✅ (see §4) |
| Team leaders / members / admin | *See §4* | `👥 Teams` CMS | ✅ |

### 3.3 Process (`/process` — `69d4e99d0e507f6703893845`)

| Section | Content | Target | Writability |
|---|---|---|---|
| Tagline | "We design for the lives that follow" | Heading | ✅ |
| Intro | People-focused... | Paragraph | ✅ |
| Values (4 lines) | Simplicity, Human-centered, Challenging, Efficient | 4 value cards (component or static rows) | ⚠️ If rendered from RichText → manual; if from repeating static elements → ✅ |
| 4 process steps | Investigate, Design, Build, Live | 4 step cards — each with heading + description | ⚠️ Same caveat |
| Process photos | `PROCESS-photos/` (7 imgs) | Process page gallery or asset library | ❓ Depends on page structure |
| Design the next chapter | CTA block | CTA element | ✅ |
| Contact us | CTA block | CTA element | ✅ |

### 3.4 Careers (`/careers` — `69c24b520f3d2be7ca7c8913`)

| Section | Content | Target | Writability |
|---|---|---|---|
| Hero | "Design that begins with people." + 2-line body | Heading + paragraph | ✅ |
| Roles | Dynamic listing OR empty-state message | `🏷️ Roles` CMS + empty-state text element | ✅ (CMS + text both writable) |
| Why work with nga (4 cards) | Inspiring space, Meaningful work, Creativity incentives, Team building | 4 feature cards | ⚠️ May need manual if in RichText |

### 3.5 Publications (`/publications` — `69c21239ceda88e219f10845`)

| Section | Content | Target | Writability |
|---|---|---|---|
| Intro text | "Over three decades..." | Paragraph | ✅ |
| Publication items | "List from actual website" — **missing** | `📢 Publications` CMS | ❌ Content missing — need to scrape `nabilgholam.com/publications` or source from client |

### 3.6 News page static content (`/news` — `69c241645ede223c3c61eed1`)

| Section | Content | Target | Writability |
|---|---|---|---|
| Awards list | "List from actual website" — **missing** | `🏆 Awards` CMS | ❌ Content missing — scrape `nabilgholam.com` |
| Greeting cards intro | "Since 1997..." paragraph | Paragraph element on News page | ✅ |
| Greeting card items | Not in doc | `💳 Greeting Cards` CMS | ❌ Content missing |

---

## 4. Team section (`/studio` page)

Source: `Team section/2026 03 31 Team section.docx` + `Team section/2026 03 02 Previous team members.docx` + photo folders.

### 4.1 Principals & Associates → `👤 Principals` CMS

Collection ID `69c13d17a4363aea1815b371` | 6 people with bios + B&W photos

| # | Name | Title | Email | Photo source |
|---|---|---|---|---|
| 1 | Nabil Gholam | Principal, Founder | — | `Team individual photos B&W/` |
| 2 | Georges Nasrallah | Managing and Technical Director | gnasrallah@nabilgholam.com | same |
| 3 | Richard Saad | Director of Design | rsaad@nabilgholam.com | same |
| 4 | Rania Moujahed | Head of Administration | rmoujahed@nabilgholam.com | same |
| 5 | Mona Saikali | Senior Lead Architect | msaikali@nabilgholam.com | same |
| 6 | Georges Hakim | Head of Development and Production | ghakim@nabilgholam.com | same |

**Writability:** ✅ name, title, email, description (RichText), photo, sort-order — all API writable. Photos must be uploaded via `upload-assets` first, then assigned by asset URL.

**Manual cross-reference needed:** match 36 B&W photos to names (filename ≠ person name).

### 4.2 Team Leaders / Members / Administration → `👥 Teams` CMS

Collection ID `69c13d1707bd300137cddff1` | Option field `category`: Team Leader | Team Member | Administration

| Category (Option) | Count | Names (docx excerpt) | Role source |
|---|---|---|---|
| Team Leader | 11 | Daniel Perez, Raffy Doulian, Youssef Nour, Nathalie Mahfoud, Joseph Fadel, Hector Salcedo, Maroun Gédéon, Isabel Pablo Romero, Ismael Páez, Nicole Rossi, Joumana Arida | Roles from docx — create `🏷️ Roles` items if missing |
| Team Member | 12 | Rebecca Bakhos, Elie Fadel, Cristina Fernández, Lina Hammoud, Hanna Nassar, François Nour, Pilar Patricio García, Maribel Seif, Aya Sleiman, Hassan Ghamloush, Wissam Sader, Mohamad El Zein | same |
| Administration | 7 | Rasha Fakhoury, Carme Raventos, Elie Hachem, Georges Gemayel, Nabil Alameddine, Marwan Khabbaz, Chintaka Kaludura | same |

**Writability:** ✅ all fields API writable.

**Missing photos:** docx says "B&W photos that appears when you hover" — all 30 team members need headshots. `Team individual photos B&W/` has 36 files; need to match.

### 4.3 Legal Partners → `⚖️ Legal Partners` CMS

| # | Name | Role |
|---|---|---|
| 1 | Alem & Associates | Lawyer |
| 2 | Semaan Gholam & co | Auditor |
| 3 | Fadi Chedid | Consultant - Tax Advisor |

**Writability:** ✅

### 4.4 Collaborators → `🌐 Consultants` CMS

Collection ID `69c13d1a722721b63cae60f3` | Fields: name, country, service, sort-order

**Collaborators list (18):** John Abarca López, Ayssar Arida, Ali Basbous, Guillaume Credoz, Scott Dimit, Mazen el Khatib, Ziad Jamaleddine, Walid Kanj, Gokhan Karakus, Gregorio Medina Marañon, Roula Mouharram, Andrei Pakhomov, Wyssem Noshie, Warren Singh-Bartlett, Naji Sleiman, Ebru Tabak, Nicolas Veron, Eduardo Wachs.

**Writability:** ✅ but country/service data is missing — docx only has names. Flag as manual enrichment.

**International consultants:** docx says `Same as website: https://www.nabilgholam.com/about.consultants` — ❌ Content missing, scrape from live site.

### 4.5 Previous team members (Studio page — historical list)

~200 names in `Team section/2026 03 02 Previous team members.docx`, grouped A-F / G-K / L-Q / R-Z.

**Target:** no existing CMS. Options:
- (a) Add as a static rich-text block on Studio page — ❌ MCP can't write nested RichText styling
- (b) Extend `👥 Teams` with new Option `Previous Member` and bulk-import — ✅ API writable
- (c) New `📦 Previous Team Members` plaintext collection — ✅ cleaner for filtering

**Decision needed.**

---

## 5. Static pages — standalone docs

### 5.1 Privacy Policy → new `/privacy` page

Source: `Privacy Policy - Terms and Conditions/PRIVACY POLICY.docx` (13143 chars, dated 2026-04-22)

- **Target page:** does not exist in `webflow-ids.md`. **Gap: need to create `/privacy` page.**
- **Writability:** ⚠️ Once the page exists, the body is a long RichText document — MCP cannot write nested H2/H3/paragraph/list styling inside a RichText container. **Manual Designer paste.**

### 5.2 Terms & Conditions → new `/terms` page

Source: `Privacy Policy - Terms and Conditions/TERMS AND CONDITIONS.docx` (6844 chars)

Same as Privacy — page missing, RichText body needs manual Designer paste. ❌

---

## 6. Asset-library-only content

Folders that are pure image sources, not tied to a specific page section:

| Folder | Count | Purpose | Target |
|---|---|---|---|
| `Office photos/` | 17 | Studio page images (per homepage doc: "Selection of Studio photos – divided between Studio and Career sections") | Webflow asset library (via `upload-assets`) + used on `/studio` + `/careers` |
| `Inspiration photos/` | 46 | Not referenced in any doc — discard? | Unknown — ask user |
| `PROCESS-photos/` | 7 | Process page (per doc: "refer to the folder 'Process photos' for the images...") | Asset library + used on `/process` |
| `Team section/Team group photos/` | 5 | Studio page team group shots | Asset library + used on `/studio` |
| `Team section/Team individual photos B&W/` | 36 | Principals + Teams CMS photo fields | Asset library + CMS photo references |

**Writability:** ✅ all images are uploadable via `pnpm run upload-assets`. Assignment to CMS items ✅. Assignment to static-page image elements ⚠️ (REST-uploaded assets can't be set via MCP Designer tools — [per memory](../.claude/projects/-Users-sanindo-nga-webflow-website/memory/feedback_asset_mcp_limitation.md) — flag manual for static page assignments).

---

## 7. Schema + page gaps summary

Things to fix/create **before** ingestion can run end-to-end:

1. **New pages needed:** `/privacy`, `/terms`
2. **New Countries needed** (11): France, Jordan, Kuwait, Montenegro, Qatar, Saudi Arabia, South Korea, Turkey, United Kingdom, United States of America, *(optional)* Arabian Peninsula placeholder
3. **News Categories:** add `Latest News` (or rename `Lectures/Awards` to match docx tags `awards` / `latest news`)
4. **Hero Slides schema:** add `background-video` field if homepage tagline section uses videos instead of images
5. **Awards CMS:** source the award list from `nabilgholam.com` — docx says "list from actual website" (not provided)
6. **Publications CMS:** same — source from live site
7. **Greeting Cards CMS:** no data in content folder
8. **International Consultants:** same — scrape from `nabilgholam.com/about.consultants`
9. **Previous Team Members:** pick strategy (a/b/c in §4.5)
10. **Folder rename:** `Content/CONTENT-2/03-Residential/21-YM HOUSE` → `2021-YM HOUSE`
11. **Year conflicts:** resolve 4 projects where folder year differs from docx year
12. **Image backfill:** merge `CONTENT/01-URBAN DESIGN/` images into `CONTENT-2/01-URBAN DESIGN/` for Jabal Omar, Regenerative Dome, Seafront Entertainment Center

## 8. MCP writability summary by destination

| Target | Writable | Notes |
|---|---|---|
| `🏗️ Works` CMS items (all fields incl. RichText `description`, `area`) | ✅ | RichText field content is writable via API; only nested styling inside rendered RichText *elements on pages* is not |
| `📰 News` CMS items | ✅ | Same |
| `👤 Principals`, `👥 Teams`, `🏆 Awards`, `⚖️ Legal Partners`, `🌐 Consultants`, `🏷️ Roles`, `📢 Publications`, `💳 Greeting Cards`, `🗂️ Works Categories`, `📰 News Categories`, `🏞️ Hero Slides`, `Countries` | ✅ | All schemas API-writable |
| Asset uploads (images) | ✅ | `pnpm run upload-assets` |
| Alt text + asset display names | ✅ | `/asset-metadata` skill |
| Page-level plain headings/paragraphs (Hero, CTA, intro text) | ✅ | `element_tool → set_text` |
| Page-level RichText containers (long-form body on Privacy/Terms, multi-paragraph Studio quote) | ❌ | Manual Designer paste |
| Component variants with styled children (value cards, process-step cards) | ⚠️ | ✅ if rendered from repeating static elements; ❌ if single RichText container |
| CMS RichText field content on static pages (e.g. `description` rendered on `/works/{slug}` template) | ⚠️ | Field is writable; rendering inherits template styling, so verify template handles H2/H3/lists |
| Assigning REST-uploaded assets to static-page Image elements via MCP | ❌ | Flag as manual |

## 9. Suggested ingestion order

Based on dependency order + writability:

1. **Prep phase (manual or skill-driven):**
   - Rename `21-YM HOUSE` folder
   - Merge CONTENT images for 3 URBAN DESIGN projects
   - Resolve 4 year conflicts (ask client)
   - Decide Previous Team Members strategy
   - Create `/privacy` + `/terms` pages in Designer
2. **Seed reference data (API):** add 11 Countries, add News Category `Latest News` (or retag)
3. **Upload assets:** `pnpm run upload-assets` on all image folders → manifest
4. **Projects CMS batch:** 47 unique items via `/upload-copy` (or direct `data_cms_tool`) — creates items with body + area + hero + up to 12 images each
5. **Team CMSes:** Principals (6), Teams (30), Legal Partners (3), Consultants (18 w/ blank country/service)
6. **News CMS:** 6 items
7. **Static page copy:** `/studio`, `/process`, `/careers`, `/news` (intro text only — not the awards/greeting sections) via `element_tool → set_text`
8. **Manual Designer passes:**
   - Privacy + Terms page RichText bodies
   - Awards list, Publications list, Greeting Cards, International Consultants (source missing)
   - Hero video assignment on Homepage
   - Studio/Process/Careers RichText card variants if they turn out to be styled-inner-element components
9. **Post-ingest:** `/asset-metadata` for alt text, `/update-seo` per page + per CMS item
