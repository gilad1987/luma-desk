# Phase 1: Web Awesome shell, new builder layout, `topView*` -> `plan/`

Branch `feat/sb-p1-shell`, on Phase 0 (`fix/sb-recover`) and then rebased on main. Phase 1 of the Stage Builder
drag-and-drop plan (`source-plan`: "Stage Builder redesign: drag-and-drop builder with a visual library"). Builder
features stay unchanged; this phase changes the layout, the controls and the folder of the 2D plan.

Orchestrator decisions on the plan (2026-11-19): the builder Plan-mode `@screenshot` baseline is NOT added in Phase 1;
it comes in Phase 5 (final layout) and the owner approves it once. Phase 1 gives design-review screenshots (desktop
and iPad size) as PR evidence. The iPad Safari check on a real device stays owner-gated and is listed in the PR body
under "Not verified".

## Context

The Stage Builder (PR #3) is a fixed overlay over the full-window 3D view: tools column 320 px, a transparent
middle, a 2D top view column 360 px, plain `<button>` controls. The owner-approved redesign needs a professional
shell first: Web Awesome 3.15.0 controls, a library column, a plan/3D split with a draggable divider, an inspector
column, iPad behaviour below 1100 px, and the `plan/` folder that the later phases (drag and drop, gestures, arrays,
inspector) build on.

Facts the design rests on (verified in the code and the published package):

- The builder DOM is built in TS on each Build Stage click (`src/ui/builder/BuilderMode.ts`, `builderMarkup.ts`);
  `index.html` has no builder markup. The 3D canvas lives in `section#viewer` inside `main#main`; the renderer sizes
  itself from a `ResizeObserver` on `#viewer` (`src/render/stage/StageRenderer.ts`, `observeViewer`).
- `@awesome.me/webawesome@3.15.0` (MIT) is on npm. `dist/styles/webawesome.css` imports `native.css`, which restyles
  `html`, `body`, `button`, `input` for the whole page. `dist/styles/themes/default.css` holds only tokens (in
  `@layer wa-theme`, on `:where(:root)`; `.wa-dark` sets the dark tokens and `color-scheme: dark`, scoped to the
  element it is on). The default `wa-icon` library fetches SVGs from `ka-f.fontawesome.com`; the `system` library
  (used inside `wa-drawer`, `wa-tab-group`) is inline data URIs. `wa-split-panel` renders no icon and binds
  `pointerdown`. Components are imported one by one (`dist/components/<name>/<name>.js`).
- Vite emits one JS chunk and one CSS file per dynamic `import()`; `build/sw-manifest-plugin.ts` puts every emitted
  file in the service worker shell list, so a lazy chunk is precached (`tests/unit/swBuild.test.ts` proves the list).
- Phase 0 changes `src/ui/builder/{builderKeys,topViewPick,wallControls}.ts`, `src/i18n/he/builder.ts` (one tooltip
  line) and adds `tests/unit/ui/builder/topViewPick.test.ts`. It does not touch `src/app/`, `src/styles/`,
  `index.html` or `tests/e2e/`.
- The 9 screenshot baselines (`tests/e2e/__screenshots__/darwin/screenshots.spec.ts/*.png`) show the desk layouts
  only. No test opens the builder in them, so the builder chunk never loads in those runs.

## Target layout

```
+---------------------------------------------------------------------------------------------+
| .builder-bar  Stage Builder | Undo Redo Duplicate Delete Mirror | Plan Split 3D | n fixtures |
|                                                           [Inspector*]   Cancel   Done        |
+----------------+-------------------------------------------------------+--------------------+
| .builder-      | .builder-centre                                       | .builder-inspector |
|  library       |   wa-split-panel orientation=vertical primary=start   |  (today's Stage /  |
|  300 px        |     slot=start  .builder-3d  <- section#viewer moves  |   Trusses /        |
|  placeholder:  |                 here while the builder is open        |   Fixtures tabs +  |
|  title + hint  |     divider (44 px hit area, keyboard arrows)         |   property panel)  |
|                |     slot=end    .builder-plan  canvas.plan-view       |  320 px            |
+----------------+-------------------------------------------------------+--------------------+
```

- Grid: `grid-template-columns: var(--builder-library-width) minmax(0, 1fr) var(--builder-inspector-width)` with
  `--builder-library-width: 300px`, `--builder-inspector-width: 320px`; rows `auto minmax(0, 1fr)`; the bar spans
  all columns. The start screen (unchanged) covers row 2 in all columns until a choice adds `.is-editing`; the
  columns are laid out under it from the start (not `display: none`), so `#viewer` never has a 0 px box.
- Centre modes, a modifier on `.builder-centre`: `is-mode-split` (default on wide screens, divider at 50 %),
  `is-mode-plan`, `is-mode-3d`. Plan and 3D set the split position to 100/0 with the divider `disabled` and remember
  the last split position for the return to Split. The switch is three `wa-button`s in a `wa-button-group`.
- Below 1100 px: the library column becomes a 56 px icon rail; the inspector column leaves the grid and its content
  mounts in a `wa-drawer placement="end"` opened by an "Inspector" bar button (hidden on wide screens); the default
  mode is Plan. The desk's `#app { min-width: 1100px }` stays; the builder is `position: fixed`, so it reflows on
  its own.
- Controls: every `wa-button` is at least 44 px tall (`--builder-target`), set through `--wa-form-control-height` in
  `_wa-theme.scss` and a `::part(base)` minimum as belt and braces. Bar buttons carry an inline SVG icon
  (`slot="start"`) and an English label; each has a `wa-tooltip` with the Hebrew text from `he.builder`.
- Colours: `.builder.wa-dark` maps the Web Awesome tokens to the desk tokens (see
  `docs/plan/stage-builder-ux/00-overview.md`). No hex colour in TypeScript (U7); the plan canvas keeps its
  `--plan-*` palette variables (renamed from `--top-view-*`).

## Approach

### 1. Dependency and the lazy `wa/` boundary

- `package.json`: `"@awesome.me/webawesome": "3.15.0"` in `dependencies` (exact). Nothing is loaded from a CDN.
- `src/ui/builder/wa/` is the only code that imports the package (linted: `eslint/waBoundary.ts`):
  `registerWa.ts` (the five component modules and `themes/default.css`; `whenWaReady()`), `waIcons.ts` (own inline
  SVG icons; no `wa-icon` anywhere), `waEvents.ts` (`listenWa` disposer), `waButton.ts` (`setWaDisabled`).
- Lazy load: `src/app/ui/loadBuilderShell.ts` imports `registerWa` dynamically; `wireBuilder` runs
  `loadShell().then(() => builder.enter())` on `#buildBtn`. The boot bundle does not contain Web Awesome; the chunk
  is `assets/registerWa-<hash>.js` plus its CSS.
- Rejected: the whole `src/ui/builder/**` as the lazy chunk (`main.ts` reads `builder.isOpen`/`exit` synchronously,
  so it needs a facade; no measured gain yet). Revisit when the builder UI code passes about 100 KB minified.

### 2. Shell markup and layout

- `builderMarkup.ts` is the bar; `shell/shellMarkup.ts` the columns, the split panel and the drawer host;
  `shell/editToolbarMarkup.ts` the edit buttons on `wa-button` with inline icons and `wa-tooltip`s.
- `BuilderSlots` stays `{ tools, view }`: tools = `.builder-inspector`, view = `.builder-plan`.
- The 3D view: `BuilderDeps.attachViewer(pane)` (implemented in `src/app/ui/viewerHost.ts`) moves `#viewer` into the
  3D pane on enter; the disposer puts it back as the first child of `#main` on exit, before the host is removed.
  The renderer's `ResizeObserver` follows the element; the WebGL context survives a DOM move. Rejected: a transparent
  hole with `setViewOffset` (render code, four moving edges); `position: fixed` mirrored from the pane box (a second
  observer and a frame of lag).
- `shell/ViewModeSwitch.ts` owns the mode; `shell/CentreSplit.ts` owns the split position and remembers it across
  Plan/3D; `shell/InspectorHost.ts` mounts the tools in the column or the drawer. Web Awesome elements are driven
  only through the plain `HTMLElement` surface, so FakeDom and jsdom treat an undefined `wa-*` tag as a plain element.
- SCSS under `src/styles/builder/`: `_shell`, `_bar`, `_centre`, `_library`, `_inspector`, `_wa-theme`, `_plan`
  (renamed `_topview`), each under 100 lines; `_layout.scss` is removed.

### 3. Rename `topView*` -> `plan/`

`TopView` -> `plan/PlanView`, `TopViewCanvas` -> `PlanCanvas`, `TopViewInput` -> `PlanInput`, `topViewDraw` ->
`planDraw` (`drawPlan`, `PlanScene`), `topViewDrawItems` -> `planDrawItems`, `topViewFit` -> `planFit`,
`topViewMove` -> `planMove`, `topViewPalette` -> `planPalette` (`--plan-*`), `topViewPick` -> `planPick` (Phase 0
content), `topViewShapes` -> `planShapes`, `topViewTransform` -> `planTransform` (`PlanTransform`). Canvas class
`plan-view`. Tests mirror the move under `tests/unit/ui/builder/plan/`. Own commit, no behaviour change (A7).

### 4. i18n

`src/i18n/he/builder.ts` splits by reach into `builder.ts` (shell), `builderStart.ts`, `builderTools.ts`,
`builderProps.ts`; every existing key path (`he.builder.tools.x`) stays, so no call site changes.

### 5. Toolbar on Web Awesome

`EditToolbar` keeps `[data-edit]`, `run()`, `is-disabled` and additionally sets the Web Awesome `disabled` state
through `setWaDisabled`. `builderKeys.ts` (Phase 0 version) and `isTextField` do not change in Phase 1.

### 6. Docs

`docs/adr/0006-web-awesome-builder-ui.md`; `docs/plan/stage-builder-ux/` (UX component specification, written with
the `impeccable` skill before the shell code); the "Builder UI" paragraph of `docs/ARCHITECTURE.md`; design-review
screenshots at 1280x800, 1024x768 and 768x1024 under `docs/screenshots/builder/`.

## Tests

- Unit: moved `plan/*` tests; `BuilderMode` call order with the viewer attach; `ViewModeSwitch`, `CentreSplit`,
  `InspectorHost`; `viewerHost` (jsdom); `wireBuilder` (the click awaits the shell load); `waIcons`, `waButton`,
  `waEvents`; `swBuild` pins the lazy boundary (the `registerWa` chunk is in the shell list, the main chunk has no
  `wa-button`).
- E2E: `builder-flow` (selectors), `builder-desk` (the 3D view sits in the pane and returns), `builder-shell` (widths,
  44 px controls, divider drag, modes, 1024 px rail and drawer, no off-origin request, boot stays free of Web Awesome,
  chunk size attached under a 600 KB budget), `builder-offline` (the builder opens offline from the service worker).
- Screenshots: `npm run test:screenshots` with the 9 baselines unchanged.

## Contract

| File or API | Owner | Note |
|---|---|---|
| `src/ui/builder/{builderKeys,wallControls}.ts` | Phase 0 | Phase 1 does not edit them |
| `src/ui/builder/topViewPick.ts` -> `plan/planPick.ts` | Phase 0 content, Phase 1 move | content unchanged |
| `src/i18n/he/builder.ts` | Phase 0 one line, then Phase 1 split | every key path stays |
| `package.json`, `package-lock.json`, `src/main.ts` (one line) | lane `ui` | |
| `src/app/ui/*`, `src/ui/builder/**`, `src/styles/**`, `tests/e2e/builder-*.spec.ts`, `eslint/*`, `tests/unit/swBuild.test.ts` | lane `ui` | |
| `src/domain/**`, `src/render/**`, `src/mvr/**`, `src/engine/**` | lane `cat` / Phase 0 | Phase 1 touches none |

Merge order: Phase 0 -> Phase 1 and C1 in either order (no file overlap) -> Phase 2 rebases on both.

## Risks

- The hidden pane in Plan or 3D mode has a 0 px box, so the renderer sizes the canvas to 0 height; QA watches the
  console in both modes; the fallback is a 2 px minimum for the hidden pane.
- `wa-button` height: if `--wa-form-control-height` does not drive it, the `::part(base)` minimum does; the e2e
  measures 44 px.
- Web Awesome's `default.css` sets `color-scheme: light`, `color` and `font-family` on `:where(:root)` once the chunk
  loads; the desk's `body` rule overrides the last two and `light` renders as the default scheme. The design review
  compares a desk screenshot before and after one builder visit. Fallback: a scoped copy of the tokens.
