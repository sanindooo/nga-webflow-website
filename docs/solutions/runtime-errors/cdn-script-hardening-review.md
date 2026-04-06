---
title: "CDN script hardening: Lenis scroll height, init guards, SplitText cleanup, dependency checks"
date: "2026-04-06"
category: "runtime-errors"
component: "scripts/src"
tags: [lenis, gsap, scroll-trigger, split-text, swiper, dom-content-loaded, ready-state, cdn-guard, dedup-guard, type-errors, code-quality, debounce, lazy-loading, cms-images, code-review]
severity: "high"
root_cause: "Multiple compounding issues: Lenis scroll height miscalculated due to lazy-loaded CMS images and incorrect use of ScrollTrigger.refresh() mid-scroll; inconsistent DOMContentLoaded initialization patterns causing silent failures with async CDN loading; missing CDN dependency guards; SplitType DOM bloat from unreversed instances; TypeScript type mismatches"
date_resolved: "2026-04-06"
commit: "53d425f"
---

# CDN Script Hardening Review

## Problem

Eleven TypeScript scripts powering a Webflow site exhibited a cluster of reliability and correctness issues:

**Symptoms:**
- Users could not scroll to the footer on CMS-heavy pages (Lenis scroll height miscalculation)
- Scripts silently failed to initialize on roughly half of page loads (no consistent DOM-ready pattern)
- Text layout broke and memory grew after repeated slide transitions (SplitText DOM bloat)
- Uncaught `ReferenceError` crashes when ad blockers or CDN outages prevented GSAP/Lenis/Swiper from loading
- TypeScript compilation failures from undeclared globals and incorrect type signatures
- Abbreviated variable names, leaked functions, and dead code across multiple files

## Investigation Steps

### Lenis Scroll Height (P1)

1. **Hypothesis: Parse image dimensions from Webflow CDN URLs.** Attempted to extract `_{width}x{height}` from the URL to set explicit dimensions before Lenis measured the page. **Result: Failed.** Webflow CDN URLs do not encode dimension data in the filename. URLs look like `https://cdn.prod.website-files.com/.../69bfe1fe26436fca7260749c_news-beach-club-townhouses.png`.

2. **Hypothesis: Use ScrollTrigger to detect when the image section enters the viewport, then refresh.** Created a ScrollTrigger on `[data-lenis-resize]` sections that called `lenis.resize()` + `ScrollTrigger.refresh()` after images loaded. **Result: Made the problem worse.** User could no longer scroll past the section at all. `ScrollTrigger.refresh()` recalculates every trigger's start/end positions. When called during active scrolling, it conflicts with Lenis's virtual scroll position — the recalculated positions effectively lock the user inside the current section.

3. **Hypothesis: Listen for image load events directly, resize Lenis only.** Attached `load`/`error` listeners to images inside `[data-lenis-resize]` sections. Debounced via `requestAnimationFrame`. Called only `lenis.resize()`, never `ScrollTrigger.refresh()`. **Result: Working fix.** (auto memory [claude])

### Silent Script Failures (P2)

Audited all 11 scripts and found three distinct initialization patterns:

| Pattern | Scripts | Problem |
|---|---|---|
| `document.addEventListener('DOMContentLoaded', init)` | 6 scripts | Fails silently when script loads after event has already fired |
| No guard at all | 3 scripts | DOM queries execute immediately on parse, finding nothing if elements don't exist yet |
| `readyState` check | 2 scripts | Correct — handles both early and late loading |

The `DOMContentLoaded` event fires exactly once. If a `defer`/`async` script arrives after the document is already interactive, the listener is attached to an event that will never fire again. The callback is silently lost.

### SplitText Accumulation (P1)

In `swiperSliders.ts`, every call to `animateSlide()` created `new SplitType(element)`, which wraps each word in a `<span>`. The previous SplitType instance was never reverted. Over N slide transitions, each text element accumulated N layers of wrapper spans. This caused visible layout breakage and unbounded DOM growth.

### Code Review Audit

A 4-agent parallel review (TypeScript quality, pattern recognition, performance, simplicity) identified the full scope of issues across all 11 scripts.

## Root Cause

No standardized script boilerplate. Each script was written ad hoc with different assumptions about load timing, dependency availability, and cleanup responsibilities. The Lenis issue was a specific interaction: `ScrollTrigger.refresh()` must never be called during active Lenis scrolling because it repositions all triggers based on native scroll height, which Lenis has virtualized.

## Solution

### 1. Lenis Scroll Height Fix

Mark CMS sections with lazy-loaded images using `data-lenis-resize` in the Webflow Designer. The smooth scroll script listens for image load completions and recalculates Lenis's internal page height.

```ts
let resizeScheduled = false
const scheduleResize = () => {
  if (resizeScheduled) return
  resizeScheduled = true
  requestAnimationFrame(() => {
    lenis.resize()
    resizeScheduled = false
  })
}

function initImageListeners() {
  document.querySelectorAll<HTMLElement>('[data-lenis-resize]').forEach((section) => {
    section.querySelectorAll<HTMLImageElement>('img').forEach((image) => {
      if (!image.complete) {
        image.addEventListener('load', scheduleResize, { once: true })
        image.addEventListener('error', scheduleResize, { once: true })
      }
    })
  })
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initImageListeners)
} else {
  initImageListeners()
}
```

**Critical rule:** Never call `ScrollTrigger.refresh()` while Lenis is actively scrolling. Only call `lenis.resize()` for dynamic content changes.

### 2. Standardized DOM-Ready Pattern

Every script uses this initialization pattern, which handles both cases — loaded before or after DOM parsing completes:

```ts
function init() {
  // all script logic here
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init)
} else {
  init()
}
```

### 3. SplitType Instance Tracking and Cleanup

Track SplitType instances per slide element. Revert before re-splitting to prevent DOM bloat.

```ts
const splitInstances = new Map<HTMLElement, SplitTypeInstance[]>()

const revertSplits = (slide: HTMLElement) => {
  const instances = splitInstances.get(slide)
  if (instances) {
    instances.forEach((instance) => {
      if ((instance as any).revert) (instance as any).revert()
    })
    splitInstances.delete(slide)
  }
}

const animateSlide = (slide: HTMLElement) => {
  revertSplits(slide) // clean up previous splits first
  // ... create new splits and animate ...
  splitInstances.set(slide, newInstances)
}
```

### 4. CDN Dependency Guards

Every script checks for its external dependencies before executing. Place immediately inside the IIFE, before the dedup guard:

```ts
// For GSAP-dependent scripts:
if (typeof gsap === 'undefined') return

// For Lenis-dependent scripts:
if (typeof gsap === 'undefined' || typeof Lenis === 'undefined') return

// For SplitText-dependent scripts:
if (typeof gsap === 'undefined' || typeof SplitText === 'undefined') return
```

### 5. Type Declaration Fixes

Added `SplitType` as a declared global alias (same constructor interface as `SplitText`):

```ts
declare const SplitType: SplitTypeConstructor
```

Fixed `gsap.timeline()` to accept an optional config object:

```ts
timeline: (vars?: Record<string, unknown>) => GsapTimeline
```

Added `resize()` to `LenisInstance` interface. Added `__loadedScripts` to `Window` interface. Removed unused `SwiperNavigationModule`/`SwiperPaginationModule` stubs.

### 6. Code Quality

- Moved `setInitialStates`/`animateSlide` inside the IIFE in `swiperSliders.ts`
- Renamed `w` to `wrapper`, `t` to `toggle` in `viewSwitcher.ts`
- Removed commented-out dead code in `navToggle.ts`
- Removed inconsistent `gsap.registerPlugin()` calls (Webflow CDN auto-registers)
- Deleted obsolete `splitText.ts` (replaced by `generalScrollTextReveal.ts`)
- Added `.prettierrc` for consistent formatting (single quotes, no semicolons)

## Key Code Patterns

### Standard Script Boilerplate

This is the canonical template that every script in the starter template must follow:

```ts
/**
 * Script Name
 *
 * One-line description.
 * Dependencies: GSAP, ScrollTrigger (list all CDN deps)
 */

;(function () {
  'use strict'

  // 1. CDN DEPENDENCY GUARD — silent exit if blocked by ad blocker or CDN outage
  if (typeof gsap === 'undefined') return

  // 2. DEDUP GUARD — prevents double-init via ngrok + CDN
  const __s = ((window as any).__loadedScripts ??= {})
  if (__s['scriptName']) return; __s['scriptName'] = true

  // 3. INIT FUNCTION — all DOM queries and logic inside here
  function init() {
    const targetSection = document.querySelector<HTMLElement>('.section_component')
    if (!targetSection) return

    // script logic...
  }

  // 4. DOM-READY DISPATCH — handles async CDN load timing
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init)
  } else {
    init()
  }
})()
```

### Mandatory Checklist for Every New Script

1. CDN dependency guard with `typeof` check for every external global
2. Dedup guard with key matching `manifest.json` name
3. `readyState` check — never bare `DOMContentLoaded`
4. All functions declared inside the IIFE
5. Descriptive variable names — minification handles compression
6. SplitType instances tracked and reverted before re-splitting
7. Never call `ScrollTrigger.refresh()` during active Lenis scrolling
8. `{ once: true }` on one-shot event listeners (image load, transitionend)

## Prevention Strategies

### Lenis + ScrollTrigger Integration
- [ ] Never call `ScrollTrigger.refresh()` directly when Lenis is active — use `lenis.resize()` debounced via `requestAnimationFrame`
- [ ] Lenis owns scroll position; ScrollTrigger reads it via `lenis.on('scroll', ScrollTrigger.update)` — never invert this
- [ ] For lazy-loaded images, use `data-lenis-resize` attribute and listen for load/error events directly

### Script Initialization Timing
- [ ] Never use bare `addEventListener('DOMContentLoaded', ...)` in CDN-loaded scripts
- [ ] Always use the `readyState` gate pattern
- [ ] Audit every script for this pattern during code review — it is the single most common silent failure

### SplitText Lifecycle Management
- [ ] Store every SplitText instance in a Map keyed by element
- [ ] Before re-splitting any element, call `.revert()` on the existing instance first
- [ ] Never split an element that is already split without reverting

### CDN Dependency Guards
- [ ] Check every CDN global with `typeof` before use — direct reference throws `ReferenceError`
- [ ] Place guards before the dedup guard so they execute even on first load
- [ ] List all CDN dependencies in the script's doc comment

### Type Declaration Maintenance
- [ ] When adding a new method call on a CDN global, update the `.d.ts` file in the same commit
- [ ] Run `pnpm run typecheck` before every commit
- [ ] Keep `SplitType` and `SplitText` both declared as aliases (both libraries may be in use)

## CLAUDE.md Updates Recommended

1. **Add DOM-ready gate as mandatory** in the Custom Code Delivery section, alongside the dedup guard
2. **Add CDN dependency guard as mandatory** — `typeof` check before using any CDN global
3. **Add Lenis + ScrollTrigger rule** — never `ScrollTrigger.refresh()` during active scroll
4. **Add SplitText lifecycle rule** — always `.revert()` before re-splitting
5. **Update the boilerplate example** to include all four mandatory patterns (CDN guard, dedup guard, readyState gate, init function)

## Template Checklist

For the starter template that future Webflow projects clone from:

- [ ] Boilerplate file at `scripts/src/_template.ts` with all mandatory patterns
- [ ] `.d.ts` declarations for all standard CDN libraries (GSAP, ScrollTrigger, Lenis, SplitText, Swiper)
- [ ] `.prettierrc` with single quotes, no semicolons, trailing commas
- [ ] `pnpm run typecheck` wired into pre-commit hook or CI
- [ ] Lenis smooth scroll script with `data-lenis-resize` image listener built in
- [ ] No `ScrollTrigger.refresh()` calls anywhere in template code

## Related Documentation

- `CLAUDE.md` (Custom Code Delivery) — primary source of truth for script conventions
- `.claude/skills/deploy-scripts/SKILL.md` — full deployment workflow
- `.claude/skills/custom-code-management/SKILL.md` — script management operations
- `docs/solutions/integration-issues/mcp-api-gap-asset-pipeline.md` — same architecture pattern (script + skill wrapper)
- `docs/template-learnings.md` — L4-L6 entries about CDN delivery quirks
- `docs/plans/2026-03-14-feat-custom-code-delivery-workflow-plan.md` — original implementation plan
