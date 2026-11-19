# Stage Builder UX specification: overview

Component specification for the Stage Builder redesign (source plan: `/Users/gilad/.local/state/autopilot/sb-dnd/
source-plan.md`, sections "Target UX", "Design system (professional UI gate)" and "Owner decisions (final)"; Phase 1
layout: `plan-ui-p1.md`, saved as `docs/plan/stage-builder-dnd/01-shell.md`). Written with the `impeccable` skill
in its Operate mode: the operator is in a task, so familiarity, density and consistency outrank expression, and the
brand lives in precise details. Each UI phase builds its components from these files; the design review of each phase
compares the running app against them.

Files: `library-card.md` (Phase 2), `toolbar.md` (Phase 1), `inspector-field.md` (Phase 5), `contextual-strip.md`
(Phase 4), `drag-ghost.md` (Phases 2 and 3), `snap-guide-handles.md` (Phase 3).

## Design thesis

A dark stage and one yellow. The builder is the desk's own room, not a web page: the surfaces are the desk's
near-black greys, the type is Inter at the desk's sizes, and `--acc` (the desk's yellow) is the only colour that
means "this is active, selected, or about to happen". Red (`--prog`) means refused or over a limit, blue (`--blue`)
is reserved for geometry help (guides, snap points, the LED wall), green (`--go`) is unused in the builder. Nothing
glows, nothing has a gradient, nothing lifts on hover; depth comes from one surface step and a 1 px line. The model
operators are grandMA3, Vectorworks Spotlight and Depence: dense but calm.

## Principles (binding for every component)

1. **Editing on the plan.** Every placement, move, rotate, resize and array happens on the 2D plan canvas. The 3D
   view is a live preview and never a drop target (owner decision 5).
2. **Direct manipulation, one gesture = one undo step.** A gesture draws through the plan preview and overlay;
   pointer-up commits once. No "Apply" dialogs.
3. **No hover-only action and no modifier-only action.** Hover may add feedback (a border, a tooltip); it never
   reveals the only way to do something. Every pointer action has a touch and a keyboard route.
4. **44 px touch targets** on every control (U9); the visible shape may be smaller, the hit area is not.
5. **Builder language is English, tooltips are Hebrew** (owner decision 7). The builder root is `dir="ltr"`; the
   Hebrew tooltip text is `dir="rtl"` inside the tooltip body. All text comes from `he.builder` or inline English.
6. **State is a class, colour is a token** (U2, U7, U11). A component shows a state through an `is-*` modifier; a
   canvas drawing reads its colours from `--plan-*` custom properties. No hex in TypeScript.

## Colour mapping: Web Awesome tokens under `.builder.wa-dark`

`src/styles/builder/_wa-theme.scss` sets these on `.builder.wa-dark`. Web Awesome's own dark values are overridden;
anything not listed keeps the upstream value. `mix(C, P%, B)` below means `color-mix(in srgb, C P%, B)`. The Phase 1
components read exactly the tokens listed (verified against the 3.15.0 style chunks of `wa-button`, `wa-tooltip`,
`wa-split-panel`, `wa-drawer`).

Surfaces and text:

| Web Awesome token | Value | Used by |
| --- | --- | --- |
| `--wa-color-surface-default` | `var(--p1)` | panels, bar, strip |
| `--wa-color-surface-raised` | `var(--p2)` | drawer, cards, popups |
| `--wa-color-surface-lowered` | `var(--bg)` | plan well, inputs |
| `--wa-color-surface-border` | `var(--line)` | panel edges, dividers |
| `--wa-color-text-normal` | `var(--txt)` | labels, values |
| `--wa-color-text-quiet` | `var(--mut)` | captions, field labels |
| `--wa-color-text-link` | `var(--blue)` | unused in the builder |

Semantic fills (`fill`, `on`, `border` × `loud`, `normal`, `quiet`):

| Scale | loud | normal | quiet |
| --- | --- | --- | --- |
| brand fill | `var(--acc)` | `mix(--acc, 18%, --p2)` | `mix(--acc, 10%, --p1)` |
| brand on | `var(--bg)` | `var(--acc)` | `var(--acc)` |
| brand border | `var(--acc)` | `var(--acc)` | `mix(--acc, 40%, --line2)` |
| neutral fill | `var(--line2)` | `var(--p3)` | `var(--p2)` |
| neutral on | `var(--txt)` | `var(--txt)` | `var(--txt)` |
| neutral border | `var(--line2)` | `var(--line2)` | `var(--line)` |
| danger fill | `var(--prog)` | `mix(--prog, 18%, --p2)` | `mix(--prog, 10%, --p1)` |
| danger on | `var(--bg)` | `var(--prog)` | `var(--prog)` |
| danger border | `var(--prog)` | `var(--prog)` | `var(--prog)` |
| warning (all) | same as danger | same as danger | same as danger |
| success fill | `var(--go)` | `mix(--go, 18%, --p2)` | `mix(--go, 10%, --p1)` |
| success on, border | `var(--bg)`, `var(--go)` | `var(--go)` | `var(--go)` |

Where they appear: brand loud = Done and OK; brand normal = the selected mode button; brand quiet = the armed card and
the marquee fill; brand border quiet = the DOM ghost outline. Neutral loud = a pressed plain button; neutral normal =
filled buttons and hover; neutral quiet = cards and outlined buttons. Danger normal = the refused chip; danger quiet =
an error field. Warning maps to danger on purpose: the desk has no orange, and the builder uses warning only for the
count badge text. Success is mapped for completeness; no builder component uses it.

Interaction, shape, motion:

| Web Awesome token | Value | Note |
| --- | --- | --- |
| `--wa-color-focus` | `var(--acc)` | every focus ring |
| `--wa-focus-ring-width` | `2px` | |
| `--wa-focus-ring-offset` | `1px` | |
| `--wa-focus-ring-style` | `solid` | |
| `--wa-color-mix-hover` | `var(--txt) 8%` | hover = fill + 8 % text |
| `--wa-color-mix-active` | `var(--bg) 16%` | pressed = fill + 16 % bg |
| `--wa-color-overlay-modal` | `mix(--bg, 60%, transparent)` | drawer backdrop |
| `--wa-color-shadow` | `rgb(0 0 0 / 0.6)` | drawer and tooltip only |
| `--wa-shadow-l` | `-8px 0 24px -8px var(--wa-color-shadow)` | drawer |
| `--wa-shadow-s` | `0 2px 8px -2px var(--wa-color-shadow)` | tooltip |
| `--wa-border-radius-s`, `-m`, `-l` | `4px` | |
| `--wa-panel-border-radius`, `--wa-form-control-border-radius` | `4px` | |
| `--wa-button-transform-hover`, `-active` | `none` | no movement on press |
| `--wa-transition-fast`, `-normal` | `120ms` | state changes |
| `--wa-transition-slow` | `200ms` | drawer slide |
| `--wa-transition-easing` | `ease-out` | |

Form controls (`inspector-field.md` lists the rest): `--wa-form-control-height: 44px`,
`--wa-form-control-padding-inline: 12px`, `--wa-form-control-padding-block: 0`,
`--wa-form-control-border-color: var(--line2)`, `--wa-form-control-background-color: var(--bg)`.

## Typography

| Role | Font | Size / weight | Token or rule |
| --- | --- | --- | --- |
| Controls (buttons, inputs, names) | Inter | 13 px / 500 | `--wa-font-size-m: 13px`, `--wa-font-weight-action: 500` |
| Bar title, section headings | Inter | 13 px / 600 | `--wa-font-weight-semibold: 600` |
| Captions (brand, badge, hints) | Inter | 12 px / 400 | `--wa-font-size-s: 12px` |
| Tags (mixed, approximate) | Inter | 11 px / 500 | `--wa-font-size-xs: 11px` |
| Drawer title | Inter | 14 px / 600 | `--wa-font-size-l: 14px` |
| Labels on the plan canvas | JetBrains Mono | 11 px / 400 | `var(--mono)`, drawn by the canvas, tabular numerals |
| Numbers in inputs and the badge | Inter | 13 px | `font-variant-numeric: tabular-nums` |

Line height 1.3 everywhere (the desk's). `--wa-font-family-body: Inter, system-ui, sans-serif`;
`--wa-font-family-code: var(--mono)`. No display face, no uppercase tracked labels, no kicker above a heading.
Sentence case everywhere ("Stage Builder", "Mirror L → R").

## Spacing, elevation, motion

- Spacing scale 4 / 8 / 12 / 16 (24 for the drawer header): `--wa-space-xs: 4px`, `-s: 8px`, `-m: 12px`,
  `-l: 16px`, `-xl: 24px`, `--wa-space-2xs: 2px`. Panels pad 12 px; controls in a row are 8 px apart; a field row is
  4 px between label and control; sections are 16 px apart.
- Elevation: flat. One surface step (`--p1` panel, `--p2` raised piece, `--bg` well) plus a 1 px `--line`. Shadows
  only on the drawer (`--wa-shadow-l`) and the tooltip (`--wa-shadow-s`). No shadow on cards, strips or ghosts.
- Motion: 120 ms ease-out on colour and border changes; the drawer slides in 200 ms. No transition on anything that
  follows a pointer or a finger (ghosts, handles, marquee, divider, guides): those draw at frame rate with no easing.
  No entrance animation when the builder opens.

## Iconography

- 20 px viewBox, 1.75 px stroke, `stroke="currentColor"`, `fill="none"`, round joins and caps, drawn on a 1 px grid.
  Inline SVG from `src/ui/builder/wa/waIcons.ts`, `aria-hidden="true"`, no icon font, no network (ADR 0006).
- Directional icons (undo, redo, mirror, inspector, rail toggle) are drawn in their left-to-right form. The builder
  is `dir="ltr"`; if an icon is ever shown under `[dir='rtl']`, SCSS mirrors it with `transform: scaleX(-1)` on the
  `svg` (U8). Never draw both forms.
- Icon colour follows the text colour of its state (`currentColor`); only the count badge over limit and the refused
  ghost chip set an own colour (`--prog`).

## Tooltips (`wa-tooltip`)

- One per control that has no visible label or whose label is a verb (edit buttons, mode buttons, star, step
  buttons, divider). `for` = the control's id, `trigger="hover focus"`, `distance="4"`, show delay 150 ms, hide delay
  0, placement `bottom` under the bar and `top` over the strip, `start`/`end` beside the rail.
- Text: the Hebrew string from `he.builder` (`dir="rtl"`), 12 px, on `--p3` with a 1 px `--line2` border, text
  `--txt`, radius 4 px, `--wa-shadow-s`, max width 240 px, no arrow (`--wa-tooltip-arrow-size: 0`). Tokens:
  `--wa-tooltip-background-color: var(--p3)`, `--wa-tooltip-border-color: var(--line2)`,
  `--wa-tooltip-content-color: var(--txt)`, `--wa-tooltip-font-size: 12px`.
- A tooltip never carries the only description of a control: every control also has an English `aria-label` or
  visible label. Touch: a long press on a control shows its tooltip; a tap acts.

## Layout grid and breakpoints

```
 >= 1100 px                                             < 1100 px
+------ bar 56 ---------------------------------------+ +------ bar 56 (icons only) ------------+
| lib 300 |  3D preview                   | insp 320  | | rail 56 | 3D (Split only)             |
|         +---- divider 1 px, hit 44 -----+           | |         +---- divider ----------------+
|         |  plan + overlay + strip       |           | |         | plan (default mode)          | drawer 320 (end)
+---------+-------------------------------+-----------+ +---------+------------------------------+
```

- Columns `300px minmax(0, 1fr) 320px`, rows `56px minmax(0, 1fr)`; the bar spans every column.
- One breakpoint, `$builder-narrow` = below 1100 px (`max-width: 1099px`): the library is a 56 px icon rail, the
  inspector is a 320 px drawer at the end edge under the bar, opened from the bar and not modal (the builder's own
  panel, not a `wa-drawer`, which always opens as a modal; ADR 0006), the bar buttons drop their
  labels and keep icon and tooltip, and the default view mode is Plan. iPad landscape (1024) and portrait (768) are
  this layout.
- Minimum tested widths: 1280 × 800, 1024 × 768, 768 × 1024.

## State vocabulary (every component uses these names and this appearance)

| State | Border | Fill | Text / icon | Extra |
| --- | --- | --- | --- | --- |
| default | 1 px `--line` or `--line2` | `--p1`, `--p2` or none | `--txt` | |
| hover | 1 px `--line2` | fill + 8 % `--txt` | `--txt` | no movement, no shadow; pointer only |
| pressed | unchanged | fill + 16 % `--bg` | `--txt` | while the pointer or finger is down |
| focus | + 2 px `--acc` ring, 1 px offset | unchanged | unchanged | keyboard only (`:focus-visible`) |
| selected | 1 px `--acc` | brand fill normal | `--acc` | `aria-pressed` or `aria-selected` |
| disabled | 1 px `--line` | unchanged, no hover | `--mut` | opacity stays 1; the tooltip still works |
| error | 1 px `--prog` | danger fill quiet | value `--txt`, message `--prog` | message under the control, as an alert |
| mixed | 1 px `--line2` | `--bg` | `—` placeholder in `--mut` | "mixed" tag; the selected items disagree |

Component-specific states extend this table and are named in the component file: `armed` (library card),
`refused` (drag ghost), `snapped` (ghost and guides), `hidden`/`locked` (outline rows, Phase 5).

## Open points for the owner

1. Warning colour: the badge over the limit uses `--prog` (red) because the desk has no orange. Accept, or add a
   desk token for warning.
2. Hover feedback on cards and plan items exists on pointer devices only; touch has none. Accept.
3. The Hebrew tooltips show on a long press on touch; the first tap on a card arms it (see `library-card.md`).
