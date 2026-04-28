# figma-to-webflow-pipeline

## 1.0.15

### Patch Changes

- Mobile nav dropdown links close the nav on click; default and split-text
  sliders auto-play; general scroll reveal handles button blocks without
  breaking icon hover; hero text reveal accepts additional element selectors.

## 1.0.14

### Patch Changes

- Animation bug fixes

## 1.0.13

### Patch Changes

- Promote every `loading="lazy"` image to `eager` before gating ScrollTrigger creation, so the browser fetches all images upfront and the gate waits for all of them. Eliminates the iOS Safari race where mid-scroll lazy loads (particularly below-fold CMS team images on /studio) shifted layout after ScrollTrigger had cached start/end positions, causing reveals to fire at wrong scroll points. Trades initial bandwidth for deterministic layout.

## 1.0.12

### Patch Changes

- Defer ScrollTrigger-creating modules until eager images finish loading so start/end positions are measured against final layout. Follows Jack Doyle's recommended pattern; targets iOS Safari premature-animation bug where refresh-after-the-fact was insufficient.

## 1.0.11

### Patch Changes

- revert: remove invalidateOnRefresh - caused animations to re-trigger

## 1.0.10

### Patch Changes

- fix: add invalidateOnRefresh to ScrollTrigger configs for text reveal

## 1.0.9

### Patch Changes

- fix: disable Lenis on mobile - use native scroll for accurate ScrollTrigger positions

## 1.0.8

### Patch Changes

- revert: remove normalizeScroll - caused jittery scrolling with Lenis

## 1.0.7

### Patch Changes

- fix: add ScrollTrigger.normalizeScroll for mobile animation timing

## 1.0.6

### Patch Changes

- fix: platform-specific ScrollTrigger refresh to prevent mobile scroll jank

  Desktop uses immediate refresh for accurate animation timing. Mobile uses soft refresh that waits for scroll to end, preventing layout recalculation jank. Also adds ignoreMobileResize config to prevent refresh on address bar show/hide.

## 1.0.5

### Patch Changes

- update: add client feedback round 2

## 1.0.4

### Patch Changes

- fix: add layered `ScrollTrigger.refresh()` hooks in `gsapSmoothScroll.ts` to defend against stale trigger positions from late image/asset loads. Previously on `/studio`, every `[scroll-text-reveal]` element below the principals section fired its SplitText line-reveal prematurely under slow-load conditions — because ScrollTrigger caches each trigger's `start`/`end` at creation and its built-in `autoRefreshEvents` (resize / load / DCL) don't cover DOM-driven height changes from late asset loads. Three redundant refresh hooks now cover the gaps: body `ResizeObserver`, `window.load`, and per-image `load` listeners (with the Safari `.complete && naturalWidth > 0` check). See `docs/solutions/integration-issues/scrolltrigger-stale-positions-late-image-loads.md` for the full diagnosis.
- update: action client feedback site-wide (pending from prior session, rolled into this release — the v1.0.3 tag was cut but changeset-version / package-bump never ran for it, so shipping together).

## 1.0.2

### Patch Changes

- Restore the developer's original home sticky text reveal code. v1.0.1 still used an `autoSplit + onSplit` wrapper with a single `gsap.to`; the developer's pattern is `const split = new SplitText(h2, { types: 'words, lines' })` + manual `overflow: hidden` on `split.lines` + a `gsap.timeline()` driven by a separate `ScrollTrigger.create({ animation: tl })`. Only structural simplifications applied (dropped IIFE wrapper, `__loadedScripts` dedup, `readyState` bootstrap, `onLayoutReady` shim). Fixes "sky bar" and similar short titles wrapping onto two lines.

## 1.0.1

### Patch Changes

- Fix word breaking in home sticky text reveal. The previous pass used `mask: 'lines'` which wraps each line in an extra `overflow: hidden; display: inline-block` div — that nested wrapper changed inline flow and forced words like "sky bar" onto separate lines. Reverted to the original behavior: no `mask` option, set `overflow: hidden` on `self.lines` manually inside `onSplit`. Keeps `autoSplit: true` for font-load robustness.

## 1.0.0

### Major Changes

- Migrate to single-bundle pier-point architecture. All 25 per-module IIFE scripts + polling loaders + Webflow-MCP-registered entries are retired. Source now lives in `src/` with a single `src/index.ts` entry that imports each module as a named export and boots them inside `window.Webflow.push(() => { ... })`. Build produces one minified `dist/index.js` served via jsDelivr at `https://cdn.jsdelivr.net/gh/sanindooo/nga-webflow-website@vX.Y.Z/dist/index.js`, loaded by a single `<script src>` in Webflow Site Settings footer. Removed: `window.onLayoutReady` queue, `window.scheduleLayoutInvalidation`, `layoutReady`/`layoutChanged` events, `stop/start/resizeSmoothScroll` window globals, `__loadedScripts` dedup guards, `pollGlobal` loader scaffolding, `scripts/` TypeScript tree, `scripts/manifest.json`. Cross-module calls (e.g. modals calling smooth-scroll stop/start) now use ES imports instead of window globals. Breaking for deploy: Webflow Site Settings footer must be switched from the N per-script loader stubs to one tag pointing at the new jsDelivr URL.
