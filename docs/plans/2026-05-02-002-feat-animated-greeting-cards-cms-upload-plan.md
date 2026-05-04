---
title: "feat: Upload Animated Greeting Cards to CMS"
type: feat
status: active
date: 2026-05-02
---

# Upload Animated Greeting Cards to CMS

## Overview

Upload 14 animated GIF greeting cards to the existing Webflow CMS collection, following the same pattern used for printed cards. All files exceed Webflow's 4MB upload limit (range: 6.3MB–13.9MB), so compression is required before upload.

## Problem Statement

The `Content/greeting cards/Animated greeting cards/` folder contains 14 holiday GIFs that need to be added to the Greeting Cards CMS collection. The files are:

| File | Size | Year |
|------|------|------|
| Christmas2022.gif | 13.9MB | 2022 |
| fitr2024.gif | 10.0MB | 2024 |
| Fitr2020.gif | 9.3MB | 2020 |
| Fitr2022.gif | 8.9MB | 2022 |
| Christmas2018.gif | 8.4MB | 2018 |
| christmas2021.gif | 8.2MB | 2021 |
| christmas2023.gif | 8.2MB | 2023 |
| fitr2025.gif | 7.9MB | 2025 |
| Fitr2019.gif | 7.6MB | 2019 |
| christmas2019.GIF | 7.0MB | 2019 |
| Christmas2025.gif | 6.9MB | 2025 |
| christmas2020 .gif | 6.8MB | 2020 |
| fitr2021.gif | 6.5MB | 2021 |
| fitr2023.gif | 6.3MB | 2023 |

**Issues to address:**
1. All files exceed 4MB upload limit (need 50–70% compression)
2. Inconsistent naming (Christmas vs christmas, trailing space in `christmas2020 .gif`)
3. No GIF compression tools currently installed

## Proposed Solution

### Phase 1: Compression Testing

1. Install `gifsicle` via Homebrew (preferred for GIF-specific optimization)
2. Test compression on the largest file (Christmas2022.gif at 13.9MB) with multiple settings
3. Determine compression strategy based on results

**Compression approaches (in order of preference):**
- **Lossy compression**: `gifsicle -O3 --lossy=80` — typically 30–50% reduction
- **Dimension reduction**: Scale to 400x400 if cards display small — 50–75% reduction
- **Frame reduction**: Skip every 2nd frame — 40–50% reduction
- **Combined**: Lossy + dimension can achieve 70%+ reduction

### Phase 2: Batch Compression

Process all 14 GIFs with the proven settings:
1. Backup originals to `Content/greeting cards/Animated-originals/`
2. Compress to `Content/greeting cards/Animated-compressed/` (or in-place)
3. Verify all files under 4MB
4. Fix filename issues (trailing space, uppercase extension)

### Phase 3: Upload

Create `scripts/api/webflow/upload-animated-cards.mjs` following the existing pattern from `upload-greeting-cards.mjs`:
1. Define CARDS array with cleaned names/slugs
2. Upload assets via S3 presigned URL flow (with MD5 deduplication)
3. PATCH CMS items with `card-image: { fileId, url, alt }`

## Technical Considerations

### Existing Infrastructure
- **Collection ID**: `69c21602e1d0bea9a19b0853`
- **Fields**: `name` (PlainText), `slug` (PlainText), `card-image` (Image), `date` (Number)
- **Reference script**: `scripts/api/webflow/upload-greeting-cards.mjs`
- **Webflow client**: `scripts/api/lib/webflow-client.cjs`

### GIF Compression Notes
- `gifsicle --lossy` uses lossy LZW compression (acceptable for web delivery)
- Dimension reduction is most effective but may affect visual quality if cards display large
- Frame reduction affects animation smoothness (12fps → 8fps is usually acceptable)

### CMS Image PATCH Format
```javascript
{
  fieldData: {
    'card-image': { fileId: assetId, url: hostedUrl, alt: 'Christmas 2022' }
  }
}
```

### Naming Convention
Match existing printed cards pattern:
- Name: `{Holiday} {Year}` with title case (e.g., "Christmas 2018", "Fitr 2019")
- Slug: `{holiday}-{year}` kebab-case (e.g., "christmas-2018", "fitr-2019")

## Acceptance Criteria

- [ ] All 14 animated GIFs compressed to under 4MB each
- [ ] Compression maintains acceptable visual quality (no visible banding or artifacts at display size)
- [ ] Original files backed up before processing
- [ ] Filename issues fixed (trailing space, consistent casing)
- [ ] Upload script created following existing pattern
- [ ] All 14 items added to Greeting Cards CMS collection
- [ ] CMS items saved as drafts (publish manually or via API)

## Success Metrics

- All 14 cards visible in Webflow CMS with animations playing
- No user complaints about GIF quality degradation
- Script can be rerun idempotently (MD5 deduplication prevents duplicate uploads)

## Dependencies & Risks

### Dependencies
- `gifsicle` installation via Homebrew
- Webflow API token with asset upload permissions
- Existing CMS items or slots to populate (may need to create placeholder items)

### Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Compression can't hit 4MB without severe quality loss | Medium | For largest files (13.9MB), dimension reduction to 400x400 should achieve target; worst case, convert to MP4 |
| GIF displays too small after dimension reduction | Low | Check display size on site before committing to dimension reduction |
| Rate limiting on bulk upload | Low | Existing script has exponential backoff; 14 files is manageable |

## Fallback Strategy

If any GIF cannot be compressed below 4MB with acceptable quality:

1. **First choice**: Reduce dimensions to 400x400 (acceptable if cards display small)
2. **Second choice**: Convert to MP4/WebM (90% smaller, requires adding video field to CMS)
3. **Last resort**: Skip file, log warning, handle manually

## Implementation Steps

### Step 1: Install gifsicle
```bash
brew install gifsicle
```

### Step 2: Analyze largest file
```bash
gifsicle --info "Content/greeting cards/Animated greeting cards/Christmas2022.gif"
```

### Step 3: Test compression settings
```bash
# Lossy compression only
gifsicle -O3 --lossy=80 Christmas2022.gif -o test-lossy80.gif

# Lossy + resize to 400x400
gifsicle -O3 --lossy=80 --resize 400x400 Christmas2022.gif -o test-lossy80-400.gif

# Check sizes
ls -lh test-*.gif
```

### Step 4: Review quality
Open test files and compare against original at 1:1 zoom. Accept if no visible banding/artifacts.

### Step 5: Process all files
```bash
# Create output directory
mkdir -p "Content/greeting cards/Animated-compressed"

# Compress each file (script this)
for f in "Content/greeting cards/Animated greeting cards/"*.gif; do
  gifsicle -O3 --lossy=80 "$f" -o "Content/greeting cards/Animated-compressed/$(basename "$f")"
done
```

### Step 6: Create upload script
New file: `scripts/api/webflow/upload-animated-cards.mjs`

CARDS array:
```javascript
const CARDS = [
  { file: 'Christmas2018.gif', name: 'Christmas 2018', slug: 'christmas-2018', year: 2018 },
  { file: 'christmas2019.GIF', name: 'Christmas 2019', slug: 'christmas-2019', year: 2019 },
  { file: 'christmas2020.gif', name: 'Christmas 2020', slug: 'christmas-2020', year: 2020 },
  { file: 'christmas2021.gif', name: 'Christmas 2021', slug: 'christmas-2021', year: 2021 },
  { file: 'Christmas2022.gif', name: 'Christmas 2022', slug: 'christmas-2022', year: 2022 },
  { file: 'christmas2023.gif', name: 'Christmas 2023', slug: 'christmas-2023', year: 2023 },
  { file: 'Christmas2025.gif', name: 'Christmas 2025', slug: 'christmas-2025', year: 2025 },
  { file: 'Fitr2019.gif', name: 'Fitr 2019', slug: 'fitr-2019', year: 2019 },
  { file: 'Fitr2020.gif', name: 'Fitr 2020', slug: 'fitr-2020', year: 2020 },
  { file: 'fitr2021.gif', name: 'Fitr 2021', slug: 'fitr-2021', year: 2021 },
  { file: 'Fitr2022.gif', name: 'Fitr 2022', slug: 'fitr-2022', year: 2022 },
  { file: 'fitr2023.gif', name: 'Fitr 2023', slug: 'fitr-2023', year: 2023 },
  { file: 'fitr2024.gif', name: 'Fitr 2024', slug: 'fitr-2024', year: 2024 },
  { file: 'fitr2025.gif', name: 'Fitr 2025', slug: 'fitr-2025', year: 2025 },
]
```

### Step 7: Run upload
```bash
node scripts/api/webflow/upload-animated-cards.mjs
```

### Step 8: Publish
Publish via Webflow Editor or API call.

## Sources & References

### Internal References
- Upload pattern: `scripts/api/webflow/upload-greeting-cards.mjs`
- Webflow client: `scripts/api/lib/webflow-client.cjs`
- Collection IDs: `docs/reference/webflow-ids.md`
- Image upload learnings: `feedback_image_upload_size.md`, `feedback_webflow_image_patch.md`

### External References
- [gifsicle documentation](https://www.lcdf.org/gifsicle/man.html)
- [Webflow Assets API](https://developers.webflow.com/data/reference/assets/create-asset)
