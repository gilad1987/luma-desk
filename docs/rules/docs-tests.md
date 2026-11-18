# Documentation and test rules

Adopted from budget-app; the project rules (docs/rules/code.md, "Project rules") win on any conflict. Tags as in
code.md. The source references (`doc:80-83`, `test:41-51`, ...) point at budget-app's `.cursor/rules/`.

Not linted yet, so checked in review until a later change adds the rule: T8, T11, T15, T22, T23, T25 and I5.
I1 (Hebrew literals only in `src/i18n/`) is linted (`eslint/i18nRules.ts`). T14 is linted only by Vitest
`allowOnly: false` and Playwright `forbidOnly: true`.

### 1.1 Documentation (TSDoc, README, ADR, docs/)

- **D1. Document the field a reader can get wrong; leave the obvious one bare.** QUALITY.md:9 needs TSDoc on every
  exported symbol. Below that level (interface fields, class members, local helpers) write a comment only for an
  optional field that looks required, a unit or scale, an encoding, or an order that matters. [review]
  Source: doc:80-83, doc:24-29. Example: `/** 0..1, not 0..255: the fx engine computes in this scale. */`
- **D2. Name the throw condition.** A function that throws has `@throws <Error type> when <condition>`, and says why
  it throws instead of returning a fallback. [review] Source: doc:37-46. Already done well in `WT/src/core/color.ts`.
- **D3. Union and enum members carry their meaning.** A string union or AST `kind` that a reader must interpret
  (layout `'ma' | 'desk' | 'classic'`, command AST kinds, executor modes) lists each value and what it does. [review]
  Source: doc:279-287.
- **D4. A wired class names its wiring.** A class that `main.ts` builds says in its TSDoc what it receives by
  injection and which EventBus events it emits or listens to. That is the "Dependencies / Usage" block of a budget
  service doc, made fit for the composition root. [review] Source: doc:176-200.
  Example: `* Emits \`cueStored\` and \`showChanged\`. Gets \`Rig\` and \`EventBus\` from main.ts.`
- **D5. Kept-on-purpose behaviour points at its record.** Code that keeps an original quirk has a one-line comment
  that names the `docs/known-quirks.md` entry and the original source line. [review] Source: doc:117-130 (business
  rule cites its regulation). Example:
  `// Quirk kept: gobo is always 0 here (known-quirks.md, index.html@48a3b63:1491).`
- **D6. Temporary code has an owner and an exit.** `TODO`/`FIXME` carry a phase or date and the reason:
  `// TODO(phase-6): remove when main.ts stops reading this global.` The auditor rejects one without both. [review]
  (ESLint `no-warning-comments` can only ban the words, not check the format.) Source: doc:132-144, doc:298.
- **D7. Errors are specific and carry context.** An `Error` message names the function, the bad value and what was
  expected: `` `hsv: hue * 6 must be finite, got hue ${h}` ``. Never `'Invalid input'`. [review] Source: doc:202-232.
- **D8. `@example` only where usage is not obvious, and it must compile.** Copy it from a real test or call site.
  [review] Source: doc:66-71, doc:300.
- **D9. Update or delete docs in the same change.** A change that makes a TSDoc, ARCHITECTURE.md section, ADR or
  known-quirks entry false fixes it in the same commit. A stale comment is a review finding. [review]
  Source: doc:12, doc:315-323.
- **D10. Write an ADR when a reasonable person would choose differently.** Sections: Context, Decision, Alternatives
  rejected (so nobody proposes them again), Consequences, Verified (what was checked and what was not). Skip ADRs
  for renames, copy edits and dependency bumps. [review] Source: logs:7-9, logs:18-26, logs:32-33.
- **D11. A known-quirks entry is complete.** Each entry has: the original source line (`index.html@48a3b63:N`), the
  behaviour, why it stays, and the test that pins it (T14). [review] Source: test:147-150 (a known bug is pinned).

### 1.2 Testing

**What to test**

- **T1. A change ships with its tests in the same change.** No "tests later". A `src/` change with no new test says
  in the commit/PR body which existing test or golden already catches it. [review] Source: test:37-39, test:87-92.
- **T2. Each new test names the bug it catches.** Before you write it, answer: what bug does it catch, why does
  nothing else (tsc, lint, a golden, a screenshot) catch it, and which line, changed, makes it fail. For parity tests
  the bug is "differs from the original", and the oracle or golden is the reference. [review] Source: test:41-51.
- **T3. Prove a new test can fail.** Break the guarded line and watch the test go red. Do it in a scratch copy, never
  in the shared worktree: other agents run the suite there. [review] Source: test:550-555.
- **T4. A bug fix adds the red case first, then the fix.** [review] Source: test:84-85.
- **T5. Exempt by definition (no test, no excuse):** type-only files, barrel `index.ts`, rig data files under
  `domain/rig/` (the `rig-build` golden owns them), `i18n/he/`, styles and `.glsl` (screenshots own them). [review]
  Source: test:53-58.
- **T6. One layer answers one question; do not re-check another layer's answer.** Lint/check scripts: repo
  invariants (layers, lines, format). Vitest units: pure logic in `core`, `domain`, `engine`, `command`, `show`,
  `autoshow`, `audio`. Playwright: boot, golden JSON through `window.__desk`, screenshots, old saved shows, service
  worker. A unit test does not re-assert a golden value; a spec does not re-test parser branches. [review]
  Source: test:566-575, test:29-33.
- **T7. No coverage threshold.** A percentage counts lines run, not bugs caught. [review] Source: test:94-96.

**Naming and structure**

- **T8. The title is a behaviour sentence, present tense, never "should".** `'keeps the original build order, not id
order'`. [lint] ESLint `no-restricted-syntax` on
  `CallExpression[callee.name=/^(it|test)$/][arguments.0.value=/^should/i]`, scoped to `tests/**`.
  Source: test:108-110, test:180.
- **T9. The file opens with a doc comment** saying what it owns and what it does not cover, and why (for example "the
  sRGB path is owned by the screenshot suite"). [review] (no core ESLint rule checks this). Source: test:103-107,
  test:181. The current `WT/tests` files mostly lack it; add it when a file is touched.
- **T10. Arrange, act, assert, one reason to fail.** Several facts of one behaviour go in one tuple, so one failure
  shows all: `expect([s.execs[0]?.on, s.execs[0]?.cur]).toEqual([true, 0])` (already in `old-show.spec.ts:28`).
  [review] Source: test:111-114.
- **T11. Assert the exact result, not a weak one.** A test whose only matchers are `toBeDefined`/`toBeTruthy`/
  `toBeFalsy` is refused; prefer `toStrictEqual` on the whole value (as `expectGolden` does). [lint] ESLint
  `no-restricted-syntax` on `CallExpression[callee.property.name=/^(toBeDefined|toBeTruthy|toBeFalsy)$/]` in
  `tests/**` (stricter than budget: bans them outright; use `.not.toBeUndefined()` or an exact value). A test with
  no `expect` at all: [review]. Source: test:156-159.
- **T12. Placement mirrors `src/`.** `src/<layer>/X.ts` → `tests/unit/<layer>/X.test.ts`. When a test file reaches
  100 lines, split by behaviour: `CommandRunner.store.test.ts`, `CommandRunner.errors.test.ts`. A builder or oracle
  only one test file uses stays beside it in `tests/unit/<layer>/` (as `parityInputs.ts`, `recordedRig.ts`); 2+ users
  → `tests/shared/` (QUALITY-3). A second copy of a builder is merged into the shared one. [review]
  Source: test:200-203, test:482-484 (adapted; see Conflicts C1, C2).
- **T13. No test depends on another test's state or order.** Each test arranges its own data; each spec boots with
  its own `bootApp(page, { show, layout })` storage. [review] Source: test:210-211, test:644-649.
- **T14. A kept quirk is pinned, not skipped.** The test asserts the quirky behaviour, its title ends in `(quirk)`,
  and a comment names the known-quirks.md entry. No `.skip`, `.todo`, `.fails`, `.only`. [lint] ESLint
  `no-restricted-syntax` on
  `MemberExpression[object.name=/^(it|test|describe)$/][property.name=/^(only|skip|todo|fails)$/]`;
  plus Vitest `test.allowOnly: false` in `vite.config.ts` and Playwright `forbidOnly: true` in
  `playwright.config.ts`. Source: test:147-150, test:160-162.

**Determinism**

- **T15. No sleeps and no real clock in a test.** Unit tests pass time as a parameter (`compute(t, …)`) or through
  the `Clock` boundary; specs step time with `stepFrames(desk, …)` and the `?test` fixed clock. Never
  `page.waitForTimeout`, `setTimeout`, `setInterval`; wait on what the user sees (`expect(locator).toBeVisible()`).
  [lint] ESLint `no-restricted-properties` `{object:'page', property:'waitForTimeout'}` and `no-restricted-globals`
  `setTimeout`, `setInterval` in `tests/**`. Source: test:126-138, test:166-168, test:650-651.
- **T16. `Date.now()`/`new Date()` only where the value never reaches an assertion** (a cache-busting URL, as in
  `swOffline.spec.ts:29`), with a comment saying so. [review] Source: test:137-138, test:166 (relaxed; see C6).
- **T17. Fake timers and stubs are undone in the same file.** `vi.useFakeTimers` needs `vi.useRealTimers()` in
  `afterEach`; `vi.stubGlobal`/`vi.stubEnv` need `vi.unstubAllGlobals()`/`vi.unstubAllEnvs()`. [review]
  Source: test:132-136, test:178-179.
- **T18. An async race is settled by hand.** For async code (`BpmDetector`, `SongPlayer`, storage), use a deferred
  promise helper in `tests/shared/` that the test resolves in the order it wants. No waiting loops. [review]
  Source: test:126-131, test:412-414.
- **T19. Tests pass under any TZ and locale.** Specs run with `timezoneId: 'UTC'` (already set); a unit test that
  formats time pins it explicitly. [review] Source: test:226-229, test:655-659.

**Seams and types**

- **T20. No `vi.mock`; inject instead.** Decision #4 (constructor injection) makes it unneeded. A test that seems to
  need a module mock means the class should take the dependency in its constructor. [lint] ESLint
  `no-restricted-properties` `{object:'vi', property:'mock'}` and `{object:'vi', property:'doMock'}` for
  `tests/**/*.ts` (`eslint/codeRules.ts`).
  Source: test:164-165, test:521-527.
- **T21. No production symbol is exported or widened for a test.** Units reach code through its public API;
  specs reach the running app only through the DOM and `window.__desk` behind `?test` (decision #23). [review]
  Source: test:516-517, test:588-590.
- **T22. No `as unknown as` and no `as never` in tests or helpers.** Type a fake properly. [lint] ESLint
  `no-restricted-syntax` on `TSAsExpression[typeAnnotation.type='TSNeverKeyword']` and
  `TSAsExpression > TSAsExpression[typeAnnotation.type='TSUnknownKeyword']`. Source: test:175, test:513-514.
- **T23. No snapshot matchers in Vitest.** Golden data goes through `expectGolden` (named, reviewed JSON in
  `tests/golden/`); images through `toHaveScreenshot`. [lint] ESLint `no-restricted-syntax` on
  `CallExpression[callee.property.name=/^toMatch(Inline)?Snapshot$/]` in `tests/unit/**`. Source: test:163.

**Fixtures and helpers (`tests/shared/`)**

- **T24. One owner per helper; look before you write a second copy.** Each `tests/shared/` file does one thing and
  is exported through `index.ts` (QUALITY-3). [review] Source: test:604-613.
- **T25. Keep runner-bound helpers apart from pure ones.** A helper that a Vitest file imports must not pull in
  `@playwright/test` at runtime, and the reverse. Split `tests/shared/` into a pure entry (for example `pure.ts`:
  `jsonRoundTrip`, `roundNumbers`, `readGolden`) and the Playwright entry `index.ts`. [lint] ESLint
  `no-restricted-imports` pattern `@playwright/test` (non-type imports) for `tests/unit/**` and the pure helpers.
  Source: test:270-272, test:333-334, test:417-418 (budget keeps guard-run harness files free of `vitest`).
  Finding: today `tests/unit/domain/rigBuild.test.ts:3` and `aim.test.ts:6` import `../../shared/index.ts`, which
  re-exports `expectGolden.ts`, which imports `test`/`expect` from `@playwright/test` as values.
- **T26. Specs find user text by key, not by literal.** A spec that asserts Hebrew UI text imports it from
  `src/i18n/he/`, so a copy edit moves the spec with it. [review] Source: test:139-141, test:639-641,
  `budget-app/e2e/support/text.ts:33-41`.
- **T27. Selectors: role and accessible name first, then the app's own `id`.** `getByRole('button', { name })` for
  user controls; the `#id` the app owns (`byId`, decision D2) where the control has no name (canvas, sheet cells). A
  CSS class selector needs a comment saying why. [review] Source: test:637-643 (adapted; see C5).

**Where suites run**

- **T28. The screenshot suite is a required local check; CI runs the rest.** Its baselines are macOS only, so CI
  (`npm run test:e2e:ci`, Linux) skips every test tagged `@screenshot`. Run `npm run test:screenshots` on macOS before
  a change that can move a pixel (styles, render, ui, layout, fonts) and say in the PR body that it passed. A new
  screenshot test gets the `@screenshot` tag; a test without it must pass on Linux. [review] Source: ADR 0004.

### 1.3 i18n (`src/i18n/he/`)

The locale is the folder `src/i18n/he/`: one file per area, joined by `src/i18n/he/index.ts`.

- **I1. Every Hebrew string lives in `src/i18n/he/`.** That covers script text and the static markup, which the
  panels render from TypeScript templates (decision 27 replaces decision 15). English console terms stay inline
  (decision 16). [lint] ESLint `no-restricted-syntax` with two selectors, `Literal[value=/[֐-׿]/]` and
  `TemplateElement:matches([value.cooked=/[֐-׿]/], [value.raw=/[֐-׿]/])`, for `src/**/*.ts`, with `src/i18n/**`
  excluded (`eslint/i18nRules.ts`). Source: i18n:9-12 (one source of truth, the build fails on a gap).
- **I2. A missing key fails the build.** `he` is a typed `as const` object read by property (`he.toast.noSelection`),
  never by a computed string key, so `tsc` refuses a key that does not exist. [lint] `npm run typecheck`.
  Source: i18n:40-49.
- **I3. Group keys by reach, not by origin.** Keys used by one module live under that module's group
  (`he.autoshow.styles`); a string used by 2+ modules moves to `he.common` in the same change. [review]
  Source: i18n:14-38.
- **I4. Text with values is a function in `src/i18n/he/`.**
  `noSelectionApplied: (n: number) => \`…${n} הגופים…\``. Keep the exact original string for parity (no
`Intl.PluralRules` or rewording during the refactor). After the refactor, a count message may use Hebrew plural
forms (`one`/`two`/`many`/`other`). [review] Source: i18n:51-57 (adapted: no i18next).
- **I5. `src/i18n/` imports nothing from outside `src/i18n/`.** It is pure data, so Playwright specs can import it
  (T26). Imports inside the folder, such as `src/i18n/he/index.ts` joining its area files, are allowed. [review]
  Source: test:588-589 (e2e imports only the locale file).
- **I6. Delete a key with its last use.** Before you delete, search for every reference (`rg "he\.toast\.x\b" src`),
  because a key can be passed through a table. [review] Source: i18n:59-75.
- **I7. Do not translate what the platform formats.** Times, numbers and percent go through `toLocale*`/`Intl` with
  an explicit locale (today `toLocaleTimeString('en-GB')`; keep it for parity). [review] Source: i18n:77-81.

### 1.4 Plans and logs (only what fits a solo hobby app)

- **P1. Before you work on an area, read its plan.** `docs/plan/` (for example `extraction/00-decisions.md`) is the
  spec. Do not invent a competing design. [review] Source: plans:11-14, logs:11-14.
- **P2. A plan is not a license to change code.** Write the plan, then wait for approval to implement. [review]
  Source: plans:16-20.
- **P3. When a plan is done, move its "why" out and mark it.** Lasting reasons go to an ADR, ARCHITECTURE.md or
  known-quirks.md; the plan gets one line at the top: `Done in <commit>; see docs/adr/000N`. [review]
  Source: plans:22-26.
- **P4. Report verification honestly.** A PR body or ADR "Verified" section says what was checked and what was
  not. [review] Source: logs:32-33.
