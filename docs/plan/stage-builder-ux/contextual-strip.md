# Contextual strip (`.plan-strip`)

Phase that builds it: **Phase 4** (arrays, distribute, duplicate with repeat offset). Phase 3b may show the same strip
for the truss tool's length field; it reuses this component.

## Purpose

The one place where a gesture needs a number before it commits: the count and spacing of an array or a distributed
drop, drawn over the plan's bottom edge while the ghost shows the result. It replaces a dialog. The strip never
appears for a plain drag or a plain drop; it appears when the operator drags out an array (`A` tool, or a card drag
with the array handle) or picks Distribute with 3+ items selected.

## Anatomy

```
                        plan canvas (--bg)
     . . . . . . . . . . ghost: 12 fixtures on the truss . . . . . . . . . .
+----------------------------------------------------------------------------------+
| Count  [ − ] 12 [ + ]  |  Spacing  [ 0.50 m ]  |  Pattern [Line ▾]  |  [ Cancel ] [ OK ] |
+----------------------------------------------------------------------------------+
  12 px from the plan's bottom edge, centred; height 56 (44 controls + 6 + 6); 1 px --line; fill --p1; radius 4
  |  = 1 px --line divider, 24 px tall, margin-inline 8
```

Fields left to right: Count (stepper with the number between the buttons), Spacing (number with unit), Pattern
(select: Line, Arc, Circle, Grid, On truss; shown only for an array, not for Distribute), then a divider, Cancel
(neutral outlined) and OK (brand accent). On a narrow screen (below 1100 px) the strip spans the plan width minus
12 px on each side and the Pattern select drops its label.

## Sizes

| Part | Size |
| --- | --- |
| Strip | height 56 px, `padding: 6px 8px`, gap 8, `inset-block-end: 12px`, max width 720 px |
| Field label | 12 px / 500 `--mut`, 6 px before its control |
| Count | step buttons 44 × 44 (minus, plus icons 20 px), value 13 px tabular, min 56 px wide |
| Spacing | input 44 px tall, 96 px wide, unit suffix 12 px `--mut` |
| Pattern | select 44 px tall, 120 px wide |
| OK, Cancel | 44 px tall, min-width 72 px, `padding-inline: 16px` |

## Tokens used

`--wa-color-surface-default`, `--wa-color-surface-border`, the form-control tokens of `inspector-field.md`, `brand`
and `neutral` button tokens, `--wa-color-danger-*` for the spacing error, `--wa-focus-ring*`. No shadow.

## States

| State | Border | Fill | Text / icon | Extra |
| --- | --- | --- | --- | --- |
| default | 1 px `--line` | `--p1` | labels `--mut`, values `--txt` | appears with no animation (note 1) |
| hover | per control | per control | | as `inspector-field.md` and `toolbar.md` |
| pressed | per control | per control | | count repeats while held (400 ms, then 80 ms) |
| focus | 2 px `--acc` ring on the control | | | focus lands on Count when the strip appears |
| selected | n/a | | | |
| disabled (OK) | none | `--p3` | `--mut` | count or spacing invalid; `is-disabled` |
| error (Spacing) | 1 px `--prog` | 10 % `--prog` | the label shows the reason, `--prog` | ghost refused (note 2) |
| mixed | n/a | | | the strip edits one pending op, never a selection |

Notes:

1. The ghost is already on the plan when the strip appears; the strip only adds the numbers.
2. Reasons: "Fixtures overlap", "Over the limit (60)" (from `he.builder.refused.*` for the tooltip, English inline).

## Behaviour

- Pointer: Count ± and Spacing changes redraw the ghost at once (`PlanView.preview(op)`, no `session.edit`). OK
  commits one `session.edit` (one undo step for the whole array); Cancel discards the pending op and the ghost. A
  click on the plan outside the strip while it is open is a Cancel, except a drag of the array's end handle, which
  edits the count live (the strip's Count follows).
- Touch: the same; the strip sits above the finger's drop point because it is anchored to the plan's bottom edge, not
  to the pointer. Two-finger pan and zoom stay possible while the strip is open; the ghost moves with the plan.
- Keyboard: when the strip appears, focus lands on the Count value; Up/Down step it; Tab goes Count → Spacing →
  Pattern → Cancel → OK; Enter anywhere in the strip is OK; Esc is Cancel. After OK or Cancel, focus returns to the
  plan canvas.
- Limits: Count is clamped to 1..(stage limit minus current fixtures); Spacing to 0.1..60 m (the parser's truss
  bounds); the pattern list comes from the array ops (`arrayLine`, `arrayArc`, `arrayGrid`, "N on truss").

## Accessibility

- `role="toolbar"` with `aria-label="Array"`; `aria-live="polite"` region for the error text so the reason is
  announced. Count ± have `aria-label` "Fewer" / "More" and Hebrew tooltips `he.builder.array.fewer/more`; the OK
  button's tooltip names the key (Enter).
- The strip is inside the plan pane's DOM (not the canvas), so screen readers and the keyboard reach it, and it
  never scrolls out of view with the plan.

## Open points

1. Pattern as a select in the strip, or as the `A` tool's own sub-mode in the toolbar? Proposed: in the strip, so the
   bar stays stable and the choice sits next to the result.
2. Whether a plain Duplicate (Ctrl/Cmd+D) shows the strip for its repeat offset. Proposed: no; Duplicate uses the last
   offset silently, and the strip is for arrays and Distribute only.
