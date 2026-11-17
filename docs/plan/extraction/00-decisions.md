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
