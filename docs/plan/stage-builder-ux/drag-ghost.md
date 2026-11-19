# Drag ghost

Phases that build it: **Phase 2** (palette ghost under the pointer, plan ghost for a card drop and the stamp cursor,
truss highlight, refused state) and **Phase 3** (plan ghost for move, rotate, resize and truss draw, through the same
`PlanOverlay`). Phase 4 draws the array ghost with the same rules for N footprints.

## Purpose

Shows what will happen before it happens. Two ghosts exist and never at the same time: the **palette ghost**, a small
DOM thumbnail that follows the pointer from the library until it is over the plan; and the **plan ghost**, drawn by
`PlanOverlay` on the plan canvas in stage units, which shows the exact footprint at the snapped position, the truss it
will hang on, and whether the drop is refused. The ghost is the preview of the one `session.edit` that pointer-up will
commit; it never edits.

## Anatomy

```
Palette ghost (DOM, position: fixed, pointer-events: none)    Plan ghost (canvas, stage units)
      pointer tip                                                     truss highlighted 2 px --acc
         +                                                    ========================================
          \  +12, +12 px                                                  +------+
           +----------+                                                   | ghost|  outline 1.5 px --acc @ 60 %
           | 64 x 48  |  thumbnail, 1 px --line2, fill --p2             +------+  fill --acc @ 10 %
           |  photo   |                                                 [x 2.50  y 4.00]  label chip 11 px mono
           +----------+                                                 ^ 4 px below the footprint, fill --p1

Refused:                                                      Stamp cursor (armed card, pointer over the plan):
           +------+  outline 1.5 px --prog @ 60 %                         same plan ghost at the snapped point,
           | ghost|  fill --prog @ 10 %                                   no label chip until the pointer stops 100 ms
           +------+
   [Outside the stage]  chip fill 18 % --prog on --p2, text --prog
```

Touch: the palette ghost is offset −24 px in Y (above the finger) and +12 px in X so the finger does not cover it.

## Sizes

| Part | Size |
| --- | --- |
| Palette ghost | 64 × 48 (4:3), 1 px `--line2`, radius 4, fill `--p2`, picture `object-fit: cover` (note 1) |
| Plan ghost outline | 1.5 px on screen at every zoom, `--acc` at 60 % alpha |
| Plan ghost fill | `--acc` at 10 % alpha |
| Fixture mark | the plan's own fixture glyph (circle or bar at real span) in the ghost colour |
| Truss highlight | the truss line redrawn 2 px `--acc` at 100 %, plus the hang point as a 6 px `--acc` dot |
| Label chip | 11 px `var(--mono)`, `padding: 2px 6px`, fill `--p1`, 1 px `--line`, radius 4, 4 px below |
| Refused chip | same geometry, fill 18 % `--prog` on `--p2`, 1 px `--prog`, text `--prog` |

Notes:

1. Offset from the pointer +12 / +12 px; on touch +12 / −24 px.

## Tokens used

Canvas colours come through `PlanPalette` from custom properties on `.plan-view`: `--plan-ghost: var(--acc)`,
`--plan-refused: var(--prog)`, `--plan-label-bg: var(--p1)`, `--plan-label-text: var(--txt)`,
`--plan-truss-hot: var(--acc)`; font `var(--mono)`. Alphas are named constants in the draw code
(`GHOST_FILL_ALPHA = 0.1`, `GHOST_LINE_ALPHA = 0.6`). DOM palette ghost: `--wa-color-surface-raised`,
`--wa-color-neutral-border-normal`, `--wa-border-radius-s`.

## States

| State | Border / outline | Fill | Text / icon | Extra |
| --- | --- | --- | --- | --- |
| default (palette) | 1 px `--line2` | `--p2`, photo | none | follows the pointer at frame rate, no easing |
| default (plan) | 1.5 px `--acc` 60 % | `--acc` 10 % | chip "x 2.50 y 4.00" `--txt` | already snapped (note 1) |
| snapped (hang) | as default | as default | chip "Truss 2 · 1.50 m" | truss 2 px `--acc`, dot; `is-hang` (note 2) |
| refused | 1.5 px `--prog` 60 % | `--prog` 10 % | chip with the reason, `--prog` | `he.builder.refused.*` (note 3) |
| array (Phase 4) | each footprint as default | as default | one chip at the end: "12 × 0.50 m" | 200 in one frame |
| hover, pressed | n/a | | | the ghost is the feedback; it exists only while pressed or armed |
| selected, disabled, mixed | n/a | | | |

Notes:

1. Snap sources: grid 0.1 m, smart guides, the hang line of a truss within 24 screen px.
2. `is-hang` goes on the plan pane so the cursor can change.
3. Reasons: outside the stage, same spot, over the limit, no truss here (hung-only item).

The palette ghost hides the moment the pointer enters the plan pane and the plan ghost appears; leaving the plan pane
brings the palette ghost back. Over the 3D pane the palette ghost shows the refused chip "Drop on the plan" and the
3D view does not react (owner decision 5).

## Behaviour

- Pointer: the plan ghost's position is the snapped stage point. Release commits exactly one `session.edit(op)`; a
  refused release commits nothing and the ghost disappears with no animation. Esc during a drag cancels it.
- Touch: identical; the ghost's label chip is drawn above the footprint instead of below, so the finger does not
  cover it. A two-finger gesture during a one-finger drag cancels the drag (no accidental drop).
- Keyboard: no ghost; Enter on a card places directly (`library-card.md`). Arrow nudges in Phase 3 show the plan
  ghost for 120 ms after the key so the new position is visible, then commit.
- Performance rule (source plan): no `session.edit` and no 3D rebuild during the gesture; `LivePreview.hold()` at
  gesture start, `release()` after the commit.

## Accessibility

- The ghosts are visual only (`aria-hidden`); the result is announced after the commit through the count badge's
  live region ("13 fixtures") and, for a refused drop, through a `role="status"` text in the plan pane that repeats
  the chip's reason in English with the Hebrew tooltip text available on the chip.
- The refused state never relies on colour alone: the chip text names the reason.

## Open points

1. Snap distance 24 screen px and grid 0.1 m are proposals; the owner may prefer 0.25 m on the deck.
2. The label chip's content for a fixture: position only ("x y"), or position plus hang height when hung? Proposed:
   "Truss 2 · 1.50 m" when hung, "x 2.50 y 4.00" on the deck.
