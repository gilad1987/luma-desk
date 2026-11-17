# ADR 0004: Deploy to GitHub Pages with GitHub Actions

- Status: Accepted (the Pages switch waits for the merge, see decision 4)
- Date: 2026-11-17
- Scope: `.github/workflows/deploy.yml`, the repository's Pages settings

## Context

GitHub Pages serves the root of the `gh-pages` branch with the "legacy" build type (`build_type: legacy`,
`source: gh-pages /`). The live URL is `https://gilad1987.github.io/luma-desk/`. Commits go to `main` and are copied
to `gh-pages` by hand. The `gh-pages` tree holds the source files as they are (`index.html`, `sw.js`,
`manifest.webmanifest`, `icons/`, `vendor/`, `.nojekyll`).

After the move to Vite (ADR 0001) the files to serve are the build output in `dist/`, not the source. A manual copy
of a build is easy to get wrong: an old `dist/`, a build from uncommitted files, a build that failed the tests.

## Decision

1. `.github/workflows/deploy.yml` runs on every pull request, on every push to `main`, and by hand
   (`workflow_dispatch`). Its `check` job runs:
   1. `actions/checkout`
   2. `actions/setup-node` with `node-version-file: .nvmrc` and the npm cache
   3. `npm ci`
   4. `npm run typecheck`, `npm run lint`, `npm test`
   5. `npm run build`
   6. on `main` only: `actions/upload-pages-artifact` with `path: dist`

   A second job, `deploy`, runs on `main` only, after `check`, with `actions/deploy-pages` in the `github-pages`
   environment.

2. Least privilege: the workflow has `contents: read`; only `deploy` gets `pages: write` and `id-token: write`.
   Concurrency group `pages` with `cancel-in-progress: false`, so two deploys never overlap and a running deploy is
   never cut off.
3. A failed check stops the deploy. Nothing reaches the live site without passing typecheck, lint (ESLint, line
   check, Prettier), the Vitest unit tests and the build. **The Playwright suite does not run in CI.** Its
   screenshot baselines are recorded on macOS (`tests/e2e/__screenshots__/darwin/`) and would not match the Linux
   runner. Run `npx playwright test` locally before a merge.
4. Switch Pages to `build_type=workflow` only after the refactor branch is merged to `main`, and only with the
   owner's explicit approval at that time. Until then the legacy `gh-pages` site keeps serving the current app.
5. Keep the `gh-pages` branch after the switch, unchanged, as a rollback: setting the Pages source back to
   `gh-pages /` restores the old site.
6. No `CNAME`, custom domain or Jekyll step. Vite output with `base: './'` works under `/luma-desk/` as it is.

## Alternatives rejected

- **Keep the legacy branch deploy and push `dist/` to `gh-pages`** (by hand, by script or with an action such as
  `peaceiris/actions-gh-pages`). No settings change. But it commits build output to the repository, and a manual
  push can skip the checks. It stays the rollback.
- **Serve `docs/` on `main`.** Built files would live in `main` next to the source, and `docs/` already holds the
  project docs and screenshots.
- **Another host (Netlify, Cloudflare Pages, Vercel).** Preview deploys per pull request are nice, but the URL, the
  service-worker scope and the installed PWAs are tied to `gilad1987.github.io/luma-desk/`. Moving them is a product
  change, not a refactor.
- **Run Playwright in CI now.** It needs Linux baselines, or a macOS runner, and a GPU-free WebGL path in both. That
  is a separate change with its own baselines.

## Consequences

Good:

- Every deploy is a clean build of a commit on `main` that passed the checks. Every pull request gets the same
  checks.
- No build output is committed to the repository.
- The deploy history is visible in the Actions tab and in the `github-pages` environment.

Costs and risks:

- The parity suite (goldens through the browser, screenshots, old saved shows, the service worker) is a local gate
  only. A pull request can pass CI and still break parity.
- The Pages switch is a manual step with a short risk window: if the first workflow run fails after the switch, the
  new app is not live. Run the workflow once with `workflow_dispatch` right after the switch and check the URL.
- The first deploy changes every file URL (hashed names) and the service-worker cache name (ADR 0003). Installed
  apps update on the next online visit. Saved shows in localStorage stay, because the origin and path do not change.
- CI minutes are used on every pull request and every push to `main`.

## Verified

- The `check` steps match the workflow file as committed.
- Not verified: a deploy run. The Pages switch has not happened, so `deploy` has not run against the live site.
