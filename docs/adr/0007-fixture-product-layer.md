# ADR 0007: Catalogue products are a layer over the fixed fixture types

- Status: Accepted
- Date: 2026-11-19
- Amended: 2026-11-19 (Phase C2): decisions 4, 7 and 8, the optics table, the TetraX base, Verified
- Scope: `src/domain/fixtureProducts`, `src/domain/stage`, `src/render/fixtures/families`

## Context

The desk has 10 fixed `FixtureTypeId`s and 9 native 3D models. The goldens and the screenshot baselines read them:
the order of `TYPES`, the type groups, the `Math.random` draws at boot (`random-calls.json`) and the object list of
the built-in rig (`fixture-scene.json`). A change to any of them changes the parity proof. The full fixture
catalogue needs many more products (Robe, Martin, Clay Paky, ...), each with its own optics and body. So the desk
needs a way to add a product without a new type, without a change to the engine, render or UI, and without a single
new object at boot.

## Decision

1. A product layer over the fixed types. A `FixtureProduct` (`src/domain/fixtureProducts/`) names a `base` type, its
   optical overrides and a body. `fixtureTypeOf` merges the base type and the optics into one `FixtureType`,
   memoised per product id, and the `Fixture` gets it as `Fixture.T`. `T.model` is the product id, so the render
   finds the product's model in the model table and the builder dispatches without a change.
2. `StageFixture.product?` is optional and v1-compatible. The parser keeps a known product whose `base` equals the
   stored `type`. It drops any other product silently (an unknown id, the empty string, a base that differs) and
   the design loads. The stored `type` is the truth; a non-string `product` is a parse error.
3. Lazy creation (binding). Nothing for a product is created at boot. The family geometry and the product lens
   textures are `once`-cached or lazy and are made when the first fixture of the product is built. A product is
   never added to `createLensTextures` or `createModelMaterials`. The `lazyProducts` test guards this rule.
4. Drawn-size convention. A product is drawn at the desk's scale relative to its base model, not at real metres:
   `size = base size * product height / base product height`, with the two heights from the manufacturer data
   sheets (Robe Esprite: `0.72 * 733 / 843 = 0.626`). `span` and `mountHeight` are the drawn values, measured from
   the built model and pinned by tests, as `BODY_SPANS` and `MOUNT_HEIGHTS` are.

   Amended 2026-11-19 (Phase C2). The rule now works on the span, on any axis: the target hung span is
   `BODY_SPANS[base] * product largest data-sheet dimension / base product largest dimension`, and the pinned `span`
   is within 2 % of it (`productSizes.test.ts`). The base records are in
   `tests/unit/domain/fixtureProducts/baseSheets.ts`: FORTE 843 mm, MegaPointe 640 mm, Spiider 477 mm, ParFect 150
   498 mm with its hanging bracket. For a mover the largest dimension is the height, so the rule gives the C1 height
   rule and the Esprite does not change. Known limit: when the largest drawn axis is not the largest sheet dimension,
   the body is up to about 4 % off strict scale. The onePATT is the case: its largest drawn axis is the 309 mm width
   across the knobs, but its largest sheet dimension is the 321 mm height with the arch.

   Proportion rule (Phase C2): the built hung box width / height is within 10 % of the sheet's width / height
   (`productProportions.test.ts`). A moving head is measured hung at rest. A static product is measured with its head
   turned level to the front (head-forward). Both are measured as their data sheets draw them.

5. Product ids are show format. A saved design stores them, so an id is never renamed.
6. Every optical number is checked against the manufacturer data sheet, and the record names the sheet
   (`dataSheet`). Real features that the desk does not model are listed in the record (`unmodelled`). A product
   without a verified GDTF name has none in its merged record, so C5 falls back to the base type's for export.
7. Parametric body families live in `src/render/fixtures/families/`. C1 ships the `mover` family, which reuses the
   Robe base, the yoke and the mover builder of the native Robe models.

   Amended 2026-11-19 (Phase C2). C2 adds two families and extends the mover:

   - `mover` gains `ref` (`'forte' | 'megapointe' | 'spiider'`): the native head whose lathe it scales. The
     MegaPointe and Spiider heads export their lathe point lists as named constants with the same numbers, as the
     FORTE head did in C1. The face gains `{ cells }`: one round lens per LED cell, the count of each ring, centre
     first.
   - `tiltBar` (TetraX) draws its own low rectangular base and box crossbar yoke, because the TetraX has no round Robe
     base.
   - `yokedCan` (onePATT) is static (`staticMount`) and draws its own two-tube arch yoke (`archYoke.ts`), not the
     ParFect U-bracket. So no native model changed for it.
   - `FamilyShared` passes the model table's `robe` and `product` factories. Both cache the geometry `once`, so
     nothing is created at boot.

8. Contract additions (Phase C2, lane `ui` reads them): `FixtureProduct.dimensions` is the data-sheet size in
   millimetres (`h`, `w`, `d`, as the sheet states them), and `discontinued?: true` marks a product that the
   manufacturer lists as discontinued.

### Optics: absolute or relative, per field

A product shows its real data-sheet values where the desk can show them (the honesty rule), and stays relative to
its base where the desk tuned the natives by eye. So the Esprite's `zr` is its real [5.5, 50], while the base `spot`
keeps its desk mapping [7, 42] for the FORTE's real 5-55°.

| Field                    | Kind     | Why                                                                                                                           |
| ------------------------ | -------- | ----------------------------------------------------------------------------------------------------------------------------- |
| `zr`, `z0`               | Absolute | Degrees from the sheet; `z0` lies in `zr` (the `catalogueRules` test checks it).                                              |
| `attrs`                  | Absolute | The product's own set, a subset of the base's.                                                                                |
| `defColor`               | Absolute | The product's own default colour.                                                                                             |
| `power`                  | Relative | The base's `power` times the product's lumens over the base's real product (same measure); the merge replaces the base value. |
| `beamK`, `soft`, `glowK` | Relative | Desk render tunings of the base's look; C1 sets none.                                                                         |
| `body.size`              | Relative | The drawn-size convention (4): tuned until the hung span meets the size rule (C2).                                            |

Amended 2026-11-19 (Phase C2), `power`: the lumen ratio uses the same measure where both sheets state one. Where a
sheet states no method (MegaPointe 20,375 lm "fixture total", Pointe 9,870 lm), the published totals are used and
the product row says so. A product with no published lumen (onePATT; PATT 2013 in the plan) keeps the base `power`.

## Alternatives rejected

- **A new `FixtureTypeId` per product.** It changes the iteration order of `TYPES`, the goldens and the type groups.
- **A `product` key on `Fixture` next to `type`.** Every `f.type === ...` branch would need a second check, and the
  fact is stored twice: `T.model` already carries the product.
- **Eager product textures in `createLensTextures`.** Each texture draws `Math.random` at boot, so
  `random-calls.json` and `fixture-scene.json` change.
- **Real-metre size.** The native models are drawn at about 1.7x real size and cannot change (parity). A real-size
  product next to them looks like a toy.
- **A parse error for an unknown product.** A design saved by a newer desk, with a product that this desk does not
  know, would not load.
- **A resolver object for the model table** (`models.builderOf(id)`). It changes the builder deps and four test
  helpers for no gain; a spread of the family entries into the model table keeps the builder as it is.

## Consequences

Good:

- A new product needs no engine, render or UI change: one data record, and a body family that already exists.
- The goldens and the screenshot baselines stay byte-equal, because the native types, models and boot objects do
  not change.
- Designs are forward-compatible: a desk that does not know a product loads the design with the base type. Its next
  save writes the design without the product, so the product name is lost once an older desk saves the design.

Costs and risks:

- The MVR luma link carries `product` (C1), so a desk round trip keeps a product and its position. Only the GDTF
  identity of a product (its own `gdtfSpec`) waits for Phase C5; until then the export names the base type's GDTF.
- A product fixture has no imported GDTF facts (`importedGdtfInfo`), because in C1 those facts always describe the
  file's product, not the catalogue's. So `bodyScale` is 1 for it, and the export and the Sheet name the base type's
  GDTF, also when the user gives an imported fixture a product. C5 revisits this with the products' own `gdtfSpec`.
  When an imported fixture gets a product, its stored `position` (the model origin) stays; `bodyScale` goes back to 1
  and the mount height becomes the product's, so the drawn body and its clamp move relative to the pipe, as they do
  today when the user changes an imported fixture's type. The UI phase that adds this edit (lane `ui`, the library)
  decides whether to re-anchor the fixture at its mounting point.
- An MVR from a desk with a product this catalogue does not know (a newer desk) loads the fixture as its base type,
  and it lands shifted by the difference of the two mount heights (about 0.1 m for an Esprite-like product), because
  the export placed it by the product's mount height. No fix is possible without the catalogue entry.
- The builder property panel shows the base type name until lane `ui` Phase 5 replaces the panels.
- One more table to keep honest: each product needs its data sheet, and its drawn `span` and `mountHeight` must be
  measured again when its body changes.

Decided: `addFixturesOnTruss` and `addFloorRow` throw a `RangeError` on a product that is not of the batch's type
(another base or an unknown id), because that is a programming error at an edit site, while `setFixtureProps` drops
it silently through the parser, because a retype must drop a product that no longer matches. Both paths apply the
one rule `productIdOf`.

Decided 2026-11-19 (Phase C2): the TetraX uses the base `wash`, because it keeps its real 540° pan (`bar` is
tilt-only). Side effects: the TetraX joins the "Wash" type group, the wash pool (x1.4 in `poolContributions.ts`), the
soft key light (`KeyLights.ts`), the `towW` auto slot (`src/domain/stage/autoSlots.ts`) and the MVR first look
(`src/show/mvrLook/mvrFirstLook.ts`). The owner accepted them.

## Verified

- `tests/unit/domain/fixtureProducts/catalogueRules.test.ts`: every product keeps its base's `moving`, `tiltOnly`
  and `shape`, its attrs are a subset of the base's, its zoom range holds `z0`, its id is not a native model key,
  and it names a data sheet.
- `tests/unit/domain/fixtureProducts/fixtureTypeOf.test.ts`: a plain fixture gets `TYPES[type]` itself; the Esprite
  gets the exact merged record, memoised.
- `parseProduct.test.ts` (`tests/unit/domain/stage/`): a known product is kept; an unknown id or a different base is
  dropped with no error; a non-string is an error by path; a design with an Esprite round-trips through JSON.
- `deriveRig.product.test.ts` (`tests/unit/domain/stage/`): the derived fixture has `T.model === 'robe-esprite'`,
  `type === 'spot'` and no own `product` key.
- `tests/unit/domain/stage/edit/productCarry.test.ts`: the edit ops keep `product`; a batch without a product adds
  no `product` key.
- `tests/unit/show/stageField.product.test.ts`: a stage with an Esprite (floor), a TetraX (hung) or a onePATT
  (floor) saves and loads deep-equal (C2 adds the TetraX and onePATT cases).
- `tests/unit/mvr/productMount.test.ts`: `mountHeight` reads the product's values; `bodyScale` is 1 for a product,
  even with an imported GDTF size.
- `importedGdtfInfo.product.test.ts` (`tests/unit/domain/stage/`): a product fixture has no imported GDTF facts, and
  an imported spot that gets a product exports the base type's GDTF.
- `tests/unit/render/fixtures/families/lazyProducts.test.ts`: `createLensTextures` and `createModelMaterials` keep
  their native keys, `createFixtureModels` draws no `Math.random`, and the product geometry and lens are cached. In C2
  the "first fixture only", geometry reuse and shared lens cases run on the first product of each body family.
- `tests/unit/render/fixtures/families/mover.test.ts`: the Esprite visual has joints, a head and a round lens. C2
  adds: each `ref` draws its head's barrel lathe; a `cells` face paints one lens per cell; the Pointe lens sinks as
  deep, in lens radii, as the MegaPointe one; vents only when the body asks for them.
- `tests/unit/render/fixtures/families/tiltBar.test.ts` (C2): the TetraX builds a light with joints and a flat lens
  at the body lens aspect; the pose sync pans its yoke; its base stays still under a pan.
- `tests/unit/render/fixtures/families/yokedCan.test.ts` (C2): the onePATT builds a static light (no joints, head
  and lens in `aim`, arch and knobs in `st`); on the floor the stand turns over and the head keeps its pose.
- `tests/unit/domain/fixtureProducts/catalogueBodies.test.ts` (C2): each body family fits its base's motion, mover
  lens and ribs stay inside the barrel, attrs keep the base's channel order, `dimensions` are finite and positive,
  and only the listed ids are `discontinued`.
- `tests/unit/domain/fixtureProducts/productSizes.test.ts` (C2): every pinned `span` is within 2 % of the size-rule
  target (decision 4).
- `tests/unit/render/fixtures/productProportions.test.ts` (C2): every built hung body is within 10 % of its
  data-sheet width / height (decision 4).
- `tests/unit/render/fixtures/productSpans.test.ts`: the measured `span` and `mountHeight` equal the pinned values.
- `tests/unit/mvr/productRoundTrip.test.ts`: a hung and a floor Esprite, and (C2) a hung and a floor onePATT, come
  back from a desk MVR export with their product and their position (within 1e-6 m); a link with an unknown product
  comes back as a plain `spot`.
- `tests/e2e/stage-product.spec.ts`: a stage with an Esprite, a TetraX and a onePATT (C2) saves and loads through
  the real app and a reload. The show helper is in `tests/e2e/stageProductShow.ts`.
- Not verified: the GDTF identity of a product (Phase C5).
- Owner close-up gates G0-G3, checked in the dev gallery (`src/render/fixtures/gallery/`,
  `npx playwright test -c playwright.gallery.config.ts`): `G0: pending`, `G1: pending`, `G2: pending`,
  `G3: pending`.
