---
title: "Dynamic script defer is ignored — polling loaders fix CDN dependency races"
date: "2026-04-06"
category: "runtime-errors"
component: "scripts/manifest.json, .claude/skills/deploy-scripts"
tags: [script-loading, defer, async, polling-loader, gsap, split-text, lenis, webflow, cdn, race-condition, safari, image-complete, dom-ready]
severity: "high"
root_cause: "Setting s.defer=true on dynamically created <script> elements has no effect per HTML spec — they always execute async in download-completion order. CDN typeof guards in scripts exit permanently on a temporary condition (dependency not yet loaded)."
date_resolved: "2026-04-06"
commit: "ed01c92"
---

# Dynamic Script Loading Race Conditions

## Problem

Scripts loaded via jsDelivr CDN intermittently failed to initialize. Symptoms:
- Hero text SplitText animation only fired ~50% of the time
- Lenis scroll height correction was inconsistent
- Worse on larger monitors (more content = different download timing)
- Worse on Safari than Chrome
- Refreshing the page sometimes fixed it

## Root Cause

Three compounding issues in the script loading architecture:

### 1. `s.defer=true` does nothing on dynamic scripts

Per the [WHATWG HTML spec](https://html.spec.whatwg.org/multipage/scripting.html), every dynamically created `<script>` element has a **`force async` boolean that defaults to `true`**. Only the HTML parser can set it to `false`. Setting `s.defer = true` on `document.createElement('script')` has **zero effect** — the script downloads and executes whenever it arrives, in download-completion order.

All 10 loader stubs used `s.defer=true`, believing it guaranteed execution after Webflow's GSAP scripts. It did not.

### 2. CDN dependency guards exit permanently

After a code review added `if (typeof gsap === 'undefined') return` to every script, any script that loaded before GSAP would silently exit forever. The dedup guard was never set, so even if GSAP loaded 100ms later, the script was gone — it never retried.

Before the guards, scripts that loaded early would crash with a visible `ReferenceError` (at least diagnosable). The guards turned a loud failure into a silent one.

### 3. Safari `image.complete` quirk

Safari reports `image.complete === true` for lazy-loaded images that haven't actually started loading. This caused the Lenis resize handler to think all images were loaded (dimensions known) when they weren't, calculating wrong page height.

## Solution

### Polling Loaders (in the Webflow inline stub)

Instead of immediately injecting the script, the loader polls every 50ms until the CDN dependency exists:

```javascript
// With polling (for scripts that need CDN globals):
(function(){function l(){if(typeof SplitText==='undefined'){setTimeout(l,50);return}var s=document.createElement('script');s.src='{url}';s.integrity='{hash}';s.crossOrigin='anonymous';document.head.appendChild(s)}l()})()

// Without polling (for scripts with no CDN deps):
(function(){var s=document.createElement('script');s.src='{url}';s.integrity='{hash}';s.crossOrigin='anonymous';document.head.appendChild(s)})()
```

Each script declares its dependency in `manifest.json` via `pollGlobal`:

```json
{
  "name": "heroTextReveal",
  "path": "scripts/dist/global/heroTextReveal.js",
  "pollGlobal": "SplitText",
  "integrity": "sha384-..."
}
```

### Dependency Map

| Script | pollGlobal | Why |
|---|---|---|
| gsapSmoothScroll | `Lenis` | Needs Lenis constructor |
| gsapBasicAnimations | `ScrollTrigger` | Uses ScrollTrigger.batch |
| heroTextReveal | `SplitText` | Uses SplitText constructor |
| generalScrollTextReveal | `SplitText` | Uses SplitText constructor |
| stickyFilter | `ScrollTrigger` | Uses ScrollTrigger.create |
| accordion | `gsap` | Uses gsap.set/to |
| swiperSliders | `Swiper` | Uses Swiper constructor |
| navToggle | `gsap` | Uses gsap.to/fromTo |
| modals | *(none)* | No CDN deps (uses window.stopSmoothScroll) |
| viewSwitcher | *(none)* | No CDN deps |

### Safari Image Fix

Check `naturalWidth > 0` alongside `complete` to confirm actual content has loaded:

```ts
const isLoaded = image.complete && image.naturalWidth > 0
if (!isLoaded) {
  image.addEventListener('load', scheduleResize, { once: true })
  image.addEventListener('error', scheduleResize, { once: true })
}
```

### DOM-Ready Gate

Never use bare `DOMContentLoaded` — it fires once and CDN scripts may arrive after it:

```ts
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init)
} else {
  init()
}
```

## Investigation Steps

1. **Hypothesis: CDN guards are too aggressive.** Confirmed — `typeof gsap === 'undefined'` exits permanently when the script races ahead of GSAP. But removing guards alone doesn't fix it because the script still needs GSAP to be defined when it runs.

2. **Hypothesis: `s.defer=true` ensures ordering.** Rejected — HTML spec confirms dynamic scripts ignore `defer`. Only `s.async = false` forces insertion-order execution among other dynamic scripts, but does NOT guarantee ordering relative to Webflow's parser-inserted scripts.

3. **Hypothesis: Retry pattern in scripts.** Considered — `setTimeout(boot, 100)` retry loop in each script. Works but adds complexity to every script. Rejected in favor of solving at the loader level.

4. **Hypothesis: Polling loader.** Implemented — the loader itself waits for the dependency before injecting the script. Guarantees the dependency exists when the script executes. ~250 chars, fits easily in Webflow's 2000-char limit. **Working fix.**

## Prevention Strategies

- [ ] Never use `s.defer=true` on `document.createElement('script')` — it does nothing
- [ ] Never put `typeof` CDN guards in the script source — they exit permanently on a temporary condition
- [ ] Always declare `pollGlobal` in `manifest.json` for scripts with CDN dependencies
- [ ] The deploy-scripts skill generates the correct loader template based on `pollGlobal`
- [ ] For lazy-loaded images on Safari, always check `naturalWidth > 0` alongside `complete`
- [ ] Use `readyState` check, never bare `DOMContentLoaded`, for DOM-ready gating

## Related Documentation

- `docs/solutions/runtime-errors/cdn-script-hardening-review.md` — The broader code review that surfaced these issues (now partially superseded by this document's loader findings)
- `CLAUDE.md` (Custom Code Delivery) — Updated with polling loader pattern and boilerplate
- `.claude/skills/deploy-scripts/SKILL.md` — Loader stub templates updated
- `.claude/skills/custom-code-management/SKILL.md` — Loader stub templates updated
- [WHATWG HTML Spec - Scripting](https://html.spec.whatwg.org/multipage/scripting.html) — `force async` flag on dynamic scripts
