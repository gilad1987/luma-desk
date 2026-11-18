# ADR 0004: Deploy to GitHub Pages with GitHub Actions

- Status: Accepted (the Pages switch waits for the merge, see decision 4)
- Date: 2026-11-17
- Revised 2026-11-18: the Playwright suite without the `@screenshot` tests runs in CI. It was a rejected alternative
  before; decision 1 (steps 6 to 8) and decision 3 now adopt it.
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
   6. Chromium for Playwright, from `actions/cache` (key: runner OS and Playwright version) or
      `npx playwright install --with-deps chromium` on a cache miss; on a cache hit,
      `npx playwright install-deps chromium` installs only the system libraries
   7. `npm run test:e2e:ci` against `dist/` served by `npm run preview` (`WEB_SERVER_CMD`)
   8. on failure only: `actions/upload-artifact` with `playwright-report/` and `test-results/`, kept 7 days
   9. on `main` only: `actions/upload-pages-artifact` with `path: dist`

   A second job, `deploy`, runs on `main` only, after `check`, with `actions/deploy-pages` in the `github-pages`
   environment.

2. Least privilege: the workflow has `contents: read`; only `deploy` gets `pages: write` and `id-token: write`.
   Concurrency is set on the whole workflow, because the checks of an older `main` commit can finish after those of
   a newer one. All `main` runs (push and `workflow_dispatch`) share the group `pages-refs/heads/main` with
   `cancel-in-progress: true`: a newer run cancels the older one, also during its deploy, so the newest commit
   always deploys last and two deploys never overlap. A re-run of an older run deploys that older commit again; to
   deploy the newest commit again, run `gh workflow run deploy.yml --ref main`. Each pull request run has its own
   group (`pages-<run id>`) and `cancel-in-progress: false`, so a check is never queued or cancelled. The `deploy`
   job has no concurrency of its own: the workflow group already runs one `main` run at a time. A job group named
   like the workflow group would deadlock.
3. A failed check stops the deploy. Nothing reaches the live site without passing typecheck, lint (ESLint, line
   check, Prettier), the Vitest unit tests, the build and the Playwright suite without its screenshot tests.

   The `check` job runs the Playwright parity suite on Linux, except the tests tagged `@screenshot`
   (`npm run test:e2e:ci`, which is `playwright test --grep-invert @screenshot`). It serves the `dist/` from the
   build step with `vite preview`, so CI tests the same files it deploys. Chromium is cached by Playwright version;
   the system libraries it needs are installed on every run, because the cache holds only the browser. On failure
   the job uploads `playwright-report/` and `test-results/` for 7 days. The 9 screenshot tests (three layouts, three
   cameras, `tests/e2e/screenshots.spec.ts`) stay out of CI, because their baselines are recorded on macOS
   (`tests/e2e/__screenshots__/`), and fonts and WebGL draw differently on Linux. They remain a required local
   check: run `npm run test:screenshots` on macOS before a change that can move a pixel, and state the result in
   the PR (`docs/rules/docs-tests.md`, T28).

   The service-worker specs (`tests/e2e/swOffline.spec.ts`, `tests/e2e/swCaching.spec.ts`) open the app with
   `?test` (`tests/shared/e2e/openUnderWorker.ts`). Without test mode the render loop runs without pause in
   software WebGL and takes the CPU that the page and the worker need: on a loaded machine one `page.evaluate`
   took 31 s and the specs timed out. The worker treats `./?test` like any other page, so the assertions do not
   change. The Google Fonts test (I6) fulfils the font stylesheet with a Playwright route instead of a live request,
   so the suite does not depend on the network. `index.html` links the sheet without `crossorigin`, so the worker
   still gets an opaque response, which is what I6 checks.

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
- **Record Linux screenshot baselines too, and run the whole suite in CI.** That doubles the baselines to maintain,
  and the Linux baselines still do not run on the developer's machine.
- **A macOS runner for the screenshot tests.** Costs more CI minutes per run, and the runner's fonts and GPU are
  not the developer's, so the baselines would still need a second recording.

## Consequences

Good:

- Every deploy is a clean build of a commit on `main` that passed the checks. Every pull request gets the same
  checks.
- No build output is committed to the repository.
- The deploy history is visible in the Actions tab and in the `github-pages` environment.

Costs and risks:

- The screenshot tests are a local gate only. A pull request can pass CI and still move a pixel; T28 makes the
  local run and its result in the PR body a review item.
- The Playwright step adds a few minutes to each run, and a flaky browser test blocks the deploy.
- The Pages switch is a manual step with a short risk window: if the first workflow run fails after the switch, the
  new app is not live. Run the workflow once with `workflow_dispatch` right after the switch and check the URL.
- The first deploy changes every file URL (hashed names) and the service-worker cache name (ADR 0003). Installed
  apps update on the next online visit. Saved shows in localStorage stay, because the origin and path do not change.
- CI minutes are used on every pull request and every push to `main`.

## Verified

- The `check` steps match `.github/workflows/deploy.yml` as committed, including the Playwright, cache and
  report-upload steps.
- Not verified: a deploy run. The Pages switch has not happened, so `deploy` has not run against the live site.
