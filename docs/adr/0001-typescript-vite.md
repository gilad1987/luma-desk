# ADR 0001: TypeScript and Vite, with three.js from npm

- Status: Accepted
- Date: 2026-11-17
- Scope: whole app

## Context

At commit `48a3b63` the whole app is one file, `index.html` (3,096 lines): CSS in one `<style>` block (18-543), an
import map (544-546), markup, and one ES-module script (675-3094). There is no `package.json`, no build, no type
checker, no lint and no unit tests.

three.js r160 is copied into `vendor/three/` and loaded through the import map:

```html
{"imports":{"three":"./vendor/three/three.module.js","three/addons/":"./vendor/three/addons/"}}
```

The script shares state through module-level `let` and `const` names, for example `sel`, `groups`, `presets` and
`bpm`, which other code reassigns with `=` (1526, 1534, 1536, 2301, 2328). An ES-module import cannot be reassigned,
so splitting the file needs an explicit owner for that state. Load order also matters: some top-level code runs
before names it uses are declared (for example `uiDirty` is declared at 1949 but `setSel` at 1802 writes it, and
`deskMode` is declared at 2940 but used by `encList` at 1996). This works only because the calls happen later.

The app is deployed as static files on GitHub Pages under a sub-path (`/luma-desk/`), and it must work offline as
an installed PWA. `manifest.webmanifest` uses relative `start_url` and `scope` (`./`).

The goal of the refactor is maintainable code with no change in behavior.

## Decision

1. Use Vite to build and serve the app, with `base: './'` (`vite.config.ts`). Relative URLs keep the build working
   under `/luma-desk/`, under a local preview, and from any other folder, the same way the old relative paths did.
2. Use TypeScript with these compiler options (`tsconfig.base.json`):
   - `strict`: the base for all of the options below.
   - `noUncheckedIndexedAccess`: the app reads by id all the time (`FX[id]`, `groups[n]`, `presets[t][s]`,
     `e.cues[i]`). In the original a missing key gives `undefined` and then a `TypeError` far away (known quirk C2).
     This option makes each such read handle the missing case at the point of the read.
   - `noImplicitOverride`: a class that changes a base-class method must say `override`. Cheap insurance for the
     render classes that extend three.js types.
   - `verbatimModuleSyntax`: type-only imports must use `import type`, so type imports never reach the output and
     import side effects stay visible.
   - `moduleResolution: "bundler"`: matches how Vite resolves imports, including `three/addons/*` and the `?raw`
     shader imports (typed by `declare module '*.glsl?raw'` in `src/types/glsl.d.ts`).
3. Three TypeScript projects, referenced from `tsconfig.json` and checked by `npm run typecheck` (`tsc -b`):
   `tsconfig.app.json` (`src/`), `tsconfig.node.json` (tests, configs, `scripts/`, `build/`) and `tsconfig.sw.json`
   (`sw.ts`, with the web-worker library). Tests and configs are type-checked like the app.
4. Install `three@0.160.0` and `@types/three@0.160.0` from npm. Phase 6 deletes `vendor/` and the import map. The
   same version as the vendored r160 keeps the rendering the same; the exact pin stops a silent upgrade.
5. `domain` and `engine` keep `THREE.Vector3` for positions and directions (decision 1 in
   `docs/plan/extraction/00-decisions.md`). A hand-written vector type would round differently in the last digits,
   and the parity goldens would break. ESLint allows the `three` core package there for math types only;
   `three/addons/*` stay in `render`.
6. Pin every tool locally in `package.json`; `npm ci` installs from the lockfile. The global `tsc` on the dev machine
   is too old, so scripts call the local binaries only. Node 26 is pinned in `.nvmrc`; it runs `scripts/*.ts`
   with its built-in type stripping.
7. Code rules that the type system, ESLint and scripts enforce:
   - No `any`, no `@ts-ignore`, no non-null `!` that hides a real missing value.
   - Model the domain with types: `readonly` data for the rig and fixture types, a discriminated union for the
     command AST, literal unions for attribute and feature names.
   - One main export per file, **100 lines at most** after Prettier (decision 19; this replaces the plan's
     250-line target). ESLint `max-lines` checks `.ts`; `npm run check:lines` checks `.css`, `.scss` and `.glsl`.
   - All TypeScript: no `.js`, `.mjs` or `.cjs` (decision 20). Configs are `.ts`; `eslint.config.ts` loads with
     `jiti`.
   - Layers import in one direction: `core` <- `domain` <- `engine` <- `command` / `show` / `autoshow` / `audio`;
     `render`, `ui` and `io` on top; `engine` never imports `render`, `ui` or the DOM. ESLint
     `no-restricted-imports` enforces it per layer.
   - No interface with one implementation unless it is a boundary (event bus, storage, clock).
   - TSDoc on every exported symbol, saying why.
8. Tooling: ESLint 9 with `typescript-eslint` `recommendedTypeChecked` and `eslint-config-prettier`; Prettier 3
   (`printWidth: 120`, Hebrew stays UTF-8 and unescaped); Vitest for unit tests; Playwright for the parity suite;
   `sass-embedded` so Vite compiles SCSS.
9. Migrate in phases. Phase 2 moved the script into `src/main.ts` with `// @ts-nocheck` and changed no logic; each
   later phase moves one layer out. Phase 6 leaves `main.ts` as wiring only and removes `@ts-nocheck`.

## Alternatives rejected

- **Keep one HTML file, add JSDoc types and `// @ts-check`.** No build step and no deploy change. But a 3,000-line
  file stays a 3,000-line file, the reassigned globals stay, and JSDoc cannot express the discriminated unions and
  import boundaries we want. It does not meet the maintainability goal.
- **TypeScript with `tsc` only, no bundler, keep the import map.** Fewer tools. But `tsc` does not handle CSS,
  `?raw` shader imports or hashed file names, and the service-worker list would stay hand-written.
- **Another bundler (webpack, Rollup alone, esbuild alone).** All can work. Vite gives a dev server, a preview
  server for Playwright and a plugin API for the service-worker list with the least configuration.
- **Upgrade three.js during the refactor.** A new three.js version changes rendering, and the parity screenshots
  could no longer separate refactor errors from library changes. Upgrade later, in its own change.

## Consequences

Good:

- The compiler finds missing ids, wrong attribute names and wrong event payloads before the app runs.
- Small files with one-way dependencies are easier to read and to test. Pure logic (phasers, tracking, the command
  parser, BPM detection, the look generator) runs in Vitest with no browser.
- three.js comes from npm with types, so an upgrade is a lockfile change and a parity run, not a file copy.
- Vite gives hashed file names, which the service worker relies on (ADR 0003).

Costs and risks:

- The app has a build step. "Run locally" changes from `python3 -m http.server` to `npm ci` and `npm run dev`.
- Deploy must run the build (ADR 0004). Copying source files to `gh-pages` no longer works.
- `noUncheckedIndexedAccess` adds checks in many places. The rule: handle the missing case the way the old code
  behaved (`docs/known-quirks.md`), not "fix" it. Where the old code only crashed, the new code throws a
  `RangeError` that names the bad value (known quirks, section J).
- The 100-line limit gives many small files. Folders per area (`domain/rig/`, `render/venue/`, `ui/panels/<panel>/`)
  keep them findable.
- Module-load side effects of the old script must happen in the same order. `main.ts` makes that order explicit.

## Verified

- `npm run typecheck` runs `tsc -b` over the three projects; CI runs it on every pull request (ADR 0004).
- Bundled three.js 0.160.0 renders like the vendored r160: `tests/e2e/screenshots.spec.ts` compares nine views with
  baselines recorded from the original app.
- `vendor/` and the import map are deleted (Phase 6); `npm run build` succeeds without them, and the parity suite
  runs against that build.
