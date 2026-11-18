# ADR 0006: The Stage Builder UI is built on Web Awesome, bundled and lazy-loaded

- Status: Accepted
- Date: 2026-11-19
- Scope: `src/ui/builder/wa`, `src/app/ui/{loadBuilderShell,viewerHost,wireBuilder}.ts`, `src/styles/builder`,
  `eslint/waBoundary.ts`, `package.json`

## Context

The Stage Builder of PR #3 is a form UI on plain `<button>` and `<input>` elements laid over the full-window 3D
view. The redesign (`docs/plan/stage-builder-dnd/`) needs a professional component set for a dense, touch-friendly
editor: buttons with icons and tooltips, a draggable split between the plan and the 3D preview, a drawer on narrow
screens, later tabs, trees, inputs with mixed values. The desk is vanilla TypeScript with no framework, runs
offline as an installed PWA, is deployed as static files on GitHub Pages, and keeps 9 pixel-exact screenshot
baselines of the desk layouts. The owner chose Web Awesome 3.15.0 (MIT) over Mantine, because Mantine needs React.

## Decision

1. `@awesome.me/webawesome` is pinned to `3.15.0` in `dependencies` and bundled by Vite. Nothing is loaded from a
   CDN: the components are imported one by one (`dist/components/<name>/<name>.js`), never the autoloader.
2. One folder imports the package: `src/ui/builder/wa/` (`registerWa.ts`, `waIcons.ts`, `waEvents.ts`,
   `waButton.ts`). ESLint (`eslint/waBoundary.ts`) rejects the import anywhere else. The rest of the builder drives
   Web Awesome elements through the plain `HTMLElement` surface (attributes, properties, `onclick`), so unit tests on
   FakeDom or jsdom never load the package.
3. Only the theme tokens are imported: `dist/styles/themes/default.css`. Not `webawesome.css`, which pulls in
   `native.css` and restyles `html`, `body`, `button` and `input` of the whole desk. The builder's own
   `src/styles/builder/_wa-theme.scss` maps the tokens to the desk tokens under `.builder.wa-dark` (the Web Awesome
   dark scheme is class-scoped, so the desk page keeps its own colours), with 44 px controls
   (`docs/plan/stage-builder-ux/00-overview.md`).
4. Icons are the builder's own inline SVGs (`waIcons.ts`). No `wa-icon` element: its default library fetches from
   the Font Awesome CDN, which breaks "offline with the builder open" and "no off-origin request". The components the
   shell uses render only `system` icons (inline data URIs) or none.
5. The chunk loads on the Build Stage click: `src/app/ui/loadBuilderShell.ts` imports `registerWa` dynamically and
   `wireBuilder` enters the builder when the custom elements are defined. The boot bundle does not contain Web
   Awesome; the service worker precaches the chunk like every other built file (ADR 0003), so the builder opens
   offline after one online visit.
6. While the builder is open, `section#viewer` (the 3D view) moves into the builder's 3D pane and back on exit
   (`src/app/ui/viewerHost.ts`). The renderer's `ResizeObserver` follows the element; no render code changes.

## Alternatives rejected

- **Mantine or another React component set.** Needs React; the desk has no framework and the owner declined one.
- **Shoelace 2.** Web Awesome 3 is its successor from the same authors; starting on the predecessor means a
  migration later.
- **An own component set on plain elements.** Tooltips, drawers, split panels, tabs and trees with keyboard and touch
  behaviour are weeks of work the plan does not have, and every later phase would pay for the gaps.
- **The CDN autoloader (`webawesome.loader.js`).** Not offline, an off-origin request on every visit, and a version
  that can move under the app.
- **`webawesome.css` with `native.css`.** Restyles the desk page; the 9 screenshot baselines and the desk's own
  look would change. Tokens only, plus a scoped mapping, gives the components what they need without touching the
  desk.
- **A hand-written scoped copy of the theme tokens.** 400 lines of SCSS to keep in step with upstream. Kept as the
  fallback if the `:where(:root)` declarations of the theme (`color-scheme: light`, `color`, `font-family`) ever move
  a desk pixel; today the desk's `body` rule overrides the last two and `light` renders as the default scheme.
- **The whole `src/ui/builder/**` as the lazy chunk.** `main.ts` reads `builder.isOpen` and `builder.exit`
  synchronously, so it needs a facade; the builder code is already in the boot bundle and small. Revisit when the
  builder UI passes about 100 KB minified.
- **A transparent hole over the full-window 3D view** (the PR #3 layout) with `camera.setViewOffset` to recentre.
  The 3D pane is bounded on four sides by moving edges, and the offset is render code the UI phases must not touch.

## Consequences

Good:

- Professional controls with keyboard, touch and focus behaviour from one maintained library; one theme file maps
  them to the desk.
- The boot path is unchanged in size and content; the desk pays for the builder only when it opens.
- The import boundary is linted, so a stray `wa-*` import in a panel or a test fails `npm run lint`.

Costs and risks:

- A second rendering model (Lit shadow DOM) inside a vanilla app. Styling crosses the boundary only through tokens
  and `::part()` selectors; a component's internals are not reachable from SCSS.
- Form controls in shadow DOM: `isTextField` must learn the Web Awesome input hosts when Phase 5 introduces them.
- Each upgrade of the package needs the design review and the offline and no-off-origin checks again.
- A pane at 0 % height (Plan or 3D mode) gives the renderer a 0 px box for a moment; the fallback is a 2 px minimum.

## Verified

- `npm run build`: the lazy chunk `assets/registerWa-*.js` is 226,683 bytes (58,139 gzip) and its CSS
  `assets/registerWa-*.css` 50,570 bytes (6,891 gzip); the boot chunk `assets/index-*.js` is 988,289 bytes
  (292,600 gzip) and holds no Web Awesome token (`tests/unit/swBuild.test.ts`: the service worker shell lists the
  chunk; the main chunk has no `--wa-` string, the chunk does).
- `tests/unit/app/ui/wireBuilder.test.ts`: the click awaits the chunk before `enter()`; `viewerHost.test.ts`: the
  viewer moves into the pane and back before `#side`.
- `tests/e2e/builder-shell.spec.ts`: no off-origin request from the Build Stage click to Done, no `wa-icon` element,
  no Web Awesome in the boot bundle before the click; `tests/e2e/builder-offline.spec.ts`: the builder opens offline
  from the service worker cache.
- `npm run test:screenshots`: the 9 desk baselines unchanged.
- Not verified: iPad Safari on a device (owner check); Web Awesome inputs (Phase 5).
