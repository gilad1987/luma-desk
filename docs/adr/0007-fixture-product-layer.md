# ADR 0007: Catalogue products are a layer over the fixed fixture types

- Status: Accepted
- Date: 2026-11-19
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
5. Product ids are show format. A saved design stores them, so an id is never renamed.
6. Every optical number is checked against the manufacturer data sheet, and the record names the sheet
   (`dataSheet`). Real features that the desk does not model are listed in the record (`unmodelled`).
7. Parametric body families live in `src/render/fixtures/families/`. C1 ships the `mover` family, which reuses the
   Robe base, the yoke and the mover builder of the native Robe models.

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
- Designs are forward-compatible: a desk that does not know a product loads the design with the base type.

Costs and risks:

- The MVR luma link and the GDTF identity learn `product` only in Phase C5. Until then an Esprite that is exported
  to MVR and imported again comes back as its base type (`spot`).
- The builder property panel shows the base type name until lane `ui` Phase 5 replaces the panels.
- One more table to keep honest: each product needs its data sheet, and its drawn `span` and `mountHeight` must be
  measured again when its body changes.

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
- `tests/unit/show/stageField.product.test.ts`: a stage with an Esprite saves and loads.
- `tests/unit/mvr/productMount.test.ts`: `mountHeight` and `bodyScale` read the product's values.
- `tests/unit/render/fixtures/families/lazyProducts.test.ts`: `createLensTextures` and `createModelMaterials` keep
  their native keys, `createFixtureModels` draws no `Math.random`, and the product geometry and lens are cached.
- `tests/unit/render/fixtures/families/mover.test.ts`: the Esprite visual has joints, a head and a round lens.
- `tests/unit/render/fixtures/productSpans.test.ts`: the measured `span` and `mountHeight` equal the pinned values.
- `tests/e2e/stage-product.spec.ts`: a stage with an Esprite saves and loads through the real app and a reload.
- Not verified: the MVR round trip of a product (Phase C5); the owner's close-up check of the `mover` family (before
  Phase C2).
