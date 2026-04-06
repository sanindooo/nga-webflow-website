---
name: deploy-scripts
description: >
  One-command deployment of all scripts to Webflow. Builds TypeScript, generates
  SRI hashes, updates the manifest, commits, pushes, verifies jsDelivr, registers
  loaders on Webflow, cleans stale page scripts, and publishes. Triggers on
  "deploy scripts", "make scripts live", "push scripts to production", or
  "publish scripts".
allowed-tools:
  - mcp__webflow__data_scripts_tool
  - mcp__webflow__data_sites_tool
  - mcp__webflow__data_pages_tool
  - Read
  - Edit
  - Glob
  - Grep
  - "Bash(pnpm:*)"
  - "Bash(openssl:*)"
  - "Bash(git:*)"
  - "Bash(/usr/bin/curl:*)"
---

# Deploy Scripts

Automated end-to-end deployment of scripts from local source to live Webflow.

## Usage

- `/deploy-scripts` — deploy ALL scripts (full rebuild + re-register)
- `/deploy-scripts heroTextReveal` — deploy a SINGLE script by name
- `/deploy-scripts heroTextReveal generalScrollTextReveal` — deploy specific scripts

When a script name is provided, only that script is built, hashed, registered, and
the manifest is updated. All other site-level loaders are preserved (not deleted and
re-registered). This is faster and safer for incremental changes.

## Prerequisites

- `scripts/manifest.json` is the source of truth for script registry
- All scripts are TypeScript in `scripts/src/`, built to `scripts/dist/`
- jsDelivr serves from GitHub commit hashes (NOT tags)
- Webflow site ID is in the project memory file at
  `.claude/projects/-Users-sanindo-nga-webflow-website/memory/project_nga_website.md`

## Argument Parsing

Check the ARGUMENTS value passed to this skill:
- If empty or "all" → run the **Full Deployment Workflow** below
- If one or more script names → run the **Single Script Deployment** below

## Single Script Deployment

For each named script:

1. Find the source file: check `scripts/src/global/{name}.ts` then `scripts/src/components/{name}.ts`
2. Run `pnpm run build` (builds all, but we only care about the named one)
3. Generate SRI hash for the built dist file:
   ```bash
   openssl dgst -sha384 -binary {dist_path} | openssl base64 -A
   ```
4. Update the script's `integrity` in `scripts/manifest.json`
5. Bump manifest version (patch bump)
6. Stage and commit only the changed files: `git add scripts/`
7. Push to origin, get commit hash
8. Verify jsDelivr serves the file at the commit hash URL
9. Register the updated loader via `add_inline_site_script` using the polling or
   direct loader template (check `pollGlobal` in manifest — see Phase 4 of Full
   Deployment for loader templates)
10. If it's a component script, also update relevant page-level scripts
11. Publish site
12. Report summary

**Key difference from full deploy:** Step 9 does NOT `delete_all_site_scripts` first.
It only re-registers the specific loader(s), which supersedes the old version by ID.

## Full Deployment Workflow

### Phase 1: Build and verify

1. Run `pnpm run build` to compile all TypeScript
2. Run `pnpm run typecheck` (warn on errors but don't block — esbuild still compiles)
3. For EVERY script in `scripts/dist/`, generate SRI hash:
   ```bash
   openssl dgst -sha384 -binary {path} | openssl base64 -A
   ```
4. Compare each hash against `scripts/manifest.json`:
   - If a hash changed → the script was modified, update the manifest
   - If a script exists in dist but not manifest → new script, add to manifest
   - If a script exists in manifest but not dist → deleted script, remove from manifest
5. Bump the manifest `version` (minor bump for new scripts, patch for updates only)

### Phase 2: Commit and push

6. Stage ONLY `scripts/` files: `git add scripts/`
7. Commit with descriptive message
8. Push to origin: `git push origin main`
9. Get commit hash: `git rev-parse HEAD`

### Phase 3: Verify CDN

10. For each script in the manifest, verify jsDelivr serves it:
    ```bash
    /usr/bin/curl -s -o /dev/null -w "%{http_code}" "https://cdn.jsdelivr.net/gh/{user}/{repo}@{commit_sha}/{path}"
    ```
    ALL must return 200. If any 404, the push may not have completed — verify with
    `git log origin/main`.

### Phase 4: Register loaders on Webflow

11. `delete_all_site_scripts` to clear stale loaders
12. For each **global** script (manifest `global[]`), register via `add_inline_site_script`:
    - Check if the script has a `pollGlobal` field in the manifest
    - If `pollGlobal` is set, build a **polling loader** that waits for the CDN
      dependency before injecting the script:
      ```javascript
      (function(){function l(){if(typeof {pollGlobal}==='undefined'){setTimeout(l,50);return}var s=document.createElement('script');s.src='{jsdelivr_url}';s.integrity='{integrity}';s.crossOrigin='anonymous';document.head.appendChild(s)}l()})()
      ```
    - If NO `pollGlobal`, build a **direct loader** (no polling):
      ```javascript
      (function(){var s=document.createElement('script');s.src='{jsdelivr_url}';s.integrity='{integrity}';s.crossOrigin='anonymous';document.head.appendChild(s)})()
      ```
    - **CRITICAL:** Never use `s.defer=true` — it has NO effect on dynamically
      created scripts (they are always async per HTML spec). The polling loader
      handles dependency ordering instead.
    - `displayName`: `{scriptName}Loader` (camelCase, alphanumeric only)
    - `version`: manifest version (without `v` prefix)
    - `location`: `footer`
13. For each **component** script (manifest `components{}`), also register via
    `add_inline_site_script` (required to get an ID for page-level application)

### Phase 5: Clean page-level scripts

14. `list_pages` to get all page IDs
15. For EACH page, `get_page_script`:
    - 404 = clean, skip
    - Empty array = clean, skip
    - Has scripts → check each one:
      - If it's a global script → stale duplicate, remove it
      - If it's a component script → keep, but update version to current
    - `upsert_page_script` with the cleaned array
16. Apply component scripts to their relevant pages (read page names to determine):
    - `viewSwitcher` → Works page
    - Other component scripts → match by page purpose

### Phase 6: Verify and publish

17. `list_applied_scripts` — confirm site-level has all globals at new version
18. Spot-check 2-3 pages with `get_page_script`
19. `publish_site` with `publishToWebflowSubdomain: true`
20. Report deployment summary to user

## jsDelivr URL Formula

```
https://cdn.jsdelivr.net/gh/{user}/{repo}@{commit_sha}/{path}
```

Read `jsdelivr.user` and `jsdelivr.repo` from `scripts/manifest.json`.

## Script Placement Rules

| Script type | Manifest location | Where it goes | Tool |
|---|---|---|---|
| Global | `global[]` | Site-level | `add_inline_site_script` |
| Component | `components{}` | Page-level on relevant pages | `upsert_page_script` |

**NEVER mix levels.** Global scripts must not appear at page-level.
`upsert_page_script` is DESTRUCTIVE — always read existing scripts first.

## Important Notes

- Use `/usr/bin/curl` (full path) for HTTP checks — shell aliases may not resolve
- `add_inline_site_script` both registers AND applies at site level — component
  scripts will appear site-wide (dedup guards prevent double-init)
- Always verify jsDelivr URLs return 200 BEFORE registering loaders
- If the push was rejected (remote has new commits), pull --rebase first
- After rebase conflicts on dist files, just `pnpm run build` to regenerate
- **CRITICAL after rebase:** Always generate SRI hashes from the PUSHED commit (what
  jsDelivr serves), NOT from local dist files. During rebase, merged changes from
  other branches alter the committed dist files, but local files may still reflect
  the pre-rebase state. Verify by curling the jsDelivr URL and hashing the response:
  ```bash
  /usr/bin/curl -s "{jsdelivr_url}" | /usr/bin/openssl dgst -sha384 -binary | /usr/bin/openssl base64 -A
  ```
