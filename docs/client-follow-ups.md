# Client Follow-ups and Good to Know

Questions to put to the client, and behaviour they should know about. Pre-launch
blockers are also listed in `docs/content-todo.md` §11.

## Follow-up questions

### Works filter (2026-10-12)

1. **Status for every project.** The new `Status` field on Works (Under Construction,
   Completed, Competition) is empty on all projects. The status filter returns nothing
   until it is filled. Needed before launch.
2. **Projects with no area.** Regenerative Dome and Tec eco-retreat have no area in
   their text, so `Max Area (m2)` is blank. They drop out of results whenever an area
   range is set. Can the client supply a figure?
3. **The House with Two Lives.** Its text gives the main house (2 000 m²), the guard
   house (850 m²) and the site, but no total. `Max Area (m2)` is set to 2 000 m².
   Confirm, or give the figure they want used.
4. **"arabian peninsula" in Countries.** It is a region, not a country, and is lowercase
   unlike the others. It shows as a location filter option because a project uses it.
   Which country should that project be under?

## Good to know

### Works filter (2026-10-12)

- **Max Area (m2)** is used only by the area filter and the largest/smallest sort. It is
  not shown on the page. It was filled from each project's Area text (largest building
  figure, site and plot figures ignored). New projects need it filled by hand, or they
  are left out of area filtering.
- **Thumbnail** is the image shown on the Works listing tiles: a 1600px version of the hero image, about 20 times smaller. New projects need one too (upload a 1600px wide copy of the hero, or rerun `scripts/api/webflow/create-works-thumbnails.mjs run --apply`), or their tile shows no image.
- **Date and area sliders set their own ends** from the projects on the page, so a new
  2027 project or a larger building widens the range with no edits.
- **The area slider uses a logarithmic scale.** Areas run from 65 m² to 1 000 000 m²,
  and most projects are under 120 000 m². Each equal stretch of the slider multiplies
  the area by the same amount, so small and large projects both get usable room. The
  labels show real m².
- **100-item limit.** The Works list holds 84 projects. Past 100, Webflow stops rendering
  extra items and the filter needs Finsweet CMS Load added.
