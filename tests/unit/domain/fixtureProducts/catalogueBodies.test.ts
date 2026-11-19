/**
 * The guard over each product's body and data-sheet facts: the body family fits the base type's motion, a mover body
 * is drawable (barrel around the tilt axis, lens and ribs inside it), an optics channel list keeps its base's order,
 * the data-sheet size is usable and only the listed ids are discontinued. Ids and base rules are
 * catalogueRules.test.ts's; the drawn span against the size rule is productSizes.test.ts's.
 */
import { describe, expect, it } from 'vitest';
import type { FixtureProduct, MoverBody, ProductBody } from '../../../../src/domain/fixtureProducts/FixtureProduct.ts';
import { PRODUCT_IDS, PRODUCTS, productOf, type ProductId } from '../../../../src/domain/fixtureProducts/index.ts';
import { TYPES } from '../../../../src/domain/fixtureTypes/index.ts';

/**
 * Whether each body family draws a moving head. A static-mount body on a moving base throws at render (`staticMount`
 * in ModelContext.ts); a new family is a type error here until it gets a row.
 */
const NEEDS_MOVING = { mover: true, tiltBar: true, yokedCan: false } as const satisfies Record<
  ProductBody['family'],
  boolean
>;

/** The ids the manufacturer lists as discontinued, in catalogue order. */
const DISCONTINUED_IDS: readonly ProductId[] = ['robe-pointe'];

/** Every mover product with its body, narrowed on the family. */
const MOVERS: { id: ProductId; body: MoverBody }[] = PRODUCT_IDS.flatMap((id) => {
  const body: ProductBody = PRODUCTS[id].body;
  return body.family === 'mover' ? [{ id, body }] : [];
});

describe('product bodies', () => {
  it.each(PRODUCT_IDS)("draws %s with a body family that fits its base type's motion", (id) => {
    const { base, body } = PRODUCTS[id];
    expect([NEEDS_MOVING[body.family]]).toStrictEqual([TYPES[base].moving]);
  });

  it.each(MOVERS)('keeps the $id lens and ribs inside its barrel, so no body is drawn inside out', ({ body }) => {
    const { barrel, lens, ribs = [] } = body;
    expect([
      barrel.front < 0 && 0 < barrel.rear,
      0 < lens.r && lens.r < barrel.r,
      ribs.every((y) => barrel.front < y && y < barrel.rear),
    ]).toStrictEqual([true, true, true]);
  });

  it.each(PRODUCT_IDS)("keeps the base type's channel order in the %s channel list", (id) => {
    const product: FixtureProduct = PRODUCTS[id];
    const attrs = product.optics?.attrs ?? [];
    expect(attrs).toStrictEqual(TYPES[product.base].attrs.filter((a) => attrs.includes(a)));
  });

  it.each(PRODUCT_IDS)('gives %s a finite, positive data-sheet height, width and depth', (id) => {
    const { h, w, d } = PRODUCTS[id].dimensions;
    expect([h, w, d].map((mm) => Number.isFinite(mm) && mm > 0)).toStrictEqual([true, true, true]);
  });

  it('flags exactly the listed ids as discontinued', () => {
    expect(PRODUCT_IDS.filter((id) => productOf(id)?.discontinued === true)).toStrictEqual(DISCONTINUED_IDS);
  });
});
