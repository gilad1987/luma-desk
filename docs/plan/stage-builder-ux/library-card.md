# Library card (`.library-card`)

Phase that builds it: **Phase 2** (library, drag to place, stamp, Enter to place). Phase 6 supplies the real pictures
and the fallback renders; Phase 2 ships with placeholder pictures through the same `pictureOf(id)` call.

## Purpose

One item of the catalogue (a fixture product, a truss preset, a stage element) that the operator drags onto the plan,
arms for stamping, or places with Enter. The picture carries the recognition ("that is a Sharpy"), the name and brand
confirm it, the badge says how honest the model is. The card is a tool handle, not a shop tile: no price, no
description, no hover reveal.

## Anatomy

```
   132 px
+-----------------------+
| picture 132 x 99 (4:3)|  <- object-fit: cover, background --p3
|                   [☆] |  <- favourite star: 20 px icon, 44 x 44 hit area, top-end corner
| [approximate]         |  <- 11 px tag, bottom-start corner of the picture, only when the model is approximate
+-----------------------+
| Sharpy                |  <- name 13 px / 500, --txt, max 2 lines, ellipsis
| Clay Paky             |  <- brand 12 px, --mut, 1 line
+-----------------------+
  padding 8, gap 4; card border 1 px --line, radius 4, fill --p2
```

Rail mode (below 1100 px): the library column is a 56 px rail of 44 × 44 category buttons (icon + Hebrew tooltip:
Movers, Washes, Beams, Strobes, LED, Trusses, Stage, Favourites, Recent). A tap opens a 300 px flyout over the plan's
start edge with the search field and the same cards; the flyout closes on a drag start, a placement, a tap outside,
or Esc. The card itself does not change in rail mode.

## Sizes

| Part | Size |
| --- | --- |
| Grid | 2 columns in the 300 px library: padding 12, gap 12 → card 132 px wide, about 150 px tall |
| Picture | 132 × 99, radius 4 on the top corners only, `background: var(--p3)` while loading |
| Star | 44 × 44 hit area, 20 px icon, 2 px from the top-end corner; the visible icon never hides |
| Tag | 11 px / 500, `padding: 2px 6px`, 1 px `--line2` border, radius 4, fill `--p1`, 4 px inset |
| Name, brand | 13 px / 500 `--txt` (2 lines max), 12 px `--mut` (1 line), `text-overflow: ellipsis` |
| Rail button | 44 × 44 in the 56 px rail, 20 px icon, 6 px vertical gap |

## Tokens used

`--wa-color-neutral-fill-quiet` (card), `--wa-color-neutral-border-quiet` (card border),
`--wa-color-neutral-border-normal` (hover), `--wa-color-brand-border-normal` and `--wa-color-brand-fill-quiet`
(armed), `--wa-color-text-normal`, `--wa-color-text-quiet`, `--wa-focus-ring*`, `--wa-border-radius-s`,
`--wa-transition-fast`; star on: `--acc`.

## States

| State | Border | Fill | Text / icon | Extra |
| --- | --- | --- | --- | --- |
| default | 1 px `--line` | `--p2` | name `--txt`, brand `--mut`, star outline `--mut` | |
| hover | 1 px `--line2` | `--p2` + 8 % `--txt` | unchanged | 120 ms; `cursor: grab`; pointer only |
| pressed | 1 px `--line2` | `--p3` | unchanged | until the drag threshold or release |
| focus | 2 px `--acc` ring | unchanged | unchanged | roving tabindex: one card is tabbable |
| armed | 2 px `--acc` | 10 % `--acc` on `--p1` | name `--acc`, 16 px stamp mark | `is-armed`, `aria-pressed` (note 1) |
| favourite | unchanged | unchanged | star filled `--acc` | `is-favourite`; persisted (note 2) |
| dragging | 1 px `--line` | `--p2` at 50 % opacity | unchanged | `is-dragging` on the source card (note 3) |
| disabled | 1 px `--line` | `--p2` | `--mut`, picture at 40 % | not placeable on this stage (note 4) |
| error | 1 px `--line` | picture area `--p3` | kind glyph 20 px `--mut` centred | `is-no-photo` (load failed) |
| selected, mixed | n/a | | | a card is armed, never selected |

Notes:

1. Armed: the plan cursor becomes a crosshair and a plan ghost follows it (`drag-ghost.md`).
2. Favourites and recent items persist in `src/io/builderLibraryStorage.ts`.
3. The drag ghost is a separate element; the source card only dims.
4. Example: a "hung only" item when the stage has no truss; the tooltip says why.

No shadow, no scale, no lift in any state. "approximate" is a tag, not a state: it stays in every state.

## Behaviour

- Pointer: press and move 6 px starts a palette drag (`PaletteDrag` on `pointerDrag`); release without moving arms
  the card for stamping (one tap arms, a second tap on the same card disarms; tapping another card re-arms). While
  armed, each click on the plan places one item at the snapped point (one undo step each); Esc or a tool key disarms.
  Click on the star toggles favourite and does not arm.
- Touch: a tap arms; a long press (300 ms, the card darkens to pressed as feedback) then a move starts the drag. Two
  fingers on the plan still pan and zoom while a card is armed. The star is a 44 px target of its own.
- Keyboard: arrow keys move focus between cards (grid navigation, wraps at row ends); Enter places one item at the
  stage centre (snapped to the nearest hang place if a truss is within 1 m, else on the deck) and keeps focus on the
  card; Space toggles armed; Tab from a card goes to its star, Tab again leaves the grid. Type-ahead in the search
  field filters the grid; Down from the search field enters the grid.
- Picture: `pictureOf(id)` returns the photo only with granted permission, else the fallback render; a load error
  shows the kind glyph. The picture is `loading="lazy"`, `draggable="false"`, `alt=""` (the name is the text).

## Empty and fallback

- No match for the search: the grid shows one line "No items match" (13 px `--mut`) and a Clear search button
  (neutral outlined, 44 px). No illustration.
- No favourites yet: "Tap the star on a card to keep it here" in `--mut`, the Hebrew version as the tooltip of the
  Favourites chip.
- No photo and no render: the kind glyph (mover, wash, truss, riser ...) on `--p3`.

## Accessibility

- The grid is `role="grid"` with one `role="row"` per visual row and `role="gridcell"` per card; the card is a
  `button` with `aria-label="<brand> <name>"` plus ", approximate" when tagged; `aria-pressed` reflects armed.
- The star: `button` `aria-label="Favourite"` with `aria-pressed`; Hebrew tooltip `he.builder.library.favourite`.
- The Hebrew tooltip of a card (`he.builder.library.cardHint`) says: drag to the plan, tap to stamp, Enter to place.
  It opens on hover, focus, or a long press; it never covers the star.

## Open points

1. Rail-mode flyout (300 px over the plan) is a design decision in this file, not in the source plan. The alternative
   is a `wa-drawer placement="start"`; the flyout keeps the plan visible while dragging. Owner to confirm.
2. The second tap on an armed card disarms it; an alternative is that any tap on a card re-arms and only Esc disarms.
3. Enter places at the stage centre; a second Enter on the same card places a duplicate 0.5 m to the right (repeat
   offset) or refuses with the "same spot" rule? Proposed: repeat offset, consistent with Ctrl/Cmd+D.
