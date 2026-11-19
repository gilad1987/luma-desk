# Toolbar (`.builder-bar`)

Phase that builds it: **Phase 1** (shell). Phase 4 adds the Align menu and the Snap toggle to the edit group without
changing the bar's rules.

## Purpose

The one fixed row over the builder. It names the screen, holds the edit commands that act on the selection, switches
the centre view mode, shows the fixture count against the stage limit, and ends the session (Cancel, Done). It never
holds a tool that needs a second step; those live in the library, the inspector or the contextual strip.

## Anatomy

```
 56 px tall, padding-inline 8, gap 8
+-------------------------------------------------------------------------------------------------------------+
| Stage Builder | [↶ Undo] [↷ Redo] [⧉ Duplicate] [⌫ Delete] [⇋ Mirror] | [▭ Plan][⊟ Split][⬚ 3D] | 12 fixtures
|                                                                             [☰ Inspector]  [ Cancel ] [ Done ]
+-------------------------------------------------------------------------------------------------------------+
  title 13/600   edit group: wa-button variant=neutral appearance=plain   view group: native radios    badge 12
                 |  = 1 px --line divider, 24 px tall, 8 px on each side              Done: variant=brand accent
```

Order left to right: title, edit group, divider, view-mode group, divider, count badge, flexible space, Inspector
button (narrow only), Cancel, Done. The bar is `dir="ltr"` like the whole builder. "Mirror L → R" keeps its arrow in
the label (English text, drawn LTR).

## Sizes

| Part | Size |
| --- | --- |
| Bar | height 56 px, fill `--p1`, `border-block-end: 1px solid var(--line)` |
| Button (`wa-button size=m`) | height 44 px, min-width 44 px, `padding-inline: 12px`, radius 4 px |
| Icon | 20 × 20 in `slot="start"`, 6 px gap to the label |
| Label | 13 px / 500, one line, no wrap |
| Gaps | 4 px inside a group; 8 px between title, groups, badge, Cancel, Done |
| Group divider | 1 px `--line`, 24 px tall, `margin-inline: 8px` (a `span.bar-divider`) |
| Count badge | 12 px, `padding-inline: 8px`, tabular numerals, min-width 88 px |
| Done | `padding-inline: 16px`, min-width 88 px |

## Tokens used

`--wa-color-surface-default`, `--wa-color-text-normal`, `--wa-color-text-quiet`, the `neutral` and `brand` fill, border
and on tokens, `--wa-color-mix-hover`, `--wa-color-mix-active`, `--wa-focus-ring*`, `--wa-form-control-height`,
`--wa-form-control-padding-inline`, `--wa-font-weight-action`, `--wa-transition-fast`; badge warning: `--prog`.

## States

Plain edit buttons (Undo, Redo, Duplicate, Delete, Mirror):

| State | Border | Fill | Text / icon | Extra |
| --- | --- | --- | --- | --- |
| default | none | transparent | `--txt` | |
| hover | none | `--p3` | `--txt` | 120 ms; pointer only |
| pressed | none | `--line2` | `--txt` | while down |
| focus | 2 px `--acc` ring | unchanged | unchanged | `:focus-visible` only |
| disabled | none | transparent, no hover | `--mut` | `disabled` + `is-disabled`; tooltip still shows (note 1) |
| selected, error, mixed | n/a | | | an edit button has no such state |

Mode buttons (Plan, Split, 3D): native `<button role="radio">` elements drawn as an outlined Web Awesome button
group (`_bar-modes.scss`). Neighbours overlap by 1 px, so one 1 px line divides them; only the group's outer corners
are rounded (4 px).

| State | Border | Fill | Text / icon | Extra |
| --- | --- | --- | --- | --- |
| default | 1 px `--line2` | `--p2` | `--txt` | the group shares inner borders |
| hover | 1 px `--line2` | `--p2` + 8 % `--txt` | `--txt` | |
| pressed | 1 px `--line2` | `--p2` + 16 % `--bg` | `--txt` | |
| selected | 1 px `--acc` | 18 % `--acc` on `--p2` | `--acc` | `aria-checked="true"`, `is-pressed`; exactly one |
| disabled | n/a | | | mode buttons are never disabled |

Cancel, Done, badge:

| State | Border | Fill | Text / icon | Extra |
| --- | --- | --- | --- | --- |
| Cancel default | 1 px `--line2` | `--p2` | `--txt` | `variant=neutral appearance=outlined` |
| Done default | none | `--acc` | `--bg` | `variant=brand appearance=accent` |
| Done hover | none | `--acc` + 8 % `--txt` | `--bg` | |
| Done pressed | none | `--acc` + 16 % `--bg` | `--bg` | |
| badge default | none | none | `--mut` | "12 fixtures" |
| badge warning | none | none | `--prog`, 600, warning icon 16 px | `is-warning`; "64 / 60 fixtures" |

Notes:

1. Disabled buttons keep full opacity; the grey text is the signal. If `wa-button[disabled]` swallows pointer events
   so the tooltip cannot open, the implementer wraps the button in a `span` that owns the tooltip's `for` id.

## Behaviour

- Pointer: click acts on release. Edit buttons act on the current selection; Undo/Redo follow `History`. The mode
  group is a radio: a click selects, the previous one deselects. Done commits and closes; Cancel asks nothing and
  closes (as today).
- Touch: a tap acts; a long press (500 ms) opens the Hebrew tooltip without acting. Targets are 44 px tall and at
  least 44 px wide, with 4 px between them so a finger does not hit two.
- Keyboard: Tab moves through the bar left to right, then into the library. Inside the mode group, Left/Right arrows
  move and select (roving tabindex, one Tab stop). The desk shortcuts stay: Ctrl/Cmd+Z, Shift+Ctrl/Cmd+Z, Ctrl/Cmd+D,
  Delete, `M` mirror, `1 2 3` Plan/Split/3D (Phase 1 adds the mode keys), Esc = Cancel only from the start screen.
  Enter on a focused button acts.
- Mode switch: `ViewModeSwitch` sets `is-mode-plan|split|3d` on `.builder-centre`; Plan and 3D disable the divider
  and remember the last split position (`CentreSplit`).

## Narrow layout (below 1100 px, iPad 1024 × 768 and 768 × 1024)

- Every bar button except Cancel and Done hides its label (`::part(label)` display none) and becomes 44 × 44; icons
  and tooltips stay. The title shortens to the builder icon with the tooltip "Stage Builder" only below 820 px.
- The Inspector button appears (icon + tooltip) and opens the `wa-drawer`; its `aria-expanded` follows the drawer.
- Width budget at 1024: 16 padding + title 100 + edit 236 + dividers 34 + modes 140 + badge 88 + inspector 44 +
  Cancel 80 + Done 88 + gaps 56 = 882 px. Fits without wrapping; the bar never wraps to two rows.

## Accessibility

- `header.builder-bar` with `role="toolbar"` and `aria-label="Stage Builder"`; the edit group is `role="group"` with
  `aria-label="Edit"`; the mode group is `role="radiogroup"` with `aria-label="View"`. Each mode is a native button
  with `role="radio"` and `aria-checked`, so the name, the focus and the checked state are on one element (a role on a
  `wa-button` host split them over the host and its inner button). Roving tabindex: only the checked radio has
  `tabindex="0"`; the arrow keys (Right/Down next, Left/Up previous, wrapping) and Home/End move the focus and select.
- Each button: the visible English label is the accessible name; the Hebrew help is the accessible description. A
  `wa-button` gets it from its `title`, which `wa-button` forwards to its inner button; a mode radio from
  `aria-description`. The mode tooltip anchors on a wrapper `span`, as `wa-tooltip` adds itself to its anchor's
  `aria-labelledby` and would replace the name. Every Hebrew `wa-tooltip` is `dir="rtl"`. The texts come from
  `he.builder.edit.*`, `he.builder.shell.*`, `he.builder.cancel`, `he.builder.done`. Undo/Redo tooltips name the key.
- The badge is `aria-live="polite"` so the count change after a drop is announced; the warning text names the limit.

## Open points

1. Mode keys `1 2 3`: confirm they do not collide with the desk's number keys while the builder is open
   (`builderKeys.ts` owns the list).
2. Title shortening below 820 px is an assumption for iPad portrait with the drawer open; verify in the design review.
