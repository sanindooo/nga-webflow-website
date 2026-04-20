---
title: "Single-bundle pier-point migration: retiring per-script polling loaders"
date: "2026-04-20"
category: "integration-issues"
component: "src/, dist/, Webflow Site Settings"
tags: [bundle, esbuild, webflow, gsap, split-text, lenis, scrolltrigger, jsdelivr, migration, pier-point, architecture]
severity: "high"
root_cause: "The legacy architecture shipped 25 standalone IIFE scripts, each registered as a separate inline loader via Webflow MCP, each polling for its CDN dependency, each with its own dedup guard + readyState gate + typeof CDN guard. Every deploy required delete-all + re-register-all because Webflow stacks script versions. The complexity existed to compensate for per-script independence — not because the scripts needed it."
date_resolved: "2026-04-20"
---

# Single-bundle pier-point migration

## Problem

25 scripts, each:
- Wrapped in an IIFE with `'use strict'`
- Gated by `typeof gsap === 'undefined' return`
- Guarded by `window.__loadedScripts['name']` dedup
- Dispatched via `readyState === 'loading'` check
- Registered as an inline polling loader via Webflow MCP `add_inline_site_script`
- Coordinated across modules via `window.onLayoutReady` / `__layoutReadyQueue` / `scheduleLayoutInvalidation` / `layoutChanged` events

Every script version bump required:
1. `delete_all_site_scripts` (Webflow stacks, does not replace)
2. Re-register every loader at a new unique version
3. Audit every page for stale page-level duplicates
4. Publish

Per-script polling loaders existed because dynamically created `<script>` elements ignore `s.defer=true` — dependency ordering had to be enforced by polling `typeof SplitText === 'undefined'` until the CDN global resolved.

## Root cause

The complexity was a consequence of the *distribution mechanism* (N independent scripts injected async), not the feature code. A single bundle loaded by a single `<script src>` placed after the CDN tags in Webflow's footer has none of these races — the module callbacks run in dependency order inside a single `Webflow.push` tick.

User's framing: "I feel like I've never once had to use any of these extra things to get code to work when bundling into one JavaScript file. All of that is a lot of excess jargon that we don't need."

## Solution

### Architecture

```
src/
├── index.ts              ← single entry: imports every module, wires into Webflow.push
├── utils/{name}.ts       ← one file per feature, named export
└── types/*.d.ts          ← ambient declarations for CDN globals
bin/
└── build.js              ← esbuild: bundle:true, IIFE, minified, target es2020
dist/
└── index.js              ← committed; jsDelivr serves from git tag
.changeset/               ← version bumps
```

### Module pattern (mandatory)

```ts
// src/utils/featureName.ts
export const featureName = () => {
  const root = document.querySelector<HTMLElement>('.selector')
  if (!root) return  // selector-presence guard — the ONLY guard needed
  // CDN globals are ambient and guaranteed defined inside Webflow.push
}
```

### Entry point

```ts
// src/index.ts
import { featureA } from './utils/featureA'
import { featureB } from './utils/featureB'
// ...

window.Webflow ||= []
window.Webflow.push(() => {
  featureA()
  featureB()
  // ...
})
```

`Webflow.push` fires after DOMContentLoaded + Webflow.js init, which is after Webflow's parser-inserted CDN tags for GSAP/ScrollTrigger/Lenis/SplitText/Swiper have executed. Every ambient global is resolved.

### Webflow footer (one line)

```html
<script src="https://cdn.jsdelivr.net/gh/sanindooo/nga-webflow-website@v1.0.2/dist/index.js"></script>
```

Deploy = bump changeset, tag, push, edit the version in the footer, publish.

### What was stripped

All of the following were deleted from every module:

- IIFE wrapper + `'use strict'`
- `typeof gsap === 'undefined' return` CDN guards
- `window.__loadedScripts` dedup guards
- `document.readyState === 'loading'` gates
- `window.onLayoutReady` queue + fallback timers
- `window.__layoutReadyQueue`, `__layoutReadyFired`, `__layoutReadyOwner`
- `ensureOnLayoutReady()` shims
- `window.scheduleLayoutInvalidation()`
- `layoutReady` / `layoutChanged` custom events
- `data-lenis-resize` opt-in attribute (replaced by blanket image watcher inside `gsapSmoothScroll`, or inlined at call sites)
- Per-script `ScrollTrigger.registerPlugin()` calls (Webflow's CDN auto-registers)
- `scripts/manifest.json`, `scripts/src/`, `scripts/dist/`, `pollGlobal` fields, polling loader stubs
- `.claude/skills/deploy-scripts/` and `.claude/skills/custom-code-management/` (retired)

What remained: the feature code itself, cleaned of architectural scaffolding.

## Investigation steps

1. **Retired the MCP script-registration flow.** Webflow MCP stacking (every `add_inline_site_script` appends a new applied copy) was a permanent tax. Moving to a single footer `<script src>` reduced deploy to editing one URL.

2. **Replaced polling loaders with `Webflow.push`.** The bundle loads *after* Webflow's CDN tags. The `Webflow.push` callback is guaranteed to run after those tags execute — no polling needed.

3. **Dropped layout coordination primitives.** The only legitimate coordinator was Lenis smooth scroll setup, which runs first in `src/index.ts`. All downstream modules assume Lenis is already wired. Any module that mutates layout after animations settle can call `ScrollTrigger.refresh(true)` inline at the point of mutation — no event bus required.

4. **Preserved dev's feature code verbatim.** *This is the critical learning.* Initial migration over-eagerly rewrote SplitText calls to use `autoSplit: true` + `onSplit` callbacks. That was a regression:
   - User feedback: "We should be using the original code that my developer wrote. The only thing that was changing was the simplification."
   - Migrations must strip architectural scaffolding (IIFE, dedup, guards, coordination) and *nothing else*. Feature logic, animation timing, SplitText option shapes, ScrollTrigger config — all untouched.

5. **Cut v1.0.0 once build was clean.** Single breaking-change tag. Subsequent patches (v1.0.1, v1.0.2) fixed over-migration regressions by restoring dev's exact SplitText calls.

## Over-migration regression detail

v1.0.0 shipped `homeTextSticky.ts` with:

```ts
new SplitText(heading, {
  types: 'words, lines',
  mask: 'lines',        // ← added during migration
  autoSplit: true,      // ← added during migration
  onSplit: (self) => {  // ← added during migration
    return gsap.fromTo(self.words, { y: '110%' }, { y: '0%', stagger: 0.1 })
  }
})
```

Dev's original was:

```ts
const split = new SplitText(titleWrapper.querySelector('h2')!, { types: 'words, lines' })
gsap.set([split.lines, arrow?.parentElement], { overflow: 'hidden' })
gsap.set([split.words, arrow], { y: '110%' })
// ... timeline built around `split` directly ...
```

`mask: 'lines'` wrapped each line in an additional `<div style="overflow:hidden; display:inline-block">`, producing two nested inline-block layers. Short phrases like "sky bar" wrapped onto a new line. See `memory/feedback_splittext_mask_lines.md` for the mask bug specifics.

v1.0.2 restored the original code exactly. Lesson: a migration is a *mechanical* operation on wrappers; it is not a refactor of what the wrappers contain.

## Deploy workflow (new)

```bash
# 1. Author changes in src/utils/**
# 2. Add a changeset
pnpm changeset       # select patch / minor / major
pnpm changeset version   # bumps package.json + CHANGELOG; does NOT commit or tag

# 3. Build + verify
pnpm run build
pnpm run check

# 4. Commit + tag + push
git add -A
git commit -m "release vX.Y.Z"
git tag vX.Y.Z       # changesets does NOT auto-tag — manual step
git push && git push --tags

# 5. Wait for jsDelivr to resolve the tag
curl -I https://cdn.jsdelivr.net/gh/sanindooo/nga-webflow-website@vX.Y.Z/dist/index.js

# 6. Edit the <script src> in Webflow Site Settings → Custom Code → Footer
# 7. Publish site
```

**Known failure mode:** `pnpm changeset version` does NOT create a git tag despite what the CLI suggests. The changesets config has `"commit": false`, so version-bumping writes files but leaves them staged. Always tag manually.

## Prevention strategies

- **Never reintroduce coordination primitives.** If a feature seems to need `onLayoutReady` or `scheduleLayoutInvalidation`, the correct move is to inline the dependency (e.g. `await document.fonts.ready`, or call `ScrollTrigger.refresh(true)` inline after a DOM mutation). Coordination primitives were a workaround for per-script independence that no longer exists.
- **Never add CDN `typeof` guards to modules.** They exit permanently when the bundle races ahead of a dependency — which never happens under `Webflow.push` but *would* if the bundle ever loaded before the CDN tags. The correct protection is script-tag ordering in the Webflow footer, not in-module guards.
- **Never add dedup guards.** The bundle is loaded exactly once from a single `<script src>`. Double-init is physically impossible.
- **When porting legacy scripts into the bundle, strip scaffolding only.** Preserve SplitText option names (plural `types:` not singular `type:` — silent no-op if wrong), GSAP animation shapes, ScrollTrigger config, and all timing/easing values. If in doubt, `git log -p scripts/src/global/<name>.js` for the developer's original.
- **Type declarations are authoritative.** See the `type-sync` skill for keeping `src/types/*.d.ts` in step with what modules actually call. Don't second-guess `tsc` with regex or heuristics.

## References

- `src/index.ts` — entry point that imports every module
- `src/utils/*.ts` — 25 feature modules
- `bin/build.js` — esbuild config
- `CLAUDE.md` → Custom Code Delivery — canonical module pattern documentation
- `.claude/skills/webflow-deploy/SKILL.md` — tag-and-push workflow
- `.claude/skills/type-sync/SKILL.md` — declaration-maintenance skill
- `memory/feedback_bundle_no_coordination.md` — the "strip scaffolding" rule
- `memory/feedback_splittext_mask_lines.md` — the mask regression that surfaced the over-migration pattern
