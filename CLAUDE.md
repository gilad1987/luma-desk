# luma-desk

A lighting desk in the browser: vanilla TypeScript, Vite, three.js 0.160, a DOM UI in Hebrew (RTL), no server.
Node 26 (`.nvmrc`), npm. The refactor from `index.html` into `src/` follows `docs/plan/`.

## Rules (binding)

- [docs/rules/code.md](docs/rules/code.md): project rules and the code rules adopted from budget-app.
- [docs/rules/docs-tests.md](docs/rules/docs-tests.md): documentation, test, i18n and plan rules.
- Reviews use the `code-quality-review` skill (`.claude/skills/code-quality-review/SKILL.md`) and its severity scale.

In short:

- Layers point one way: core <- domain <- engine <- command/show/autoshow/audio; render/ui -> engine; app ->
  everything. `src/app/` is the wiring under the composition root `src/main.ts`; no `src/` layer except
  `src/main.ts` imports `src/app` (linted). The engine never imports render, ui or the DOM.
- Max 100 lines per file (Markdown excluded), measured after Prettier. Split by responsibility.
- All TypeScript: no .js/.mjs/.cjs file anywhere. Configs are .ts.
- Prettier 120, single quotes, semicolons, trailing commas. SCSS only in Phase 5, by the styles owner.
- Shared code only when 2+ modules use it: `src/core/`, `<layer>/shared/`, `tests/shared/`, each with an `index.ts`.
- Behaviour does not change: the parity suite (goldens, screenshots) is the proof.
- Agents (binding): write and edit files only with your file-edit tools (Write and Edit in Claude Code); never write
  file content with a shell heredoc, `sed`, `echo` or an ad-hoc script. The npm scripts under Commands and the git
  hook may write files.

## Commands

| Command                           | What it does                                                                              |
| --------------------------------- | ----------------------------------------------------------------------------------------- |
| `npm ci`                          | Installs, then `prepare` sets up the git hooks (`scripts/install-git-hooks.ts`).          |
| `npm run typecheck`               | `tsc -b` over the app, node (tests, configs, scripts, build) and service-worker projects. |
| `npm run lint`                    | ESLint, `check:lines`, `check:no-js`, `format:check`. CI runs it.                         |
| `npm run lint:fix`                | ESLint `--fix`, then Prettier `--write`.                                                  |
| `npm test` / `npm run test:watch` | Vitest unit tests (`tests/unit/`).                                                        |
| `npm run test:e2e`                | Playwright parity suite (`tests/e2e/`) against the production build.                      |
| `npm run format`                  | Prettier over the tree.                                                                   |

## Git hooks

husky runs `.husky/pre-commit`, which runs lint-staged (`lint-staged.config.ts`): ESLint `--fix` and Prettier on the
staged files, the line check for CSS/GLSL, the no-JS check for JS files. Commit only with the hook active; never
`--no-verify`.

All worktrees of this repository share one git config, so `core.hooksPath` is the relative path `.husky/_` in every
worktree. That folder is created by `npm ci` (or `npm run prepare`) in each worktree:

- A worktree without `.husky/_` runs no hook. Run `npm ci` after you merge or check out a branch that has `.husky/`.
- A worktree with the hook but without `node_modules` skips the checks with a note; CI still runs the full lint.
- An install without dev dependencies skips the hook setup instead of failing.
