# Style & Component Inventory

This document is the **live reference** for what already exists in the Webflow project. Before creating ANY new style or element, check here first. If a match exists, reuse it.

**Last updated:** 2026-03-24

---

## Existing Components (Reusable)

These are Webflow components — use `de_component_tool > insert_component_instance` instead of building from scratch.

| Component | ID | Instances | Use For |
|---|---|---|---|
| **Button Icon** | `c7d3f11c-2273-c246-7dcf-f34a40b0c283` | 8 | ALL CTA links (READ MORE, SHOW MORE, etc.) — not plain TextLink |
| **Large Text Hero Section** | `2984aafe-0a79-f7c8-ae96-5e0ac8a60179` | 1 | Page headers with large display title + description |
| **Hero Section** | `19f7a6f8-079e-72cc-690e-18afa130820f` | 2 | Full-viewport hero with background image |
| **Sticky Section** | `16dab678-3deb-4cc7-9431-677c5f916486` | 4 | Sticky scroll text sections |
| **Main Nav** | `7f7d6a97-a689-ade1-b745-2592853a0e4a` | 3 | Site navigation (already on every page) |
| **Footer Section** | `15ef0942-6739-a1f4-75cf-dc4f6188a30c` | 3 | Site footer (already on every page) |
| **About Section** | `1962a196-1c0a-f6e3-6a4f-d3cf340f4dcf` | 1 | About block with image + text |
| **Project Listing Section** | `91c69f02-de82-a9b3-13c8-9f2a73db1eb8` | 1 | Project grid with category filters |
| **News Listing Section** | `879888f7-5836-635d-c9e6-782de0676b81` | 1 | News article listing |

---

## Typography — Custom Styles

Use these BEFORE creating new heading/text styles. Match the Figma text size to the closest existing style.

### Display / Hero Text
| Style | Font Size | Weight | Line Height | Letter Spacing | Use For |
|---|---|---|---|---|---|
| `large-text-hero_heading` | 9.2rem | 400 | 0.89 | -0.04em | Page title display text (combo on heading-style-h1) |
| `section-title_large` | 5rem | 400 | 1 | -0.02em | Large section headings |
| `footer_contact-heading` | 5rem | — | 1.15 | -0.1rem | Contact section heading (combo on heading-style-h2) |
| `studio-quote_text` | 4.5rem | 400 | — | -0.18rem | Pull quotes |

### Section / Component Headings
| Style | Font Size | Weight | Notes |
|---|---|---|---|
| `heading-style-h1` | 4rem | 700 | Relume default — use combo class for overrides |
| `heading-style-h2` | 3rem | 700 | Relume default |
| `heading-style-h3` | 2.5rem | 700 | Relume default |
| `heading-style-h4` | 2rem | 600 | Relume default |
| `heading-style-h5` | 1.5rem | 600 | Relume default |
| `heading-style-h6` | 1.25rem | 600 | Relume default |

### Body Text
| Style | Font Size | Weight | Line Height |
|---|---|---|---|
| `text-size-large` | 1.25rem | 400 | 1.6 |
| `text-size-medium` | 1rem | 400 | 1.6 |
| `text-size-small` | 0.875rem | 400 | 1.6 |
| `news_title` | 1.25rem | 400 | — |

### Text Utilities
| Style | Purpose |
|---|---|
| `text-weight-xbold` through `text-weight-light` | Font weight overrides |
| `text-align-left`, `text-align-center`, `text-align-right` | Alignment |
| `studio-quote_attribution` | Uppercase, spaced-out attribution text |
| `is-text-small` | Combo: 1rem, weight 400 |

---

## Layout — Shared Patterns

### Dividers
| Style | Properties | Use For |
|---|---|---|
| `pub-list_divider` | 1px solid #2b2b2b, full-width, margin 3rem top/bottom | Section dividers |
| `studio-team_divider` | 1px, background #2b2b2b, full-width | Team section dividers |

**TODO:** Consolidate into a single `divider` or `divider_full-width` utility class.

### Decorative Elements
| Style | Properties | Use For |
|---|---|---|
| `button-square` | 6px square, background from variable | Square bullet next to links |
| `pub-card_square` | 6px square, background #2b2b2b | Square bullet (publication cards) |

**TODO:** Consolidate into a single `square-bullet` utility class.

### Background / Overlay
| Style | Purpose |
|---|---|
| `background-image` | 100% width/height image |
| `background-image-wrapper` | Absolute positioned, inset 0, cover |
| `gradient-overlay` | Dark gradient overlay on images |
| `overlay` | 25% black overlay |

### Aspect Ratios
| Style | Ratio |
|---|---|
| `aspect-ratio-landscape` | 3:2 |
| `aspect-ratio-portrait` | 2:3 |
| `aspect-ratio-square` | 1:1 |
| `aspect-ratio-widescreen` | 16:9 |

---

## Component Families

### Publication Cards (`pub-card_*`)
Full card layout: image left + info-col right with title + read more link.
- `pub-card_component` — flex row, gap 2rem
- `pub-card_figure` — 26.25rem x 34.25rem, overflow hidden
- `pub-card_image` — 100% cover
- `pub-card_info-col` — flex column, space-between, full height
- `pub-card_header` / `pub-card_footer` — wrappers
- `pub-card_read-more` — flex row, gap 0.5rem, with square + link
- `pub-card_link` — uppercase, 1rem, tracking 0.01em

### Card Grid (`card-grid_*`)
3-column CSS grid for square image cards.
- `card-grid_component` — flex column, gap 3rem
- `card-grid_grid` — CSS grid, 3 columns, gap 1.25rem
- `card-grid_item` — 1:1 aspect ratio, overflow hidden
- `card-grid_image` — 100% cover

### Project Grid (`project-grid_*`)
3-column grid with overlay text on images.
- `project-grid_list` — CSS grid, 3 columns
- `project-grid_item` — relative, flex, 1:1 aspect ratio, padding 1.25rem

### Studio Team (`studio-team_*`)
4-column grid for team member cards + list rows.
- `studio-team_grid` — CSS grid, 4 columns
- `studio-team_card` — flex column, gap 1.75rem
- `studio-team_row` — flex, space-between, border-bottom

### Footer (`footer_*`)
26 styles covering contact form, follow banner, sitemap, addresses, newsletter, legal links.

---

## How to Use This Inventory

1. **Before every build session**, query `style_tool > get_styles(query: "all")` and cross-reference with this doc
2. **Match Figma text sizes** to existing typography styles — don't default to heading-style-h1 through h6
3. **Check components first** — if a section pattern exists as a component, insert an instance instead of building
4. **Reuse layout utilities** — aspect ratios, overlays, shadows, z-index helpers
5. **Use generic names** for new shared patterns (describe the layout, not the content)
6. **Update this doc** after each build with any new styles/components created
