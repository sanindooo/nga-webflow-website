---
title: Add Press Content to News CMS Collection
type: feat
status: completed
date: 2026-05-02
---

# Add Press Content to News CMS Collection

Upload 12 remaining press PDFs and create News CMS items under the Press category with SEO metadata.

## Context

- **Source document:** `content/press/2026 04 30 -Press section.docx`
- **PDFs location:** `content/press/` (13 files total)
- **Already uploaded:** Item 01 (Taste and Flair magazine, 2019) - CMS ID `69f4ce86d8d8aea5cc72ef3c`
- **Remaining:** Items 02-13 (12 PDFs)

## CMS Configuration

| Field | Value |
|-------|-------|
| Collection | News (`69bfd12acb21ae530fc28b7a`) |
| Category | Press (`69f4ccb9f8fd608205937743`) |
| PDF Field | `download-link` (File type) |

## Content Mapping

| # | Title | Year | Summary | PDF Filename |
|---|-------|------|---------|--------------|
| 02 | Bespoke magazine, Ultimate awards issue | 2019 | One of the first large-scale global architectural competitions launched from Saudi Arabia puts nga at the helm of an ambitious public library renovation. | `02-Bespoke Magazine- Ultimate Awards Issue - Dec-Jan 19.pdf` |
| 03 | W Magazine | 2018 | Inside the Lebanon Home of Tania Fares, Fashion's Well-Traveled Power Broker | `03-W Magazine-Inside the Lebanon Home of Tania Fares...pdf` |
| 04 | Al Mustaqbal | 2017 | nga teams up with Snohetta for the execution of the BLF Headquarters | `04-Al Mustaqbal.pdf` |
| 05 | Bespoke magazine | 2016 | Born again. This is a tale of nature, renewal and one insightful architect. | `05-Bespoke issue 57.pdf` |
| 06 | Wall Street Journal | 2015 | Damaged by War, a Villa in Lebanon Gets a Transformation | `06-Wall Street Journal.pdf` |
| 07 | Paper of Dialogue | 2014 | The troubadours of the new century | `07-Papers of Dialogue.pdf` |
| 08 | Main Gate | 2012 | Going greener | `08-Main Gate.pdf` |
| 09 | Area Magazine | 2012 | Beirut, Platinum Tower | `09-Area Magazine.pdf` |
| 10 | Real magazine | 2010 | Nabil Gholam, architecture of the serene soul | `10-REAL magazine issue 7.pdf` |
| 11 | Parjap | 2008 | "Japonés, italiano, francés... cualquier jardín puede llegar a inspirar" | `11-Parjap Issue 52.pdf` |
| 12 | Paisagismo | 2008 | Casa Z: Recuperar un icono | `12-Paisajismo 25 Z House.pdf` |
| 13 | Mipim Architectural Review, Future awards | 2008 | nga winner, masterplanned communities | `13-MIPIM Architectural Review Future Projects Award 2006.pdf` |

## Acceptance Criteria

- [x] Upload 12 PDFs to Webflow asset library via REST API
- [x] Create 12 News CMS items with Press category reference
- [x] Set `download-link` field to uploaded PDF URLs
- [x] Write SEO Meta Title for all 13 items (max 75 chars)
- [x] Write SEO Meta Description for all 13 items (max 150 chars)
- [x] Set Publication Date using year from title (Jan 1 of that year)
- [x] Publish all Press items

## SEO Metadata Guidelines

**Meta Title pattern:** `{Publication Name} features nga | {Year}`
- Max 75 characters
- Include publication name and year

**Meta Description pattern:** Brief context about the article topic
- Max 150 characters
- Mention what the article covers or which project is featured

## Implementation Steps

### 1. Upload PDFs
```bash
# Copy PDFs to assets folder structure
cp content/press/*.pdf assets/documents/press/

# Upload via existing script (adapts to documents)
pnpm run upload-assets --type=documents
```

### 2. Create CMS Items
Use Webflow Data API to batch create items:
- `name`: Title from mapping table
- `slug`: Kebab-case of title
- `summary`: Summary from mapping table
- `publication-date`: `{year}-01-01T00:00:00.000Z`
- `news-category-2`: `69f4ccb9f8fd608205937743`
- `download-link`: `{ fileId, url }` from upload response

### 3. Add SEO Metadata
Update each item with:
- `seo-meta-title`
- `seo-meta-description`

### 4. Publish
```bash
# Publish all Press category items
```

## File Size Check

| PDF | Size | Status |
|-----|------|--------|
| 06-Wall Street Journal.pdf | 8.7MB | OK (under 10MB limit) |
| 09-Area Magazine.pdf | 8.6MB | OK |
| 12-Paisajismo 25 Z House.pdf | 7.2MB | OK |
| 13-MIPIM Architectural Review... | 7.2MB | OK |

All files under Webflow's 10MB file upload limit.

## Notes

- Hero image, body, and hero slider fields intentionally left empty per requirements
- Existing item 01 needs SEO metadata added (currently null)
- Item titled "Works 2025" exists in Press category but is unrelated to this content batch
