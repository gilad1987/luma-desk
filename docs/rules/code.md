# Code rules

The project rules first, then the rules adopted from budget-app. The project rules win on any conflict. Tags:
**[lint]** = ESLint or tsc enforces it; **[review]** = a reviewer checks it (`.claude/skills/code-quality-review`).
The source references (`principles.md:29-42` and so on) point at budget-app's `.cursor/rules/`.

**Parity first.** Every rule applies to new and moved code. If a rule would change behaviour, the parity rule wins and
the case goes to `docs/known-quirks.md`.

## Project rules

- **Senior quality bar.** Professional, clean, easy-to-maintain code that follows the plan in `docs/plan/`.
- **Layers, one way:** core <- domain <- engine <- command/show/autoshow/audio; render/ui -> engine. The engine never
  imports render, ui or the DOM. [lint] `eslint/layerRules.ts`
- **Small, focused files and classes:** one main export per file. Names say what a thing is. No clever code.
- **No duplication:** each hotspot is removed by ONE shared abstraction. No copy-paste between modules.
- **Strict types:** no `any`, no non-null `!` to hide a real gap, no `@ts-ignore`. Model the domain with types
  (readonly data, discriminated unions for the command AST). [lint]
- **No speculative abstraction:** no interface with one implementation unless it is a boundary (EventBus, storage,
  clock). No new dependency unless the plan names it.
- **TSDoc on every exported symbol** that tells WHY (technical-prose skill). No comments that repeat the code.
- **Behaviour does not change.** Prove it with the parity suite, not with words.
- **100 lines per file, hard.** Every file: `src/`, tests, configs, `build/`, `sw.ts`, CSS/SCSS, GLSL (Markdown
  excluded), measured after Prettier. [lint] ESLint `max-lines` for .ts, `npm run check:lines` for .css/.scss/.glsl.
  Split by responsibility, never by cutting a file in half; never pack code to fit.
- **All TypeScript.** No .js, .mjs or .cjs file (`vendor/` until Phase 6 deletes it). Configs are .ts; GLSL stays
  .glsl loaded with `?raw`. [lint] `npm run check:no-js`
- **Shared folders only where needed:** code goes to a shared folder only when 2 or more modules use it, at the lowest
  level that fits: `src/core/` (app-wide pure helpers and types), `<layer>/shared/`, `tests/shared/`. A shared folder
  obeys the layer rules and has an `index.ts` that exports only its public API. No `utils.ts`, `helpers.ts`,
  `misc.ts`, `common.ts`. [lint] `eslint/sharedInternals.ts`
- **Prettier is required:** printWidth 120, singleQuote, semi, trailingComma all (`prettier.config.ts`); the
  pre-commit hook formats staged files and `npm run lint` checks the tree. [lint]
- **SCSS (Phase 5, styles owner only):** `@use`/`@forward`, never `@import`; mixins and maps only where plain CSS
  cannot do it cleanly; runtime values stay CSS custom properties; nesting depth max 3; no `@extend`. The compiled CSS
  must give the same result (screenshot suite).

## Adopted from budget-app

### 1.1 Principles

- **P1 Function names are verb + noun.** `buildRig()`, `paintFader()`, `computeOutput()`. Never `process()`,
  `handle()`, `doIt()`. A method may drop the noun when its class supplies it (`Tempo.tap()`). [review]
  — principles.md:29-42
- **P2 Names describe the thing.** No cryptic short names. Allowed: loop indices and standard math names (`x y z`,
  `r g b`, `h s v`, `t`). Rename a legacy short name (`T`, `TR`, `TOWX`) when you move it, unless a golden file or
  `window.__desk` reads it. [review] — principles.md:44-54
- **P3 Booleans read as a question** (`isLit`, `hasPixels`, `canStore`). [review]
  — principles.md:56-67
- **P4 One level of abstraction per function.** A frame step calls `merger.compute(t)`, `visuals.sync()`,
  `renderer.draw()`; it does not also loop over fixture channels inline. [review] — principles.md:71-92
- **P5 Max 4 parameters; more go into a readonly options object** (`RigBuilder.row(options: RowOptions)` is the
  model). [lint] `@typescript-eslint/max-params: ['error', { max: 4 }]`. Exception: a per-frame, allocation-free function (for example `dirFrom(f, pan, tilt, out)`) keeps its
  parameters with `// eslint-disable-next-line @typescript-eslint/max-params -- per-frame path, no allocation`.
  Prefer a `Vector3` over `x, y, z` triples. — principles.md:94-109
- **P6 Fail fast.** Check input at the top and throw before the main path. After `find`/`get`, narrow with an
  explicit check and a throw or an early return. [review] — principles.md:113-127, typescript.md:225-233
- **P7 Errors name the value and its context.** `throw new RangeError(\`hsv: hue * 6 must be finite, got hue ${h}\`)`,
not `'invalid input'`. [review] — principles.md:129-137
- **P8 Inline comments only for a non-obvious reason or a workaround.** A `TODO` names its issue or ADR.
  [review] — principles.md:139-158

### 1.2 TypeScript

Put every tsc flag below in `tsconfig.base.json`, so the app, node and sw projects all get it
(typescript.md:9-14).app.json`.

- **T1 `exactOptionalPropertyTypes: true`.** If callers really pass `undefined`, declare `prop?: T | undefined`.
  Never fix this error with a cast. [lint] tsc — typescript.md:23-36
- **T2 `noPropertyAccessFromIndexSignature: true`.** Read index-signature data with brackets
  (`record['key']`); declared fields keep dot access. [lint] tsc — typescript.md:54-65
- **T3 `allowUnusedLabels: false`, `allowUnreachableCode: false`.** [lint] tsc — typescript.md:71-72
- **T4 External data enters as `unknown` and is narrowed by a guard** (localStorage show JSON, MIDI messages, files,
  audio). An optional device or API that is missing must not stop the desk. [review]; the `no-unsafe-*` rules in
  `recommendedTypeChecked` already catch most leaks. — typescript.md:94-105, architecture.md:135-136
- **T5 Exported functions and public methods declare their return type**; locals stay inferred. [lint]
  `@typescript-eslint/explicit-module-boundary-types: 'error'`. — typescript.md:107-123
- **T6 A `switch` over a union covers every member; no `default` that hides a new one.** [lint]
  `@typescript-eslint/switch-exhaustiveness-check: ['error', { considerDefaultExhaustiveForUnions: false }]`.
  — typescript.md:184-205
- **T7 No optional sprawl.** One required field, not several optional ways to say the same thing
  (`fixtureId: number`, not `fixture?`, `fixtureId?`, `fixtureName?`). [review] — typescript.md:127-144
- **T8 Derive related types from the source type** (`Pick`, `Omit`, `Partial`, `Readonly`) instead of declaring a
  copy. `aim.ts` already takes `Pick<Fixture, 'mount'>`. [review] — typescript.md:171-182
- **T9 Import order:** `three`, then other packages, then app modules by layer (core → domain → engine …), then
  siblings. [review] — no `eslint-plugin-import` (no new dependencies, QUALITY.md:8). — typescript.md:235-255

### 1.3 Architecture and structure

- **A1 Max 40 lines per function in `src/` and `sw.ts`.** [lint] `max-lines-per-function: ['error', { max: 40,
skipBlankLines: true, skipComments: true }]`. The rig area data files in `src/domain/rig/` are exempt. — architecture.md:15
- **A2 Max nesting depth 3.** [lint] `max-depth: ['error', 3]`. Same depth as the SCSS rule in
  QUALITY-5. — architecture.md:16
- **A3 A class's TSDoc says why it exists and what it deliberately does not own.** Model: `Fixture` ("render and UI
  state is not part of it"). [review] — architecture.md:14
- **A4 A piece lives in the folder of the one module that uses it.** A panel with parts becomes a folder:
  `ui/panels/SequencePanel/SequencePanel.ts` + `SequenceRow.ts`. A leaf stays a flat file. [review]
  — architecture.md:63-88
- **A5 Feature modules do not import each other** (`command`, `show`, `autoshow`, `audio`), and a panel does not
  import another panel; they meet in the engine or through the EventBus. [review] (not linted yet; `eslint/layerRules.ts` forbids
  only `render`/`ui`/`io` for each feature).
  — architecture.md:115, 119
- **A6 Outside `core/` and `<layer>/shared/`, no `index.ts` that only re-exports.** An `index.ts` that does work is a
  module and stays (`domain/rig/index.ts` with `buildRig()`). [review] — architecture.md:90-108
- **A7 A refactor commit carries no feature and no fix.** [review] — architecture.md:295-297

### 1.4 Domain classes (domain, engine)

- **D1 A class must hold state with behaviour, identity or an invariant.** A class of only `static` members is a
  namespace: keep functions (`core/math.ts`, `core/color.ts`). [lint] `@typescript-eslint/no-extraneous-class`.
  — domain-classes.md:14-29
- **D2 Logic has an owner.** A folder of loose `computeX.ts` functions is a smell; the rule goes on the class that
  owns the data (`CueList.find`, `Tracking`, `Rig.lightIds()`). Pure formatting, stateless math and type guards stay
  functions. [review] — domain-classes.md:31-55
- **D3 An invariant throws in the constructor or a static factory, not in a comment;** no instance exists for bad
  input. During the refactor only where the old code also failed (precedent: `hsv`, 00-decisions.md:22). [review]
  — domain-classes.md:57-70
- **D4 Derive; never store the same fact twice.** Use a getter over the source data; memoise privately
  (`#cache ??= this.compute()`) if it is expensive. [review] — domain-classes.md:72-79, frontend.md:486-495
- **D5 Return `undefined` rather than a misleading number** (no detected tempo is `undefined`, not `120`); the caller
  decides what to show. New APIs only (parity). [review] — domain-classes.md:81-95
- **D6 Value objects:** `readonly` fields, a static factory, and operations that return a new instance (`PanTilt` is
  readonly). Round only at the display boundary, never inside the computation. [review] — domain-classes.md:97-102
- **D7 Pass the clock in.** Engine and domain methods take `t`/`now` or a `Clock`; they never read the time
  themselves. [review] `core/Clock.ts` is the one reader. — domain-classes.md:104-108
- **D8 To scope a derived result (a cue range, a time window), run the derivation over the full history and then
  select results;** do not filter the inputs first. Assumption: this fits tracking. [review]
  — domain-classes.md:110-117
- **D9 Every new computation in the engine gets a Vitest case in `tests/unit/<layer>/`.** A flipped sign does not
  crash, it gives a wrong level. [review] — domain-classes.md:135-146

### 1.5 Shared code

- **S1 When a second user appears, move the code to shared and switch the first user in the same change;** never
  leave a near-copy. [review] — shared-components.md:9-11
- **S2 Shared UI pieces take inputs, not a panel's state:** `Fader` takes `value` + `onChange`; it never imports a
  panel. [review] — shared-components.md:17-33
- **S3 Document the inputs a caller can get wrong** (unit, range, encoding); leave obvious ones bare.
  `/** Level in percent (0..100), not 0..1. */` [review] — shared-components.md:44-63

### 1.6 UI code (DOM, SCSS)

- **U1 File order:** imports → types → module constants → the exported class or function → private helpers.
  [review] — frontend.md:9-37
- **U2 One root class per component; children are nested selectors in its SCSS partial.** Discrete state is a
  modifier class (`el.classList.toggle('is-active', isActive)`), not inline style. A continuous runtime value goes
  through a CSS custom property (`el.style.setProperty('--level', …)`). Existing inline style strings stay (parity).
  [review] — frontend.md:47-154, shared-components.md:87-95
- **U3 UI state lives in a class; DOM handlers only forward** (`button.addEventListener('click', () => panel.go())`).
  [review] — frontend.md:324-392
- **U4 Keep logic out of render code.** Derived values, formatting and filtering are getters; the render method only
  reads them. No conditions inside template strings. [review] — frontend.md:450-484
- **U5 No nested ternaries; use early returns.** [lint] `no-nested-ternary` (off in `tests/**/oracle/`, which copy the original code as is). — frontend.md:595-616
- **U6 Every subscription has a disposer that is kept and called on teardown** (`EventBus.on` returns one; store the
  `addEventListener` pair or an `AbortController`). A layout switch must not leak listeners. [review]
  — frontend.md:268-286
- **U7 No magic numbers or hex colours in UI TypeScript.** Name constants with their unit
  (`const FADE_SECONDS = 0.4`); UI colours come from CSS custom properties. Fixture colours are data, not UI.
  [review] — frontend.md:642-682, shared-components.md:35-42
- **U8 RTL:** new CSS uses logical properties (`margin-inline-start`, `inset-inline-end`). Draw a directional icon in
  its left-to-right form and mirror it under `[dir='rtl']`; never draw both. [review] — shared-components.md:115-124
- **U9 Touch targets are at least 44px** on new controls (the desk runs on iPad). [review]
  — shared-components.md:101-113
- **U10 CSS craft:** `100dvh`, not `100vh`; `min-height: 0` on every flex level that must scroll; UI animation in
  CSS, not per-frame JS. [review] — frontend.md:808-819, 828
- **U11 Style a shared piece by its class name, never by structure** (`> div`, `:nth-child`). [review]
  — frontend.md:821-823
