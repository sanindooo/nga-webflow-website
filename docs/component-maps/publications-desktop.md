# Component Map: Publications Page (Desktop)

## Page Overview
- Background: #fafafa
- Font: Arial throughout (Regular weight)
- Text color: #2b2b2b (neutral/700)
- All text: lowercase
- Header and Footer already built (component instances)

---

## Section 1: Publications Hero

### Element Tree
```
section .section_page-hero
  div .padding-global .padding-section-large
    div .container-large
      article .pub-hero_component
        header .pub-hero_header
          H1 .heading-style-h1 .pub-hero_heading    "publications"
        div .pub-hero_body
          Paragraph                                   "This section gathers a selection..."
```

### Styles
- **pub-hero_heading**: font-size 147.254px (display), line-height 130.893px, letter-spacing -5.89px, font-weight 400, lowercase. Convert to ~9.2rem with clamp for responsiveness.
- **pub-hero_body**: max-width 473px (29.5rem), font-size 16px, line-height 1.25, letter-spacing -0.08px

### Content
- Heading: "publications"
- Body: "This section gathers a selection of publications that document the work and research of NGA over the years. Through monographs, editorial features and special editions."

---

## Section 2: Monographs

### Element Tree
```
section .section_pub-list
  div .padding-global .padding-section-medium
    div .container-large
      article .pub-list_component
        div .pub-list_section
          header .pub-list_header
            H2 .heading-style-h1 .pub-list_heading   "monographs"
          div .pub-list_divider
        [Publication Card - see shared pattern below]
```

### Content
- Heading: "monographs"
- 1 publication card: "eastwest"

---

## Section 3: Works

### Element Tree
```
section .section_pub-list .is-works
  div .padding-global .padding-section-medium
    div .container-large
      article .pub-list_component
        div .pub-list_section
          header .pub-list_header
            H2 .heading-style-h1 .pub-list_heading   "works"
          div .pub-list_divider
        [Publication Card: "works 2025"]
        div .pub-list_divider
        [Publication Card: "works 2017"]
        div .pub-list_divider
        [Publication Card: "works 2013"]
        div .pub-list_divider
        [Publication Card: "works 2005"]
```

### Content
- Heading: "works"
- 4 publication cards: works 2025, works 2017, works 2013, works 2005

---

## Shared Pattern: Publication Card

### Element Tree
```
div .pub-card_component
  div .pub-card_carousel-col
    div .pub-card_carousel-viewport         (overflow: hidden)
      div .pub-card_carousel-track          (display: flex, horizontal scroll)
        div .pub-card_carousel-slide
          Image .pub-card_image             (420x548, aspect-ratio ~0.766)
        div .pub-card_carousel-slide
          Image .pub-card_image
        ... (up to 5 slides)
    div .pub-card_carousel-dots
      div .pub-card_dot .is-active          (6x6px, bg #2b2b2b)
      div .pub-card_dot                     (6x6px, bg #e1e1e1)
      div .pub-card_dot
      div .pub-card_dot
  div .pub-card_info-col
    header .pub-card_header
      H3 .heading-style-h2 .pub-card_title  "eastwest" / "works 2025" etc.
    footer .pub-card_footer
      div .pub-card_read-more
        div .pub-card_square                (6x6px, bg #2b2b2b)
        TextLink .pub-card_link             "READ MORE" (16px, uppercase, tracking 0.16px)
```

### Styles
- **pub-card_component**: display flex, align-items flex-start, width 100%, gap ~326px (between carousel and info)
- **pub-card_carousel-col**: width 420px (26.25rem), flex-shrink 0
- **pub-card_carousel-viewport**: width 420px, height 548px (34.25rem), overflow hidden
- **pub-card_carousel-track**: display flex, height 100%
- **pub-card_carousel-slide**: width 420px, height 548px, flex-shrink 0
- **pub-card_image**: width 100%, height 100%, object-fit cover
- **pub-card_carousel-dots**: display flex, gap 8px, justify-content center, margin-top 19px
- **pub-card_dot**: width 6px, height 6px, background #e1e1e1
- **pub-card_dot.is-active**: background #2b2b2b
- **pub-card_info-col**: display flex, flex-direction column, justify-content space-between, height 573px (35.8rem), flex 1
- **pub-card_title**: font-size 56px (3.5rem), line-height 56px, letter-spacing -1.68px, lowercase, font-weight 400, color #2b2b2b
- **pub-card_read-more**: display flex, gap 8px, align-items center
- **pub-card_square**: width 6px, height 6px, background #2b2b2b
- **pub-card_link**: font-size 16px (1rem), uppercase, letter-spacing 0.16px, color #2b2b2b

### Publication Data
| Title | Hero Image (Figma node) | Figma Node ID |
|---|---|---|
| eastwest | image 53 | 1464:10464 |
| works 2025 | Captura...16.51.50 | 1464:10514 |
| works 2017 | Captura...16.54.41 | 1464:10490 |
| works 2013 | Captura...19.24.28 | 1464:10446 |
| works 2005 | Captura...16.54.54 | 1464:10427 |

---

## Section 4: Greeting Cards

### Element Tree
```
section .section_card-grid
  div .padding-global .padding-section-large
    div .container-large
      article .card-grid_component
        div .card-grid_section
          header .card-grid_header
            H2 .heading-style-h1 .card-grid_heading   "greeting cards"
          div .card-grid_body
            Paragraph                                   "This section gathers a selection..."
        div .card-grid_grid
          div .card-grid_item
            Image .card-grid_image            (353x355, ~1:1 aspect ratio)
          ... (8 items total)
```

### Grid Layout (Figma positions, interpreted as CSS Grid)
The 8 images form a 3-column masonry-like layout:
- Row 1: col1(x:20), col2(x:766), col3(x:1139) — 3 images
- Row 2: col1(x:393), col3(x:1137) — 2 images (col2 empty)
- Row 3: col1(x:20), col2(x:764), col3(x:1137) — 3 images

Each image: 353x355px (~22rem x 22.2rem), roughly square.
Gap between images: ~20px vertically, variable horizontal (~373px between col1 and col2).

**Simplified responsive approach:** CSS Grid with 3 columns, auto placement, gap 1.25rem. Let items flow naturally rather than matching exact Figma absolute positions.

### Styles
- **card-grid_heading**: 72px, line-height 1.2, letter-spacing -2.88px, lowercase
- **card-grid_body**: max-width 473px, margin-top ~112px (from heading)
- **card-grid_grid**: display grid, grid-template-columns repeat(3, 1fr), gap 1.25rem
- **card-grid_item**: aspect-ratio 353/355 (~1:1)
- **card-grid_image**: width 100%, height 100%, object-fit cover

### Content
- Heading: "greeting cards"
- Body: "This section gathers a selection of publications that document the work and research of NGA over the years. Through monographs, editorial features and special editions."
- 8 greeting card images (all appear to be the same dark blue starfield image with different crops)

---

## Dividers

Full-width 1px lines separating sections/cards.
- **pub-list_divider**: width 100%, height 1px, background-color #2b2b2b (or use border-top)

---

## Custom Attributes
- `data-animation-general` on each section
- `data-animation-order` on animated children (0, 1, 2...)

## Responsive Notes
- At tablet (medium): stack pub-card columns vertically, reduce heading sizes
- At mobile: single column for greeting card grid, reduce display heading to ~3rem with clamp
