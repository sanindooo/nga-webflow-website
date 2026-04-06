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
- **Webflow loaders must be updated after every new tag.** Pushing a new git tag makes files available on jsDelivr, but Webflow still serves the old version until the registered loader script is updated. After tagging, always update the loader's `displayName` version and `sourceCode` URL to reference the new tag, then re-register and re-apply via `data_scripts_tool`. Forgetting this step means the live site continues loading the old version.

## Script Placement Rules (CRITICAL)

**Global scripts → site-level ONLY.** `add_inline_site_script` both registers AND applies at the site level. NEVER apply global scripts to individual pages via `upsert_page_script` — this was the source of a recurring double-loading bug where old page-level scripts lingered after version updates.

**Page-specific scripts → page-level ONLY.** Use `upsert_page_script` exclusively for scripts that belong on specific pages (e.g., viewSwitcher on Works, stickyFilter on News/Works).

| Script type | Where it goes | Tool |
|---|---|---|
| Global (manifest `global[]`) | Site-level | `add_inline_site_script` |
| Component (manifest `components{}`) | Page-level on relevant pages | `upsert_page_script` |

### NEVER mix levels for the same script
If a global script is at the site level, it MUST NOT also be at the page level. The dedup guard prevents double-init, but duplicate network requests waste bandwidth and signal a broken deployment.

## jsDelivr URL Strategy

**Use commit hashes, not tags.** jsDelivr tag resolution is unreliable for newer tags — tags v0.6.1+ consistently 404 even though the files exist on GitHub. Commit hash URLs resolve immediately and are immutable.

```
https://cdn.jsdelivr.net/gh/{user}/{repo}@{commit_sha}/{path}
```

Get the commit hash: `git rev-parse HEAD` (after committing and pushing the built files).

**Fallback:** If tags do resolve (check with `curl -sI`), they're fine to use. But always verify before injecting.

## Full Update Workflow (MANDATORY CHECKLIST)

When updating scripts after a code change, follow EVERY step:

### Phase 1: Build and push
1. `pnpm run build` — compile TypeScript
2. Generate new SRI hashes for all changed dist files
3. Update `scripts/manifest.json` with new version + hashes
4. Commit all changes (src + dist + manifest)
5. Push to origin
6. Get the commit hash: `git rev-parse HEAD`

### Phase 2: Verify CDN
7. Verify jsDelivr serves each file at the commit hash URL:
   ```bash
   curl -sI "https://cdn.jsdelivr.net/gh/{user}/{repo}@{commit_sha}/{path}"
   ```
   ALL must return 200. If any 404, the commit may not have pushed — check `git log origin/main`.

### Phase 3: Register new loaders (site-level)
8. For each global script in `manifest.json`:
   - `add_inline_site_script` with the new version and commit-hash URL
   - Location: `footer`

### Phase 4: Clean up old page-level scripts (CRITICAL — DO NOT SKIP)
9. `list_pages` to get all page IDs
10. For EACH page, `get_page_script`:
    - If it has global scripts from an old version → those are stale
    - Use `upsert_page_script` to replace with ONLY page-specific scripts
    - Pages with no page-specific scripts → `upsert_page_script` with empty `[]`
    - `get_page_script` returning 404 = already clean, skip
11. For pages that need component scripts, apply ONLY component scripts at the CURRENT version

### Phase 5: Verify and publish
12. `list_applied_scripts` — confirm site-level has all globals at new version
13. Spot-check 2-3 pages with `get_page_script` — should have ZERO global scripts
14. `publish_site`
15. Hard-refresh the live site and check browser Network tab — each script should load ONCE

### Post-publish verification
- Filter Network tab by "JS" — no script name should appear more than once
- Console should have no 404 errors for script files
- If any duplicates or 404s, DO NOT proceed — debug first

## MCP API Notes

### MCP app must be authorized for the target site
The MCP `data_scripts_tool` uses an OAuth app token, NOT the `.env` site token. If `list_sites` doesn't show the target site, the MCP app needs re-authorization:
1. User runs `/mcp` in Claude Code to reauthenticate
2. User checks Webflow Dashboard > Site Settings > Apps & Integrations
3. Once authorized, `list_sites` should show the site

The `.env` `WEBFLOW_API_TOKEN` is a legacy site token for CMS/assets only — it CANNOT access the custom code endpoints.

### upsert_page_script IS DESTRUCTIVE (replaces all)
`upsert_page_script` replaces ALL existing scripts on the page. You MUST read existing scripts first if you want to preserve any. Writing an empty array `[]` clears all page scripts.
