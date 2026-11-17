# ADR 0003: Keep the hand-written service worker; generate only its file list and cache name

- Status: Accepted
- Date: 2026-11-17
- Scope: `sw.ts`, `build/`, the page-side registration (moving to `src/io/`)

## Context

`sw.js` at `48a3b63` is 26 lines. It does three things:

- **Install** (`sw.js:13`): open the cache `luma-desk-v13` (`sw.js:2`), add every file in a hand-written `SHELL`
  list (`sw.js:3-12`: the page, manifest, icons and 12 vendored three.js files), then `skipWaiting()`.
- **Activate** (`sw.js:14`): delete every cache whose name is not the current one, then `clients.claim()`.
- **Fetch** (`sw.js:15-26`): ignore non-GET requests. Page navigations are network-first: the response is stored as
  `./index.html`, and offline the stored page is returned. Every other GET is stale-while-revalidate: return the
  cached copy at once (ignoring the query string) and refresh it from the network; cache opaque responses too (the
  Google Fonts at `index.html:16-17`).

The page registers it only on http(s) and ignores errors (`index.html:2916`).

Network-first for the page came from a real problem (commit `73778aa`, "network-first for the page so updates appear
immediately"): with cache-first, users kept an old page after a deploy.

After the move to Vite (ADR 0001) the hand-written list breaks: `vendor/` goes away, and the built files have
content hashes in their names that change on every build. The cache name also has to change on every deploy, and
that depended on someone editing `v13` by hand.

Saved shows and layout live in localStorage (`lumadesk-show-v6`, `lumadesk-layout2`, `lumadesk-guide-seen`), not in
Cache Storage, so a new cache name loses no user data.

## Decision

1. Keep the worker logic as it is: network-first for navigations, stale-while-revalidate for everything else,
   install with `addAll`, `skipWaiting`, delete other caches on activate, `clients.claim`. `sw.ts` ports it with the
   same behavior, quirks included (`docs/known-quirks.md`, section I).
2. A small Vite plugin, `build/sw-manifest-plugin.ts`, runs in `vite build` only. It builds `sw.ts` into
   `dist/sw.js` and, after every other plugin has added its files to the bundle:
   - collects every shipped file: the bundle (HTML, JS, CSS) and `public/` (`build/readPublicFiles.ts`);
   - makes the `SHELL` list from their names (`build/shellUrls.ts`: `./` first, then each file as `./<name>`,
     sorted);
   - makes the cache name `luma-desk-` + a hash of every name and content (`build/cacheName.ts`);
   - writes both into the placeholders `__SW_SHELL__` and `__SW_CACHE__` (`build/injectManifest.ts`), and fails the
     build if a placeholder is missing or the worker imports another chunk.

   The worker stays `sw.js` at the root of `dist/`, so the registration URL and the scope do not change, and
   browsers with the old worker update to the new one in place.

3. Keep the `luma-desk-` prefix. It makes the cache easy to find in DevTools and allows a later fix that deletes only
   our own caches (known quirk I7).
4. In `npm run dev` the worker does not work, on purpose: the plugin does not run, and the dev server answers
   `/sw.js` with a module the classic registration cannot parse. Registration fails silently (quirk I10), so the dev
   server never serves stale files.
5. The page-side registration stays one call, as before (`register('sw.js')` on http(s), errors ignored). It lives
   in `src/main.ts` today and moves to `src/io/` with the other browser edges.
6. Test the worker in Playwright against the production preview. `playwright.config.ts` blocks service workers for
   every other spec; `tests/e2e/swOffline.spec.ts` and `tests/e2e/swCaching.spec.ts` allow them with `test.use`.

## Alternatives rejected

- **`vite-plugin-pwa` or Workbox.** Generates the list and the worker, and handles updates well. But it replaces our
  logic with Workbox strategies, adds a dependency the plan does not list, and changes behavior (for example
  precache routing for navigations). It can be revisited later as a separate change.
- **Keep `sw.js` fully hand-written and edit the list by hand.** Vite file names change on every build, so the list
  would be wrong after every change.
- **A build timestamp as the cache name.** Every build gives a new name even with no change, and users download
  everything again.
- **Drop the service worker.** Offline use and installation are product features (README, "Installable PWA").

## Consequences

Good:

- The cache name changes when, and only when, a shipped file changes. Two builds of one commit agree.
- The file list always matches the build, so `addAll` cannot fail on a file that no longer exists.
- The worker behaves as before, so installed iPad users keep working offline.

Costs and risks:

- We own about 80 lines of worker code and a small plugin, instead of a library.
- The first visit after the switch installs a new cache and deletes `luma-desk-v13`. This is the normal update path;
  a manual iPad reinstall check is recorded in the plan.
- `skipWaiting` with hashed chunks: an open old page can ask for a chunk that the new cache does not hold (quirk I8,
  not measured). Not fixed here.
- `vite preview` must answer like GitHub Pages (`Access-Control-Allow-Origin: *`, no `Vary: Origin`), or the
  cached copies never match the page's requests and offline boot fails. `vite.config.ts` sets `preview.cors`.

## Verified

- `tests/unit/swManifest.test.ts`: the shell list, the cache-name hash (stable, order-free, changes with content),
  placeholder injection and the public-folder read.
- `tests/unit/swBuild.test.ts`: the plugin over a real build.
- `tests/e2e/swOffline.spec.ts`: the app boots offline from the cache. `tests/e2e/swCaching.spec.ts`: what is cached.
- Not verified: the update path on an installed iPad (manual, after the deploy switch).
