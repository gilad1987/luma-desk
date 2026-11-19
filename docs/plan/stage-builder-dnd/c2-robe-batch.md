# Phase C2: Robe batch, `tiltBar` and `yokedCan` body families

Lane `cat`, worktree `luma-desk.wt/19-11-2026-feat-sb-c1-products`, new branch `feat/sb-c2-robe` from `origin/main`
(`git fetch origin && git switch -c feat/sb-c2-robe origin/main`; keep `feat/sb-c1-products`; `npm ci` if the lock
changed). One PR into `main`. Saved in the repo as `docs/plan/stage-builder-dnd/c2-robe-batch.md` (rule P1) in the
first implement commit.

## Context

C1 (PR #13, merge `5774563f`) shipped the product layer, the `mover` family and the Robe Esprite. C2 adds the other
14 Robe products of the source plan and the two body families they need (`tiltBar`, `yokedCan`). The owner checks
each family in close-up before its batch (gates G0-G3). Done when (source plan): span and mount are pinned per
product, the owner approved each family, goldens and the 9 screenshot baselines are byte-equal.

Tier: **Large** (domain contract change, three render families, a native-model refactor, owner gates).

## Base check and what changed from the draft

The draft (`draft-plan-cat-c2.md`) was checked line by line against the tree. `feat/sb-c1-products` HEAD
`08179e60` is the PR #13 head and contains PR #8, so its lane files equal `main` at `5774563f` (no other PR merged
since). All 14 product rows were re-checked against `robe-1.md` / `robe-2.md`: no number is wrong, and all 14 have
H x W x D. Step 0 (base data sheets) was done in this plan phase (table below).

Corrections to the draft, with the reason:

| # | Draft said | True / changed | Why it matters |
|---|---|---|---|
| 1 | `FixtureProduct.ts` is 78 lines | 81 | Still fits the union; body interfaces move to `bodies/` anyway |
| 2 | Line refs `catalogueRules.test.ts:49-60`, `:29-36`; `lazyProducts.test.ts:43-44,68-84` | `:50-61`, `:30-37`; `:44-45`, `:69-78` (first fixture), `:80-92` (geometry reuse), `:94-99` (shared lens) | Correct refs for the implementer |
| 3 | `playwright.config.ts:55-57` wires the build | `:55-57` is `projects`; the build is `webServer` `:59-65` | — |
| 4 | `stage-product.spec.ts` has a two-boot run | Three boots (`:51`, `:66`, `:78`); the file is 86 lines | New products go into the existing boots; a show helper split if it passes 100 |
| 5 | `uBracket` from the ParFect stand "with a top clamp" | The ParFect stand has no clamp | The clamp is an optional part; ParFect calls `uBracket` without it, same numbers |
| 6 | Gallery on port 5182 | 5182 is lane `ui`'s port; lane `cat` owns 4181/5181 | Gallery dev server on 5181 |
| 7 | npm script `gallery:shots` in `package.json` | `package.json` is owned by lane `ui` and PR #14 is open | No npm script; run `npx playwright test -c playwright.gallery.config.ts` |
| 8 | `fixture-gallery.html` at the repo root | Root `.html` files other than `index.html` escape `check:lines` | Page goes to `src/render/fixtures/gallery/gallery.html` (lane `cat` path, line-checked); dev URL `/src/render/fixtures/gallery/gallery.html` |
| 9 | `baseSheets.ts` in `src/domain/fixtureProducts/` | Only tests read it (rule T21: no production symbol for a test) | `tests/unit/domain/fixtureProducts/baseSheets.ts` |
| 10 | Not in the draft | `catalogueRules.test.ts:79-86` destructures mover fields with no narrowing; it fails typecheck once `ProductBody` is a union | Narrow on `family`; move it to the new `catalogueBodies.test.ts` |
| 11 | Not in the draft | `MOVER_FACE_PAINTERS` is `satisfies Record<MoverBody['face'], ...>` (`familyModels.ts:25-28`); an object face `{ cells }` cannot be a key | A `moverFacePainter(face)` function with an exhaustive branch |
| 12 | Not in the draft | `moverProfile.ts:17` `VENT` is MegaPointe fractions | `VENT` moves into the `megapointe` reference set |
| 13 | Not in the draft | `lazyProducts.test.ts` is 99 lines and `:85` reads Robe-mover child order | The `it.each` uses a family-neutral helper `productVisual.ts` (lens map by traversal) |
| 14 | Not in the draft | `FixtureModels.ts:49` passes only `{ robe }`; the base cache is `:29` | `FamilyShared` gains `robeBase`; `:49` passes `{ robe, robeBase }` |
| 15 | Not in the draft | `catalogueRules.test.ts` is 87 lines | Split: ids and base rules stay; body, dimension and channel-order rules go to `catalogueBodies.test.ts` |
| 16 | "sphere-to-sphere" power for every base | MegaPointe (base `beam`) publishes 20,375 lm "fixture total", method not stated; Pointe 9,870 also not stated | Rule amended (see Optics) |
| 17 | ParFect 150 as one sheet | Four variants (RGBA, RGBW, FWQ RGBA/RGBW) with the same size and zoom | Size rule needs only the size; cite RGBA record 689 and the variants page |
| 18 | Emitter layouts 3+9, 1+6, 1+6+12+18 | Not stated in Robe text; only UM drawings (images) | Step 0b checks the drawings; fallback below |
| 19 | `robe.ts` header cites FORTE FS (record 4251) | Same numbers, but the base copies plain FORTE (record 4220) | Cite record 4220 in the moved header |
| 20 | TetraX on `wash`: pool, key light, type group | Also `autoSlots.ts:56` (tower washes -> `towW`) and `mvrFirstLook.ts:19` (`LOOK_TYPES`) | Listed under Risks; accepted with O3 |

## Data-sheet records (verified in this plan phase)

Base records (robe.cz page and PDF, same numbers in both):

| Base type | Robe fixture | H x W x D mm | Largest | Lumen | URL |
|---|---|---|---|---|---|
| `spot` | FORTE (4220) | 843 x 483.5 x 335 | 843 | 50,000 sphere (TE HP) | https://www.robe.cz/forte, https://cdn.aws.robe.cz/print/en_product_4220.pdf |
| `beam` | MegaPointe (635) | 640 x 396 x 230 | 640 | 20,375 "fixture total", method not stated | https://www.robe.cz/megapointe, https://cdn.aws.robe.cz/print/en_product_635.pdf |
| `wash` | Spiider (667) | 477 x 390 x 252 | 477 | 13,700 sphere | https://www.robe.cz/spiider, https://cdn.aws.robe.cz/print/en_product_667.pdf |
| `par` | ParFect 150 RGBA (689) | 192 x 240 x 392 (498 with hanging bracket) | 498 | not used (no PATT lumen) | https://www.robe.cz/parfect-150-rgba, https://www.robe.cz/products/parfect-150 |

Product rows (ids frozen; show format, never renamed after merge). Order = source plan list = `PRODUCT_IDS` order.

| id | base | category | body | zr | lumen | H x W x D | target span m | flags |
|---|---|---|---|---|---|---|---|---|
| robe-iforte | spot | spot | mover forte, rings | 5-55 | 50,000 | 837 x 480 x 335 | 1.336 | |
| robe-esprite | spot | spot | mover forte, rings (C1 row + `ref`, `dimensions`) | 5.5-50 | 34,000 | 733 x 443 x 264 | 1.171 (pinned) | |
| robe-painte | spot | spot | mover forte, rings | 8-48 | 15,200 | 619 x 367 x 219 | 0.988 | |
| robe-t1-profile | spot | spot | mover forte, rings | 7-49 | 12,600 | 726 x 400 x 258 | 1.159 | |
| robe-t2-profile | spot | spot | mover forte, rings | 5-55 | 22,000 | 802 x 483 x 335 | 1.281 | |
| robe-pointe | beam | hybrid | mover megapointe, hotspot, vents | 2.5-20 | 9,870 beam mode | 575 x 365 x 250 | 0.845 | discontinued |
| robe-gigapointe | beam | hybrid | mover megapointe, hotspot, vents | 1.8-42 | 23,400 | 671 x 403 x 257 | 0.986 | |
| robe-ibolt | beam | beam | mover megapointe, hotspot | 0.4-8.5 | 26,800 | 830 x 542 x 392 | 1.219 | soft-edge 16° unmodelled |
| robe-ledbeam-150 | wash | wash | mover spiider, cells (7) | 3.8-60 | 3,550 | 337 x 244 x 149 | 0.751 | |
| robe-ledbeam-350 | wash | wash | mover spiider, cells (12) | 3.8-60 | 8,200 | 426 x 320 x 220 | 0.949 | |
| robe-tarrantula | wash | wash | mover spiider, cells (37) | 4-50 | 25,200 | 587 x 508 x 257 | 1.308 | |
| robe-spikie | beam | beam | mover megapointe, hotspot | 4-28, z0 4 | 1,150 | 408 x 277 x 147 | 0.599 | discontinued; attrs without gobo/grot |
| robe-tetrax | wash | bar | tiltBar (9 cells) | 4-45 | 5,300 | 368 x 512 x 205 | 1.141 | single cell / approximate |
| robe-patt-2013 | par | par | yokedCan dish, lamp | 22 (base, flagged) | none | 691 x 695 x 324 | 0.855 | attrs `['dim']`, 3,050 K defColor, "beam angle not published, approximate" |
| robe-onepatt | par | par | yokedCan dish, dome | 58 | none | 321 x 309 x 150 | 0.395 | |

Rules (decided):

- **Size (amends ADR 0007 decision 4):** target span = `BODY_SPANS[base] x product largest dimension / base largest
  dimension`. For movers this equals the C1 height rule (Esprite unchanged). For `par`, both sides include the mount
  bracket (ParFect 498). `size` is tuned until the built hung span is within 2 % of the target; then `span` and
  `mountHeight` are pinned to the millimetre (`productSpans.test.ts`, generic over `PRODUCT_IDS`).
- **Power (amends the ADR optics table):** `base.power x product lumen / base lumen`, same measure where both sheets
  state one; where a sheet states no method (MegaPointe, Pointe), the published totals are used and the row comment
  says so. No published lumen (PATT 2013, onePATT): base `power`, with a comment.
- **Two-mode heads:** `zr` spans both modes (beam-mode min to spot-mode max). `z0` stays the base's when inside `zr`,
  else the nearest end.
- **Emitter layouts (Step 0b):** the implementer renders the UM pixel-order pages (Tarrantula UM p15, TetraX UM p14)
  with `pdftoppm` and looks at the robe.cz photos of the LEDBeam 150/350. Each row comment names the drawing or photo.
  A layout no Robe image confirms uses the count with hexagonal packing and adds "cell layout approximate" to
  `unmodelled`.
- `discontinued: true` only on Pointe and Spikie (robe-1.md:164,169; robe-2.md:118).

## Contract additions (lane `ui` reads them; told in the PR)

```ts
// src/domain/fixtureProducts/FixtureProduct.ts
export interface FixtureProduct {
  // ...C1 fields unchanged...
  /** Data-sheet size in millimetres (height, width, depth, as the sheet states them); feeds the size rule. */
  readonly dimensions: { readonly h: number; readonly w: number; readonly d: number };
  /** Set only when Robe lists the product as discontinued; the library card shows a badge. */
  readonly discontinued?: true;
}
export type ProductBody = MoverBody | TiltBarBody | YokedCanBody; // C3 adds panel | tube
// MoverBody gains `ref: 'forte' | 'megapointe' | 'spiider'` (required) and
// `face: 'rings' | 'hotspot' | { readonly cells: readonly number[] }`.
```

`ProductId` grows to the 15 ids above. Nothing else of the C1 contract changes. The body interfaces move to
`src/domain/fixtureProducts/bodies/` and are re-exported from `FixtureProduct.ts`, so import paths for lane `ui` do
not change.

## Approach

### Domain (`src/domain/fixtureProducts/`)

- `bodies/moverBody.ts`, `bodies/tiltBarBody.ts`, `bodies/yokedCanBody.ts`: types only (rule T5). Shapes as the draft
  §4a-4c (`TiltBarBody { family, size, ax, head {w,h,d}, cells {count, groups}, lens {w,h,off} }`,
  `YokedCanBody { family, size, shell: 'dish', rim {r, depth}, centre: 'lamp' | 'dome', yoke {halfWidth, height},
  lens {r, off} }`). Every body keeps `size` (`fixtureTypeOf.ts:45` reads it).
- `FixtureProduct.ts`: the union, `dimensions`, `discontinued?`.
- Data files, each < 100 lines, rows with their data-sheet comment and `dataSheet` URL:
  `robe/robeSpots.ts` (iFORTE, Esprite moved unchanged + `ref`/`dimensions`, Painte), `robe/robeProfiles.ts` (T1,
  T2), `robe/robeBeams.ts` (Pointe, GigaPointe, iBolt), `robe/robeLedHeads.ts` (LEDBeam 150, 350, Tarrantula),
  `robe/robeEffects.ts` (Spikie, TetraX), `robe/robeRetro.ts` (PATT 2013, onePATT). `robe.ts` stays the joiner in
  catalogue order with `satisfies`; `index.ts` does not change.

### Render (`src/render/fixtures/families/`, `models/`)

- `familyModels.ts`: dispatcher only (switch over three families). `moverBuilder` moves to `moverFamily.ts`.
  `FamilyShared` gains `robeBase`; `FixtureModels.ts:49` passes it.
- Mover extension: `moverReferences.ts` (per `ref`: barrel and bezel profiles, lathe segments, reference
  `r/rear/front`, rib/groove radius, MegaPointe inner wall and `VENT`); `moverProfile.ts` scales the chosen
  reference; `moverFaces.ts` `moverFacePainter(face)`; `cellFaces.ts` `concentricCells(counts)` (lazy, via
  `LazyLensTextures`). `megapointeHead.ts` and `spiiderHead.ts` export their lathe point lists as constants with the
  same numbers (C1 FORTE precedent); the native heads read the constants.
- `tiltBarFamily.ts` + `tiltBarParts.ts` + `barFaces.ts` (`cellRow(count, groups)`, 256x32): Robe base from
  `robeBase`, `robeYokeGeometry(prims, ax)` at the 0.66 drop, head box with rear fins, end caps, front bezel frame and
  cell dividers (Tetra2 trim pattern), `addFlatLens`, `addRobePanel`; returns `joints: { yoke, tiltG }`. `syncPose`
  pans the yoke for a `wash` base with no family code.
- `yokedCanFamily.ts` + `dishProfile.ts` + `reflectorFace.ts`: `staticMount(c)`; stand in `st` from
  `models/uBracket.ts` `uBracket(prims, { halfWidth, height, clamp? })`; head in `aim`: parabolic outer shell (8-point
  lathe, `bodyMat`), rolled rim (trim), inner reflector wall listed rear to front (`alu`), `lamp` cylinder or `dome`
  hemisphere; `addRoundLens` with the lazy `reflectorFace(centre)`. `parfectModel.ts` calls `uBracket` with its
  current numbers (own commit; `fixtureParity` and `fixtureScene` prove no change). No new material.
- Not in C2: `tiltBar` `mount: 'ends'` and `yokedCan` `shell: 'can'` (no C2 product; they come with their first C3
  product).

### Owner close-up gallery (dev only, nothing shipped)

- `src/render/fixtures/gallery/gallery.html`, `galleryMain.ts`, `GalleryScene.ts`, `galleryControls.ts`: own small
  scene (ModelPrimitives, materials, `createFixtureModels`, `FixtureVisualBuilder`, OrbitControls, neutral lights,
  floor). Query `?family=<f>&id=<product>` shows the product next to its native base, hung and on the floor; pan/tilt
  sliders set `joints` directly; lens off/lit. No `src/app`, `main.ts` or `index.html` change; `vite build` keeps
  building `index.html` only, so the service worker manifest does not change.
- `playwright.gallery.config.ts` (testDir `tests/gallery`, webServer `npx vite --host 127.0.0.1 --port 5181
  --strictPort`, the main config's SwiftShader flags) and `tests/gallery/productGallery.spec.ts`. It writes
  `test-results/product-gallery/<family>/<id>-{front34,side,below,floor}-{off,lit}.png`. Not part of `test:e2e`, not
  baselines, not committed. Copies go to `~/.local/state/autopilot/sb-dnd/evidence/c2/<gate>/`.
- Lane `ui` Phase 6 (`scripts/renderFixtureThumbs.ts`) can reuse the page; told in the PR.

## Gate sequence

| Step | Work | Gate | Starts when |
|---|---|---|---|
| 0 | Branch; Step 0b emitter drawings; domain types + contract fields + Esprite move; test refactors (catalogue split, `lazyProducts` it.each, `baseSheets.ts`, size and proportion tests on the Esprite); dispatcher refactor; gallery page + config | — | Now |
| G0 | Gallery shots: Esprite vs native FORTE (spot); measured Esprite W/H ratio reported | **G0** | Step 0 done |
| 1 | `tiltBar` + TetraX row; shots with pan and tilt | **G2** | Step 0 done (parallel with G0 wait) |
| 2 | `uBracket` refactor, `yokedCan` + onePATT row; shots | **G3** | Step 0 done (parallel) |
| 3 | Mover extension + pilots Pointe (`megapointe`) and LEDBeam 150 (`spiider`, cells); shots | **G1** | G0 approved |
| 4 | Mover batch: iFORTE, Painte, T1, T2, GigaPointe, iBolt, LEDBeam 350, Tarrantula, Spikie; pins and proportions | — | G1 approved |
| 5 | PATT 2013 | — | G3 approved |
| 6 | ADR 0007 amendment, ARCHITECTURE recipe, plan file final, full verification, PR | — | Steps 4 and 5 done |

At each gate the implementer commits, copies the shots to the evidence folder and stops with the line
`HERD-GATE: <G0|G1|G2|G3> <evidence folder>` (or the marker the orchestrator names). Work after a gate starts only
when the orchestrator says the owner approved it. Owner feedback on a family goes back to that family's implementer.

## Tests (each new test shown red once in a scratch copy; the PR body names the broken line, rule T3)

- `catalogueRules.test.ts`: the literal ordered list of the 15 ids replaces `['robe-esprite']` (show-format freeze).
- `catalogueBodies.test.ts` (new): per product, the body family fits the base motion (`yokedCan` needs `!moving`;
  bug: `staticMount` throws at render); `optics.attrs` keeps base channel order (bug: reordered channels); `dimensions`
  positive; `discontinued` only on the listed ids; mover body sanity narrowed on `family` (moved from `:79-86`).
- `fixtureTypeOf.test.ts`: one more exact merged record with an attrs override (PATT 2013).
- `productSizes.test.ts` (new): pinned `span` within 2 % of the size-rule target from `baseSheets.ts` (bug: a size
  tuned by eye or a wrong base sheet).
- `productProportions.test.ts` (new): built hung box W/H within 10 % of the data-sheet W/H, axes mapped once in the
  file (bug: right span, wrong silhouette). The Esprite is measured first; if it is outside 10 %, the measured value
  goes to G0 and the orchestrator sets the tolerance before Step 3.
- `lazyProducts.test.ts`: "first fixture only", geometry reuse and shared lens become `it.each` over the first product
  of each family, derived from `PRODUCTS`, through `productVisual.ts` (family-neutral lens lookup); boot-key tests
  stay; file stays < 100.
- `families/tiltBar.test.ts`: TetraX builds a light with joints and a flat lens of the body's aspect; after `syncPose`
  with pan 30 the yoke turns on the `wash` base.
- `families/yokedCan.test.ts`: onePATT builds a static visual (`joints === null`), head under `aim`, stand under
  `st`, the stand flips on the floor.
- `families/mover.test.ts`: `ref` changes the barrel lathe; a `cells` face paints `sum(counts)` cells (stub canvas).
- `stageField.product.test.ts`: `it.each` over Esprite (floor), TetraX (hung), onePATT (floor).
- `productRoundTrip.test.ts`: a hung and a floor onePATT (static product, different hang and floor mount heights).
- `tests/e2e/stage-product.spec.ts`: TetraX and onePATT appended in the existing boots (no extra boot); if the file
  passes 100 lines, the show builder moves to a helper next to it.
- Unchanged and green: `fixtureParity`, `fixtureScene` (`byModel.size === 9`), `bodySpans`, `mountHeights`,
  `productSpans`, `productRebuild`, `sultansPoolParity`, `golden-serialize`, `determinism` (`random-calls.json`), the 9
  `@screenshot` baselines.

## Verification (end to end; client only, no server change)

1. `npm run typecheck`, `npm run lint`, `npm test`.
2. `BASE_URL=http://127.0.0.1:4181/ WEB_SERVER_CMD="npm run build && npm run preview -- --host 127.0.0.1 --port 4181
   --strictPort" npm run test:e2e` (production build preview; includes the 9 `@screenshot` baselines on macOS).
3. `git diff main -- tests/golden tests/e2e/__screenshots__` is empty.
4. Gallery: `npx playwright test -c playwright.gallery.config.ts` (vite dev server on 5181) for every gate and for
   the final set of 15 products; shots attached to the PR.
5. Manual in the real app: `npx vite --port 5181 --strictPort`, load a show with one product per family (the e2e
   design in `localStorage['lumadesk-show-v6']`), check pan/tilt of the TetraX, the static onePATT, and a save and
   reload; screenshots to the evidence folder.
6. PR body: per-row data-sheet citations with the numbers used, the size and power ratios, the gate approvals, what
   was verified and what was not (P4).

## Team (Fable Team Manager, Large; Opus for families, architecture and scoped TS; Sonnet for scans and test runs)

- Implementer A (Opus): Step 0 domain (bodies, contract, Esprite move, data files, domain tests, `baseSheets`, size
  and proportion tests), then Step 6 docs.
- Implementer B (Opus): Step 0 render (dispatcher, `robeBase`, gallery, `lazyProducts`, `productVisual`), then Steps
  3-4 (mover extension, all mover rows and their pins).
- Implementer C (Opus): Step 1 (`tiltBar`, TetraX row in `robeEffects.ts`, its tests).
- Implementer D (Opus): Steps 2 and 5 (`uBracket`, `yokedCan`, `robeRetro.ts`, their tests).
- Each writer in its own sub-worktree; at most 3 write at once. A and B merge first; C and D branch from that. The
  few shared lines (union in `FixtureProduct.ts`, `switch` in `familyModels.ts`, id list, `robe.ts` joiner) are
  merged by Fable. Then `reviewer` and `qa` (Opus) in parallel, fix implementer as needed, `auditor` on the whole
  change. Gallery and e2e runs by Sonnet; at most 2 browser-heavy agents at once.

## Alternatives rejected

- TetraX on `bar` (loses its real 540° pan), on `spot` (claims gobos), dropped (owner listed it).
- A new `FixtureTypeId` for a pan-capable bar (changes `TYPES` and the goldens; ADR 0007).
- One native-style model file per product (against the 6-12-line rows; copies geometry).
- Generalising the native `spiider` painter for cell faces (risks baseline pixels).
- A `__desk.lookAt` test hook for close-ups (touches `src/app`, `main.ts` and the production build).
- A committed "gallery show" JSON (hung fixtures at 6 m are hard to frame; no repeatable shots).
- `tiltBar` 'ends' and `yokedCan` 'can' now (no C2 product).
- Committed gallery PNGs (size; not parity proof).
- A dealer-hosted PATT 2013 beam angle (owner decision O2: manufacturer sources only).
- `baseSheets.ts` in `src/` (only tests read it, rule T21).
- An npm script for the gallery (`package.json` belongs to lane `ui` while PR #14 is open).

## Risks

- R1. An eager painter or material moves `random-calls.json`; guarded by the derived `lazyProducts` cases.
- R2. Small heads fail the proportion test because the Robe base and the yoke drop are fixed. Fix: a `drop`
  parameter in `robeYokeGeometry` with today's default (native-file edit, own commit, parity tests prove it).
- R3. Product ids freeze at merge; the 15 ids above are final.
- R4. TetraX on `wash` joins the "Wash" type group, the wash pool (x1.4), the soft key light, the `towW` auto slot
  (`autoSlots.ts:56`) and the MVR first look (`mvrFirstLook.ts:19`). Accepted by the owner (O3).
- R5. Beam power ratios mix measures for GigaPointe and iBolt (sphere) against MegaPointe (method not stated); the
  rows say so.
- R6. Owner gates can stall the branch; Steps 1-2 run during the G0 wait to use the time.

## Merge order

C1 is merged. C2 shares no file with lane `ui`'s open PR #14 (no `src/ui`, `src/app`, `src/styles`, `package.json`
change), so the two merge in either order. Lane `ui` Phase 2 rebases on `main` after C2 to read `dimensions` and
`discontinued`. The `tests/shared/` helper move stays a follow-up after PR #14 (not in C2). C3 starts from `main`
after C2 merges.

## Open questions

Open questions: none.

## Departures during implementation

Recorded 2026-11-19. The owner approved G0-G3 on 2026-11-19; Steps 4 and 5 then added the other 10 products, so
the tree holds all 15.

- Data files: the 100-line limit moved rows. `robeSpots.ts` (iFORTE, Esprite), `robeProfiles.ts` (Painte, T1, T2),
  `robeBeams.ts` (Pointe, GigaPointe), `robeBolts.ts` (iBolt), `robeLedHeads.ts` (LEDBeam 150, 350),
  `robeTarrantula.ts` (Tarrantula), `robeEffects.ts` (Spikie, TetraX), `robeRetro.ts` (PATT 2013, onePATT). The
  joiner `robe.ts` keeps the catalogue order.
- The Tarrantula is measured head-forward for size and proportion. Its user manual (p34) draws the 587 mm height
  with the head facing front. The list of such products is `HEAD_FORWARD_SHEETS` in
  `tests/unit/domain/fixtureProducts/sheetSize.ts`; its pinned `span` stays the hung-at-rest value (1.277 m). The drum
  stays centred on the tilt axis (front 93 mm, rear 131 mm, as drawn).
- PATT 2013: the gold grille colour is in `unmodelled`, because no body field can tint the grille and C2 adds no
  material.

- TetraX draws its own base. `tiltBarParts.ts` draws a low rectangular base and a box crossbar yoke, because the
  TetraX has no round Robe base. So `FamilyShared` has no `robeBase`; it passes the model table's `product` factory
  next to `robe` instead (`FixtureModels.ts`, `familyModels.ts`).
- No `uBracket` and no ParFect refactor. The onePATT hangs in its own two-tube arch yoke (`archYoke.ts`), not in a
  U-bracket, so `parfectModel.ts` did not change.
- LEDBeam 350 cell layout: 4 inner + 8 outer cells (UM drawing), not 3 + 9. The inner 2x2 group is drawn as a ring
  of 4, and `unmodelled` says the layout is approximate.
- The iBolt body has `vents: true`, as its photos show; the table above lists no vents for it.
- The proportion test measures a static product head-forward: its head turned level to the front, as the data sheet
  draws it (`productProportions.test.ts`). A moving head is measured head vertical unless its drawing gives the
  height head-forward (the Tarrantula and sheet-pose entries).
- Sheet pose of the bases: the Spiider user manual (p34) draws the 477 mm height head-forward, so `BaseSheet` has a
  `pose` and the `wash` scale uses the native Spiider built head-forward (1.170 m, pinned by a render test), not
  `BODY_SPANS.wash` (1.063 m, hung at rest). The four `wash` products grew about 10 % (`body.size` only): LEDBeam 150
  and TetraX (approved at G1 and G2 at the smaller size), LEDBeam 350 and Tarrantula. FORTE and MegaPointe sheets
  are head vertical, so no other row moved.
- The gallery page is `src/render/fixtures/gallery/gallery.html`, with no npm script (as corrections 7 and 8 said).
  Run the shots with `npx playwright test -c playwright.gallery.config.ts`.
- `tests/e2e/stage-product.spec.ts` moved its show helper to `tests/e2e/stageProductShow.ts`.
- The mover extension pilots (Pointe, LEDBeam 150; Step 3) ran before G0 was answered. The orchestrator allowed it.
