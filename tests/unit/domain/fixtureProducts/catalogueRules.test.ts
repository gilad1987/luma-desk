/**
 * The guard over the product catalogue: every product row keeps the invariants aiming, presets, the parser and the
 * render tables rely on (id, kebab-case, base motion and shape, zoom range, positive span, data sheet). The body,
 * channel-order, dimension and discontinued rules are catalogueBodies.test.ts's. It does not pin the drawn span and
 * mount heights against the built model: the render lane owns that (productSpans.test.ts).
 */
import { describe, expect, it } from 'vitest';
import { fixtureTypeOf } from '../../../../src/domain/fixtureProducts/fixtureTypeOf.ts';
import { PRODUCT_CATEGORIES, type FixtureProduct } from '../../../../src/domain/fixtureProducts/FixtureProduct.ts';
import { isProductId, PRODUCT_IDS, PRODUCTS, productOf } from '../../../../src/domain/fixtureProducts/index.ts';
import type { FixtureType } from '../../../../src/domain/FixtureType.ts';
import { TYPES } from '../../../../src/domain/fixtureTypes/index.ts';

/** The model keys of the native types; a product id equal to one would replace a native model in the render table. */
const NATIVE_MODELS: readonly string[] = [
  'forte',
  'forteFS',
  'megapointe',
  'spiider',
  'wtf',
  'strike4',
  'parfect',
  's4',
  'tetra2',
];

const KEBAB_CASE = /^[a-z0-9]+(-[a-z0-9]+)*$/;

describe('product catalogue', () => {
  it('holds the listed product ids in catalogue order and knows only its own keys', () => {
    expect([PRODUCT_IDS, isProductId('robe-esprite'), isProductId('toString'), productOf(undefined)]).toStrictEqual([
      [
        'robe-iforte',
        'robe-esprite',
        'robe-painte',
        'robe-t1-profile',
        'robe-t2-profile',
        'robe-pointe',
        'robe-gigapointe',
        'robe-ibolt',
        'robe-ledbeam-150',
        'robe-ledbeam-350',
        'robe-tarrantula',
        'robe-spikie',
        'robe-tetrax',
        'robe-patt-2013',
        'robe-onepatt',
      ],
      true,
      false,
      undefined,
    ]);
  });

  it.each(PRODUCT_IDS)('stores %s under its own kebab-case id, apart from the native model keys', (id) => {
    const product: FixtureProduct = PRODUCTS[id];
    const facts = [
      product.id,
      KEBAB_CASE.test(id),
      NATIVE_MODELS.includes(id),
      PRODUCT_CATEGORIES.includes(product.category),
    ];
    expect(facts).toStrictEqual([id, true, false, true]);
  });

  it.each(PRODUCT_IDS)("keeps the motion, shape and channels of %s's base type", (id) => {
    const product: FixtureProduct = PRODUCTS[id];
    const base: FixtureType = TYPES[product.base];
    const merged = fixtureTypeOf({ type: product.base, product: id });
    const attrs = product.optics?.attrs ?? [];
    expect([attrs.every((a) => base.attrs.includes(a)), merged.moving, merged.tiltOnly, merged.shape]).toStrictEqual([
      true,
      base.moving,
      base.tiltOnly,
      base.shape,
    ]);
  });

  it.each(PRODUCT_IDS)('gives %s a default zoom inside its zoom range', (id) => {
    const { zr, z0 } = fixtureTypeOf({ type: PRODUCTS[id].base, product: id });
    expect([zr[0] <= z0, z0 <= zr[1]]).toStrictEqual([true, true]);
  });

  it.each(PRODUCT_IDS)('gives %s a positive size and span, usable mount heights and a data sheet link', (id) => {
    const { body, span, mountHeight, dataSheet }: FixtureProduct = PRODUCTS[id];
    const heights = [mountHeight.hang, mountHeight.floor];
    expect([
      body.size > 0,
      span > 0,
      heights.every((h) => Number.isFinite(h) && h >= 0),
      dataSheet.startsWith('https://'),
    ]).toStrictEqual([true, true, true, true]);
  });
});
