# Orchestrator decisions for the extraction (binding)

1. Vectors: `domain` and `engine` keep `THREE.Vector3` (exact float parity). The lint boundary allows the `three` core package in `domain`/`engine` for math types only; addons (`three/addons/*`) and anything in `render/`, `ui/` or the DOM stay forbidden there. Record this in ADR 0001.
2. Auto-show inputs to the output merge: option B. `OutputMerger.compute(t, modulation)` takes a small readonly `OutputModulation` value (pump, hitUntil, ...). The engine never imports `autoshow`. `main.ts` passes the AutoShow's current modulation each frame.
3. Persistence: a dedicated `showChanged` event (the show must be saved). `stateDirty` stays for "UI must repaint". Also add `storeModeChanged`. The full event list: message, cueStored, poolsChanged, selectionChanged, stateDirty, showChanged, storeModeChanged. The bus is synchronous.
4. The rig is not a module singleton. `main.ts` builds it and passes it in (constructor injection).
5. Haze value moves to `AppState` (engine). Render reads it; the serializer reads it from AppState.
6. Extra render files (SceneLights, venue/Props, venue/Performer, FixturePicker, SurfaceHit, modelGeometry, FixtureModels, LensTextures) are approved under `src/render/` (venue ones in `render/venue/`, fixture ones in `render/fixtures/`), each within the 250-line rule.
7. New domain files approved: `domain/aim.ts` (aimAt/dirFrom), `domain/venue.ts` (shared stage constants).
8. The Hebrew auto-show style labels go to `src/i18n/he.ts` (created in Phase 3c by the autoshow owner, extended in Phase 5).
9. Command runner keeps statement-by-statement execution: the parser may tokenize the whole line, but each statement is parsed and run in order, so an error later in the line leaves earlier statements applied (parity).
10. Fixture array order stays build order; never sort by id.
11. Canvas-texture helper: colour space is an explicit option, no sRGB default, so gobo/glow keep no colour space.
12. Rig count is 405 fixtures (the plan's 377 is out of date).

## UI decisions (from 03-ui.md §12)
13. D1: extra UI files (AutoShowPanel, ShowFileDialog, TopBar, SideTabs, viewport interaction) go under `ui/panels/`; install/fullscreen and the download helper go under `io/`. `main.ts` stays wire-and-boot only.
14. D2: one `ui/dom.ts` with a typed `byId<T>()` that throws on a missing id (no `!`).
15. D3: Hebrew in the static markup stays in `index.html` (exact first paint). All script Hebrew goes to `i18n/he.ts`.
16. D4: English UI strings stay inline where they are used (they are command/console terms, not translations). No `en.ts`.
17. D5: `setLevel` moves to the engine (executor/playback API). MIDI and the panel both call the engine.
18. D6: `StageRenderer.setConsoleHeight()` setter, called by `fitDesk`. No new event.

## Owner rules (QUALITY-2, override the plan)
19. Max 100 lines per file (all .ts, .css, .glsl, configs, tests). The 250-line targets in the extraction maps are void: split by responsibility. rigDefinition → `domain/rig/<area>.ts` data files + `domain/rig/index.ts` that joins them in today's build order (parity: array order). CSS → one file per panel/layout under `src/styles/`, imported in the same cascade order.
20. All TypeScript: no .js/.mjs/.cjs anywhere. Configs are .ts (eslint.config.ts via jiti). `declare module '*.glsl?raw'`.
21. Styles become SCSS in Phase 5 only (QUALITY-5), by the Phase 5 styles owner. No style edits before Phase 5.
22. `hsv` throws a RangeError for non-finite hue (the original returned `undefined`, which crashed every caller at once). Accepted; listed in known-quirks.
23. `window.__desk` and `__desk.test` stay behind the runtime `?test` check in all builds, so the parity suite runs against the production preview (departure from plan row 6, which said dev/test builds only).
24. Render parity includes the order in which three.js objects are created (each consumes seeded `Math.random` via generateUUID). Only the orchestrator approves a new screenshot baseline, after a visual diff review; the PR lists every such approval.

## Decisions recorded during integration (Phase 6-8)

25. Decision 23 is implemented in Phase 6 by gating on `?test`: `window.__desk` exists only with `?test`, not only `__desk.test`. `installTestHook()` (`src/app/testHook/installTestHook.ts`) returns at once when `readDeskClock()` (`src/app/testHook/deskClock.ts`) finds no `window.__deskClock`, and the `<head>` block in `index.html` sets that clock only when the URL starts with `?test`. So the clock block is the one `?test` check of the app.
26. `window.__desk` is no longer a console API. The original published it on every page (`index.html@48a3b63:3093`)
    with `renderer`, `THREE`, `perf`, `prog`, `applyPreset`, `runCmd`, `execs`, `setView`, `FX`, `sel`, `execGo`,
    `gotoCue`, `scene`, `camera`, `controls`, `fixtures`, `puffs` and `groups`. Now it does not exist on a normal page;
    under `?test` it holds only `setView`, `fixtures` and `test` (decision 25,
    `src/app/testHook/installTestHook.ts`), the members the specs read. Dropped: `renderer`, `THREE`, `perf`, `prog`,
    `applyPreset`, `runCmd`, `execs`, `FX`, `sel`, `execGo`, `gotoCue`, `scene`, `camera`, `controls`, `puffs` and
    `groups`. No spec or unit test reads a dropped member. A user who typed `__desk` in the console no longer finds
    it; that is the one user-visible change of this decision.
27. The Phase 6 integration overrides decision 15 (D3): `index.html` is a shell of at most 100 lines
    (`docs/plan/extraction/index-shell.html`). The panels render their static markup from TypeScript templates, and
    the Hebrew in that markup comes from `src/i18n/he/`, as script Hebrew already does (rule I1). Decision 15 kept
    the markup in `index.html` for an exact first paint. The markup and its text stay the same:
    `tests/unit/ui/layouts/shellMarkup.test.ts` compares the templates with the original page, and `src/main.ts`
    inserts the shell as its first statement, before it builds any object or asks for a frame, so every DOM check
    and screenshot sees the same page. What changes is the time before the script runs: the page then shows only the
    background, where the original already showed the static panels.
28. One layout-prefs store: `src/show/LayoutPrefs.ts` reads and writes `lumadesk-layout2` for every layout. `src/ui/layouts/layoutStorage.ts` and its test are removed; `tests/unit/show/layoutPrefs.test.ts` and `tests/unit/ui/layouts/layoutPrefsParity.test.ts` pin the reads (known quirks D7, D9).
29. Shared test code is split by runtime: `tests/shared/dom/` (the fake DOM for Vitest), `tests/shared/legacy/` (`legacyMarkup`, the markup of the original page) and `tests/shared/e2e/` (Playwright page helpers), each behind its own `index.ts`, so a Vitest unit never loads `@playwright/test` (rule T25).
30. The random stream is re-baselined once, in Phase 6 (commit `4cc51d2`). The original exposed `__desk.THREE`
    (`import * as THREE`), which kept all of three.js in the bundle, including 4 module-level objects whose
    constructors draw a uuid from `Math.random`. Decisions 23 and 26 drop `THREE` from the hook, so tree-shaking drops
    those objects: 16 fewer seeded draws at script start (84 -> 68). The crowd layout branches on random values, so the
    venue build then draws 6 more; the boot total goes from 277539 to 277529 (-10). The random-calls golden
    (`tests/golden/random-calls.json`) and the 9 screenshot baselines are re-recorded. Proof that nothing else moved:
    a temporary import that kept the three.js namespace alive passed 35/35 against the old baselines. No user sees
    the change: `Math.random` is seeded only under `?test` (the `<head>` block of `index.html`), so a normal page
    gets a new random crowd on every load, as before.
