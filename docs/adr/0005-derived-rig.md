# ADR 0005: The rig is derived from a stage design

- Status: Accepted
- Date: 2026-11-18
- Scope: `src/domain/stage`, `src/engine/stage`, `src/render/stage`, `src/ui/builder`, `src/show/stageField.ts`

## Context

Before the Stage Builder, the rig was one fixed list: `buildRig()` in `src/domain/rig` made the 405 fixtures of the
Sultan's Pool stage, and the scene, the groups and the presets were built for it once at boot. The Stage Builder
lets the operator change the deck, the trusses, the LED walls and the fixtures at run time. The MVR import must
replace the rig too. So the desk needs one rule for where a rig comes from and how the rest of the app learns of a
new one.

## Decision

1. The operator edits a `StageDesign` (`src/domain/stage/StageDesign.ts`), never the rig. `rigFromDesign` derives
   the rig from the design.
2. `StageService` (`src/engine/stage/StageService.ts`) is the one place that replaces the rig at run time. Its
   `apply(design, cause)` sets rig, design, frame and cause together, then emits `rigChanged` with only the design
   (contract G5). Listeners read the rest from the `RigSource`.
3. The cause says why the rig changed: `boot`, `preview` (the builder's live preview), `builder` (Done), `showLoad`
   and `import` (MVR). Only `builder` and `import` emit `showChanged`, so a preview or a show load is not saved.
4. The built-in Sultan's Pool design derives the original rig exactly, and a show on the built-in design has no
   `stage` key, so the default stage and the default show stay as they were.
5. No `StagePartBuilder` interface. Plan §4 W3 listed `src/render/stage/StagePartBuilder.ts` as the extension point
   for MVR parts. It is deferred until MVR needs it. Until then MVR adds its parts through the contract hooks (§7,
   §9): its surfaces go in the one `SurfaceHit.setSurfaces(boxes)` call of a rebuild (G6), and it fits the camera
   with `CameraViews.fitTo(bounds)` (G7). An interface with no second implementation is a premature abstraction
   (code rules).

## Alternatives rejected

- **Edit the rig directly** (add, move and delete fixtures in the live `Rig`). The builder would need its own undo
  of rig changes, a show file would need the rig and the stage geometry kept in step, and the MVR import would need
  a second path. Trusses, decks and walls are not fixtures, so they would need a second model anyway.
- **Let each consumer rebuild itself from the design** (no service, each panel derives what it needs). Each would
  derive the rig again, and the order between the selection, the groups and the programmer would depend on chance.
- **An asynchronous `rigChanged`.** A queue would let a frame, a key or a command run after the rig changed but
  before its listeners ran, with a selection, groups and a scene that do not match the rig.

## Consequences

Good:

- One source of truth: the design. Undo is a stack of whole designs (`History`); the show file saves the design;
  the MVR import is to apply its design with the cause `import`, through the same path as the builder.
- Groups, presets, the selection and the scene follow every new rig without knowing who made it.

Costs and risks:

- Order is behavior. The bus is synchronous and calls listeners in subscribe order, which is their construction
  order: `Selection`, `StageGroups`, `MissingFixtureNotice`, `Programmer`, then `StageScene` and the UI. A listener
  that calls `apply` again throws (`RigAnnouncer.checkIdle`), because later listeners would get a stale design.
- Listeners must tell the causes apart: a `preview` is not committed (missing-fixture warnings stay, no toast above
  the soft limit), a `showLoad` brings its own groups.
- The built-in design must stay byte-exact. A change to it changes the goldens.
- Each `apply` rebuilds the 3D stage, so the builder delays its previews (150 ms after the last edit).

## Verified

- `tests/unit/domain/stage/sultansPoolParity.test.ts`: the built-in design derives the rig of `buildRig()` and the
  recorded original, field by field and in order.
- `tests/unit/engine/stage/`: the emit order, the causes, the re-entry guard and the listeners.
- `tests/unit/render/stage/StageScene.test.ts`: one `setSurfaces` call per build, `setVenue` before it on a venue
  switch, `fitTo` only on a rebuild.
- `tests/e2e/builder-flow.spec.ts` and the `stage-*.spec.ts` suites: Done, Cancel and undo in the browser.
- Not verified: the MVR import path; it lands with the MVR lane.
