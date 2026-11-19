# Inspector field (`.inspector-field`)

Phase that builds it: **Phase 5** (inspector multi-edit with mixed values, outline). Phase 1 keeps today's property
panel inside the inspector column unchanged; Phase 5 replaces its rows with these fields and deletes the old panels.

## Purpose

One editable property of the selection in the 320 px inspector: a number with a unit, a choice, a flag, or a name.
It edits every selected item at once. When the selected items disagree, the field says so instead of showing one
item's value, and typing a value makes them agree.

## Anatomy

```
 296 px (320 - 2 x 12 padding)
Height                                     <- label 12 px / 500, --mut, 4 px above the control
+----+----------------------------+----+
| −  |  2.500                   m |  + |  <- number field: step 44 x 44 | input, unit 12 px --mut | step 44 x 44
+----+----------------------------+----+
  Value must be between 0.1 and 60       <- error line 12 px --prog, role=alert, only in the error state

Role                                       Mixed row:
+-------------------------------------+   +----+----------------------------+----+  [mixed]
| Wash                              ▾ |   | −  |  —                       m |  + |
+-------------------------------------+   +----+----------------------------+----+

[x] Hidden                                 <- checkbox 20 px box in a 44 px row, label 13 px --txt
```

Rows stack with 12 px between them; a section heading (13 px / 600 `--mut`, e.g. "Position", "Truss") sits 16 px
above its first row. Two short numbers (X, Y) may share one row as two half-width fields with an 8 px gap.

## Sizes

| Part | Size |
| --- | --- |
| Row | label 16 px tall + 4 px + control 44 px; an error line adds 18 px below |
| Control | height 44 px, 1 px border, radius 4, fill `--bg`, `padding-inline: 12px`, 13 px text |
| Step buttons | 44 × 44 inside the control's border, 20 px icons (minus, plus), 1 px `--line` separators |
| Unit suffix | 12 px `--mut`, `padding-inline-end: 8px`, not selectable |
| Select caret | 20 px icon `--mut`, end side |
| Checkbox | 20 px box, radius 2, 1 px `--line2`; checked fill `--acc`, mark `--bg`; row 44 px |
| Mixed tag | 11 px / 500 `--mut`, 1 px `--line2`, radius 4, `padding: 2px 6px`, after the control |

## Tokens used

`--wa-form-control-height: 44px`, `--wa-form-control-background-color: var(--bg)`,
`--wa-form-control-border-color: var(--line2)`, `--wa-form-control-border-width: 1px`,
`--wa-form-control-border-radius: 4px`, `--wa-form-control-padding-inline: 12px`,
`--wa-form-control-label-color: var(--mut)`, `--wa-form-control-value-color: var(--txt)`,
`--wa-form-control-placeholder-color: var(--mut)`, `--wa-form-control-activated-color: var(--acc)` (checkbox),
`--wa-form-control-toggle-size: 20px`, the danger fill and border tokens for error, `--wa-focus-ring*`.

## States

| State | Border | Fill | Text / icon | Extra |
| --- | --- | --- | --- | --- |
| default | 1 px `--line2` | `--bg` | value `--txt`; label, unit `--mut` | |
| hover | 1 px `--line2` + 8 % `--txt` | `--bg` | unchanged | step buttons fill `--p2`; pointer only |
| pressed | unchanged | step button `--p3` | unchanged | repeats after 400 ms, every 80 ms |
| focus | 1 px `--acc` + 2 px ring | `--bg` | unchanged | keyboard focus selects the input text |
| selected | n/a | | | a field is never "selected" |
| disabled | 1 px `--line` | `--p1` | `--mut` | property not available for this selection (note 1) |
| error | 1 px `--prog` | 10 % `--prog` on `--bg` | value `--txt`, message `--prog` | `aria-invalid`; alert (note 2) |
| mixed | 1 px `--line2` | `--bg` | `—` placeholder `--mut`, unit stays | "mixed" tag (note 3) |

Notes:

1. Example: truss size while a fixture is selected. The row stays visible and its tooltip says why.
2. The typed value stays in the field until it is fixed or Esc reverts it.
3. A checkbox shows `indeterminate`; a select shows `—` as its text.

## Behaviour

- Pointer: a click on a step button changes the value by `step` and commits one undo step per click (holding repeats,
  each repeat its own commit so Undo walks back one at a time). A click in the input places the caret; Enter or blur
  commits (one undo step per committed value, as `numberField.ts` does today); Esc reverts to the shown value.
- Multi-edit semantics: typing a value sets every selected item to that value (`setPropsOfMany`); a step button on a
  **mixed** field moves each item by `step` from its own value (relative nudge), so a spread stays a spread; the
  field stays mixed and the tag stays. A checkbox in `indeterminate` becomes checked for all on the first click.
  A select on mixed lists the real options plus a disabled `—` at the top.
- Touch: step buttons are the main route for numbers (44 × 44); the input opens the numeric keyboard
  (`inputmode="decimal"` or `numeric`). A long press on a step button repeats.
- Keyboard: Tab goes input to input, top to bottom, through the inspector; step buttons are `tabindex="-1"` and
  Up/Down arrows in the input step the value (Shift+Up = 10 × step is an extra, not the only route). Enter commits
  and keeps focus; Esc reverts. Space toggles a checkbox; a select opens with Space or Alt+Down and arrows.
- Validation: the field checks range and integer rules before it sends (as today, `he.builder.tools.badNumber`); a
  value the domain refuses shows the session's refused-edit text in the same error line.

## Accessibility

- `label` wraps the text and the control (`for`/`id` on the Web Awesome host); the unit is part of the accessible
  name ("Height, metres"). The mixed tag is `aria-describedby` text "mixed values". Step buttons: `aria-label`
  "Decrease Height" / "Increase Height" plus Hebrew tooltips `he.builder.props.stepDown/stepUp`.
- Error line `role="alert"`, linked by `aria-errormessage`. Disabled rows keep their label readable (`--mut`, not
  faded) so the operator sees what the selection cannot change.

## Open points

1. Implementation: `wa-input`, `wa-select`, `wa-checkbox` with the same tokens, or native controls styled by class
   (today's `numberField.ts`)? The spec is the same; `isTextField` must learn the hosts if Web Awesome is chosen.
2. Relative nudge on a mixed field (each item ± step) is a design decision here; the alternative is "step sets all
   to first value ± step". Owner to confirm.
3. Two fields per row (X | Y) at 144 px each: confirm the unit suffix and step buttons still fit (44 + 56 + 44).
