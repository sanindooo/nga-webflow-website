---
name: type-sync
description: Keep `src/types/*.d.ts` ambient declarations in sync with how bundle modules actually use CDN globals (gsap, ScrollTrigger, Lenis, SplitText, Swiper, Webflow) and window extensions. Use before deploying, after adding a new module, or when `pnpm run check` fails with "Property X does not exist on type Y" (TS2339) or "Cannot find name Z" (TS2304). Invoke with `/type-sync`. The skill runs the typechecker, classifies each diagnostic, and proposes precise edits to `src/types/*.d.ts` — it does not touch `src/utils/` code.
allowed-tools:
  - Read
  - Edit
  - Write
  - Glob
  - Grep
  - "Bash(pnpm:*)"
  - "Bash(tsc:*)"
  - "Bash(node:*)"
---

# type-sync

Keeps `src/types/*.d.ts` in step with how modules actually use CDN globals and
window extensions. Declarations are the contract between the bundle and the
CDN runtime; drift between the two is only visible as a `pnpm run check`
failure, so this skill's job is to resolve those failures with precise
declaration edits.

## Working principle

`tsc` is the source of truth for "is this declared." Do not second-guess it
with regex or heuristics — run the typecheck and act on its diagnostics. If
the typecheck is clean, there is no drift and nothing to do.

## When to invoke

- Before cutting a tag (`webflow-deploy`).
- Right after a module adds a new method call on a CDN global (e.g.
  `gsap.xxx`, `ScrollTrigger.xxx`), a new CDN constructor (e.g. `new Foo(...)`),
  or a new read/write on `window`.
- When `pnpm run check` reports:
  - **TS2304** — "Cannot find name 'Foo'"
  - **TS2339** — "Property 'bar' does not exist on type 'X'"
  - **TS2345** — "Argument of type 'A' is not assignable to parameter of type 'B'"
    (when the declared signature is narrower than the real CDN API)

## Workflow

### 1. Run the typechecker

```bash
pnpm run check
```

If exit code 0 and no diagnostics: report `no drift` and stop. Do not invent
work.

### 2. Classify each diagnostic

For every error, read the error line + the offending source file, then sort
into one of these buckets:

| Diagnostic | Meaning | Fix location |
|---|---|---|
| TS2304 Cannot find name `Foo` | New CDN global or constructor | Add `declare const Foo: ...` to `src/types/gsap.d.ts` (CDN libs) or `src/types/webflow.d.ts` (Webflow runtime) |
| TS2339 Property `bar` does not exist on type `X` | Existing interface needs a new method/field | Extend the relevant interface in `src/types/*.d.ts` |
| TS2339 Property `bar` does not exist on type `Window` | `window.bar` read/write introduced | Add `bar?: ...` to the `Window` interface in `src/types/webflow.d.ts` |
| TS2345 argument not assignable | Declared signature is too narrow | Widen the parameter type in the interface |
| Anything else | Not a declaration problem | Stop. Hand back to user with the diagnostic verbatim |

### 3. Propose the patch

For each declaration change, present a minimal diff:

- File + line
- Exact one-line signature added or widened
- Brief justification (the call site that requires it)

Wait for approval, then apply with `Edit`.

### 4. Re-run `pnpm run check`

Repeat steps 1–3 until `pnpm run check` exits clean. If a fix introduces new
diagnostics, triage those the same way. If the loop doesn't converge after
three passes, stop and hand the remaining errors back to the user.

### 5. Report

One paragraph:

- Files + interfaces changed
- New declarations added (one line each)
- Final `pnpm run check` result

## Hard rules

- **Never use `any`.** Use `unknown`, `Record<string, unknown>`, or precise
  function signatures. A declaration with `any` is worse than no declaration.
- **Never silence errors with `@ts-ignore`, `@ts-expect-error`, or `as any`.**
  Every diagnostic resolves to a real declaration.
- **Never edit `src/utils/**/*.ts` from this skill.** If code needs changing
  (e.g. a typo caused TS2304), stop and hand back to the user — don't
  "fix" source from a types workflow.
- **Never add declarations the code doesn't use.** `tsc` tells you exactly
  what's missing; nothing else gets added. No speculative declarations for
  CDN API methods that might be useful later.
- **Narrow where the usage is narrow.** If every call site passes
  `HTMLElement`, declare `HTMLElement`, not `Element | HTMLElement`. Widen
  later when a real call site requires it.
- **Never introduce `@types/*` npm packages** for CDN libraries. The whole
  point of the ambient `.d.ts` files is zero dependencies — CDN globals are
  provided by Webflow Site Settings, not npm.

## File placement

- `src/types/gsap.d.ts` — GSAP + ScrollTrigger + Lenis + SplitText + Swiper
  (despite the name, it holds every CDN global). Split into
  `src/types/lenis.d.ts`, `src/types/swiper.d.ts`, etc. only if the single
  file exceeds ~300 lines or a new dev joins and needs finer granularity.
- `src/types/webflow.d.ts` — Webflow runtime (`window.Webflow` queue) and
  any other Window interface extension the bundle introduces.

## Example pass

1. Developer adds `gsap.quickSetter(element, 'opacity')` to a module.
2. `pnpm run check` → `TS2339 Property 'quickSetter' does not exist on type 'GsapInstance'`.
3. Skill opens `src/types/gsap.d.ts`, finds `interface GsapInstance`, adds:
   ```ts
   quickSetter: (target: unknown, property: string) => (value: number) => void;
   ```
4. Re-runs `pnpm run check` → 0 errors. Reports:
   > `src/types/gsap.d.ts`: added `GsapInstance.quickSetter`. Typecheck clean.

## What this skill does NOT do

- Audit call sites or refactor `src/utils/` code.
- Generate declarations from `node_modules/@types/*`.
- Maintain a "full" GSAP API surface — only what the bundle actually calls.
- Propose speculative improvements to existing declarations ("you should
  narrow this"). Only act on real diagnostics.
