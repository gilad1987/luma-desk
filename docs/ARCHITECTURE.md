# Architecture

LUMA DESK is a lighting desk and a 3D stage that run in the browser with no server. Until the TypeScript refactor it
was one file, `index.html` (3,096 lines at commit `48a3b63`). This document describes the target structure in `src/`,
why it has that shape, and the rules that keep it that way.

> **Status (Phase 8, written on the staging branch `refactor/typescript-ahead`).** The layers below exist and are
> tested, but the integration is not finished. Update this note and the marked sections when it is:
>
> - `src/main.ts` still holds most of the original script (6,500 lines, `// @ts-nocheck`, exempt from lint in
>   `eslint.config.ts` as `LEGACY_UNTIL_PHASE_6`). Phase 6 makes it wiring and boot only.
> - `index.html` still holds the markup and the `?test` hook (413 lines). The final pass makes it a shell of at most
>   100 lines (`docs/plan/extraction/index-shell.html`).
> - `index.html` links `src/styles/index.css`. The SCSS partials (`src/styles/**/_*.scss`, entry `index.scss`) sit
>   beside the CSS until the styles owner switches the entry.
> - `src/io/` (service-worker registration, install, fullscreen, download, MIDI, REC) is being created. Until it
>   lands, the page registers the worker in `src/main.ts`.
> - `vendor/` (three.js r160) is still in the tree. Phase 6 deletes it; the app already imports `three` from npm.

## Layers

Each folder under `src/` is a layer. A layer imports only from the layers below it:

```text
core  <-  domain  <-  engine  <-  command / show / autoshow / audio
                                  render / ui / io  (on top: they may import any layer above in this list)
main.ts: the composition root; the only file that knows every layer
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

Why one direction: the engine must run in Vitest with no browser, and a parity test must be able to drive it
without a DOM. So `engine` never imports `render`, `ui`, `io` or the DOM. `domain` and `engine` may use the `three`
core package for its math types only (`Vector3` keeps the float results exact, decision 1); `three/addons` stay in
`render`. `eslint.config.ts` enforces all of this with `no-restricted-imports`, one rule set per layer.

## Wiring

`main.ts` builds every object and passes each one what it needs in its constructor. There are no module
singletons: the rig, for example, is built once in `main.ts` and injected (decision 4). A class that `main.ts`
builds says in its TSDoc what it receives and which events it emits or listens to.

The engine reports what happened through one typed, synchronous `EventBus` (`src/core/EventBus.ts`, ADR 0002). It
never calls the UI or storage. The event map is `EngineEvents` in `src/engine/events.ts`:

| Event              | Means                                                     | Listener today                 |
| ------------------ | --------------------------------------------------------- | ------------------------------ |
| `message`          | Feedback for the operator: a log line or a toast          | `CommandLine`, `Toast`         |
| `poolsChanged`     | Group or preset pools changed; repaint them               | `PoolsPanel`                   |
| `stateDirty`       | The slow panels must repaint                              | the UI tick in `main.ts`       |
| `showChanged`      | The show must be saved                                    | `persist()` in `main.ts`       |
| `storeModeChanged` | STORE was armed or cancelled                              | `showStoreMode`                |
| `selectionChanged` | The fixture selection changed                             | none (known quirks, section H) |
| `cueStored`        | A cue was stored; carries the executor and the cue number | none (known quirks, section H) |

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
Note: `window.__desk` itself is published at the end of boot in every run today; only `__desk.test` needs `?test`.

three.js gives every object a uuid from `Math.random`. So the order in which render code creates materials,
geometries and meshes is part of the behavior (decision 24): unused materials stay, and some materials are created
before their geometry. Only the orchestrator approves a new screenshot baseline. `docs/known-quirks.md` lists every
odd behavior that is kept on purpose, and the code cites its id.

## Build, deploy and offline

Vite builds the app with `base: './'`, so the same output runs under `/luma-desk/` on GitHub Pages and from the
installed PWA (ADR 0001). `build/sw-manifest-plugin.ts` builds `sw.ts` into `dist/sw.js` and writes into it the list
of shipped files and a cache name made from their content (ADR 0003). `.github/workflows/deploy.yml` checks every
pull request and push to `main`, and deploys `main` to Pages (ADR 0004).

There are three TypeScript projects (`tsconfig.json` references them): `tsconfig.app.json` for `src/`,
`tsconfig.node.json` for tests, configs, `scripts/` and `build/`, and `tsconfig.sw.json` for the worker.

## Code rules

The full rules are in the plan and, once merged, in `CLAUDE.md` and `docs/rules/`. In short:

- **100 lines per file**, measured after Prettier, for every file except Markdown. ESLint `max-lines` checks `.ts`;
  `npm run check:lines` checks `.css`, `.scss` and `.glsl`. Split by responsibility: the rig is data files per area
  plus one index that joins them in build order.
- **All TypeScript.** No `.js`, `.mjs` or `.cjs` file (until Phase 6 deletes `vendor/`). Configs are `.ts`.
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
- `docs/plan/extraction/00-decisions.md`: the 24 binding decisions of the extraction.
- `docs/plan/extraction/01-core-domain-engine.md`, `02-command-show-autoshow-audio-render.md`, `03-ui.md`: where each
  part of the original script went.
