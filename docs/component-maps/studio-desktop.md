# Studio Page Map — Desktop (1512px)

Figma node: `1464:10668` | URL: figma.com/design/5taBLjqMEKYIMrm6Q5bqCZ?node-id=1464-10668

## Webflow Page State

Already built:
- **Global Styles** component instance
- **Main Nav** component instance (Header)
- **Hero Section** component instance (text override: "Studio")
- **Footer Section** component instance

Everything below goes inside `main-wrapper` (`f3a6c255-9ed7-32a9-be96-9b7f1e282565`).

---

## Section Inventory

| # | Section | Figma Node | Type | Build Method |
|---|---------|-----------|------|-------------|
| 1 | Hero | `1464:10670` | Static | Already built (component instance) |
| 2 | Intro — Sticky text + images | `1464:10675` | Static | Manual build |
| 3 | Intro — Philosophy + panoramic | `1464:10683` | Static | Manual build |
| 4 | Founder Quote | `1464:10689` | Static | Manual build |
| 5 | Principal & Associates | `1464:10693` | CMS | Collection List (6 cards) |
| 6 | Team Leaders | `1464:10735` | CMS | Collection List (filtered) |
| 7 | Team Members | `1464:10719` | CMS | Collection List (filtered) |
| 8 | Administration | `1464:10711` | CMS | Collection List (filtered) |
| 9 | Legal Partners | `1464:10767` | CMS | Separate collection |
| 10 | Previous Team Members | `1464:10749` | Static | Text columns |
| 11 | Collaborators | `1464:10779` | Static | Text columns |
| 12 | International Consultants | `1464:10764` | CMS | Collection List |
| 13 | CTA — "Design the Next Chapter" | `1464:10702` | Static | Manual build |
| 14 | Awards | `1464:10792` | CMS | Collection List |
| 15 | Footer | `1464:10796` | Static | Already built (component instance) |

Sections 6-8 share the same **Team** CMS collection, filtered by a Category dropdown. Section 9 (Legal Partners) is a separate collection.

---

## Section Details

### 2. Intro — Sticky Text + Images (editorial composition)

**Layout:** Left column (477px) with sticky text, right column (746px) with 3 stacked images.

Left column (sticky):
- **H2:** "Where Architecture Meets Humanity" — `heading-style-h2`, 56px, lowercase
- **Body:** "Aware of our role as catalysts..." — 16px, `text-size-small`

Right column (3 images stacked vertically with small gaps):
- `image-42.png` — 746x512, top
- `image-43.png` — 746x548, middle
- `image-44.png` — 746x548, bottom

**Classification:** Editorial — the sticky scroll behavior will need GSAP or CSS `position: sticky`.

### 3. Intro — Philosophy + Panoramic

**Layout:** 3-column text row + full-width panoramic image below.

Text row:
- Col 1 (602px): "In the last 30 years, we've grasped the nuances of every project." — 40px, `heading-style-h3`
- Col 2 (353px): "Optimizing living, engendering character..." — 16px
- Col 3 (353px): "In this way our designs offer buildings..." — 16px

Image:
- `image-40.png` — full-bleed panoramic, 1516x611

### 4. Founder Quote

**Layout:** Full-width quote text + attribution.

- **Quote:** "True architecture begins when the way you inhabit space, and understand yourself within it, is transformed." — large display text
- **Attribution:** "— nabil gholam, founder" — small caps/uppercase

**Classification:** Structured, simple build.

### 5. Principal & Associates (CMS)

**Layout:** 3x2 grid of cards (353px each, 20px gap). Section heading above.

- **Heading:** "principal & associates" — 56px, `heading-style-h2`, lowercase
- **Cards:** Each card is a clickable block with:
  - Photo (aspect ~1:1.3, object-fit: cover)
  - Name (24px, lowercase, black)
  - Title/Role (18px, grey #999, hidden by default — appears on hover, opacity 0 → 1)

**People (row 1 L→R):** Nabil Gholam (Principal, Founder) | Georges Nasrallah (Managing and Technical Director) | Richard Saad (Director of Design)
**People (row 2 L→R):** Rania Moujahed (Head of Administration) | Mona Saikali (Senior Lead Architect) | Georges Hakim (Head of Development and Production)

### 6–9. Team Lists (CMS — shared collection, filtered by category)

**Layout:** Each section has a heading (56px) + list of rows. Rows separated by implied borders.

Each **row** contains:
- Name (left, 24px, black, lowercase)
- Title/Role (right, 24px, grey #717171, lowercase)
- Hidden hover photo (center, 115x148px, opacity: 0 → shows on hover)

**Horizontal divider lines** separate each team section (full-width, 1px).

#### 6. Team Leaders (10 people)
Daniel Perez (Senior Architect, Head of Design) | Raffy Doulian (Senior Lead Architect/Planner) | Nathalie Mahfoud (Senior Lead Architect) | Joseph Fadel (Lead Architect) | Hector Salcedo (Lead Architect) | Maroun Gedeon (Senior Architect) | Isabel Pablo Romero (Senior Architect) | Ismael Paez (Senior Architect) | Nicole Rossi (Senior Architect – BIM Manager) | Joumana Arida (Senior Architect, Head of Communication)

#### 7. Team Members (12 people)
*(names in Figma instances — to be extracted during CMS population)*

#### 8. Administration (5 people)
*(names in Figma instances — to be extracted during CMS population)*

#### 9. Legal Partners (3 people)
- Alem & Associates — Lawyer
- Semaan Gholam & Co — Auditor
- Fadi Chedid — Consultant - Tax Advisor

### 10. Previous Team Members (static text)

**Layout:** 4 columns (353px each), each with an alphabetical heading and a paragraph of names.

- **A — F** | **G — K** | **L — Q** | **R — Z**
- Each column is a block of comma-separated names in body text

**No CMS needed** — this is a static archive list, rarely updated.

### 11. Collaborators (static text)

**Layout:** 3 columns of names (229px each), no titles.

John Abarca Lopez, Ayssar Arida, Ali Basbous, Guillaume Credoz, Scott Dimit, Mazen el Khatib, Ziad Jamaleddine, Walid Kanj | Gokhan Karakus, Gregorio Medina Maranon, Roula Mouharram, Andrei Pakhomov | Wyssem Noshie, Warren Singh-Bartlett, Naji Sleiman, Ebru Tabak, Nicolas Veron, Eduardo Wachs

### 12. International Consultants (static or CMS — see decision below)

**Layout:** List of rows, each with company name (24px) + country (18px, grey). Has a "SHOW MORE" toggle at the bottom.

Companies include: AECOM (UK), Atelier 10 (UK), Arup (UK), Buro Happold (UK), Dar Group (Lebanon), and ~15 more.

### 13. CTA

**Layout:** Single row — "Design the Next Chapter with us" (left) + two dot-links: "Start A Project" | "View Careers" (right)

### 14. Awards (CMS)

**Layout:** Two visual formats in a single list:

1. **Featured awards** (top ~5): Award logo image (229px wide) | Award name | Project name(s) | "READ MORE" dot-link
2. **Simple awards** (remaining ~15): Year text | Award name | Project name(s) | "READ MORE" dot-link

Has a "SHOW MORE" toggle at the bottom (overflow: hidden, reveals more on click).

---

## CMS Collection Strategy

### Collection 1: "Principals" (6 items)

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| Name | PlainText | Yes | e.g. "Nabil Gholam" |
| Title | PlainText | Yes | e.g. "Principal, Founder" |
| Photo | ImageRef | Yes | Portrait photo, ~353x453 |
| Sort Order | Number | Yes | Controls grid position (1-6) |

**Template:** 3-column card grid. Each card links to nowhere for now (could link to a bio page later).

### Collection 2: "Team" (~30 items)

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| Name | PlainText | Yes | e.g. "Daniel Perez" |
| Title | PlainText | Yes | e.g. "Senior Architect, Head of Design" |
| Photo | ImageRef | No | Hover thumbnail (115x148px). Optional — legal partners don't have photos |
| Category | Option | Yes | Options: `Team Leader`, `Team Member`, `Administration` |
| Sort Order | Number | Yes | Controls display order within each category |

**Why single collection:** Team Leaders, Team Members, and Administration share the exact same row layout (name + title). The category field lets us filter 3 Collection Lists from one source. Easy to promote someone between levels.

**Template:** 3 filtered Collection Lists on the page, each with its own section heading and divider. Each list filters by `Category = X` and sorts by `Sort Order`.

**Note:** Legal Partners are a separate collection (see Collection 4 below).

### Collection 3: "Awards" (~20 items)

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| Year | PlainText | Yes | e.g. "2018" (text not number — allows "2018" display) |
| Award Name | PlainText | Yes | e.g. "World Architecture Festival" |
| Project | PlainText | Yes | e.g. "j house, the House with two lives, Private Residences" |
| Award Logo | ImageRef | No | Only featured awards have logos |
| Featured | Switch | No | Determines card layout (logo vs text-only) |
| Link URL | Link | No | "Read More" destination |
| Sort Order | Number | Yes | Controls display order |

**Template:** Single Collection List. Conditional visibility on the logo image (show if Award Logo exists). The "Featured" switch controls whether the expanded layout (with logo) or compact layout (text row) is used. "SHOW MORE" button placed below — interaction wired up later by animation dev.

### Collection 4: "Legal Partners" (3 items)

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| Name | PlainText | Yes | e.g. "Alem & Associates" |
| Role | PlainText | Yes | e.g. "Lawyer", "Auditor" |
| Sort Order | Number | Yes | Controls display order |

**Why separate:** Different structure from the Team collection — these are firms/individuals with a role label, not employees with job titles. Kept separate for cleaner data management.

### Collection 5: "Consultants" (~20 items)

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| Name | PlainText | Yes | e.g. "AECOM" |
| Country | PlainText | Yes | e.g. "United Kingdom" |
| Sort Order | Number | Yes | Controls display order |

**Template:** List rows with company name + country. "SHOW MORE" button — interaction wired up later.

---

## Decision Points for Your Review

### 1. International Consultants — CMS

CMS collection for easy client management. "Consultants" collection (Name, Country, Sort Order).

### 2. Previous Team Members — Keep as static text?

Currently a wall of ~150+ comma-separated names in 4 alphabetical columns. This is clearly archival. **Recommend static** — CMS would be overkill for a text paragraph.

### 3. Collaborators — Keep as static text?

~18 names in 3 columns, no titles. **Recommend static.**

### 4. Awards "SHOW MORE" behavior

Just a button for now — no interaction. Animation dev will wire it up later.

### 5. Team row display

No hover photo interaction for now (animation dev handles later). Each row shows:
- Name (left)
- Title/Role text visible below or beside name (not hidden)

---

## Assets Exported

45 images + 1 SVG exported to `assets/images/`. Key files:

| Asset | File | Use |
|-------|------|-----|
| Hero | `home.png` | Already in Hero component |
| Intro photo 1 | `image-42.png` | Sticky section, top-right |
| Intro photo 2 | `image-43.png` | Sticky section, mid-right |
| Intro photo 3 | `image-44.png` | Sticky section, bottom-right |
| Panoramic | `image-40.png` | Philosophy section, full-width |
| 6 principal photos | `rectangle-133.png` to `-6.png` | Principal cards |
| ~28 team hover photos | `rectangle-133-7.png` to `-34.png` | Team row hover thumbnails |
| 5 award logos | `image-52.png` to `-5.png` | Featured award rows |
| Footer clouds | `frame-248.png` | Shared with homepage |

**Next step:** Rename these semantically before uploading to Webflow.
