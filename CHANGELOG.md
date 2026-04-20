# figma-to-webflow-pipeline

## 1.0.2

### Patch Changes

- Restore the developer's original home sticky text reveal code. v1.0.1 still used an `autoSplit + onSplit` wrapper with a single `gsap.to`; the developer's pattern is `const split = new SplitText(h2, { types: 'words, lines' })` + manual `overflow: hidden` on `split.lines` + a `gsap.timeline()` driven by a separate `ScrollTrigger.create({ animation: tl })`. Only structural simplifications applied (dropped IIFE wrapper, `__loadedScripts` dedup, `readyState` bootstrap, `onLayoutReady` shim). Fixes "sky bar" and similar short titles wrapping onto two lines.

## 1.0.1

### Patch Changes

- Fix word breaking in home sticky text reveal. The previous pass used `mask: 'lines'` which wraps each line in an extra `overflow: hidden; display: inline-block` div — that nested wrapper changed inline flow and forced words like "sky bar" onto separate lines. Reverted to the original behavior: no `mask` option, set `overflow: hidden` on `self.lines` manually inside `onSplit`. Keeps `autoSplit: true` for font-load robustness.

## 1.0.0

### Major Changes

- Migrate to single-bundle pier-point architecture. All 25 per-module IIFE scripts + polling loaders + Webflow-MCP-registered entries are retired. Source now lives in `src/` with a single `src/index.ts` entry that imports each module as a named export and boots them inside `window.Webflow.push(() => { ... })`. Build produces one minified `dist/index.js` served via jsDelivr at `https://cdn.jsdelivr.net/gh/sanindooo/nga-webflow-website@vX.Y.Z/dist/index.js`, loaded by a single `<script src>` in Webflow Site Settings footer. Removed: `window.onLayoutReady` queue, `window.scheduleLayoutInvalidation`, `layoutReady`/`layoutChanged` events, `stop/start/resizeSmoothScroll` window globals, `__loadedScripts` dedup guards, `pollGlobal` loader scaffolding, `scripts/` TypeScript tree, `scripts/manifest.json`. Cross-module calls (e.g. modals calling smooth-scroll stop/start) now use ES imports instead of window globals. Breaking for deploy: Webflow Site Settings footer must be switched from the N per-script loader stubs to one tag pointing at the new jsDelivr URL.
