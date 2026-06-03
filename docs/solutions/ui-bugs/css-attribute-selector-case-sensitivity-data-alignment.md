---
title: "CSS attribute selector case-sensitivity broke data-alignment=\"Right\" layout"
date: "2026-06-03"
category: "ui-bugs"
module: "projectInfoButton"
component: "frontend_stimulus"
problem_type: "ui_bug"
symptoms:
  - "Project-info button rendered white over two narrow images on /works/* detail pages when it should have been blue"
  - "Two narrow images visually clustered on the left of the row instead of one-left / one-right"
  - "[data-alignment='right'] CSS rule never matched any element at runtime"
  - "JS compensation in projectInfoButton.ts over-fired for genuine Left+Left pairs, masking the CSS bug"
root_cause: "logic_error"
resolution_type: "code_fix"
severity: "medium"
status: "resolved"
resolved_in: "v1.1.10"
tags:
  - css
  - attribute-selector
  - case-sensitivity
  - webflow-embed
  - data-attributes
  - flexbox
  - works-detail
  - mis-diagnosis
  - investigation-process
---

# CSS attribute selector case-sensitivity broke data-alignment="Right" layout

## Problem

The project-info button on Works detail pages (e.g. `/works/echo`) rendered white over image rows where two narrow images visually clustered on the left side of the viewport, instead of correctly rendering blue (its over-light-background state). Root cause was a one-character mismatch in a Webflow custom-code CSS attribute selector — but the visible symptom was so similar to "the JS heuristic is wrong" that the JS was edited twice before the CSS was checked.

## Symptoms

- On `/works/echo` (and other Works detail pages with paired narrow images), scrolling past certain image rows showed a white button against a light background — visually invisible.
- DevTools inspection revealed image pairs marked `data-alignment="Left"` and `data-alignment="Right"` in markup, but both rendered flush-left visually with empty viewport space on the right.
- The JS `coversRight()` check in `src/utils/projectInfoButton.ts` correctly identified the `Right`-aligned image as covering the right zone, so the JS logic *was* doing what it was told — but what it was told didn't match what the user saw on screen.
- Bug reproduced consistently in both the deployed `@v1.1.9` bundle and the local `pnpm run dev` bundle, ruling out cache / freshness as a cause.

## What Didn't Work

1. **Removed the `if (alignedCount >= 2) anyCoversRight = true` compensation line in `src/utils/projectInfoButton.ts`.** Assumed the JS was over-firing on `Left + Left` pairs. **Why it failed:** `/works/echo` had zero `Left + Left` pairs in markup — every pair was `Left + Right`. The "two left-aligned narrows" was a *visual* observation of where the images sat on screen, not a reading of the underlying `data-alignment` attribute values.
2. **Investigated whether jsDelivr was serving a stale bundle.** Fetched the live page, confirmed `@v1.1.9` was the served bundle, planned a deploy. **Why it failed:** the user was already loading the dev bundle via `pnpm run dev` into Webflow's custom code, so freshness was never the issue — the JS was up-to-date and still produced the wrong visual result, because the JS was never the bug.
3. **Proposed replacing the attribute-based heuristic with a `getBoundingClientRect()` geometric overlap check.** **Why deferred:** the user inspected the live page in DevTools and found the real CSS bug before this JS-side rewrite was implemented — at which point the rewrite became unnecessary.

## Solution

**One-line CSS fix** in the Webflow Site Settings → Custom Code → Head `<style>` block:

```css
/* Before — never matched, because markup is data-alignment="Right" */
[data-alignment='right'] { margin-left: auto; }

/* After — case-insensitive match flag */
[data-alignment='right' i] { margin-left: auto; }
```

**Follow-up JS cleanup** in `src/utils/projectInfoButton.ts` — removed the compensation line that was papering over the CSS bug:

```ts
// Removed in v1.1.10 — was masking the real CSS attribute-selector bug
if (alignedCount >= 2) anyCoversRight = true
```

Shipped together as v1.1.10.

## Why This Works

CSS attribute selectors are **case-sensitive by default** per the CSS Selectors Level 4 spec for author-defined attributes. `data-*` attributes are author-defined, so `[data-alignment='right']` only matches the exact lowercase string `right`. The `i` flag inside the brackets (`[attr='value' i]`) explicitly opts into ASCII case-insensitive matching — `Right`, `right`, `RIGHT` all match.

Webflow's Option fields render their value as the human-readable label (`Right`, `Left`, `Default`) — capitalized for display in both the Designer panel and the rendered markup. The CMS author sees "Right" in the editor and assumes the markup matches; the developer writes `'right'` in CSS by reflex (lowercase is the JS/CSS convention). The mismatch is invisible — no error, no warning, just a silently-missing rule — until something visually breaks.

The cascade hid the real bug: because `Right`-aligned narrows never received `margin-left: auto`, they sat next to `Left`-aligned narrows in normal flex flow, looking like two left-clustered images. Someone (correctly) noticed the JS produced the wrong button color on those rows and added the `alignedCount >= 2` compensation, which made the symptom go away for the common case while leaving the underlying CSS bug intact. Fixing the CSS made the compensation actively wrong (it would force the button white over genuine `Left + Left` pairs that legitimately sit on the left and leave the right empty).

## Prevention

- **Suspect CSS before JS when debugging visual layout** — particularly when the JS reading the DOM is correct but the rendered result disagrees with the markup. The DOM is the source of truth; if JS reads it correctly and still produces a "wrong" result, the visual rendering layer is lying.
- **Use the `i` flag on attribute selectors whenever the value comes from CMS, Webflow Options, user content, or anywhere case is not under your direct control:** `[data-foo='bar' i]`. Cheap insurance against future casing drift. (auto memory — `feedback_nav_simplicity.md` reinforces the same boundary: JS for state, CSS for styling; when JS appears to be doing layout work, suspect CSS first.)
- **Treat heuristic / compensation JS as a leading indicator of broken CSS.** Lines like "if N elements match, assume X" usually paper over a layout primitive that isn't doing its job. Fix the primitive, then delete the compensation. If the compensation predates you, assume its existence is *evidence* that the primitive was once broken — verify whether it still is, and whether the compensation is still correct given the current CSS state.
- **DevTools verification ritual** when an attribute-driven style "isn't working":
  1. Inspect the live element — read the actual attribute value, noting casing exactly.
  2. In the Styles pane, type the selector into the filter to confirm a matching rule exists for *this specific element*. If the rule shows up under "Matched CSS Rules", it's firing; if it only appears in the source `<style>` block but not in the element's matched rules, the selector isn't matching.
  3. If no match, check casing and operator (`=` vs `~=` vs `*=` vs `^=`) before assuming the rule is missing or has a specificity problem.
- **For any Webflow project that consumes Option-field values via attribute selectors,** make `[attr='value' i]` the default convention. Reserve the case-sensitive form for cases where casing carries meaning.

## Related Issues

- [`docs/reference/gallery-layouts.md`](../../reference/gallery-layouts.md) — Canonical reference for the `data-layout` / `data-alignment` CMS Option system. Worth adding a one-line "Gotcha: CSS attribute selectors are case-sensitive — match the Webflow Option casing exactly or use the `i` flag" note here so the warning lives at the point of use, not only here in docs/solutions/.
- [`docs/solutions/integration-issues/finsweet-cms-filter-webflow-setup.md`](../integration-issues/finsweet-cms-filter-webflow-setup.md) — Sibling lesson: Finsweet category strings "must match exactly between filter UI and CMS item elements (case-sensitive)". Same family of bug (Webflow Option field value casing breaking attribute matching), different surface area.
- Git history: `src/utils/projectInfoButton.ts` has only 2 commits prior to v1.1.10 (`b699fb4` initial, `821b0ab` release bump) — no prior JS-side fix attempts, consistent with the bug having been visible-but-uncaught rather than repeatedly mis-fixed in code.
