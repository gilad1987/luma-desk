# Architecture

LUMA DESK is a lighting desk and a 3D stage that run in the browser with no server. Until the TypeScript refactor it
was one file, `index.html` (3,096 lines at commit `48a3b63`). This document describes the structure in `src/`, why it
has that shape, and the rules that keep it that way.

> **Status: Phase 6 is done.** `src/main.ts` is the composition root (at most 100 lines) over `src/app/`, fully typed
> and linted with no exemption. `index.html` is a 90-line shell. `vendor/` is deleted; three.js comes from npm.

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
rule set per layer, plus one rule that lets only `src/main.ts` and `src/app/` import `src/app/`.

## Wiring

Every object is built once and gets what it needs in its constructor. There are no module singletons: the rig, for
example, is built once at boot and injected (decision 4). A class that the wiring builds says in its TSDoc what it
receives and which events it emits or listens to.

### Composition root

`src/main.ts` (at most 100 lines) builds the desk in the boot order of the original script
(`index.html@48a3b63`), because the order of construction is behavior (decision 24). It calls the wiring modules in `src/app/`. Besides those, it
inserts the page shell markup first, builds `ViewportPicking`, binds `#helpBtn` and calls `restoreShow`, each at the
point where the original did the same work.

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

| Event              | Means                                                     | Listener today                                       |
| ------------------ | --------------------------------------------------------- | ---------------------------------------------------- |
| `message`          | Feedback for the operator: a log line or a toast          | `CommandLine`, `Toast`                               |
| `poolsChanged`     | Group or preset pools changed; repaint them               | `PoolsPanel`                                         |
| `stateDirty`       | The slow panels must repaint                              | `UiTickScheduler.markDirty()`, joined in `main.ts`   |
| `showChanged`      | The show must be saved                                    | `ShowStorage.persist()`, joined in `createShowFiles` |
| `storeModeChanged` | STORE was armed or cancelled                              | `showStoreMode`                                      |
| `selectionChanged` | The fixture selection changed                             | none (known quirks, section H)                       |
| `cueStored`        | A cue was stored; carries the executor and the cue number | none (known quirks, section H)                       |

Delivery is synchronous because order is behavior: the command line must show a statement's feedback before the
next statement runs, and the save debounce must start in the same tick as before.

Per-frame data that crosses layers is passed as a value, not as an import. For example the Auto Show's beat pump
reaches the output merge as a readonly `OutputModulation` argument, so the engine never imports `autoshow`
(decision 2).

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
  `npm run check:lines` checks `.css`, `.scss` and `.glsl`. Split by responsibility: the rig is data files per area
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

## Where to read more

- `docs/adr/`: the decisions with their alternatives.
- `docs/known-quirks.md`: behavior kept on purpose.
- `docs/plan/extraction/00-decisions.md`: the binding decisions of the extraction and the integration.
- `docs/plan/extraction/01-core-domain-engine.md`, `02-command-show-autoshow-audio-render.md`, `03-ui.md`: where each
  part of the original script went.
