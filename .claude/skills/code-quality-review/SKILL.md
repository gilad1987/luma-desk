---
name: code-quality-review
description: Run an extremely strict maintainability review of the current branch's luma-desk changes for abstraction quality, layer and EventBus violations, file size (100-line hard limit), duplication, three.js/DOM resource handling and spaghetti-condition growth. Use for a code quality review, thermo-nuclear or thermonuclear review, deep code quality audit, or an especially harsh maintainability review.
disable-model-invocation: true
---

# luma-desk Code Quality Review

An unusually strict review of implementation quality, maintainability, abstraction quality and codebase health,
against luma-desk's own rules. Be **ambitious** about structure. Do not stop at local cleanups: look for "code judo"
moves, restructurings that keep behavior and make the code dramatically smaller, simpler and more direct.

## Core Prompt

> Perform a deep code quality audit of the current branch's changes (`git diff main...HEAD`).
> Rethink how to structure the changes to meaningfully improve code quality without changing behavior.
> Improve abstractions and modularity, reduce spaghetti code, improve succinctness and legibility.
> Be ambitious: if restructuring part of the codebase gives a clearly better design, propose it.
> Be extremely thorough and rigorous. Measure twice, cut once.

## The luma-desk rules (a break is a finding; name the rule)

- **R1 Size.** Max 100 lines per file, measured after Prettier, for every file: `src/`, `tests/`, configs, `build/`,
  `sw.ts`, `.css`/`.scss`/`.glsl`. Markdown is exempt. Split by responsibility, never by cutting in half and never by
  packing (long lines, removed TSDoc, merged statements). Data splits by area (`rig/frontTruss.ts` + an index).
- **R2 All TypeScript.** No `.js`/`.mjs`/`.cjs` file (`git ls-files | grep -E '\.(js|mjs|cjs)$'` is empty). Configs
  are `.ts`. Shaders are `.glsl` loaded with `?raw`. Styles are SCSS (`@use`/`@forward`, never `@import`; nesting ≤ 3;
  no `@extend`; theme values stay CSS custom properties).
- **R3 Layers, one way.** `core` ← `domain` ← `engine` ← `command` / `show` / `autoshow` / `audio`; `render` and `ui`
  sit on `engine`; `ui` drives `render`, never the reverse. `engine` never imports `render`, `ui` or touches the DOM.
  `core` imports no library; `three/addons` is render-only (`domain`/`engine` may use three core math types only).
  An `import type` in the wrong direction is still a wrong-direction dependency.
- **R4 EventBus.** The engine reports change only through typed `EventBus` events (`message`, `cueStored`,
  `poolsChanged`, `selectionChanged`, `stateDirty`). No engine call to `toast`, `log`, `renderPools`, `persist`, and
  no `uiDirty`-style flags. `AppState` owns mutable state; nothing reassigns a module-level binding.
- **R5 Ownership.** `Fixture` is domain data only; `FixtureVisual` owns the three.js objects; selection lives in
  `Selection`; `Executor` holds no DOM nodes (`ExecutorsPanel` maps them). `main.ts` only wires and boots.
- **R6 Shared folders.** Shared only when 2+ modules use it, at the lowest level that fits: `src/core/` (app-wide),
  `<layer>/shared/`, `tests/shared/`. Each has an `index.ts` that exports only its public API; callers import through
  it. No `utils.ts`, `helpers.ts`, `misc.ts`, `common.ts`. A shared folder obeys R3.
- **R7 No duplication.** Each plan hotspot has ONE owner: `MeshFactory.add`, `createCanvasTexture`, `pointerDrag`,
  `cssRgb`, `paintFader`, `indexFx`, `stripFx`, `StoreModeGuard`, `optExec`/`findCue`, `rig.lightIds()`.
  A second copy of any of them, or of anything in a `shared/` folder, is a finding.
- **R8 Types.** No `any` (explicit, `as unknown as`, or suppressed), no `!` to hide a real gap, no `@ts-ignore` /
  `@ts-expect-error` / new `@ts-nocheck`. Readonly data, discriminated unions (command AST), parsed boundaries
  (`unknown` → typed) for saved shows and imported files. `exactOptionalPropertyTypes` errors are fixed with a
  conditional spread, never a cast. One main export per file; no default exports outside tool configs.
- **R9 No speculation.** No interface with one implementation unless it is a boundary (EventBus, storage, clock).
  No new dependency outside the plan.
- **R10 TSDoc.** Every exported symbol has TSDoc that says WHY it exists or why it is shaped this way (technical-prose
  skill). A comment that repeats the code is a finding.
- **R11 Parity.** Behavior does not change: localStorage keys (`lumadesk-show-v6`, `lumadesk-layout2`,
  `lumadesk-guide-seen`) and show format `v:1` exactly; known quirks kept and listed in `docs/known-quirks.md`;
  Hebrew stays UTF-8 with `dir="rtl"`; the worker stays network-first for pages and stale-while-revalidate for the
  rest. Proof is the parity suite (golden JSON, transcripts, screenshots), not words.

## Non-Negotiable Standards

0. **Be ambitious about structural simplification.** Look for the reframing that makes branches, modes, flags or
   whole layers disappear. Prefer the design that feels inevitable in hindsight. Push to delete complexity, not move it.
1. **The 100-line limit is hard (R1).** A file at 95 lines that grew by 30 and was then compressed is worse than an
   honest split. Ask what the second responsibility is, and split there.
2. **No random spaghetti growth.** New ad-hoc conditionals in `main.ts`, the frame loop, the command runner or a
   panel are a design problem, not a nit. Push them into a typed model, a dispatcher, a phaser shape, a command
   handler, or their own module.
3. **Clean the design, do not just accept working code.** If behavior can stay while the structure gets cleaner,
   push for it. Prefer removing moving parts over spreading them out.
4. **Direct, boring code over magic.** Flag clever generics, string-keyed dispatch hiding a simple shape, identity
   wrappers and pass-through helpers.
5. **Type and boundary cleanliness (R8).** Question optionality, casts and `unknown` that leak past the boundary
   that parsed them.
6. **Canonical layer and helpers (R3, R6, R7).** Logic lives in the layer that owns the concept. Reuse the owner;
   never write a near-duplicate.
7. **three.js and DOM hygiene.**
   - Every `Geometry`, `Material`, `Texture` and `WebGLRenderTarget` removed from the scene is `dispose()`d by its owner.
   - No allocation in the per-frame path (`new Vector3`/`Color`/`Matrix4`, array spread, closures): reuse scratch objects.
   - No DOM query, layout read (`getBoundingClientRect`, `offsetWidth`) or style write per frame unless dirty-checked.
   - One owner of the `requestAnimationFrame` loop. Listeners are removed (`AbortController` signal) when a panel goes.
   - `CanvasTexture` sets `needsUpdate` only when the canvas changed. Color spaces are explicit.
   - User text (group, preset, cue names, imported show) goes to `textContent`, never `innerHTML`.
   - `localStorage` and `JSON.parse` are guarded at the `show/` boundary. `Math.random` and `Date.now` go through
     the seeded `rng` and `Clock` in `core`, so `?test` stays deterministic. `window.__desk` exists only in dev/test.
   - DOM controls are reachable by keyboard and have labels. Pointer drags use the shared `pointerDrag`.

## Primary Review Questions

- Is there a code-judo move that makes this dramatically simpler?
- Can it be reframed so fewer concepts, branches or helper layers are needed?
- Does any import point the wrong way (R3), or does the engine reach the UI without an event (R4)?
- Did a file grow toward 100 lines because it took a second responsibility?
- Is this logic in the right layer, file and owner? Does a shared owner already do it (R7)?
- Do repeated conditionals signal a missing model (a union, a table, a dispatcher)?
- Is each abstraction earning its keep, or is it a wrapper?
- Did the diff add casts, optionality or ad-hoc object shapes that hide the real invariant?
- Does the frame loop now allocate, query the DOM or leak GPU resources?
- Is state change atomic, or can a partial update leave `AppState` and the UI out of sync?
- Does TSDoc explain why, and does the parity suite prove that behavior did not change?

## What to Flag Aggressively

- A complicated implementation where a reframing would delete whole categories of complexity.
- Refactors that move code but do not reduce the concepts a reader must hold.
- A file over 100 lines, or a split that cuts a file in half instead of by responsibility.
- New conditionals bolted onto the frame loop, `computeOutput`, the command runner or `main.ts`.
- One-off booleans, nullable modes or dirty flags instead of an event or a state model.
- Feature logic leaking into `core`, a `shared/` folder, or another layer.
- Engine code that imports `three/addons`, touches `document`/`window`, or calls UI code.
- Thin wrappers, identity abstractions, one-implementation interfaces that are not boundaries.
- `any`, `!`, casts or optional params that muddy the contract.
- Copy-paste instead of the canonical owner; a new `utils.ts`; deep imports past a shared `index.ts`.
- "Temporary" branches likely to become permanent debt; new entries in `LEGACY_UNTIL_PHASE_6`.
- Undisposed GPU resources, per-frame allocation, listeners that outlive their panel.
- A changed localStorage key, show shape, golden file or screenshot baseline without a stated reason.

## Preferred Remedies

- Delete a layer of indirection instead of polishing it.
- Reframe the state model so conditionals disappear (discriminated union, lookup table, explicit dispatcher).
- Move the ownership boundary so the feature is a natural extension of an existing owner.
- Replace a direct engine→UI call with an `EventBus` event the panel subscribes to.
- Split a growing file by responsibility; split data by area with one joining index.
- Extract a pure function into the layer that owns the concept; move a second user's copy into `<layer>/shared/`.
- Separate orchestration (`main.ts`, layouts) from logic (engine, command).
- Make the type boundary explicit (parse `unknown` once at `show/`) so control flow gets simpler.
- Hoist scratch objects out of the frame loop; give each GPU resource one owner with `dispose()`.

Do not settle for "maybe rename this" when the issue is structural, or for a cleaner version of the same messy idea
when a much simpler idea is visible.

## Severity (from budget-app REVIEW.md, adapted)

**Important**: would break behavior, break parity, or break a luma-desk rule the gate cannot catch: R3 via a path
the globs miss, R4, R5, R6 (shared too early or duplicated), R7, R8 casts, R9, R11, any item in Standard 7, a missed
code-judo move that keeps a lot of incidental complexity, and a test that asserts nothing a caller depends on, mocks
its subject, or would not fail on the bug it names.

**Nit**: a function over 20 lines, a name that does not say what a thing is, TSDoc that says what instead of why,
ordering. Report at most six nits inline; give the rest as a count.

Anything `npm run typecheck`, `npm run lint` (ESLint, `check:lines`, `format:check`) or `npm test` already rejects
is not a finding. Run them first and report their exit codes; a failing gate is reported once, as a blocker.

**Skip**: `package-lock.json`, `dist/**`, `tests/golden/**`, `tests/fixtures/**`,
`tests/e2e/__screenshots__/**`, `docs/screenshots/**`, `docs/plan/**`, and `src/main.ts` lines that only moved
out unchanged (review what replaced them).

## Verification Bar

A claim about behavior cites `file:line` in the source, not a guess from a name. A claim that a rule is broken
names the rule (R1–R11 or a Standard) and quotes it. A size claim quotes `wc -l` after `npm run format`.

## Review Tone

Direct, serious and demanding. Not rude, but do not soften a maintainability problem into a suggestion.

- `this pushes ExecutorsPanel.ts to 118 lines. what is the second responsibility? split there.`
- `engine/Tempo.ts calls toast(). emit a 'message' event and let the ui subscribe.`
- `this adds a special case to the frame loop. can the phaser shape own it?`
- `this is a third copy of the canvas-texture setup. use createCanvasTexture from render/shared.`
- `why the cast here? parse the show once at the boundary and the cast disappears.`
- `this allocates a Vector3 per fixture per frame. hoist a scratch vector.`
- `there is a code-judo move here: a lookup table makes these five branches disappear.`

## Output

Open with a one-line tally (`2 important, 3 nits`, or "no rule violations"), then the gate exit codes. Order
findings: (1) structural regressions and rule breaks, (2) missed code-judo simplifications, (3) spaghetti growth,
(4) boundary, type and layer problems, (5) size and decomposition, (6) three.js/DOM hygiene, (7) legibility.
Prefer a few high-conviction findings over many cosmetic ones.

## Approval Bar

Do not approve because behavior seems correct. Approve only when there is: no rule break (R1–R11); no clear
structural regression; no visible missed code-judo move; no spaghetti growth; no magic or unnecessary
wrapper/cast/optionality churn; no layer or EventBus leak; no duplicate of a canonical owner; no undisposed GPU
resource or per-frame allocation; and green gates plus the parity suite. Otherwise leave explicit, actionable
feedback and push for the cleaner decomposition.
