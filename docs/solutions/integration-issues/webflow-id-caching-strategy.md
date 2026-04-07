---
title: "Cache Webflow resource IDs in docs/reference to eliminate redundant API lookups"
date: "2026-04-07"
category: "integration-issues"
component: "docs/reference/webflow-ids.md, CLAUDE.md"
tags: [webflow, api, mcp, caching, optimization, workflow]
severity: "low"
root_cause: "Every conversation was calling list_pages, get_collection_list, and similar Webflow API/MCP endpoints to look up IDs that rarely change, wasting time and context window."
date_resolved: "2026-04-07"
commit: "0400ce6"
---

# Cache Webflow Resource IDs to Eliminate Redundant API Lookups

## Problem

Each conversation session was calling `list_pages`, `get_collection_list`, `get_collection_details`, etc. to look up Webflow resource IDs (page IDs, collection IDs, field slugs). These IDs rarely change but the lookups consume API calls, MCP round-trips, and context window space.

## Solution

Created `docs/reference/webflow-ids.md` as a persistent lookup table containing:
- Site ID
- All page IDs with slugs
- CMS collection IDs
- Key CMS field slugs and types

Added a mandatory rule to `CLAUDE.md`:
> After any Webflow API or MCP call that returns resource IDs, save them to `docs/reference/webflow-ids.md` if not already cached.

### Why docs/reference/ and not memory?

- **Project memory** is conversation-scoped context that may not persist or be visible across tools
- **docs/reference/** is committed to the repo, versioned, visible to all contributors and agents, and follows the existing pattern of reference documentation (breakpoints, component patterns, style guide, etc.)

### Safety rule

Always verify cached IDs still exist before using them on destructive operations (`upsert_page_script`, `delete_collection_items`, etc.). IDs can become stale if pages or collections are deleted and recreated.

## Prevention

1. **Update the reference on every new resource** — when creating pages, collections, or fields via API, add the new ID to `webflow-ids.md` immediately
2. **Check the reference first** — before calling `list_pages` or similar, read `docs/reference/webflow-ids.md`
3. **Verify before destructive ops** — cached IDs are trusted for reads but should be verified for writes that could affect the wrong resource
