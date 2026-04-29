# Modal Setup Reference

How to build an accessible modal in Webflow that reuses the shared `modals.ts`
script. Covers static content modals, CMS-driven modals, and one-off dialogs.

The script lives at `scripts/src/global/modals.ts` and is loaded site-wide by
`modalsLoader`. You do not need to write new JS for each modal — the script
discovers any `[role="dialog"]` element automatically and wires up every
trigger, close control, overlay, focus trap, ESC handler, and aria linkage at
runtime.

## Core contract

The script enforces a tiny, strict contract between three roles: **trigger**,
**dialog**, and optional **overlay**. Every modal type in this repo uses the
same contract — only the DOM placement differs.

| Role | How to mark it | Required |
|---|---|---|
| Trigger | `[data-modal-open="{id}"]` | value must equal a dialog's `id` |
| Dialog | `[role="dialog"]` + native `id="{id}"` | both required |
| Close control | `[data-modal-close]` | empty value; closes the active dialog |
| Overlay | `[data-modal-overlay]` | optional; single global element |
| Opt-out of overlay | `data-modal-no-overlay` on a specific dialog | optional |

The script does all of the heavy lifting:

- Finds the matching dialog via `getElementById(modalId)`
- Adds the `is-open` **class** to the dialog (and overlay, if present)
- Flips `aria-hidden` and `aria-expanded`
- Generates `aria-labelledby` from the first heading inside the dialog
- Generates `aria-describedby` from the first rich-text / paragraph
- Traps focus within the dialog while open
- Closes on ESC, close button, or overlay click
- Returns focus to the trigger on close

The script does NOT pause ScrollSmoother or lock body scroll. Native scroll
is already prevented by ScrollSmoother's `overflow: hidden` on body, and the
overlay covers the page visually. If wheel-scroll-behind becomes a real
issue in practice, add a `wheel`/`touchmove` `preventDefault` listener on
the overlay element.

You never touch JS for a new modal instance — just set the attributes below.

## ScrollSmoother constraint — modal placement matters

Under ScrollSmoother, `position: fixed` resolves against the transformed
`#smooth-content` wrapper rather than the viewport. Modals must therefore
live OUTSIDE `#smooth-content` for their `position: fixed; inset: 0` to
cover the viewport correctly.

| Modal type | Designer placement |
|---|---|
| **Static one-off** (e.g. video lightbox, hero "+ Project Info") | Place dialog as a sibling of the page's main wrapper (i.e. inside `page-wrapper` but outside `#smooth-content`) |
| **CMS collection** (e.g. studio team modals) | Build a SECOND Collection List bound to the same CMS collection, sitting outside `#smooth-content`. It contains only the modals (one per item). The trigger card list stays inside `#smooth-content`. Slug-based ids on the dialogs pair with the trigger cards' `data-modal-open` values. |
| **Global overlay** (`[data-modal-overlay]`) | Sibling of the main wrapper, outside `#smooth-content` |

The trigger and the dialog do NOT need to be in the same DOM subtree. The
script finds the dialog via `document.getElementById(modalId)` — they can
live anywhere.

## Static attributes to set in Designer

These are identical for every dialog, regardless of whether it's static or
CMS-driven.

### On the dialog wrapper
| Attribute | Value |
|---|---|
| **ID** (native Settings panel field) | unique string (CMS slug for CMS dialogs; a static id for one-offs) |
| `role` | `dialog` |
| `aria-modal` | `true` |
| `aria-hidden` | `true` |
| `tabindex` | `-1` |

### On the trigger (button, link, card)
| Attribute | Value |
|---|---|
| `data-modal-open` | same value as the dialog's id |
| `aria-haspopup` | `dialog` |
| `aria-expanded` | `false` |
| `type` (native buttons only) | `button` |

Prefer a real `<button>` element over a link for triggers. If the trigger must
be a link (CMS collection card, etc.), the script still works — it calls
`preventDefault()` on click.

### On every close control (inside each dialog)
| Attribute | Value |
|---|---|
| `data-modal-close` | (empty) |
| `aria-label` | e.g. `Close bio` (describe what's being closed) |
| `type` | `button` |

Close controls should be real `<button>` elements.

### On the overlay (optional, one per site)
Place the overlay outside `#smooth-content` (sibling of the page's main
wrapper) so its `position: fixed; inset: 0` resolves against the viewport.
Style it with a transition on opacity + pointer-events.

| Attribute | Value |
|---|---|
| class | `modal_overlay` (or any class you're styling) |
| `data-modal-overlay` | (empty) |
| `data-modal-close` | (empty) — makes overlay clicks dismiss |
| `aria-hidden` | `true` |

Suggested CSS:
```css
.modal_overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.6);
  opacity: 0;
  pointer-events: none;
  transition: opacity 0.4s ease;
  z-index: 900; /* below the dialog, above content */
}
.modal_overlay.is-open {
  opacity: 1;
  pointer-events: auto;
}
```

## Styling conventions

- **Open state is a class, not an attribute.** The script toggles the
  `is-open` **class** on the dialog and overlay. Style it with Webflow combo
  classes: e.g. `studio-team_modal` base + `is-open` combo.
- **Body scroll lock.** The script adds `no-scroll` to `<body>` while any
  dialog is open. Make sure your project's global CSS has:
  ```css
  body.no-scroll { overflow: hidden; position: fixed; width: 100%; }
  ```
- **Animation.** Put all transitions on the base class. The `is-open` combo
  just flips the target values (translate, opacity, pointer-events). The
  script adds the class in the same frame it flips `aria-hidden`, so any CSS
  transition runs naturally.

## Pattern 1 — Static one-off dialog

Use when: a single dialog exists on the page (e.g. a video modal, a legal
disclaimer, an image lightbox with a single source).

```
┌─ section.section_some-section
│  ├─ button.some-cta-button
│  │    data-modal-open="video-demo"
│  │    aria-haspopup="dialog"
│  │    aria-expanded="false"
│  │    type="button"
│  │
│  └─ div.my-dialog   ← [role="dialog"] wrapper
│       id="video-demo"
│       role="dialog"
│       aria-modal="true"
│       aria-hidden="true"
│       tabindex="-1"
│       ├─ button.my-dialog_close
│       │    data-modal-close
│       │    aria-label="Close video"
│       │    type="button"
│       │
│       ├─ h2.my-dialog_title       ← script wires aria-labelledby here
│       └─ div.my-dialog_body       ← script wires aria-describedby here
│            └─ <p> or rich-text
```

Id: pick anything unique. `video-demo`, `legal-disclaimer`, etc.

## Pattern 2 — CMS collection list (one dialog per item)

Use when: each CMS item has its own dialog (e.g. principals, projects,
testimonials). Two separate Collection Lists, both bound to the same CMS
collection: the **trigger list** lives inside `#smooth-content` (where it
visually belongs in the page flow); the **modal list** lives outside
`#smooth-content` (so each dialog's `position: fixed` resolves to the
viewport). Slug-based ids on the dialogs pair with the trigger cards'
`data-modal-open` values, so each card opens its corresponding dialog
regardless of DOM relationship.

```
INSIDE #smooth-content (the page's main scrollable area):

┌─ .trigger-list-wrapper          (DynamoWrapper, bound to CMS collection)
│  └─ .trigger-list               (DynamoList)
│     └─ .trigger-list-item       (DynamoItem — repeats per CMS record)
│        └─ button.item_trigger   ← or a link, if CMS card is clickable
│             data-modal-open = purple CMS binding → Slug
│             aria-haspopup="dialog"
│             aria-expanded="false"
│             type="button"

OUTSIDE #smooth-content (sibling of the main wrapper):

┌─ .modal-list-wrapper            (second DynamoWrapper, same CMS collection)
│  └─ .modal-list                 (DynamoList)
│     └─ .modal-list-item         (DynamoItem — repeats per CMS record)
│        └─ div.item_modal        ← [role="dialog"] wrapper
│             ID field (Settings panel) = purple CMS binding → Slug
│             role="dialog"
│             aria-modal="true"
│             aria-hidden="true"
│             tabindex="-1"
│             ├─ button.item_modal_close
│             │    data-modal-close
│             │    aria-label="Close {item type}"
│             │    type="button"
│             │
│             ├─ h3 (bound to Name field)
│             ├─ p  (bound to Role field)
│             └─ .rich-text (bound to Description RichText field)
```

### Why the ID is bound to Slug
Each CMS item gets a unique slug automatically. Binding both the trigger's
`data-modal-open` and the dialog's native `id` to the **Slug** field gives you
unique, matching identifiers with zero JavaScript.

### The MCP limitation
Webflow MCP can set static attribute values but **cannot** create CMS field
bindings — the purple binding UI lives only in the Designer. You must set
`data-modal-open` and the dialog ID **manually** via Designer:

1. Select trigger → Settings → Custom Attributes → Add `data-modal-open`
2. Click the purple **CMS binding icon** in the value field → pick **Slug**
3. Select dialog wrapper → Settings → in the **ID** field (at the top of the
   panel, not Custom Attributes), click the purple binding icon → pick **Slug**

After this, run the sanity check below to confirm both values match.

## Pattern 3 — Multiple static dialogs on one page

Use when: a page has a fixed set of dialogs (e.g. team photos with bios that
aren't CMS-driven). Same as Pattern 1 but with unique ids per trigger/dialog
pair. No special handling — the script finds all of them at init.

## Deploy checklist

When adding a new modal instance:

1. **No code changes needed.** `modals.ts` is already deployed site-wide.
2. Set attributes in Designer per the table above.
3. Verify in the browser console before publishing (see Sanity check below).
4. Confirm Webflow's footer already loads `modalsLoader` — it does if the
   site-wide scripts are in `list_applied_scripts`.
5. Publish.

## Sanity check (paste in browser console)

```js
console.table({
  dialogs: document.querySelectorAll('[role="dialog"]').length,
  triggers: document.querySelectorAll('[data-modal-open]').length,
  overlays: document.querySelectorAll('[data-modal-overlay]').length,
  close_buttons: document.querySelectorAll('[data-modal-close]').length,
  sample_dialog_id: document.querySelector('[role="dialog"]')?.id,
  sample_trigger_value: document.querySelector('[data-modal-open]')
    ?.getAttribute('data-modal-open'),
});
```

Expected:
- `dialogs` and `triggers` match (1 per dialog instance)
- `sample_dialog_id` and `sample_trigger_value` are equal, non-empty strings
  (the slug, or your static id)
- `overlays` is `1` if you added one
- `close_buttons` is `dialogs + (overlays * 1)` — each dialog has one close
  button, plus the overlay itself if it carries `data-modal-close`

If `sample_dialog_id` is `undefined`, you forgot to set the ID field on the
dialog. If `sample_trigger_value` is `''`, the `data-modal-open` attribute
exists but has no CMS binding — re-do the purple binding step.

## Common mistakes (save yourself)

1. **`is-open` as an attribute instead of a class.** The script uses
   `classList.add/remove`, so style on `.is-open`, not `[is-open]`.
2. **Setting `data-modal` on the dialog.** Deprecated — use the native `id`
   field. Remove any leftover `data-modal` attribute.
3. **Changing a Link element's type to DOM button** — this wipes all attributes
   on the element. Re-apply `aria-haspopup`, `aria-expanded`, `type`, and
   `data-modal-open` after converting.
4. **Missing CMS binding on attributes.** Setting `data-modal-open` to a
   literal string (not the purple slug binding) gives every CMS item the same
   value, so every trigger opens the same modal. Always use the binding UI.
5. **Multiple overlays on one page.** Only the first `[data-modal-overlay]` is
   used. Keep one global overlay.
6. **Close button outside the dialog.** That's fine for the overlay, but any
   close control inside a dialog must actually be a descendant of the
   `[role="dialog"]` wrapper so focus trap and close delegation work cleanly.
7. **Forgetting the overlay's `z-index`.** The overlay needs to sit below the
   dialog but above page content. If clicks fall through, the stacking order
   is wrong.

## Opting out of the overlay for a specific dialog

Sometimes a dialog shouldn't dim the page (a small dropdown-style bio card,
for example). Add `data-modal-no-overlay` to that dialog's wrapper. The
overlay stays hidden when that specific dialog opens — every other dialog
still uses it.

```
<div role="dialog" id="inline-tooltip" data-modal-no-overlay ...>
```

## Reference implementation

The NGA Studio page principals grid is the canonical Pattern 2 implementation.
See `studio-team_link`, `studio-team_modal`, and `modal_overlay` on the Studio
page. Every attribute and binding described above is live there.
