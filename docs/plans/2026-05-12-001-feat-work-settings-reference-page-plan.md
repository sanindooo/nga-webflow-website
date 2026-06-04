---
title: "feat: Work Settings Reference Page"
type: feat
status: active
date: 2026-05-12
---

# Work Settings Reference Page

## Summary

Create a static draft page showing all CMS layout/alignment combinations for the Works gallery. Grey placeholder rectangles demonstrate each setting visually, with labels and compatible row combinations so the client can see how settings affect image presentation.

---

## Problem Frame

The client needs to understand how the 9 layout options and 3 alignment options affect gallery image presentation. Currently, they'd have to trial-and-error in the CMS. A visual reference page removes that friction.

---

## Requirements

- R1. Show all 9 layout options as grey rectangles with correct aspect ratios
- R2. Show compatible combinations that form complete rows (Large+Small, Half+Half)
- R3. Label each rectangle with its CMS setting name
- R4. Demonstrate alignment options (Default vs Right)
- R5. Save as draft (not published)

---

## Scope Boundaries

- Static HTML/CSS only — no CMS binding needed
- No responsive behaviour required (desktop reference only)
- No interactivity — pure visual reference

---

## Key Technical Decisions

- **Reuse existing CSS:** The `data-layout` attribute selectors from the Works page custom code already handle all sizing/aspect-ratio logic. Apply those same attributes to static divs.
- **Grey placeholder divs:** Use `background: #e5e5e5` rather than images — simpler and clearly communicates "this represents an image slot."
- **Page embed for custom CSS:** Add the gallery CSS via a page-level embed block so the data-layout attributes work without touching site-wide custom code.

---

## Implementation Units

### U1. Create Draft Page

**Goal:** Create a new static page in Webflow as a draft.

**Requirements:** R5

**Dependencies:** None

**Files:**
- Webflow page: `/work-settings` (draft)

**Approach:**
- Use MCP `data_pages_tool` or Designer to create a blank page titled "Work Settings"
- Set `draft: true` so it doesn't appear on the live site

**Test expectation:** None — page creation verified via MCP response.

**Verification:**
- Page exists in Webflow with slug `work-settings` and draft status

---

### U2. Add Gallery CSS Embed

**Goal:** Embed the gallery layout CSS so `data-layout` attributes work on this page.

**Requirements:** R1, R2

**Dependencies:** U1

**Files:**
- Page embed block containing the CSS from the user's message

**Approach:**
- Add an HTML Embed element at the top of the page
- Paste the full `<style>` block with all `data-layout` and `data-alignment` selectors

**Test expectation:** None — CSS embed verified via visual inspection.

**Verification:**
- Embed block is present and contains the gallery CSS

---

### U3. Build Layout Option Showcase

**Goal:** Create grey placeholder rectangles for each layout option, organised into logical rows.

**Requirements:** R1, R2, R3

**Dependencies:** U2

**Approach:**

Build a flex container (class `dynamic-image_component`) with placeholder items. Structure:

**Row 1 — Full Width Options:**
```
[Full Width — 16:9] ← data-layout="Full Width"
[Full Width — Tall — 3:2] ← data-layout="Full Width — Tall"
```

**Row 2 — Large + Small Combo:**
```
[Large — 4:3] [Small — 4:3] ← shows they fill a row together
```

**Row 3 — Large Tall + Small Tall Combo:**
```
[Large — Tall — 3:4] [Small — Tall — 3:4]
```

**Row 4 — Half + Half Combo:**
```
[Half — 4:3] [Half — 4:3]
```

**Row 5 — Half Tall + Half Tall Combo:**
```
[Half — Tall — 3:4] [Half — Tall — 3:4]
```

**Row 6 — Extra Large Tall (offset demonstration):**
```
[Extra Large — Tall — 3:4, right-aligned]
```

Each placeholder:
- Div with class `dynamic-image_item`
- `data-layout` attribute matching the option name
- Grey background (`#e5e5e5`)
- Text label centred inside showing the setting name

**Test scenarios:**
- Happy path: Each layout option renders at correct width percentage and aspect ratio
- Happy path: Large + Small visually fill one row (66% + 34%)
- Happy path: Half + Half visually fill one row (50% + 50%)

**Verification:**
- All 9 layout options visible with correct proportions
- Compatible pairs share rows without wrapping

---

### U4. Add Text Labels

**Goal:** Label each placeholder with its CMS setting name.

**Requirements:** R3

**Dependencies:** U3

**Approach:**
- Centre a text block inside each placeholder div
- Text content = exact CMS option name (e.g., "Large — Tall")
- Style: dark grey text, medium weight, centred vertically and horizontally

**Test expectation:** None — labelling is visual verification only.

**Verification:**
- Each grey rectangle has a readable label matching its `data-layout` value

---

### U5. Demonstrate Alignment Options

**Goal:** Show how Right alignment affects positioning.

**Requirements:** R4

**Dependencies:** U3

**Approach:**
- Add a section below the layout showcase titled "Alignment Options"
- Show a Half-width rectangle at Default alignment (left-aligned in row)
- Show a Half-width rectangle with `data-alignment="Right"` (pushed right via `margin-left: auto`)

**Test scenarios:**
- Happy path: Default-aligned item sits flush left
- Happy path: Right-aligned item sits flush right with visible gap on left

**Verification:**
- Clear visual difference between Default and Right alignment

---

## Risks & Dependencies

| Risk | Mitigation |
|------|------------|
| CSS embed doesn't apply to child elements | Verify CSS selectors match the div structure we build |
| Aspect ratios look odd without actual images | Grey background makes the shape clear; no image needed |

---

## Sources & References

- Custom CSS provided by user (gallery layout via `data-layout` attributes)
- Works CMS collection schema (layout options extracted via MCP)
- **New Site ID:** `69f8a84868fb1946b71566b3` (Copy of NGA Website)
- **Works Collection ID:** `69f8a84868fb1946b71566bf`
