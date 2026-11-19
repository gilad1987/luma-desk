# Snap guides, snap points, selection handles, marquee

Phase that builds it: **Phase 3** (3a: pan/zoom, marquee, nudge, move; 3b: rotate and resize handles, truss draw,
smart guides). Everything here is drawn by `PlanOverlay` on the plan canvas; the hit areas are computed in
`planHandles`, not DOM elements.

## Purpose

Make precise placement possible without typing: guides show alignment with neighbours and the distance to them, snap
points show where a drag will land, handles let the operator rotate and resize in place, and the marquee selects
many items at once. The vocabulary is the one a Vectorworks or Figma user already knows, drawn in the desk's colours:
blue for geometry help, yellow for selection.

## Anatomy

```
                 : guide 1 px --blue (full plan height)
                 :
   +-------+     :         [1.20 m]  <- distance label 11 px mono --blue on --bg chip, mid-way on the gap line
   | truss |-----:---------|-------|
   +-------+     :         | riser |
                 :         +-------+
                 :
         Selection (single item):                    Marquee:
              o  <- rotate handle: 10 px circle on a 24 px stem      + - - - - - - - - +
              |                                                     '  1 px dashed --acc '
         ■---------■  <- 8 px square handles --acc, 1 px --bg inset  '  fill --acc 10 %   '
         |         |     44 x 44 invisible hit area each             + - - - - - - - - +
         ■---------■  <- outline 1 px --acc around the footprint
            [15°]     <- angle chip while rotating (11 px mono)

   Truss ends:  ■======================■   resize handles only at the two ends; a dragged end snaps to other ends
   LED wall:    ■----------------------■   two end handles (width); height is an inspector field
   Riser:       four corner handles (size) plus the rotate handle
```

## Sizes

| Part | Size |
| --- | --- |
| Smart guide | 1 px `--blue`, full plan viewport length, drawn within 24 screen px of an alignment |
| Distance label | 11 px `var(--mono)` `--blue`, chip fill `--bg`, `padding: 1px 4px`, radius 2, centred on the gap |
| Snap point | 4 px square `--blue` at the landing point (grid, end, centre), 1 px `--bg` inset |
| Hang snap | see `drag-ghost.md`: 6 px `--acc` dot on the truss line |
| Selection outline | 1 px `--acc` around the footprint (single) or the group bounds (multi, dashed 4 2) |
| Resize handle | 8 × 8 square, fill `--acc`, 1 px `--bg` inset line; hit area 44 × 44 centred on it |
| Rotate handle | 10 px circle `--acc`, 1 px `--bg` inset, on a 24 px stem (1 px `--acc`); hit area 44 × 44 |
| Marquee | 1 px dashed `--acc` (dash 4, gap 2), fill `--acc` 10 % |
| Hover outline | 1 px `--txt` at 60 % around the item under the pointer; not drawn on touch |

Handles keep their screen size at every zoom (drawn in screen px, positioned in stage units). When two handles would
be closer than 16 px on screen (a tiny riser zoomed out), the edge handles hide and the corners stay. The rotate stem
rises from the top-centre handle.

## Tokens used

`--plan-guide: var(--blue)`, `--plan-selected: var(--acc)` (exists today), `--plan-handle-inset: var(--bg)`,
`--plan-hover: var(--txt)`, `--plan-label-bg: var(--bg)`, `--plan-marquee: var(--acc)`; alphas are named constants
in the draw code (`MARQUEE_FILL_ALPHA = 0.1`, `HOVER_ALPHA = 0.6`). Font `var(--mono)`.

## States

Handles:

| State | Border / stroke | Fill | Text / icon | Extra |
| --- | --- | --- | --- | --- |
| default | 8 px `--acc` square, `--bg` inset | `--acc` | none | drawn only for the selection |
| hover | 10 px (grows 2 px) | `--acc` | none | resize cursors; rotate: `grab`; pointer only |
| pressed | 10 px | `--acc` | chip with the live value | item draws through `preview(op)` (note 1) |
| focus | n/a | | | handles are not focusable (note 2) |
| error (refused) | outline `--prog` | | chip reason `--prog` | below 0.1 m or outside the stage; release reverts |
| selected, disabled, mixed | n/a | | | |

Items, guides, marquee:

| State | Border / stroke | Fill | Text / icon | Extra |
| --- | --- | --- | --- | --- |
| selected (item) | 1 px `--acc` outline | none | | multi: dashed group bounds plus 1 px solid per item |
| disabled (locked) | 1 px `--mut` outline, no handles | none | lock glyph 12 px `--mut` | Phase 5 lock (note 3) |
| snapped (guide) | 1 px `--blue` | | distance chip `--blue` | up to 2 vertical and 2 horizontal (note 4) |
| marquee | 1 px dashed `--acc` | `--acc` 10 % | | items inside show the hover outline; release selects |
| hover (item) | 1 px `--txt` 60 % | | | pointer only |

Notes:

1. The chip shows the angle, the length or the size; guides may appear during the drag.
2. Keyboard uses the nudge keys and the inspector fields instead.
3. A locked item is pickable but not editable.
4. Equal gaps show the same value on both chips.

## Behaviour

- Pointer: Select tool (`V`). Press on empty plan and move = marquee (any direction; contained items are selected on
  release; Shift adds to the selection as an extra, not the only route: a second marquee without Shift replaces).
  Press on an item = move the whole selection (1 px threshold, then snapped). Press on a handle = resize or rotate;
  rotation snaps to 15° steps always (the angle chip shows the value; fine angles are typed in the inspector). A truss
  end dragged within 24 screen px of another truss end snaps to it and the other end highlights 2 px `--acc`.
- Touch: one finger does what the pointer does; two fingers pan and zoom (`PlanCamera`), also during a one-finger
  gesture, which cancels that gesture. Handles have 44 px hit areas, so a finger can take a corner of a small riser;
  when two hit areas overlap, the one nearer to the finger wins.
- Keyboard: arrows nudge the selection 0.1 m (Shift 1 m, Alt 0.01 m are extras; the default step is 0.1 m); the
  moved item draws as a ghost for 120 ms then commits one undo step per key press. Ctrl/Cmd+A selects all, Esc clears
  the selection, Delete deletes. Rotation and size by keyboard go through the inspector fields.
- One gesture is one undo step; the overlay never calls `session.edit` before pointer-up.

## Accessibility

- The canvas has `role="application"` with an English `aria-label` ("Stage plan") and `aria-describedby` a hidden
  text naming the keys (select all, nudge, delete). The selection is announced through a `role="status"` text in the
  plan pane ("3 fixtures selected"; "Truss 2 selected").
- Handles are pointer and touch targets only; every handle action has a keyboard route through the inspector (Phase
  5) and the nudge keys, so no function is pointer-only.
- Colour is never the only signal: the locked item shows a glyph, the refused resize shows a reason chip.

## Open points

1. 15° rotation snap always (no free rotation by drag): confirm. Free rotation would need a modifier, which the
   source plan excludes; the inspector takes exact angles.
2. Guides to the stage centre line and the deck edges in addition to neighbours? Proposed: yes, centre line and deck
   edges always count as guide sources.
3. Marquee from a press on an item is impossible (it moves the item). Proposed: keep Figma semantics; the owner may
   want a dedicated marquee key.
