# Phase C1: fixture product layer

Branch `feat/sb-c1-products`, base `fix/sb-recover` (Phase 0), then `main`. Phase C1 of the Stage Builder
drag-and-drop plan: the fixture product layer, the `mover` family and the pilot product Robe Esprite.

Lane `cat`, worktree `luma-desk.wt/19-11-2026-feat-sb-c1-products`, branch `feat/sb-c1-products`, base `main`
after Phase 0 (`fix/sb-recover`, 13 commits, not merged at plan time; line counts below are the Phase 0 versions).
Saved in the repo as `docs/plan/stage-builder-dnd/c1-product-layer.md` (rule P1) in the implement phase.

## Context

The source plan ("Full catalogue") keeps the 10 `FixtureTypeId`s and the 9 native 3D models untouched, so goldens and
screenshots stay byte-equal, and adds a product layer on top: a stored fixture may name a catalogue product
(`product`), whose merged type record (`base` type + optics + its own model key) lands on `Fixture.T`. Engine, render
and UI already read everything through `f.T`, so a product needs no change there. C1 builds the layer, the first
parametric body family (`mover`, reusing the Robe base, yoke and mover builder), one pilot product (Robe Esprite) and
the ADR. No product UI: the Esprite is reachable through a saved design and tests only.

Facts that shape the plan (verified in the code):

- `Fixture.T = TYPES[type]` (`src/domain/Fixture.ts:69`). `T.model` is the key into two render tables:
  `createFixtureModels` (`src/render/fixtures/FixtureModels.ts:36-46`) and `createLensTextures`
  (`LensTextures.ts:20-30`). `FixtureVisualBuilder.#modelOf` throws for a key that is not in `models`
  (`FixtureVisualBuilder.ts:76-81`); the lens lookup `deps.lensTextures[spec.model ?? '']` just gives `undefined`.
  So a product id in `model` works as soon as the model table has a lazy entry for it; no builder change is needed.
- `random-calls.json` counts every `Math.random` draw at boot (three.js `generateUUID` = 4 draws per Object3D,
  geometry, material; 8 per texture). `once()` closures and plain records cost nothing (`modelGeometry.ts:60`).
  `fixtureParity.test.ts` pins the exact object list of the built-in rig under a seeded random.
- An unknown enum value in the parser is an error that rejects the whole design (`Reader.oneOf`,
  `parseStageDesign` returns `ok: false`). The product rule must be softer by design: drop the product, keep the
  base type (forward compatibility with a newer desk's catalogue).
- Every edit op copies a fixture by spread (`copies.ts`, `mirrorGeometry.ts`, `patchedFixtures.ts`, `trussOps.ts`,
  `ledWall.ts`, `millimetres.ts`), so `product` is carried for free; only the parser, `appendFixtures`, the MVR luma
  link (`lumaData.ts` `linkOf`, `lumaStandIns.ts` `LINK_FIELDS`, `applyLumaData.ts` `relink`) and the templates
  build a fixture field by field. The MVR link was planned for Phase C5 (source plan: "MVR: `product` in the luma
  link fields"); the C1 review moved it into C1, because without it a round trip moved an Esprite by 0.103 m.
- Line budget (hard 100): Phase 0 `StageDesign.ts` 98, `addFixtures.ts` 95, `parseFixture.ts` 84,
  `FixtureModels.ts` 47, `Fixture.ts` 79, `RigBuilder.ts` 63.
- Robe Esprite numbers (Robe data sheet "Esprite", 27.11.2019, and "ESPRITE FS", 4/16/2026, pages 1, 3-5, 8;
  product page https://www.robe.cz/esprite): zoom 5.5° - 50° (ratio 9:1), output lens 150 mm, fixture output up to
  27,000 lm (goniophotometer 27,000 for the HP engine on the FS sheet), pan 540°, tilt 265°, height 733 mm (head
  vertical), width 443 mm, depth 264 mm, weight 27.8 kg (FS: 29.4 kg), 650 W white LED engine, CMY + CTO, two
  colour wheels (5 + white each), 7 rotating + 9 static gobos, animation wheel, 6-facet prism, iris, two frosts,
  framing shutters. The base type `spot` copies the Robe FORTE (843 mm high on the current Robe sheet; the
  implementer re-checks this on https://www.robe.cz/forte and cites it).

## Approach

### Domain: `src/domain/fixtureProducts/`

| File | Content |
|---|---|
| `FixtureProduct.ts` | Types only: `PRODUCT_CATEGORIES`, `ProductCategory`, `ProductOptics`, `MoverBody`, `ProductBody`, `FixtureProduct`. |
| `robe.ts` | `ROBE_PRODUCTS = { 'robe-esprite': {...} } as const satisfies Record<string, FixtureProduct>`. One product in C1. Each brand file stays under 100 lines (C2 splits Robe into `robe-movers.ts` / `robe-static.ts` when needed). |
| `index.ts` | Does work (A6): joins the brand files into `PRODUCTS`, derives `ProductId`, `PRODUCT_IDS`, `isProductId`, `productIdOf`, `productOf`. |
| `fixtureTypeOf.ts` | `fixtureTypeOf`: `TYPES[type]` (same object) for a plain fixture; for a product a merged `FixtureType`, memoised per product id in a module `Map` (the catalogue is static data, as `TYPES` is). |

Merged record: `{ ...withoutGdtf(TYPES[base]), ...optics, ...(gdtfSpec/gdtfMode when set), name:
\`${brand} ${name}\`, model: id, size: body.size }`, where `withoutGdtf` strips the base's `gdtfSpec`/`gdtfMode`
first, so the record names a GDTF only when the product sets its own. `ProductOptics` is a
`Partial<Pick<FixtureType, ...>>` that cannot name `moving`, `tiltOnly`, `shape`, `model`, `name` or `size`, so the
type system already keeps the invariants; the guard test checks them on the merged record anyway (it guards a future
widening of `ProductOptics`).

Optics per field (pre-review L1): ADR 0007, "Optics: absolute or relative, per field", says which fields are absolute.

Drawn size convention (decision, recorded in the ADR): a product is drawn at the desk's scale relative to its base
model, not at real metres: `body.size = TYPES[base].size * (product height / base product height)` from the two
data sheets (Esprite 733 mm / FORTE 843 mm => `0.72 * 0.870 = 0.626`, re-computed by the implementer from the cited
sheets). Reason: the 9 native models are drawn about 1.7x real size (spot span 1.346 m for a 0.84 m fixture) and
cannot change (parity); a real-size Esprite next to them would look like a toy. `span` and `mountHeight` are the
drawn values, measured from the built model and pinned by a test, exactly as `BODY_SPANS` and `MOUNT_HEIGHTS`.

### Stored design and parser

- `src/domain/stage/StageDesign.ts`: `readonly product?: ProductId;` with a one-line TSDoc, after `mount`, and an
  `import type { ProductId } from '../fixtureProducts'`. The file is at 98 lines; with the import it reaches 101,
  so the `StageFixture` TSDoc (4 text lines, about 455 characters) is reworded into 3 lines that keep every fact
  (no type moves). Absent key when there is no product (as `rotation`, `fixed`, `pixel`, `patch`): `isSameData`
  counts keys.
- `src/domain/stage/parse/parseFixture.ts` (84 -> about 92): `const product = r.optional(o, 'product', path,
  productReader(r, fixture.type))` and a conditional spread. `productReader(r, type): FieldReader<ProductId>` returns
  the reader (a 5-parameter helper would break `max-params: 4`). `r.optional` calls it only when the key is present,
  and a reader may return `undefined` without `r.fail`, so a silent drop is possible. Rule: a non-string value is a
  parse error (`fixtures[0].product: expected a string, got 5`, through `r.str`); a string that is not a `ProductId`
  (the empty string included), or a product whose `base` differs from the stored `type`, is dropped silently and the
  base type is kept (the design loads). The stored `type` stays the v1 truth.
- `src/domain/Fixture.ts`: constructor takes `FixtureInit` (= the current `Pick` plus `product?: ProductId | undefined`)
  and sets `this.T = fixtureTypeOf({ type, product })`; the `TYPES` import goes (unused). `Fixture` stores no
  `product` field (D4: `T.model` already carries it, `type` stays the base type so every `f.type === ...` branch
  keeps working). TSDoc of `T` updated.
- `src/domain/rig/RigBuilder.ts`: `PlaceOptions.product?: ProductId | undefined`, passed through `add`.
  `row` and `RowOptions` unchanged (built-in rig).
- `src/domain/stage/deriveRig.ts`: `rig.add({ ..., product: f.product })`.
- `src/domain/stage/edit/addFixtures.ts` (95, shared with lane `ui`; minimal): `TrussBatch` and `FloorRow` extend
  `Pick<StageFixture, 'type' | 'product'>` (replacing their own `type` lines and the then-unused `FixtureTypeId`
  import), `FixtureBase` adds `'product'`, and a 4-line `unitOf({ type, product })` helper feeds `appendFixtures` so
  a batch without a product adds no `product` key. Net about +3 lines (98). Lane `ui` rebases on this; nothing else
  in the file moves.
- `src/domain/fixtureTypes/bodyScale.ts`: `Pick<StageFixture, 'id' | 'type' | 'product'>`; span stays
  `BODY_SPANS[fixture.type]`. Pre-review M1: `importedGdtfInfo` returns `undefined` for a fixture with a product (the
  imported facts describe the file's product), so a product always scales 1 and the export and the Sheet name the
  base type's GDTF (ADR 0007, Consequences).
- `src/mvr/design/mountHeight.ts`: `MountPose` gains `product?: ProductId | undefined`; heights =
  `productOf(product)?.mountHeight ?? MOUNT_HEIGHTS[type]`. Callers already pass whole `StageFixture`s.
- Not in C1 (named so nobody is surprised): `deskType`/`gdtfModeOf` (C5 reads the product's `gdtfSpec`), the builder property panel
  (`ui/builder/fixtureProps.ts` shows the base type name; lane `ui` Phase 5 replaces the panels).

### Render: `src/render/fixtures/families/`

| File | Content |
|---|---|
| `familyModels.ts` | `familyModels(shared: { robe: (head: RobeHead, fs: boolean) => ModelBuilder }): FixtureModelTable` (the C1 review replaced `kit` and `robeBase` with the native `robe` factory): one entry per `PRODUCT_IDS`, built by an exhaustive `switch (body.family)` (T6; one member in C1). Each entry is a `once`-cached geometry closure; nothing three.js is created until the first fixture of that product is built. It creates the one `LazyLensTextures` and holds it in its closure: same lifetime as the kit (`createFixtureModels` runs once at boot), no change to `ModelKit` or the test helpers. |
| `moverFamily.ts` | `moverHead(body: MoverBody): RobeHead` (`ax`, `lensR`, `lensY`, `lensOff` and a `geometry(prims)` method from the body numbers) only; `familyModels` sets `c.lensMat.map = lens()` and then calls the native `robe(moverHead(body), false)` builder, which adds `robeYokeGeometry(prims, body.ax)` and the shared Robe base. |
| `moverProfile.ts` | The barrel lathe profile and bezel from `barrel`, `lens`, `ribs`, `vents`: the FORTE profile (`forteHead.ts`) normalised and scaled by radius and length, so a mover product keeps the realistic shape (widened body around the tilt axis, stepped bezel, rib rings, optional side vents as the MegaPointe). The profile points are `FORTE_BARREL_PROFILE` and `FORTE_BEZEL_PROFILE`, exported by `forteHead.ts` and read by both (the C1 review replaced a copy with the shared constants; the numbers did not change). Split out only if `moverFamily.ts` would pass 100 lines. |
| `LazyLensTextures.ts` | `class LazyLensTextures { get(id, painter, w?, h?): CanvasTexture }` with a private `Map`; creates on first `get`, shares after. Never disposed, as the native lens set. |

- `src/render/fixtures/LensTextures.ts`: export the existing `lensTexture` helper (no new entry in
  `createLensTextures`; the second export is noted in the PR body).
- `src/render/fixtures/FixtureModels.ts` (47 -> about 50): `return { ...natives, ...familyModels({ robe }) }`
  so the products share the one Robe base `once`. The 9 native entries are untouched; of the model files only
  `forteHead.ts` changes, to export its two lathe profiles with the same numbers (parity tests prove the geometry).
- `src/render/fixtures/fixtureBody.ts:33`: `map: lensMap` becomes a conditional spread
  (`...(lensMap === undefined ? {} : { map: lensMap })`), because three 0.160 `Material.setValues` warns on
  `map: undefined` for every product fixture. Natives keep the same objects in the same order, so `random-calls`
  and `fixture-scene` stay byte-equal.
- `FixtureVisualBuilder`, `createModelMaterials`: untouched. The lens face painter for the Esprite is
  `MOVER_LENS_FACES.forte` (`face: 'rings'`); `'hotspot'` maps to `.megapointe` for C2.
- Esprite body (model units, FORTE head as the reference, lens 150/180 of the FORTE's): `ax 0.43`, `barrel` with the
  FORTE radii, `lens.r = 0.235 * 150 / 180`, `ribs` as FORTE, no vents, `face: 'rings'`. The implementer tunes the
  numbers until the built hung model measures a span of `1.346 * 733 / 843` m (about 1.170 m) within 2 %, then pins
  the measured `span` and `mountHeight` to the millimetre.

### Docs

- `docs/adr/0007-fixture-product-layer.md` (0006 is Phase 1's Web Awesome ADR; if Phase 1 has not landed 0006 on
  main at merge time, renumber to 0006). Sections per D10: Context, Decision
  (product layer over fixed types; `product` optional and droppable; `T.model = product id`; lazy creation rule;
  drawn-size convention; product ids are show format and never renamed), Alternatives rejected (new `FixtureTypeId`
  per product: changes `TYPES` iteration, goldens and groups; `product` on `Fixture` as a second type key: every
  `f.type` branch would need a second check; eager product textures in `createLensTextures`: breaks
  `random-calls.json` and `fixture-scene.json`; real-metre size: toy next to the 1.7x natives; a parse error for an
  unknown product: a newer desk's design would not load), Consequences, Verified.
- `docs/ARCHITECTURE.md` "Extending > A fixture type": add "A fixture product" (brand file entry, body family,
  data sheet, the three tests) and fix the sentence that registers a new model's lens in `createLensTextures`
  (true for native types only).
- `docs/plan/stage-builder-dnd/c1-product-layer.md`: this plan (P1).

### Alternatives rejected

- A resolver object instead of a spread table (`models.builderOf(id)`): changes `FixtureVisualDeps` and four test
  helpers for no gain; the spread keeps the builder untouched.
- A module-level lens cache in the family: global state across test files; the kit-owned class is the pattern of
  `createLensTextures`.
- `product?: string` on `StageFixture` (the source plan's wording): a literal union `ProductId` makes a bad id a
  type error in every edit op and test; the parser narrows at the storage boundary, so nothing is lost.
- A product field on `Fixture`: stores the same fact twice (`T.model`).
- Moving `isSameSpot` or the lane search out of `addFixtures.ts` to make room: a refactor of a file lane `ui`
  edits in Phases 2-4; the 4-line helper fits.

## Contract (for lane `ui`, Phase 2 library)

```ts
// src/domain/fixtureProducts/FixtureProduct.ts
export const PRODUCT_CATEGORIES = ['spot', 'beam', 'wash', 'hybrid', 'bar', 'par', 'strobe', 'blinder', 'profile', 'tube'] as const;
export type ProductCategory = (typeof PRODUCT_CATEGORIES)[number];
/** Optical overrides; it cannot name moving, tiltOnly, shape, model, name or size, so a product keeps its base's. */
export type ProductOptics = Partial<Pick<FixtureType, 'attrs' | 'zr' | 'z0' | 'power' | 'beamK' | 'soft' | 'glowK' | 'defColor'>>;
export interface MoverBody {
  readonly family: 'mover';
  /** Metres per model unit (`FixtureType.size`). */
  readonly size: number;
  /** Yoke arm offset from the pan axis, model units. */
  readonly ax: number;
  /** Barrel radius at the tilt axis; y of the rear cap and of the lens face (negative = towards the lens). */
  readonly barrel: { readonly r: number; readonly rear: number; readonly front: number };
  /** Lens radius, y of its face, and the group-origin-to-lens-face offset (`BuiltModel.lensOff`). */
  readonly lens: { readonly r: number; readonly y: number; readonly off: number };
  /** y of each cooling rib ring; none for a smooth barrel. */
  readonly ribs?: readonly number[];
  /** Side vent grilles on the head. */
  readonly vents?: boolean;
  /** Lens face painter: 'rings' (one front lens over zoom optics), 'hotspot' (short-arc beam). */
  readonly face: 'rings' | 'hotspot';
}
export type ProductBody = MoverBody; // C2 adds tiltBar | yokedCan, C3 panel | tube
export interface FixtureProduct {
  readonly id: string; // equals its key in PRODUCTS; kebab-case `<brand>-<model>`; show format, never renamed
  readonly brand: string; // 'Robe'
  readonly name: string; // 'Esprite'; the merged type's name is `${brand} ${name}`
  readonly category: ProductCategory;
  readonly base: FixtureTypeId;
  readonly optics?: ProductOptics;
  readonly gdtfSpec?: string; // `Manufacturer@Model.gdtf`, only when verified (C5 reads it)
  readonly gdtfMode?: string;
  readonly body: ProductBody;
  /** Drawn hung span in metres (largest dimension), pinned against the built model as BODY_SPANS. */
  readonly span: number;
  /** Drawn mounting-point distances, pinned against the built model as MOUNT_HEIGHTS. */
  readonly mountHeight: MountHeight;
  /** The manufacturer data sheet every number above was checked against (URL, title, date). */
  readonly dataSheet: string;
  /** Real features the desk does not model, for the library card ("single cell / approximate"). English. */
  readonly unmodelled: readonly string[];
}

// src/domain/fixtureProducts/index.ts
export const PRODUCTS = { ...ROBE_PRODUCTS } as const satisfies Record<string, FixtureProduct>; // no annotation: ProductId derives from it
export type ProductId = keyof typeof PRODUCTS; // 'robe-esprite' in C1; PRODUCTS[id] is a FixtureProduct
export const PRODUCT_IDS: readonly ProductId[]; // catalogue order (brand file order), the library's default order
export function isProductId(v: string): v is ProductId;
export function productIdOf(id: string, type: FixtureTypeId): ProductId | undefined;
export function productOf(id: string | undefined): FixtureProduct | undefined; // undefined for a plain fixture or an unknown id

// src/domain/fixtureProducts/fixtureTypeOf.ts
export function fixtureTypeOf(fixture: { readonly type: FixtureTypeId; readonly product?: ProductId | undefined }): FixtureType;
// TYPES[type] itself for a plain fixture; one memoised merged record per product id, with model === product id.

// src/domain/stage/StageDesign.ts
interface StageFixture { /* ...as today... */ readonly product?: ProductId; }
// The parser keeps `product` only when it is a known id whose `base` equals `type`; otherwise the key is absent.

// src/domain/stage/edit/addFixtures.ts
interface TrussBatch extends Pick<StageFixture, 'type' | 'product'> { trussId: string; count: number }
interface FloorRow extends Pick<StageFixture, 'type' | 'product'> { count: number; from: Vec3; to: Vec3 }
```

The category of the 9 native types is not part of this API: the library derives it from `TYPES` (lane `ui`).

Merge order: Phase 0 (`fix/sb-recover`) is the base; the brief's sequence puts C1 after Phases 1 and 2. C1 adds only
new files plus small edits in files lane `ui` does not own, except `addFixtures.ts` (2 interfaces, 4-line helper),
so it can also merge before Phase 2 if lane `ui` wants `PRODUCT_IDS` for the library; the orchestrator decides.

## Tests (one file per behaviour, title = behaviour sentence, exact matchers)

Domain (`tests/unit/domain/fixtureProducts/`, `tests/unit/domain/stage/`):

- `catalogueRules.test.ts` (the guard test): for every `PRODUCT_IDS` entry: `id === key` and kebab-case;
  `optics.attrs` is a subset of `TYPES[base].attrs`; merged `moving`, `tiltOnly`, `shape` equal the base's;
  `zr[0] <= z0 <= zr[1]` on the merged record; `span > 0`, `mountHeight` finite; `dataSheet` starts with `https://`;
  `id` is not a native model key (`forte`, `forteFS`, `megapointe`, `spiider`, `wtf`, `strike4`, `parfect`, `s4`,
  `tetra2`). Bug it catches: a data row that silently breaks aiming, presets or the render tables.
- `fixtureTypeOf.test.ts`: a plain fixture gives `TYPES[type]` itself (`toBe`); the Esprite gives the exact merged
  record (`toStrictEqual` of the whole object: zr `[5.5, 50]`, name `'Robe Esprite'`, model `'robe-esprite'`,
  base attrs, size from the body); two calls give the same object (memo).
- `parseProduct.test.ts`: keeps a known product; drops an unknown id with no error and no `product` key; drops a
  product whose base differs from `type`; a non-string is an error by path; a design with an Esprite round-trips
  through JSON `toStrictEqual`.
- `deriveRig.product.test.ts`: the derived `Fixture` has `T.model === 'robe-esprite'`, `type === 'spot'`, and no
  own `product` key; `has('zoom')` reads the merged attrs.
- `edit/productCarry.test.ts`: duplicate, mirror and `setFixtureProps` keep `product`; `addFixturesOnTruss` with a
  product adds fixtures that carry it; without a product the new fixtures have no `product` key.
- `tests/unit/show/stageField.product.test.ts`: a theatre design plus one Esprite survives save -> JSON -> load
  deep-equal through `stageWorld()` ("a stage with an Esprite saves and loads").
- `tests/unit/mvr/productMount.test.ts`: `mountHeight` reads the product's values; a product scales 1, also with an
  imported GDTF size. `tests/unit/domain/stage/importedGdtfInfo.product.test.ts`: a product has no imported GDTF facts.

Render (`tests/unit/render/fixtures/`):

- `families/lazyProducts.test.ts` (the lazy-creation test): `Object.keys(createLensTextures())` strictly equals
  the 9 native keys; `Object.keys(createModelMaterials(trim))` strictly equals `['trim', 'panel', 'vent', 'alu']`;
  `createFixtureModels(kit)` draws zero `Math.random` (a `vi.spyOn(Math, 'random')` installed after
  `new ModelPrimitives()` and `createModelMaterials`, restored in `afterEach`, never nested in `withSeededRandom`)
  and its keys are the 9 natives plus `PRODUCT_IDS` with no overlap; building the first Esprite draws > 0, the
  second draws fewer than the first, the third equals the second (geometry and lens texture cached); two Esprites
  share one `lensMat.map` object. Bug it catches: an eager product texture or geometry that moves
  `random-calls.json`.
- `families/mover.test.ts`: the Esprite visual is a `light` with `joints`, a head mesh, a round lens whose material
  map is a `CanvasTexture`; `lensOff` equals `body.lens.off * size`.
- `productSpans.test.ts`: measured hung span and `mountHeight.hang/floor` of every product equal the pinned values
  to the millimetre. The `builtSpan`/box helpers of `bodySpans.test.ts` and `mountHeights.test.ts` move to
  `tests/unit/render/fixtures/builtBox.ts` and both existing tests use it (S1, T12), so no second copy exists.
- Existing parity: `fixtureParity.test.ts`, `fixtureScene.test.ts` (`byModel.size === 9`), `bodySpans`,
  `mountHeights`, `sultansPoolParity` stay green unchanged.

e2e (`tests/e2e/stage-product.spec.ts`, no `@screenshot`; a spec imports nothing from `src/` but `i18n`, T21/I5):
two-boot pattern as `stage-old-show.spec.ts`: boot, `__desk.applyTemplate('theatre')`, read `desk.serialize()`,
append one Esprite (`type: 'spot'`, `product: 'robe-esprite'`, `role`, `trussId: null`, `position`, `mount: 'hang'`)
to `show.stage.fixtures`, then `bootApp(page, { show })` again. Assert: no page error; `serialize().stage.fixtures`
last entry has `product === 'robe-esprite'`; `stage().count` is the theatre count + 1; the same after
`page.reload()`. Existing `golden-serialize`, `determinism` (`random-calls`), `screenshots` (9 baselines) run
unchanged.

T3: each new test is shown red once in a scratch copy (break the guarded line) and the PR body says which line.

## Verification (end to end)

Client only; no server changes. Commands from the lane worktree, own ports (not 4950, 5173, 4173):

1. `npm run typecheck`, `npm run lint`, `npm test`.
2. `BASE_URL=http://127.0.0.1:4181/ WEB_SERVER_CMD="npm run build && npm run preview -- --host 127.0.0.1 --port 4181 --strictPort" npm run test:e2e`
   (macOS, includes the 9 `@screenshot` baselines) and `npm run test:screenshots` the same way.
3. `git diff main -- tests/golden` is empty; `tests/e2e/__screenshots__` unchanged; `random-calls.json` unchanged.
4. Manual, with evidence: `npx vite --port 5181 --strictPort`; load a show with an Esprite (paste the e2e design
   into `localStorage['lumadesk-show-v6']`), open the viewport, take close-up screenshots of the Esprite body next to
   a native Spot (FOH and side), and attach them to the PR. The 3D body must read as a Robe profile (barrel, yoke,
   base, bezel, ribs), not a box. The owner checks the family in close-up before the C2 batch (brief).
5. PR body: data sheet citations with the numbers used, the drawn-size ratio, what was verified and what was not
   (P4).

Team (Fable Team Manager, Large: multi-module): `explorer` done in this plan; `implementer` A (domain, parser, rig,
mvr, domain tests), `implementer` B (render families, render tests, ARCHITECTURE recipe), `implementer` C (ADR,
plan file, e2e spec, stageField test) with divided file ownership; then `reviewer` and `qa` in parallel; fix
`implementer` as needed; `auditor` on the whole change set.

## Open questions

Open questions: none.

## Follow-ups

- Move the test helpers that have 2+ users into `tests/shared/` (rule T12):
  `tests/unit/domain/stage/edit/sampleDesign.ts` (with `withEsprite`), and the render helpers `tests/unit/render/stubCanvasDocument.ts`,
  `tests/unit/render/fixtures/buildFixtureScene.ts` and `tests/unit/render/fixtures/builtBox.ts`. Do it once PR #13
  and PR #14 are merged and before Phase 2, because the move touches lane `ui` test files while PR #14 is open
  (review #16, #17, #18).
