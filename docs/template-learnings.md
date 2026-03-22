# Template Learnings

Observations from first real-world use of the Webflow automation project template (NGA Website, 2026-03-22).

## L1: Manifest jsDelivr repo is hardcoded to test project

**Issue:** `scripts/manifest.json` ships with `"repo": "webflow-mcp-test"` — the test project name, not the actual project repo.
**Impact:** Custom code injection would silently point to wrong CDN URLs.
**Fix for template:** Either leave the repo field blank with a `TODO` comment, or add a project init script that auto-detects the repo name from `git remote -v` and patches the manifest.

## L2: Figma view-only access blocks REST API entirely

**Issue:** The REST API returns 403 "File not exportable" when the token holder only has "can view" access. The MCP screenshot still works (uses desktop app connection) but has its own rate limits.
**Impact:** The pipeline assumes API access for token extraction and asset export. View-only access blocks the entire automated flow.
**Fix for template:** Add a pre-flight check in Phase 1 that tests Figma API access (`GET /v1/files/{key}?depth=1`) and surfaces a clear error message with instructions to request edit access. Document this requirement in the README.

## L3: Figma MCP has plan-based tool call limits

**Issue:** The Figma MCP server enforces tool call limits based on seat type/plan. After a few calls (screenshot + design_context attempt), it returned a rate limit error.
**Impact:** Can't complete a full component extraction in one session if on a free/basic plan.
**Fix for template:** Document the MCP plan requirement. Consider adding a fallback mode that uses REST API + local screenshots when MCP is unavailable.

## L4: Webflow script displayName must be alphanumeric (no hyphens)

**Issue:** `add_inline_site_script` rejects `displayName` values with hyphens (e.g., `"animations-loader"`). The error says "must be between 1 and 50 alphanumeric characters".
**Impact:** The skill doc example uses `"animations-loader"` which fails. Wasted a tool call.
**Fix for template:** Update the custom-code-management SKILL.md examples to use camelCase (`animationsLoader`) instead of kebab-case. Add a note that hyphens/underscores are not allowed.

## L5: Re-registering a script with same displayName+version fails; delete_all only clears applied refs

**Issue:** `add_inline_site_script` rejects duplicate `displayName` + `version` combos. `delete_all_site_scripts` only removes the *applied* references — the *registered* scripts persist. So you can't re-register after deleting.
**Impact:** When updating a loader (e.g., changing the CDN path), you must bump the version even if the underlying script hasn't changed. Old registrations accumulate.
**Fix for template:** The skill doc should instruct: always bump the patch version when re-registering a loader, even for path-only changes. Add a note that `delete_all_site_scripts` does NOT clear registrations. Consider adding a cleanup step that lists registered scripts and warns about orphans.
