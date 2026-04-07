---
title: "feat: Swiper Slider System Documentation & News Gallery"
type: feat
status: active
date: 2026-04-07
---

# feat: Swiper Slider System Documentation & News Gallery

## Overview

Create reusable Swiper.js slider documentation for the Webflow automation pipeline, then apply it to build the image gallery slider on the news detail template page. The goal is to make future Swiper slider setup trivially easy — any slider type should be buildable by following the reference doc.

## Problem Statement / Motivation

The existing `swiperSliders.ts` handles two slider types (default testimonial + split horizontal scroll) but the knowledge of how to set up a Swiper slider in this pipeline is tribal — it lives only in the code. There's no reference doc explaining:
- What Webflow classes are required for Swiper to work
- How to add a new slider type
- The CDN dependency chain
- The relationship between Webflow element structure and the TypeScript initialization

This makes it slow and error-prone to add new sliders. The news detail page needs an image gallery slider, which is the perfect opportunity to document the pattern.

## Proposed Solution

**Two deliverables:**

1. **`docs/reference/swiper-slider-setup.md`** — Comprehensive reference doc covering Webflow class structure, TypeScript patterns, CDN dependency chain, and how to add new slider types
2. **Updated `swiperSliders.ts`** — Add a `gallery` slider type for the news detail page image gallery
3. **CLAUDE.md pointer** — Brief entry in CLAUDE.md pointing to the reference doc

### Approach: Type-discriminating combo classes

The existing pattern is elegant: every slider section uses `.swiper_slider` as the outer wrapper, then the `.swiper` element gets a combo class (`.default`, `.split`) that tells the TypeScript which config to apply. The gallery slider follows this exact pattern with `.swiper.gallery`.

## Technical Considerations

### Webflow Class Structure (mandatory for Swiper to work)

Swiper requires three mandatory classes in the DOM hierarchy:

```
.swiper_slider                    ← project wrapper (scopes nav/pagination queries)
  .swiper.{type}                  ← Swiper container (combo class = type discriminator)
    .swiper-wrapper               ← MANDATORY: direct child, Swiper uses this for layout
      .swiper-slide               ← MANDATORY: each slide must have this class
      .swiper-slide
  .slide-button.swiper-button-next  ← optional: navigation
  .slide-button.swiper-button-prev  ← optional: navigation
  .swiper-pagination              ← optional: pagination dots
```

**Critical:** `.swiper-wrapper` and `.swiper-slide` are Swiper's own classes — without them, Swiper cannot initialize. These must be applied in Webflow Designer alongside any project-specific classes.

### CDN Dependency Chain

```
1. Swiper CSS (<link> in site head custom code)
2. Swiper JS (<script> in site body custom code)
3. Polling loader detects window.Swiper exists
4. Loader injects swiperSliders.js from jsDelivr
5. init() queries all .swiper_slider wrappers and initializes by type
```

The CSS must load first — without it, slides stack vertically and the slider is broken.

### Existing Bug: Global pagination selector

The current `defaultSlider` config uses `el: '.swiper-pagination'` (a global CSS selector). If multiple sliders exist on the same page, all pagination renders into the first `.swiper-pagination` element. **This should be fixed as part of this work** — scope pagination to the parent `.swiper_slider` wrapper using `slider.querySelector('.swiper-pagination')`.

### News Detail Template Integration

The gallery slider replaces or augments the existing single hero image in the sticky left column (`news-detail_image-wrap`). The existing `news-detail_dots` (static decorative dots) should either:
- Be replaced by real Swiper pagination, or
- Remain decorative (if the gallery uses navigation arrows instead)

**This needs confirmation via the Webflow snapshot** — the user has already built the slider structure in the Designer.

## Acceptance Criteria

### Reference Doc (`docs/reference/swiper-slider-setup.md`)

- [ ] Documents mandatory Swiper classes (`.swiper`, `.swiper-wrapper`, `.swiper-slide`)
- [ ] Documents the project's wrapper pattern (`.swiper_slider` + type combo class)
- [ ] Lists all current slider types with their combo classes and configs
- [ ] Explains how to add a new slider type (Webflow classes + TS code)
- [ ] Documents the CDN dependency chain (CSS → JS → polling loader → script)
- [ ] Documents the `pollGlobal: "Swiper"` manifest.json pattern
- [ ] Covers multiple sliders on one page (scoped selectors, not global)
- [ ] Covers single-slide edge case (hide nav buttons)

### TypeScript Update (`swiperSliders.ts`)

- [ ] Add `gallery` slider type (`.swiper.gallery`) with appropriate config
- [ ] Fix global `.swiper-pagination` selector → scope to parent wrapper for all types
- [ ] Gallery config determined by actual Webflow structure (via snapshot)
- [ ] Follows all mandatory conventions: dedup guard, DOM-ready gate, clean variable names
- [ ] SplitText lifecycle maintained (revert before re-split) if gallery has text animations

### CLAUDE.md Update

- [ ] Brief entry under "Custom Attributes" or new "Swiper Sliders" subsection
- [ ] Points to `docs/reference/swiper-slider-setup.md` for full reference
- [ ] Mentions the type-discriminating combo class pattern

### Deployment

- [ ] `pnpm run build` succeeds
- [ ] `pnpm run typecheck` passes
- [ ] Updated `manifest.json` with new integrity hash
- [ ] Deploy via `/deploy-scripts` skill
- [ ] Verify slider works on published news detail page

## Implementation Phases

### Phase 1: Snapshot & Document (research)

1. Take Webflow snapshot of news detail page slider structure
2. Identify all classes currently applied
3. Map the existing structure to Swiper's required classes
4. Determine what's missing or needs renaming

### Phase 2: Reference Doc

1. Write `docs/reference/swiper-slider-setup.md`
2. Document all three slider types (default, split, gallery)
3. Include the Webflow class → Swiper class mapping table
4. Add "Adding a new slider type" section
5. Add CLAUDE.md pointer

### Phase 3: TypeScript Update

1. Add gallery slider branch to `swiperSliders.ts`
2. Fix pagination scoping for all slider types
3. Configure gallery based on snapshot findings
4. Build and typecheck

### Phase 4: Deploy & Verify

1. Run `/deploy-scripts`
2. Publish site
3. Test gallery slider on news detail page
4. Verify existing sliders still work (regression check)

## Dependencies & Risks

- **Webflow Designer connection** — needed for snapshot to confirm the element structure
- **Swiper CSS** — must already be loaded in site custom code; need to verify this is in place
- **CMS binding** — if the gallery shows CMS images, the MultiImage field must be properly bound to generate `.swiper-slide` elements
- **Existing slider regression** — fixing the pagination scoping changes behavior for existing sliders; must test

## Sources & References

### Internal References
- Existing slider script: `scripts/src/global/swiperSliders.ts`
- Manifest entry: `scripts/manifest.json:36-41`
- Type declarations: `scripts/src/types/gsap.d.ts:106-118`
- News detail component map: `docs/component-maps/news-detail.md`
- CDN hardening learnings: `docs/solutions/runtime-errors/cdn-script-hardening-review.md`
- Dynamic script loading learnings: `docs/solutions/runtime-errors/dynamic-script-loading-race-conditions.md`

### External References
- Swiper.js docs: https://swiperjs.com/swiper-api
- Swiper CDN (bundle): `https://cdn.jsdelivr.net/npm/swiper@12/swiper-bundle.min.js`
- Swiper CSS CDN: `https://cdn.jsdelivr.net/npm/swiper@12/swiper-bundle.min.css`
