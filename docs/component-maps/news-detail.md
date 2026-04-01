# Component: news-detail

## Page Type
CMS Template page for News collection items. Slug: `detail_news`

## Layout Overview
Split layout: sticky left image column (~49%) + scrollable right content column (~41%) with ~10% gap.
Below the split: "More News" section with 2 related article cards.

## Element Tree

```
main-wrapper (existing)
  ── SECTION 1: News Detail Split ──
  DivBlock [section_news-detail]
    DivBlock [news-detail_component]                    ← flex row, space-between
      │
      ├── DivBlock [news-detail_sticky-col]             ← 49.3% width
      │     DivBlock [news-detail_sticky-wrap]          ← sticky, top 0, 100vh
      │       DivBlock [news-detail_image-wrap]         ← absolute fill, overflow hidden
      │         Image [news-detail_image]               ← CMS: Featured Image
      │       DivBlock [gradient-overlay]               ← existing style
      │       DivBlock [news-detail_dots]               ← decorative slider dots
      │         DivBlock [news-detail_dot] x3           ← 6px, opacity 0.35
      │         DivBlock [news-detail_dot is-active]    ← 6px, opacity 1
      │         DivBlock [news-detail_dot]              ← 6px, opacity 0.35
      │
      └── DivBlock [news-detail_content-col]            ← 41.1% width
            │
            ├── DivBlock [news-detail_hero]             ← flex-end, min-h 100vh, gap 8rem
            │     ├── DivBlock [news-detail_meta]       ← flex row, space-between
            │     │     Paragraph "5th Feb, 2026"       ← CMS: Date
            │     │     Paragraph "lectures/awards"     ← CMS: Category
            │     └── DivBlock [news-detail_header]
            │           H1 [heading-style-h2 news-detail_title]
            │             "Innovative Skyscraper Designs Transforming Dubai's Skyline"
            │           Paragraph [news-detail_excerpt]
            │             "Dubai has never been a city that thinks small..."
            │
            └── DivBlock [news-detail_body]             ← flex col, gap 4rem, pt 4rem
                  RichText ← MANUAL: MCP cannot create RichText elements
                    CMS-bound to Body rich text field

  ── SECTION 2: More News ──
  DivBlock (section) [section_more-news]
    DivBlock [padding-global padding-section-large]
      DivBlock [container-large]
        DivBlock (article) [more-news_component]
          DivBlock (header) [more-news_header]
            H2 [heading-style-h1 more-news_heading] "more news"
          DivBlock [more-news_grid]                     ← MANUAL: replace with DynamoWrapper
            DivBlock [more-news_card]                   ← CMS: News item 1
              DivBlock [more-news_figure]
                Image [more-news_card-image]
              DivBlock [more-news_card-info]
                Paragraph [news_title]
                DivBlock [more-news_read-more]
                  DivBlock [button-square]
                  Paragraph [more-news_link-text] "READ MORE"
            DivBlock [more-news_card]                   ← CMS: News item 2
              (same structure)
```

## Styles from Figma

### Section 1: News Detail Split
| Style | Key Properties |
|---|---|
| `section_news-detail` | display: flex, flex-direction: column |
| `news-detail_component` | flex row, justify-content: space-between |
| `news-detail_sticky-col` | width: 49.3%, flex-shrink: 0, align-self: stretch |
| `news-detail_sticky-wrap` | position: sticky, top: 0, height: 100vh, overflow: hidden, flex-end, padding: 0 0 1.25rem 1.25rem |
| `news-detail_image-wrap` | position: absolute, inset: 0, overflow: hidden |
| `news-detail_image` | 100% cover |
| `gradient-overlay` | existing — dark bottom gradient |
| `news-detail_dots` | inline-grid, auto-flow column, gap 19px, relative, z-1 |
| `news-detail_dot` | 6px square, #f5f5f5, opacity 0.35 |
| `is-active` (combo) | opacity 1 |
| `news-detail_content-col` | width: 41.1%, flex-shrink: 0, flex column |
| `news-detail_hero` | flex column, gap 8rem, flex-end, min-h 100vh, pt 5rem, pb 2.5rem |
| `news-detail_meta` | flex row, space-between, 1.125rem, #222, lowercase |
| `news-detail_header` | flex column, gap 4rem |
| `news-detail_title` (combo on h2) | 3.5rem, line-height 1, -1.68px spacing, #222, lowercase, weight 400 |
| `news-detail_excerpt` | 1.25rem, line-height 1.4, -0.4px spacing, #2b2b2b, lowercase |
| `news-detail_body` | flex column, gap 4rem, pt 4rem |

### Section 2: More News
| Style | Key Properties |
|---|---|
| `more-news_heading` (combo on h1) | 5rem, line-height 1.15, -1.6px spacing, #2b2b2b, lowercase, weight 400 |
| `more-news_component` | flex column, gap 4rem |
| `more-news_grid` | flex row, gap 1.25rem, align-items flex-start |
| `more-news_card` | flex column, gap 2rem, flex: 1 |
| `more-news_figure` | width 100%, overflow hidden |
| `more-news_card-image` | 100% cover |
| `more-news_card-info` | flex row, space-between, align-items flex-end |
| `more-news_read-more` | flex row, gap 0.5rem, align-items center |
| `more-news_link-text` | 1rem, uppercase, tracking 0.16px, #2b2b2b |

## CMS Fields (bind manually)
- **Featured Image** → `news-detail_image` (left sticky column)
- **Name** → H1 title
- **Date** → first Paragraph in meta
- **Category** → second Paragraph in meta
- **Excerpt** → Paragraph in header
- **Body** (RichText) → RichText inside `news-detail_body`

## CMS Population
Use text + images from the Figma article design to populate existing News CMS items.

## Manual Steps Required
1. Add RichText element inside `news-detail_body`, bind to CMS Body field
2. Bind all hero fields to CMS (date, category, name, excerpt, featured image)
3. Replace `more-news_grid` with DynamoWrapper (News collection, exclude current, limit 2)
4. Set semantic tags: section_news-detail → `<section>`, news-detail_component → `<article>`, news-detail_header → `<header>`, more-news_header → `<header>`, more-news_figure → `<figure>`
