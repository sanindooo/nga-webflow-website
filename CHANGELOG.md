# figma-to-webflow-pipeline

## 1.0.0

### Major Changes

- Migrate to single-bundle pier-point architecture. All 25 per-module IIFE scripts + polling loaders + Webflow-MCP-registered entries are retired. Source now lives in `src/` with a single `src/index.ts` entry that imports each module as a named export and boots them inside `window.Webflow.push(() => { ... })`. Build produces one minified `dist/index.js` served via jsDelivr at `https://cdn.jsdelivr.net/gh/sanindooo/nga-webflow-website@vX.Y.Z/dist/index.js`, loaded by a single `<script src>` in Webflow Site Settings footer. Removed: `window.onLayoutReady` queue, `window.scheduleLayoutInvalidation`, `layoutReady`/`layoutChanged` events, `stop/start/resizeSmoothScroll` window globals, `__loadedScripts` dedup guards, `pollGlobal` loader scaffolding, `scripts/` TypeScript tree, `scripts/manifest.json`. Cross-module calls (e.g. modals calling smooth-scroll stop/start) now use ES imports instead of window globals. Breaking for deploy: Webflow Site Settings footer must be switched from the N per-script loader stubs to one tag pointing at the new jsDelivr URL.
