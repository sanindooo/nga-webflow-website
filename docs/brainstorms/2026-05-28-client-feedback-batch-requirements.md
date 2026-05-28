---
date: 2026-05-28
topic: client-feedback-batch-may-2026
---

# Client Feedback Batch — May 2026

## Summary

Six JS/CSS fixes addressing client feedback on the NGA website: a new project info button module (intersection hide + color theming), mobile menu scroll fix under ScrollSmoother, horizontal scroll fix for filter tags, footer sticky text animation with mobile breakpoint gate, and column reading order correction on project/team pages.

---

## Problem Frame

The NGA site uses GSAP ScrollSmoother with `normalizeScroll: true`, which intercepts all touch/scroll events for smooth momentum. Three of the six items are direct consequences of this: the mobile nav menu can't scroll its overflow content, the filter tag bar can't scroll horizontally, and the fixed project info button can't be hidden via z-index alone because it sits outside the ScrollSmoother wrapper.

The remaining items are new animations and a layout correction: the project info button needs color adaptation for readability on dark pages, the footer CTA section needs a sticky text reveal matching the homepage pattern, and the multi-column descriptions on project and team pages read in the wrong order (left-right across columns instead of top-bottom within each column).

---

## Requirements

**Project info button (`projectInfoButton.ts` — new module)**

- R1. When the contact footer section enters the viewport, the fixed project info button fades out and becomes non-interactive (`pointer-events: none`).
- R2. When the contact footer section leaves the viewport, the button fades back in and becomes interactive again.
- R3. The button toggles an `is-light` class (or equivalent) when it overlaps sections with dark backgrounds, so the button text/icon remains readable.
- R4. The color detection reuses existing `data-header-theme` section attributes but operates independently from `navTheme.ts` — no shared state or coupling.
- R5. Both behaviors (hide on contact intersect + color toggle) live in a single module and share the same detection mechanism.

**Mobile menu scroll fix**

- R6. When the mobile nav menu opens, ScrollSmoother is paused and `normalizeScroll` is disabled so that overflow content inside the menu can scroll natively.
- R7. When the mobile nav menu closes, ScrollSmoother resumes and `normalizeScroll` is re-enabled.
- R8. The fix follows the same pause/resume pattern already established in `modals.ts`.

**Horizontal scroll for filter tags**

- R9. The filter/tag bar on listing pages (e.g., `/works`) scrolls horizontally on touch devices.
- R10. If `normalizeScroll` is the blocker, the filter element is exempted from touch capture without disabling `normalizeScroll` globally.

**Footer sticky text animation**

- R11. The footer CTA section ("follow our story on" + social links) uses a sticky text reveal animation matching the `homeTextSticky.ts` pattern — text pins and words reveal as the user scrolls through the section.
- R12. On viewports below 480px width, the sticky animation is disabled entirely. A simple fade-in on scroll replaces it.
- R13. The breakpoint gate uses GSAP `matchMedia` so the animation cleanly reverts and re-applies on resize.

**Column reading order**

- R14. On project detail pages, the multi-column description text reads top-to-bottom within each column, not left-to-right across columns.
- R15. The same top-to-bottom reading order applies to team member descriptions.
- R16. If the fix is CSS-only (e.g., `column-count`), no JS module is needed. If the DOM structure requires reordering, a lightweight JS utility handles it.

---

## Acceptance Examples

- AE1. **Covers R1, R2.** Given the user is on a project page and scrolls to the contact footer, the "PROJECT" button fades out before the footer reaches the button's position. Scrolling back up fades it back in.
- AE2. **Covers R3, R4.** Given the user is on a project page with a full-bleed dark hero image, the project button shows light text/icon. When scrolling past the hero into a light-background section, the button switches to dark text/icon. This detection is independent of the nav's own theme switching.
- AE3. **Covers R6, R7.** Given the user is on mobile, opens the hamburger menu, and the menu content overflows the viewport, the user can scroll within the menu. Closing the menu restores normal ScrollSmoother behavior.
- AE4. **Covers R9.** Given the user is on `/works` on a mobile device, swiping left/right on the filter tag bar scrolls through the filter options.
- AE5. **Covers R12, R13.** Given the user views the footer CTA section on a 375px-wide device, the text fades in on scroll without any sticky pinning. On a 768px tablet, the sticky pin animation plays normally.

---

## Success Criteria

- All six fixes are visually verified on the live staging site across desktop (1440px), tablet (768px), and mobile (390px).
- The project info button is invisible when scrolled to the contact form and readable (correct color contrast) on every page.
- Mobile menu scrolls its overflow content without jank or interference from ScrollSmoother.
- Filter tags are horizontally scrollable on touch devices.
- Footer sticky animation matches the homepage pattern on desktop and degrades gracefully on mobile.
- Column reading order on project and team pages is top-to-bottom.

---

## Scope Boundaries

- No Webflow Designer/MCP changes — user handles DOM structure manually in Designer.
- No changes to `navTheme.ts` — project button is fully independent.
- `stickyFilter.ts` reactivation is a separate concern, not included here.
- No new CDN dependencies — all fixes use GSAP APIs already loaded.

---

## Key Decisions

- **Single module for project button:** Both hide-on-intersect and color-toggle share a module and detection mechanism, avoiding duplicated intersection logic.
- **Follow modals.ts pattern for menu scroll:** Pause/resume ScrollSmoother on menu open/close rather than adding a separate scroll container workaround.

---

## Dependencies / Assumptions

- The site continues to use GSAP ScrollSmoother (not Lenis) with `normalizeScroll: true`.
- `data-header-theme` attributes on sections are already set for the nav — the project button reuses these.
- The footer CTA section has a class structure compatible with the `homeTextSticky` pattern (`.section_sticky-text`, `.sticky-text_component` or equivalent).
- The contact footer section has a selectable class or attribute for intersection detection.

---

## Outstanding Questions

### Deferred to Planning

- [Affects R3][Needs research] What is the exact selector for the project info button element in the DOM? Need to inspect the live site.
- [Affects R9][Needs research] Does GSAP's `normalizeScroll` support element-level exemptions, or do we need a different approach (e.g., Swiper, or temporarily disabling normalizeScroll during horizontal touch gestures on the filter bar)?
- [Affects R14, R15][Needs research] What is the current DOM structure of the multi-column description on project pages and team bios? Determines whether CSS `column-count` works or JS reordering is needed.
- [Affects R11][Needs research] What class/selector does the footer CTA section use? Need to inspect whether it matches the `homeTextSticky` pattern or needs adaptation.
