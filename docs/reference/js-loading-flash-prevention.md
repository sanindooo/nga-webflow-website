# JS Loading Flash Prevention

Prevents flash of unstyled content (FOUC) for elements that animate on page load. CSS hides elements by default; JS removes the class after animations initialize.

## Current CSS

Copy this to Webflow Site Settings → Custom Code → Head (inside a `<style>` tag):

```css
.js-loading .heading-style-h1.hero_title,
.js-loading .slide-in,
.js-loading .fade-in,
.js-loading .sticky-text_component h2,
.js-loading [scroll-text-reveal],
.js-loading .card-grid_grid-item,
.js-loading .process_header-item,
.js-loading .process_grid-item,
.js-loading .studio-team_card-info p,
.js-loading .works_content-wrapper .overlay,
.js-loading .works_content {
  opacity: 0;
}
```

## Setup Scripts

**Head** (add before the CSS):
```html
<script>document.documentElement.classList.add('js-loading')</script>
```

**Body (end)**:
```html
<script>
;(function () {
  function removeLoadingClass() {
    document.documentElement.classList.remove('js-loading')
  }
  
  function waitForAnimations() {
    if (typeof gsap !== 'undefined' && document.readyState === 'complete') {
      requestAnimationFrame(removeLoadingClass)
    } else {
      setTimeout(waitForAnimations, 50)
    }
  }
  
  waitForAnimations()
})()
</script>
```

## Selector Reference

| Script | Selector(s) | Initial State |
|--------|-------------|---------------|
| `heroTextReveal.ts` | `.heading-style-h1.hero_title` | words y: 110% |
| `gsapBasicAnimations.ts` | `.slide-in`, `.fade-in` | opacity: 0, y: 25 |
| `homeTextSticky.ts` | `.sticky-text_component h2` | words y: 110% |
| `generalScrollTextReveal.ts` | `[scroll-text-reveal]` | lines y: 110% |
| `swiperSliders.ts` | `.heading-style-h1.hero_title.is-slider` | words y: 110% (covered by hero_title rule) |
| `publicationsGridFade.ts` | `.card-grid_grid-item` | autoAlpha: 0, y: 20 |
| `randomImagesFadeIn.ts` | `.process_header-item`, `.process_grid-item` | autoAlpha: 0, y: 20 |
| `teamCardHover.ts` | `.studio-team_card-info p` | autoAlpha: 0 |
| `worksCardHover.ts` | `.works_content-wrapper .overlay`, `.works_content` | autoAlpha: 0 |

**Not included:**
- `generalImageHover.ts` — only sets `overflow: hidden`, no opacity change
- `navToggle.ts`, `navTheme.ts` — nav state changes, not content flash
- Interaction-only scripts (accordion, modals, viewSwitcher, etc.)

## Adding New Animations

When building a new animation script that sets initial opacity/visibility:

1. Identify the CSS selector used in the script
2. Add `.js-loading .your-selector { opacity: 0; }` to the CSS block above
3. Add an entry to the selector reference table
4. Update the CSS in Webflow Site Settings
