---
name: custom-code-management
description: >
  Manages custom JavaScript delivery for Webflow sites via jsDelivr CDN.
  Reads the component-to-script manifest, writes JS files, constructs jsDelivr
  URLs, and injects script tags into Webflow pages using data_scripts_tool.
  Triggers on "add custom script", "inject script", "custom code", or when
  build-component detects a component needs JS.
allowed-tools:
  - mcp__webflow__data_scripts_tool
  - mcp__webflow__data_sites_tool
  - mcp__webflow__data_pages_tool
  - Read
  - Write
  - Edit
  - Glob
  - Grep
  - "Bash(curl:*)"
  - "Bash(shasum:*)"
  - "Bash(openssl:*)"
  - "Bash(base64:*)"
---

# Custom Code Management

You manage custom TypeScript/JavaScript delivery for Webflow sites. Source files
live in `scripts/src/` (TypeScript), compiled output goes to `scripts/dist/`
(JS), served via jsDelivr CDN from GitHub release tags, and injected into
Webflow pages using `data_scripts_tool`.

## Project Structure

```
scripts/
├── src/                          ← TypeScript source (edit here)
│   ├── global/{name}.ts          ← site-wide scripts
│   └── components/{name}.ts      ← per-component scripts
├── dist/                         ← compiled JS output (jsDelivr serves from here)
│   ├── global/{name}.js
│   └── components/{name}.js
├── build.mjs                     ← esbuild config
└── manifest.json                 ← script registry (paths point to dist/)
```

**Build commands:**
- `pnpm run build` — compiles `.ts` → minified `.js` IIFE
- `pnpm run typecheck` — validates types without emitting

## CRITICAL: How data_scripts_tool Works

**Spike completed 2026-03-14.** See `docs/spike-results.md` for full details.

### The tool only supports inline scripts (not external URLs)

`add_inline_site_script` accepts a `sourceCode` string (max 2000 chars). There is
NO action for external `<script src>` tags. **Workaround: use a loader stub** — a
small inline script that dynamically creates a `<script>` element pointing to jsDelivr.

### Loader stub template (with SRI)

```javascript
(function(){var s=document.createElement('script');s.src='https://cdn.jsdelivr.net/gh/{user}/{repo}@{version}/{path}';s.integrity='{integrity}';s.crossOrigin='anonymous';s.defer=true;document.head.appendChild(s);})()
```

~220 chars — safely under the 2000-char limit. One loader per jsDelivr script.

### Two-step workflow: register then apply

1. `add_inline_site_script` → registers the loader, returns an `id`
2. `upsert_page_script` → applies by `id` to a specific page

### upsert_page_script IS DESTRUCTIVE (replaces all)

`upsert_page_script` replaces ALL existing scripts on the page. You MUST:
- Read existing scripts first (`get_page_script`)
- Merge the new script into the existing array
- Write the full combined set via `upsert_page_script`
- **Never call upsert without reading first — this causes silent data loss.**

`get_page_script` returns 404 if no scripts exist (not an error — just means empty).

## Key Principle

**Always jsDelivr, never inline scripts.** Every script exists as a local file
in `scripts/` for version control and rollback.

## Reference

- `scripts/manifest.json` — the single source of truth for script registry
- `CLAUDE.md` — project conventions

## jsDelivr URL Formula

```
https://cdn.jsdelivr.net/gh/{user}/{repo}@{version}/{path}
```

Read `jsdelivr.user`, `jsdelivr.repo`, and `version` from `scripts/manifest.json`.

## Operations

### 1. Look Up Script for Component

1. Read `scripts/manifest.json`
2. Look up the component name in `components`
3. If found → proceed to inject (Operation 3)
4. If not found → no script needed, skip

### 2. Create New Script

1. **Determine scope:**
   - Unique to one component → `scripts/src/components/{name}.ts`
   - Shared across multiple components → `scripts/src/global/{name}.ts`

2. **Write the TypeScript source file** using this template:

   ```typescript
   /**
    * Script Name
    *
    * What this script does.
    * Dependencies: GSAP (via Webflow CDN toggle)
    */

   declare const gsap: {
     registerPlugin: (plugin: unknown) => void
     from: (target: Element, vars: Record<string, unknown>) => void
     to: (target: Element, vars: Record<string, unknown>) => void
   }
   declare const ScrollTrigger: unknown

   ;(function () {
     'use strict'

     document.addEventListener('DOMContentLoaded', () => {
       // Logic here. GSAP is available globally: gsap.to(), gsap.from(), etc.
     })
   })()
   ```

   Rules: IIFE wrapper, `'use strict'`, no `eval()`/`document.write()`, no secrets.

3. **Build the script:**
   ```bash
   pnpm run build
   ```
   This compiles `scripts/src/**/*.ts` → `scripts/dist/**/*.js` (minified IIFE).

4. **Generate SRI hash** (from the built output):
   ```bash
   openssl dgst -sha384 -binary scripts/dist/{scope}/{name}.js | openssl base64 -A
   ```

5. **Update `scripts/manifest.json`** — add entry with `path` (pointing to dist), `description`, and `integrity`:
   ```json
   {
     "path": "scripts/dist/components/example.js",
     "description": "What it does",
     "integrity": "sha384-{hash from step 4}"
   }
   ```

5. **Update version** in manifest.json to the tag you will create (e.g., bump `v0.1.0` → `v0.2.0`).

6. **Inform user** to commit, push, and tag:
   ```bash
   git add scripts/ && git commit -m "feat: add {name} script"
   git tag v{new_version} && git push && git push --tags
   ```

### 3. Inject Script into Webflow Page

1. Read `scripts/manifest.json` for path, version, integrity, and jsdelivr config
2. Construct the jsDelivr URL from the formula above
3. **Verify the URL is live** before injecting:
   ```bash
   curl -s -o /dev/null -w "%{http_code}" "https://cdn.jsdelivr.net/gh/{user}/{repo}@{version}/{path}"
   ```
   If not 200, wait and retry (jsDelivr may need time to pick up a new tag).
4. **Build the loader stub** (inline script that loads the jsDelivr file):
   ```javascript
   (function(){var s=document.createElement('script');s.src='{jsdelivr_url}';s.integrity='{integrity}';s.crossOrigin='anonymous';s.defer=true;document.head.appendChild(s);})()
   ```
5. **Register the loader** via `data_scripts_tool` → `add_inline_site_script`:
   - `sourceCode`: the loader stub from step 4
   - `displayName`: script name in camelCase (e.g., "animationsLoader") — becomes the script `id`. **Must be alphanumeric only — no hyphens or underscores.**
   - `version`: manifest version
   - `location`: "footer"
6. **Read existing page scripts** via `get_page_script` (404 = empty, not an error)
7. **Merge** the new script `id` into the existing array (avoid duplicates by checking `id`)
8. **Write** the full combined set via `upsert_page_script`
   - Component scripts → page-level
   - Global scripts → site-level (apply via project settings)

## Script Conventions

- **Global source:** `scripts/src/global/{name}.ts` → builds to `scripts/dist/global/{name}.js` — loaded site-wide
- **Component source:** `scripts/src/components/{name}.ts` → builds to `scripts/dist/components/{name}.js` — loaded per-page
- Component script filenames must match the component name in manifest.json
- Manifest `path` fields always point to `scripts/dist/` (the built output)
- GSAP is globally available (Webflow CDN toggle) — use `gsap.*` directly
- All scripts use `defer` — executes after DOM parsing, in document order
- Loading order: GSAP (head) → global scripts (project-level) → component scripts (page-level)

## Cache Purging

If jsDelivr serves stale content after a new tag:
```
https://purge.jsdelivr.net/gh/{user}/{repo}@{tag}/{path}
```
Visit or `curl` this URL to force-refresh.

## Important Notes

- **jsDelivr requires a public GitHub repo.** Verify the repo is public before testing URLs.
- **Propagation delay:** After pushing a new tag, jsDelivr may take a few minutes. Always verify the URL returns 200 before injecting into Webflow.
- **SRI is mandatory.** Every script tag must include `integrity` and `crossorigin="anonymous"`. Generate the hash at release time and store in the manifest.
