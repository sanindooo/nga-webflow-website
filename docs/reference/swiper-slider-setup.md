# Swiper Slider Setup

How to build and configure Swiper.js sliders in the Webflow automation pipeline.

## CDN Dependencies

Swiper is loaded via CDN (not npm). Two tags are required in Webflow site-level custom code:

```html
<!-- Head custom code -->
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/swiper@12/swiper-bundle.min.css" />

<!-- Body (before </body>) custom code -->
<script src="https://cdn.jsdelivr.net/npm/swiper@12/swiper-bundle.min.js"></script>
```

The polling loader waits for `window.Swiper` to exist before injecting `swiperSliders.js`. This is declared via `"pollGlobal": "Swiper"` in `scripts/manifest.json`.

**Dependency chain:** Swiper CSS → Swiper JS → polling loader detects `Swiper` global → injects `swiperSliders.js` → `init()` queries all `.swiper_slider` wrappers.

## Webflow Class Structure

Every slider requires this class hierarchy. Each element carries **two classes**: a project-specific class for styling + a Swiper functional class for initialization.

```
{component}_image-wrap + swiper_slider          ← outer wrapper (TS queries .swiper_slider)
  └── {component}_slider + swiper + {type}      ← Swiper container (type = discriminator)
        └── {component}_slides + swiper-wrapper  ← MANDATORY: Swiper layout wrapper
              └── {component}_slide + swiper-slide   ← MANDATORY: each slide
                    └── (slide content)
  .slide-button + swiper-button-next             ← optional: next arrow
  .slide-button + swiper-button-prev             ← optional: prev arrow
  .swiper-pagination                             ← optional: pagination dots
```

### Mandatory Swiper classes

| Class | Purpose | Must be on |
|---|---|---|
| `swiper` | Swiper container — initializes the slider instance | The Collection List or div wrapping the slides |
| `swiper-wrapper` | Flexbox layout wrapper — Swiper positions slides inside this | Direct child of `.swiper`, wrapping all slides |
| `swiper-slide` | Individual slide element | Each slide (Collection Item or div) |

Without these three classes, Swiper cannot initialize. Slides will stack vertically.

### Project wrapper: `swiper_slider`

The `swiper_slider` class marks the **scoping boundary** for the TypeScript. It does NOT need to be the direct parent of the `.swiper` element — it can be on the section, the image wrap, or any ancestor. The script uses `querySelector` within this wrapper to find:
- The `.swiper.{type}` container to initialize
- Navigation buttons (`.slide-button.swiper-button-next`, `.slide-button.swiper-button-prev`)
- Pagination (`.swiper-pagination`)

This means navigation and pagination elements can live **anywhere** inside the `swiper_slider` wrapper — they don't need to be siblings or children of the `.swiper` element.

### Type-discriminating combo classes

The `.swiper` element gets a combo class that tells the TypeScript which configuration to apply:

| Combo class | Selector | Behavior |
|---|---|---|
| `text-animation` | `.swiper.text-animation` | Loop, centered, 1 slide. Navigation arrows + pagination. GSAP SplitText testimonial animations on slide change. Single-slide nav hiding. |
| `default` | `.swiper.default` | Loop, centered, 1 slide. Clickable pagination bullets. No navigation arrows. Clean image gallery slider. |
| `split` | `.swiper.split` | No loop, free mode, grab cursor, mousewheel horizontal scroll. Responsive `slidesPerView` breakpoints. Next button only. |

To add a new slider type, add a combo class and a corresponding branch in `swiperSliders.ts` (see "Adding a New Slider Type" below).

## CMS Collection List as Slider

In Webflow, the CMS Collection List maps naturally to Swiper's structure:

| Webflow element | Swiper role | Classes |
|---|---|---|
| DynamoWrapper (Collection List) | Swiper container | `{component}_slider` + `swiper` + `{type}` |
| DynamoList (list wrapper) | Slide wrapper | `{component}_slides` + `swiper-wrapper` |
| DynamoItem (each item) | Individual slide | `{component}_slide` + `swiper-slide` |

Bind the CMS field (e.g., MultiImage, Collection Reference) to the Collection List. Each generated item automatically becomes a slide.

## Example: News Detail Slider

```
news-detail_image-wrap + swiper_slider
  └── news-detail_slider + swiper + default     ← Collection List (MultiImage: hero-slider)
        ├── news-detail_slides + swiper-wrapper  ← Collection List wrapper
        │     └── news-detail_slide + swiper-slide   ← each image
        │           ├── gradient-overlay
        │           └── news-detail_image
        └── Empty State
  news-detail_dots + swiper-pagination           ← pagination (Swiper auto-generates bullets)
```

## Pagination (Dots)

### Setup

1. Add a div with the `.swiper-pagination` class anywhere inside the `.swiper_slider` wrapper
2. Leave it empty — Swiper auto-generates `<span class="swiper-pagination-bullet">` elements at runtime
3. The TypeScript scopes pagination to the parent wrapper: `slider.querySelector('.swiper-pagination')`

### Swiper-generated HTML (runtime)

```html
<div class="swiper-pagination swiper-pagination-bullets swiper-pagination-horizontal">
  <span class="swiper-pagination-bullet"></span>
  <span class="swiper-pagination-bullet swiper-pagination-bullet-active" aria-current="true"></span>
  <span class="swiper-pagination-bullet"></span>
</div>
```

### Styling pagination bullets

Bullets are generated at runtime (not in Webflow Designer DOM), so they must be styled via **custom CSS** in site-level or page-level code, not via the Webflow style panel.

**Default Swiper bullet styles:** 8px circle, black at 20% opacity, active is `#007aff` at 100% opacity.

**NGA project standard — square dots:**

```css
.swiper-pagination-bullet {
  width: 6px;
  height: 6px;
  min-width: 6px;
  min-height: 6px;
  border-radius: 0;
  background: #f5f5f5;
  opacity: 0.35;
  transition: opacity 0.3s ease;
}

.swiper-pagination-bullet-active {
  opacity: 1;
  background: #f5f5f5;
}
```

**CSS custom properties (alternative approach):**

```css
.swiper-pagination {
  --swiper-pagination-color: #f5f5f5;
  --swiper-pagination-bullet-inactive-color: #f5f5f5;
  --swiper-pagination-bullet-inactive-opacity: 0.35;
  --swiper-pagination-bullet-size: 6px;
  --swiper-pagination-bullet-horizontal-gap: 6px;
  --swiper-pagination-bullet-border-radius: 0;
}
```

**Key CSS classes reference:**

| Class | When applied | Default style |
|---|---|---|
| `.swiper-pagination-bullet` | Every bullet | 8px circle, `#000`, opacity 0.2 |
| `.swiper-pagination-bullet-active` | Current slide's bullet | Full opacity, theme color |
| `.swiper-pagination-clickable` | Container when `clickable: true` | `cursor: pointer` on bullets |
| `.swiper-pagination-horizontal` | Horizontal slider | Bottom-positioned, centered |

### Common dot patterns

**Pill/line active bullet:**
```css
.swiper-pagination-bullet {
  width: 8px;
  height: 8px;
  border-radius: 4px;
  background: rgba(255, 255, 255, 0.4);
  opacity: 1;
  transition: width 0.3s ease, background 0.3s ease;
}
.swiper-pagination-bullet-active {
  width: 24px;
  background: #ffffff;
}
```

**Larger round dots:**
```css
.swiper-pagination-bullet {
  width: 12px;
  height: 12px;
  min-width: 12px;
  min-height: 12px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.5);
  opacity: 1;
  transition: background 0.3s ease, transform 0.3s ease;
}
.swiper-pagination-bullet-active {
  background: #00c853;
  transform: scale(1.3);
}
```

## Navigation Arrows

Navigation buttons use dual classes: `.slide-button` (project styling) + `.swiper-button-next` / `.swiper-button-prev` (Swiper targeting).

The TypeScript scopes navigation to the parent wrapper:
```typescript
const nextButton = slider.querySelector<HTMLElement>('.slide-button.swiper-button-next')
const prevButton = slider.querySelector<HTMLElement>('.slide-button.swiper-button-prev')
```

**Single-slide handling:** If only one slide exists, the script hides nav buttons with the `.hide` utility class and sets `aria-hidden="true"`.

## Multiple Sliders on One Page

Each slider must be scoped by its own `.swiper_slider` wrapper. The TypeScript iterates all wrappers:

```typescript
document.querySelectorAll<HTMLElement>('.swiper_slider').forEach((slider) => {
  // All queries scoped to this slider wrapper
  const defaultSlider = slider.querySelector<HTMLElement>('.swiper.default')
  const nextButton = slider.querySelector<HTMLElement>('.slide-button.swiper-button-next')
  // ...
})
```

**Critical:** Pass `HTMLElement` references (not CSS selector strings) to Swiper's `navigation` and `pagination` options. A CSS selector like `.swiper-pagination` would match the first one on the page, not the one inside this specific slider.

## Adding a New Slider Type

1. **Choose a type name** (e.g., `gallery`, `cards`, `testimonial`)

2. **In Webflow Designer:** Add the combo class to the `.swiper` element: `swiper` + `{type}`

3. **In `swiperSliders.ts`:** Add a new branch inside the `forEach` loop:

```typescript
const gallerySlider = slider.querySelector<HTMLElement>('.swiper.gallery')

if (gallerySlider) {
  new Swiper(gallerySlider, {
    loop: true,
    speed: 800,
    slidesPerView: 1,
    pagination: {
      el: paginationElement,
      clickable: true,
    },
    navigation: {
      nextEl: nextButton,
      prevEl: prevButton,
    },
  })
}
```

4. **Build and deploy:** `pnpm run build` → commit → push → `/deploy-scripts`

## Swiper Configuration Quick Reference

| Option | Type | Common values |
|---|---|---|
| `loop` | boolean | `true` for infinite, `false` for bounded |
| `speed` | number | Transition duration in ms (e.g., `1000`) |
| `slidesPerView` | number | `1` for single, `1.25` for peek, `'auto'` for variable width |
| `centeredSlides` | boolean | Center active slide |
| `spaceBetween` | number | Gap between slides in px |
| `freeMode` | boolean | Free scrolling without snapping |
| `grabCursor` | boolean | Show grab cursor on hover |
| `effect` | string | `'slide'`, `'fade'`, `'cube'`, `'coverflow'`, `'flip'` |
| `autoplay` | object | `{ delay: 5000, disableOnInteraction: false }` |
| `mousewheel` | object | `{ forceToAxis: true }` for horizontal scroll |
| `observer` | boolean | Auto-update on DOM mutations (useful for CMS/Interactions) |
| `breakpoints` | object | Responsive configs keyed by min-width: `{ 768: { slidesPerView: 2 } }` |
