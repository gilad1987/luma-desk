# Architecture

LUMA DESK is a lighting desk and a 3D stage that run in the browser with no server. Until the TypeScript refactor it
was one file, `index.html` (3,096 lines at commit `48a3b63`). This document describes the structure in `src/`, why it
has that shape, and the rules that keep it that way.

> **Status: the refactor (Phases 0-8) is complete.** `src/main.ts` is the composition root (at most 100 lines) over
> `src/app/`, fully typed and linted with no exemption. `index.html` is a 90-line shell. `vendor/` is deleted;
> three.js comes from npm.

## Layers

Each folder under `src/` is a layer. A layer imports only from the layers below it:

```text
core  <-  domain  <-  engine  <-  command / show / autoshow / audio
                                  render / ui / io  (on top: they may import any layer above in this list)
app: the wiring modules; app -> every layer; no src/ module except main.ts imports app
main.ts: the composition root; it calls the app modules
```

`ui` drives `render`, never the reverse: `render` must not import `ui`.

| Layer      | Holds                                                                                                       |
| ---------- | ----------------------------------------------------------------------------------------------------------- |
| `core`     | Pure helpers with no app knowledge: math, colour, seeded RNG, `Clock`, `EventBus`. Imports no library.      |
| `domain`   | What the rig is: fixture types, attributes, the rig data (`domain/rig/<area>.ts`), aim and venue constants. |
| `engine`   | What the desk does: selection, programmer, presets, groups, executors, cue lists, fades, phasers, output.   |
| `command`  | The command line: lexer, parser, one runner per statement kind.                                             |
| `show`     | The show file: serializer, storage, the demo show, boot restore.                                            |
| `autoshow` | Auto Show: song structure, styles, the look generator.                                                      |
| `audio`    | Song playback, analysis and BPM detection.                                                                  |
| `render`   | three.js: renderer, cameras, scene lights, venue, beams, shaders (`.glsl` loaded with `?raw`).              |
| `ui`       | DOM panels, layouts (MA, desk, classic), guide and tour, shared widgets.                                    |
| `io`       | Browser edges: service-worker registration, install, fullscreen, download, MIDI, REC.                       |
| `i18n`     | Hebrew text (`i18n/he/`). English console terms stay inline where they are used (decision 16).              |
| `styles`   | One stylesheet per panel or layout, in the original cascade order.                                          |
| `app`      | Wiring for the composition root: builds the objects of every layer, joins them, runs the frame loop.        |

Why one direction: the engine must run in Vitest with no browser, and a parity test must be able to drive it
without a DOM. So `engine` never imports `render`, `ui`, `io` or the DOM. `domain` and `engine` may use the `three`
core package for its math types only (`Vector3` keeps the float results exact, decision 1); `three/addons` stay in
`render`. `eslint.config.ts` enforces the layer imports with `no-restricted-imports` (`eslint/layerRules.ts`), one
rule set per layer, plus one rule that lets only `src/main.ts` and `src/app/` import `src/app/`; the same patterns,
the app rule included, guard `import()` through `no-restricted-syntax`, and `eslint/domGlobalRules.ts` keeps
`document`, `window` and `localStorage` out of core, domain and engine.

## Wiring

Every object is built once and gets what it needs in its constructor. There are no module singletons: the rig, for
example, is built once at boot and injected (decision 4). A class that the wiring builds says in its TSDoc what it
receives and which events it emits or listens to.

### Composition root

`src/main.ts` (at most 100 lines) builds the desk in the boot order of the original script
(`index.html@48a3b63`), because the order of construction is behavior (decision 24). It calls the wiring modules in
`src/app/`. Besides those, it inserts the page shell markup first, builds `ViewportPicking`, binds `#helpBtn` and
calls `restoreShow`, each at the point where the original did the same work.

| Folder             | Wires                                                                                            |
| ------------------ | ------------------------------------------------------------------------------------------------ |
| `src/app/boot`     | Engine, stage, render and fixture visuals (`wireEngine`, `wireStage`, `wireRender`, ...).        |
| `src/app/loop`     | The frame loop (`FrameLoop`), the UI tick scheduler (`UiTickScheduler`) and its callbacks.       |
| `src/app/testHook` | `window.__desk` for the parity suite, only with `?test` (`installTestHook`, decision 25).        |
| `src/app/ui`       | The UI panels: top bar, encoders, executors, cue panes, side panes, command line, FPS and clock. |
| `src/app/uix`      | Show files, the Show File dialog, Auto Show.                                                     |
| `src/app/io`       | MIDI, the guide and tour, recording, fullscreen, install, service-worker registration.           |
| `src/app/layout`   | The layouts (MA, desk, classic), the MA hardware readouts, console info.                         |

### Frame loop

`FrameLoop` (`src/app/loop/FrameLoop.ts`) asks for the next frame first, so an exception later in the frame does
not stop the loop. Then it runs one frame in the original order, which is parity: the merger reads the fades just
stepped, the visuals read the merged output, and the lights read the light frame the visuals just filled. One step
moved: the original updated the house and key lights inside `updateVisuals` (`index.html@48a3b63:1782-1785`), before
`updateProps`; now the scene and key lights update after the props, which touch only the haze sprites.

1. `animateCrowd`
2. the engine: `songPlayer.sync`, `autoShow.tick`, `pool.stepFades`, `merger.compute` (with the Auto Show
   modulation)
3. `visualSync.update`
4. `props.update`
5. `sceneLights.update`
6. `keyLights.update`
7. `animatePerformers`
8. `stageRenderer.renderFrame`
9. the FPS readout, then the UI tick

The frame step `dt` is capped at 0.1 s, as in the original (`index.html@48a3b63:2529`). The cap affects only the
fixture pose smoothing (`visualSync.update`) and the FPS count. Fades, the Auto Show and the output merge use the
absolute time, so after a stalled tab they catch up in one frame.

### UI tick scheduler

The render runs every frame; the DOM panels repaint on two slower clocks (`src/app/loop/UiTickScheduler.ts`):

- **Fast tick**, more than 50 ms after the last one: live readouts and faders. Callbacks get the frame time.
- **Slow tick**, more than 400 ms after the last one, or on the next frame when the UI is dirty: the slow panels.
  `markDirty()` replaces the original `uiDirty.all` flag; the composition root calls it on the engine's `stateDirty`
  event. It forces the slow tick on the next frame, not at once.

Callbacks run in registration order. `src/app/loop/scheduleUiTicks.ts` registers them in the original order
(`index.html@48a3b63:2536-2547`): fast are the executors, encoders, Auto Show pane, MA readouts, selection info and
command keys; slow are the sequence and sheet panes, then the FPS and the clock. The UI starts dirty, so the first
frame runs the slow tick (known quirk Q17).

The engine reports what happened through one typed, synchronous `EventBus` (`src/core/EventBus.ts`, ADR 0002). It
never calls the UI or storage. The event map is `EngineEvents` in `src/engine/events.ts`:

| Event              | Means                                                     | Listener today                                              |
| ------------------ | --------------------------------------------------------- | ----------------------------------------------------------- |
| `message`          | Feedback for the operator: a log line or a toast          | `CommandLine`, `Toast`                                      |
| `poolsChanged`     | Group or preset pools changed; repaint them               | `PoolsPanel`                                                |
| `stateDirty`       | The slow panels must repaint                              | `UiTickScheduler.markDirty()`, joined in `main.ts`          |
| `showChanged`      | The show must be saved                                    | `ShowStorage.persist()`, joined in `createShowFiles`        |
| `storeModeChanged` | STORE was armed or cancelled                              | `showStoreMode`                                             |
| `selectionChanged` | The fixture selection changed                             | none (known quirks, section H)                              |
| `cueStored`        | A cue was stored; carries the executor and the cue number | none (known quirks, section H)                              |
| `rigChanged`       | `StageService` replaced the rig; carries the new `design` | engine services, `StageScene`, `SheetPanel` (Stage Builder) |

Delivery is synchronous because order is behavior: the command line must show a statement's feedback before the
next statement runs, and the save debounce must start in the same tick as before.

Per-frame data that crosses layers is passed as a value, not as an import. For example the Auto Show's beat pump
reaches the output merge as a readonly `OutputModulation` argument, so the engine never imports `autoshow`
(decision 2).

## Stage Builder

The rig is not edited directly: it is derived from a stage design ([ADR 0005](adr/0005-derived-rig.md)).

- **Model** (`src/domain/stage`). `StageDesign` (version 1) is plain readonly data: deck, risers, trusses, LED walls,
  fixtures, venue and scenery toggles. `templates/` makes the four start designs (`empty`, `theatre`, `festival`,
  `sultans-pool`); the built-in Sultan's Pool design derives the original rig field by field and in build order
  (`sultansPoolParity.test.ts`). `edit/` holds the pure edit operations and `History`, the builder's undo stack of
  whole designs. `rigFromDesign` derives the rig.
- **Rig lifecycle** (`src/engine/stage`). `StageService` is the one place that replaces the rig at run time. It is
  the `RigSource`: rig, design, frame and cause are set together, then `RigAnnouncer` emits `rigChanged` with only
  the design. The cause is `boot`, `preview` (the builder's live preview, not saved), `builder` (Done), `showLoad`
  or `import` (MVR); only `builder` and `import` emit `showChanged`. Delivery is synchronous in subscribe order:
  `Selection`, `StageGroups`, `MissingFixtureNotice`, `Programmer`, then `StageScene` and the UI. A listener that
  calls `apply` again throws.
- **Render** (`src/render/stage`). `StageScene` owns `StageBuild` (deck, risers, trusses, LED walls) and
  `StageVenue` (the venue around them). `SceneryRegistry` shows or hides a scenery part without a rebuild. The venue
  kinds are `sultans-pool`, `black-box` and `open-field`; only a new kind rebuilds the venue. Each build makes one
  `SurfaceHit.setSurfaces(surfacesOf(design))` call; `setVenue` sets the ground (terraces or a flat floor) at boot
  and on a venue switch. A rebuild calls `CameraViews.fitTo(boundsOf(design))`, then `setView(currentView)`.
- **Builder UI** (`src/ui/builder`). The **Build Stage** button (`#buildBtn`) opens `BuilderMode`, which hides the
  console and makes `#side`, `#enc` and `#desk` inert. Edits apply as a delayed `preview`; Done applies the draft as
  `builder`, Cancel applies the start design back. `builderKeys.ts` maps Ctrl/Cmd+Z, Ctrl/Cmd+Shift+Z, Ctrl/Cmd+Y,
  Ctrl/Cmd+D and Delete/Backspace.
- **Show format** (`src/show/stageField.ts`). A v:1 show has an optional `stage` key, written only for a custom
  design, so the default show stays byte-equal to older ones. The auto-saved show stays under `lumadesk-show-v6`.

## Behavior parity

The refactor changes no behavior. That is proved by tests, not by review:

- Golden files in `tests/golden/` record the original app's output: the show JSON, command transcripts, the
  computed fixture output, the venue scene, the shaders and the order of random calls.
- Oracles under `tests/unit/**/oracle/` are the original functions, copied as they were, so a unit test can compare
  the new class with the old code over many random inputs.
- `tests/e2e/screenshots.spec.ts` compares nine views (three layouts, three cameras) with approved baselines.

Determinism makes that possible. With `?test` in the URL, a block in `index.html` freezes the clock, seeds
`Math.random` and lets the test step frames. The test API `window.__desk.test` exists only then. The hook ships in
every build and is switched on at run time, so the parity suite runs against the production preview (decision 23).
`window.__desk` itself exists only with `?test` too (decision 25). Test mode does not patch `setTimeout` or
`setInterval` (known quirk K1).

three.js gives every object a uuid from `Math.random`. So the order in which render code creates materials,
geometries and meshes is part of the behavior (decision 24): unused materials stay, and some materials are created
before their geometry. Only the orchestrator approves a new screenshot baseline. `docs/known-quirks.md` lists every
odd behavior that is kept on purpose, and the code cites its id.

## Build, deploy and offline

Vite builds the app with `base: './'`, so the same output runs under `/luma-desk/` on GitHub Pages and from the
installed PWA (ADR 0001). `index.html` is a shell of 90 lines: the head, the `?test` block and the module script.
It links `src/styles/index.scss`, and Vite compiles the SCSS partials. `build/sw-manifest-plugin.ts` builds `sw.ts`
into `dist/sw.js` and writes into it the list of shipped files and a cache name made from their content (ADR 0003).
`.github/workflows/deploy.yml` checks every pull request and push to `main`, and deploys `main` to Pages (ADR 0004).

There are three TypeScript projects (`tsconfig.json` references them): `tsconfig.app.json` for `src/`,
`tsconfig.node.json` for tests, configs, `scripts/` and `build/`, and `tsconfig.sw.json` for the worker.

## Code rules

The full rules are in `CLAUDE.md` and `docs/rules/`. In short:

- **100 lines per file**, measured after Prettier, for every file except Markdown. ESLint `max-lines` checks `.ts`;
  `npm run check:lines` checks `.css`, `.scss`, `.glsl`, `.html` and `.yml` (the frozen
  `tests/shared/legacy/original-index.html` is exempt). Split by responsibility: the rig is data files per area
  plus one index that joins them in build order.
- **All TypeScript.** No `.js`, `.mjs` or `.cjs` file anywhere. Configs are `.ts`.
- **Strict types.** `strict`, `noUncheckedIndexedAccess`, `noImplicitOverride`, `verbatimModuleSyntax`. No `any`,
  no `@ts-ignore`, no `!` that hides a real gap.
- **Prettier 3** (`prettier.config.ts`: width 120, single quotes, semicolons, trailing commas) for `.ts`, `.css`,
  `.scss`, `.json`, `.md`, `.yml` and `index.html`. `npm run lint` runs ESLint, the line check and `format:check`.
- **SCSS** only where plain CSS cannot do the job cleanly (partials with `@use`, mixins, loops). Runtime colours and
  sizes stay CSS custom properties.
- **Shared folders** only for code that two or more modules use, at the lowest level that fits: `src/core/` across
  layers, `<layer>/shared/` inside one layer (`ui/shared`, `render/shared`, `engine/shared`), `tests/shared/` for
  tests. Each has an `index.ts` that exports only its public API, and code outside imports that index.
- **TSDoc** on every exported symbol, saying why.

## Extending

Each recipe lists the files to touch, in order. The existing goldens record the original app, so they must stay
green unchanged; a change that alters them is re-recorded only with the orchestrator's approval.

### A fixture type

1. `src/domain/FixtureType.ts`: add the key to `FixtureTypeId`.
2. `src/domain/fixtureTypes/movingTypes.ts` (`MOVING_TYPES`) or `staticTypes.ts` (`STATIC_TYPES`): add its
   `FixtureType`. `moving` gates position phasers, the All Movers group and the focus pad; every type except the
   screen needs `model` and `size`.
3. `src/domain/fixtureTypes/index.ts`: add it at the end of `TYPES`, because the key order is the iteration order.
4. A new `FixtureModel` file in `src/render/fixtures/models/` (see `strike4Model.ts`). Register it under the `model`
   key in `createFixtureModels` (`src/render/fixtures/FixtureModels.ts`) and its lens in `createLensTextures`
   (`src/render/fixtures/LensTextures.ts`, faces in `src/render/fixtures/lens/`). This lens table is for native types
   only; a catalogue product uses the lazy lens of its family (see "A fixture product"). The tables are keyed by
   string, so a missing model throws at boot in `FixtureVisualBuilder`, not at compile time.
5. A new area file in `src/domain/rig/` with an `add…(rig: RigBuilder)` function (see `profiles.ts`), called at the
   end of `buildRig` (`src/domain/rig/index.ts`): the call order is the id order of the groups and the output.
6. Type-specific behavior: search for `f.type ===` (`src/engine/OutputMerger.ts`,
   `src/render/fixtures/FixtureVisualSync.ts`) and the type groups (`rig.idsOfType`) in `src/engine/defaultGroups.ts`.
7. The rig table: `RIG_RANGES` in `src/ui/guide/rigTable.ts` and `rigLocations` in `src/i18n/he/rigLocations.ts`
   (paired by index), and the README rig table.

Tests: update the key list in `tests/unit/domain/rigQueries.test.ts`. `tests/unit/domain/rigBuild.test.ts`
(`rig-build.json`) and `tests/unit/render/fixtures/fixtureParity.test.ts` (`fixture-scene.json`) prove that the old
rig is unchanged. New fixtures in the rig change those goldens, `random-calls.json` (`tests/e2e/determinism.spec.ts`),
the output goldens and the screenshots by design.

### A fixture product

A catalogue product (a real fixture such as the Robe Esprite) is a layer over a fixture type, not a new type (ADR
0007). The goldens and the screenshots stay unchanged.

1. The brand file in `src/domain/fixtureProducts/` (for example `robe.ts`): add a record with `id`, `brand`, `name`,
   `category`, `base`, `optics`, `body`, `span`, `mountHeight`, `dataSheet` and `unmodelled`. The `id` is show
   format: a saved design stores it, so it never changes.
2. `body.family` picks the parametric body family in `src/render/fixtures/families/` (`mover` in C1). A new family is
   a new member of `ProductBody` and a new case in the family switch.
3. Run `catalogueRules.test.ts`, `lazyProducts.test.ts` and `productSpans.test.ts`. Pin `span` and `mountHeight` to
   the values measured from the built model, as `BODY_SPANS` and `MOUNT_HEIGHTS` are.
4. Never add a product to `createLensTextures` or `createModelMaterials`: everything for a product is made when the
   first fixture of that product is built, so the boot draws no new `Math.random` (`random-calls.json`).
5. Cite the manufacturer data sheet in `dataSheet`, and check every optical number against it.

### A phaser

1. `src/engine/shared/phaserTypes.ts`: add the key to `PhaserType` and its `PhaserTypeSpec` to `PHASER_TYPES`
   (label, driven feature, starting size). Show files store the key, so it never changes. The key order is the button
   order that `src/ui/panels/encoders/extra/fxExtra.ts` builds.
2. `src/engine/phaserShapes.ts`: add its writer to `SHAPES`. The `Record` type fails the build until it is there. The
   writer sets only the `FxSample` fields of its feature.
3. No other engine change: `evalPhaser` (`src/engine/Phaser.ts`) calls `shapePhaser`, and `applyPhaser`
   (`src/engine/programmerActions/applyPhaser.ts`) picks the fixtures that can run the feature.
4. Optional users: the Auto Show styles (`src/autoshow/styles/`) and the demo show (`src/show/demo/`). A demo change
   alters `demo-show.json`.
5. The guide: the Phasers section in `src/i18n/he/guideChaptersMiddle.ts`.

Tests: add a unit test for the new writer under `tests/unit/engine/`. The oracles that
`tests/unit/engine/playback/outputParity.test.ts` and `tests/unit/engine/programmer/programmerParity.test.ts` compare
with know only the original types, but their random inputs (`PHASERS` in `tests/unit/engine/playback/cueData.ts` and
`tests/unit/engine/programmer/randomInputs.ts`) take every key of `PHASER_TYPES`: keep the new key out of them.
`compute-output-phasers.json` (`tests/e2e/golden-output.spec.ts`) protects the existing shapes.

### A command

1. `src/command/aliases.ts`: add the keyword to `Keyword` and its spellings to `SPELLINGS`. A spelling that was an
   unknown word before changes how old lines parse; the `ALIAS_LINES` and `PARTIAL_ERROR_LINES` transcripts catch it.
2. `src/command/statements.ts`: add a readonly variant to `Statement` (executors as 0-based indexes).
3. `src/command/parse/parseCommand.ts`: add a `case` to `parseCommand`; selection and level words belong in
   `Parser.next` (`src/command/parse/Parser.ts`). A syntax error throws `CommandError`.
4. `src/command/run/`: add a runner that takes `StatementOf<'kind'>` and `CommandDeps` next to its kin (see
   `runPlayback.ts`). It reaches the engine only through `CommandDeps` and reports with `log`, in English (decision 16).
5. `src/command/run/runStatement.ts`: add the `case`. The switch is exhaustive, so lint fails until it is there.
6. The guide: the command-line chapter in `src/i18n/he/guideChaptersEnd.ts`.

Tests: `tests/unit/command/Parser.test.ts` and `tests/unit/command/CommandRunner.test.ts`. The transcripts in
`tests/e2e/transcripts/` and their `command-*.json` goldens record the original app: `tests/e2e/golden-commands.spec.ts`
and `tests/unit/command/transcriptReplay.test.ts` replay them and must pass unchanged.

## Where to read more

- `docs/adr/`: the decisions with their alternatives.
- `docs/known-quirks.md`: behavior kept on purpose.
- `docs/plan/extraction/00-decisions.md`: the binding decisions of the extraction and the integration.
- `docs/plan/extraction/01-core-domain-engine.md`, `02-command-show-autoshow-audio-render.md`, `03-ui.md`: where each
  part of the original script went.
