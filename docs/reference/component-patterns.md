# Component Patterns — Webflow Element Structure

This document defines the MANDATORY element patterns for building components in Webflow.
These patterns are non-negotiable — every element must follow them.

## Core Principle: Every Element Needs a Wrapper

Never place headings, images, paragraphs, or interactive elements as direct children of layout containers. Always wrap them in a semantically-named div that provides spacing, sizing, and responsive control.

## Mandatory Wrapper Rules

### 1. Header Wrappers (`_header`)

**EVERY heading must be inside a `_header` wrapper.** This allows spacing, max-width, and padding to be controlled without combo classes on the heading itself.

```
WRONG:
  Block [component_component]
    H2 [heading-style-h2]        <-- naked heading, no wrapper
    Paragraph

CORRECT:
  Block [component_component]
    Block [component_header]     <-- wrapper provides spacing/width
      H2 [heading-style-h2]
      Paragraph                  <-- body text inside header wrapper
```

**Why:** Headings use shared utility styles (`heading-style-h1` through `h6`). Adding spacing or width directly to the heading would require combo classes, breaking reusability. The `_header` wrapper absorbs all layout-specific overrides.

### 2. Figure Wrappers (`_figure` or `_images-wrap`)

**EVERY image must be inside a figure/wrapper div.** Never place `<Image>` elements as direct children of flex/grid containers.

```
WRONG:
  Block [component_images-col]
    Image [component_image]      <-- naked image in layout

CORRECT:
  Block [component_images-col]
    Block [component_images-wrap] <-- wrapper controls aspect ratio, overflow
      Image [component_image]
```

**Why:** Image wrappers provide overflow control, aspect ratio enforcement, border radius clipping, and hover effect containers. Without them, images can't be properly constrained in responsive layouts.

### 3. Section Wrappers (`_section`)

When a section has **repeating subsections** (like team categories), each subsection must be wrapped in a `_section` div that groups its header + content + divider.

```
WRONG:
  Block [component_component]
    H2 "Team Leaders"
    DynamoWrapper
    Block [divider]              <-- floating divider, unclear grouping
    H2 "Team Members"
    DynamoWrapper
    Block [divider]

CORRECT:
  Block [component_component]
    Block [component_section]    <-- groups header + content + divider
      Block [component_header]
        H2 "Team Leaders"
      DynamoWrapper
      Block [component_divider]
    Block [component_section]
      Block [component_header]
        H2 "Team Members"
      DynamoWrapper
      Block [component_divider]
```

**Why:** Section wrappers create clear parent-child relationships, make it easy to show/hide entire subsections, and ensure consistent vertical spacing via the wrapper's gap or padding.

### 4. Footer Wrappers (`_footer`)

**CTA buttons and action links at the bottom of a section need a `_footer` wrapper.**

```
WRONG:
  Block [component_component]
    DynamoWrapper
    Button "SHOW MORE"           <-- naked button

CORRECT:
  Block [component_component]
    DynamoWrapper
    Block [component_footer]     <-- footer wrapper
      Component: Button Icon
```

**Why:** Footer wrappers provide consistent spacing, alignment, and responsive positioning for action elements. They also establish a clear semantic boundary between content and actions.

### 5. Column Wrappers in Rows

In list/table rows with multiple data cells, **each cell needs its own wrapper div**, even for single text elements.

```
WRONG:
  Block [component_row]
    Paragraph "Award Name"
    Paragraph "Project Name"

CORRECT:
  Block [component_row]
    Block [component_column-1]
      Paragraph "Award Name"
    Block [component_column-2]
      Paragraph "Project Name"
    Block [component_footer]     <-- for the "READ MORE" link
      Component: Button Icon
```

**Why:** Column wrappers provide fixed widths, flex-basis control, and responsive stacking. Without them, text elements compete for space unpredictably.

### 6. Dual Text Wrappers

When multiple body paragraphs sit side-by-side (e.g., two text columns), wrap them in a `_dual-text` or similar container — don't place them as direct children of the row.

```
WRONG:
  Block [component_text-row]
    Block [component_header]
      H3 "Lead heading"
    Paragraph "Body text 1"      <-- direct children of row
    Paragraph "Body text 2"

CORRECT:
  Block [component_text-row]
    Block [component_header]
      H3 "Lead heading"
    Block [component_dual-text]  <-- groups the body paragraphs
      Paragraph "Body text 1"
      Paragraph "Body text 2"
```

## Sizing Rule: No Fixed Dimensions

**NEVER use fixed `width` + `height` on content elements.** Use `aspect-ratio` + `max-width` + `width: 100%` instead.

```
WRONG:
  Block [component_figure]
    width: 26.25rem
    height: 34.25rem        <-- fixed dimensions, breaks on smaller screens

CORRECT:
  Block [component_figure]
    aspect-ratio: 420 / 548  <-- maintains proportions
    max-width: 26.25rem      <-- caps size on large screens
    width: 100%              <-- fills available space responsively
```

**Why:** Fixed widths and heights break responsive layouts. Elements overflow their containers on smaller screens and can't adapt to flex/grid sizing. `aspect-ratio` preserves proportions while `max-width` + `width: 100%` allows the element to shrink gracefully.

**Applies to:** Image wrappers/figures, card containers, info columns, any element with visual dimensions. The only exception is truly fixed decorative elements (e.g., 6px square bullets, 1px dividers).

## Spacing Pattern: Section + Divider

Use section wrappers with internal dividers for consistent vertical rhythm. The `_section` wrapper controls spacing via its own padding/gap, and the `_divider` sits inside it as the last child.

```
Block [component_section]
  Block [component_header]
    H2 [heading-style-h1]
  [content: DynamoWrapper or static elements]
  Block [component_divider]      <-- inside the section, not floating
```

The divider is a 1px line (full-width, `background-color: #2b2b2b`). It belongs inside the section wrapper, not as a sibling between sections.

## Heading Semantic Levels vs Visual Styles

Use heading level (H1-H6) for **document hierarchy** and heading-style classes for **visual size**. These are independent.

```
H2 [heading-style-h1]    <-- visually large, but semantically H2 (page has one H1)
H3 [heading-style-h5]    <-- visually small, but semantically H3 for subsection
H3 [heading-style-h3]    <-- semantic and visual match
```

**Why:** The Figma design uses visual sizing independent of document structure. The heading level must follow proper document hierarchy (one H1 per page, H2 for sections, H3 for subsections), while the style class matches the Figma visual.

## Button Components

Use the **Button Icon** component for all CTA links (READ MORE, SHOW MORE, Start A Project, etc.) — not plain Button or TextLink elements. This ensures consistent icon + text patterns across the site.

## Complete Section Template

```
Block (section tag) [section_component-name]
  Block [padding-global . padding-section-large]
    Block [container-large]
      Block (article tag) [component-name_component]
        Block [component-name_section]
          Block (header tag) [component-name_header]
            H2 [heading-style-h1]
          [content area]
          Block [component-name_divider]
        Block [component-name_section]
          Block (header tag) [component-name_header]
            H3 [heading-style-h3]
          [content area]
          Block [component-name_footer]
            Component: Button Icon
          Block [component-name_divider]
```

## CMS Collection List Sections

For sections powered by CMS data, the structure is the same but with DynamoWrapper/DynamoList/DynamoItem:

```
Block [component-name_section]
  Block [component-name_header]
    H2 [heading-style-h1]
  DynamoWrapper [component-name-wrapper]
    DynamoList [component-name_list]
      DynamoItem [component-name_item]
        Block [component-name_row]
          H3 [heading-style-h5]           <-- CMS-bound: Name
          Paragraph [heading-style-h5 . text-color-neutral-500]  <-- CMS-bound: Role
      DynamoEmpty
        Block (empty state)
  Block [component-name_footer]
    Component: Button Icon
  Block [component-name_divider]
```

**Note:** The MCP element_builder CANNOT create DynamoWrapper/DynamoList/DynamoItem elements. These must be created manually in the Webflow Designer. Build the section wrapper, header, footer, and divider — then flag the CMS connection as a manual step.

## Custom Navigation Pattern

**Do NOT use Webflow's native NavbarWrapper/NavbarMenu/NavbarLink elements.** Build navigation with custom DivBlocks so we have full control over the open/close behaviour and styling.

### Nav Bar (visible header)
```
Block (nav tag) [header]
  Block [container-xl]
    Block [nav-custom_bar]
      LinkBlock [nav-custom_logo] → href="/"         ← logo (add SVG inside)
      Block [nav-custom_toggle] data-nav="open"      ← hamburger button
        Block [nav-custom_line]                       ← top line (2px #012c72)
        Block [nav-custom_line]                       ← bottom line
```

### Fullscreen Menu Overlay (hidden by default)
```
Block [nav-custom_menu] data-nav="menu"               ← display:none, position:fixed, z-100
  Block [nav-custom_close] data-nav="close"            ← ✕ close button (top-right)
    TextBlock "✕"
  Block (ul tag) [nav-custom_list]                     ← flex column, centered
    Block (li tag) [nav-custom_list-item]
      TextLink [nav-custom_menu-link] "works" → /
    Block (li tag) [nav-custom_list-item]
      TextLink [nav-custom_menu-link] "about" → /studio
    Block (li tag) [nav-custom_list-item]
      TextLink [nav-custom_menu-link] "news" → /news
    Block (li tag) [nav-custom_list-item]
      TextLink [nav-custom_menu-link] "careers" → /careers
    Block (li tag) [nav-custom_list-item]
      TextLink [nav-custom_menu-link] "contact" → /contact
```

### Semantic Tags (set manually in Designer Settings panel)
- `nav-custom_bar` parent → `<nav>` tag
- `nav-custom_list` → `<ul>` tag
- Each `nav-custom_list-item` → `<li>` tag

### JavaScript (`navToggle.ts`)
Uses `data-nav` attributes for element selection:
- `data-nav="open"` → click opens menu (fade in 300ms)
- `data-nav="close"` → click closes menu (fade out 300ms)
- `data-nav="menu"` → the overlay element
- Also closes on Escape key and when clicking any nav link
- Locks body scroll while menu is open

**Why custom instead of Webflow navbar:** Native NavbarWrapper has built-in responsive breakpoint behaviour, hamburger animation, and menu toggling that conflicts with the custom GSAP animations and design requirements. Custom DivBlocks give full control.

**Why list structure:** Even though MCP builds DivBlocks, the structure mirrors `<ul>` > `<li>` > `<a>` so the developer only needs to change the tag in Settings panel. This ensures semantic HTML and accessibility (screen readers identify it as a navigation list).
