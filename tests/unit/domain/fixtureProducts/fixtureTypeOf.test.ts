/**
 * Owns `fixtureTypeOf`: a plain fixture keeps its native type record by identity (the built-in rig's parity rests on
 * it), a product gets the exact merged record (with no GDTF identity of its base), and that record is made once per
 * product, and a product not of the fixture's type (another base, an unknown id) throws. The catalogue rows themselves
 * are guarded by catalogueRules.test.ts.
 */
import { describe, expect, it } from 'vitest';
import type { ProductId } from '../../../../src/domain/fixtureProducts/index.ts';
import { fixtureTypeOf } from '../../../../src/domain/fixtureProducts/fixtureTypeOf.ts';
import { TYPES } from '../../../../src/domain/fixtureTypes/index.ts';

describe('fixtureTypeOf', () => {
  it('gives a plain fixture its native type record itself', () => {
    const records = [fixtureTypeOf({ type: 'spot' }), fixtureTypeOf({ type: 'spot', product: undefined })];
    expect(records.map((record) => record === TYPES.spot)).toStrictEqual([true, true]);
  });

  it("gives the Esprite the spot record with its own optics, name, model key and size, and not the FORTE's GDTF", () => {
    expect(fixtureTypeOf({ type: 'spot', product: 'robe-esprite' })).toStrictEqual({
      name: 'Robe Esprite',
      model: 'robe-esprite',
      attrs: ['dim', 'pan', 'tilt', 'r', 'g', 'b', 'gobo', 'grot', 'zoom', 'strobe'],
      zr: [5.5, 50],
      z0: 16,
      power: 0.68,
      moving: true,
      shape: 'mh',
      size: 0.626,
    });
  });

  it("gives the PATT 2013 the par record with its own attrs and colour over the par's optics, once", () => {
    const first = fixtureTypeOf({ type: 'par', product: 'robe-patt-2013' });
    expect([first, fixtureTypeOf({ type: 'par', product: 'robe-patt-2013' }) === first]).toStrictEqual([
      {
        name: 'Robe PATT 2013',
        model: 'robe-patt-2013',
        attrs: ['dim'],
        defColor: [100, 73, 42],
        zr: [22, 22],
        z0: 22,
        power: 0.75,
        moving: false,
        shape: 'par',
        size: 0.7386,
        soft: 2.6,
      },
      true,
    ]);
  });

  it('makes the merged record of a product once and shares it', () => {
    const first = fixtureTypeOf({ type: 'spot', product: 'robe-esprite' });
    expect(fixtureTypeOf({ type: 'spot', product: 'robe-esprite' })).toBe(first);
  });

  it('throws a RangeError for a product of another base', () => {
    expect(() => fixtureTypeOf({ type: 'wash', product: 'robe-esprite' })).toThrow(
      new RangeError('fixtureTypeOf: robe-esprite is not a product of type wash'),
    );
  });

  it('throws a RangeError for a product id the catalogue does not know', () => {
    expect(() => fixtureTypeOf({ type: 'spot', product: 'acme-x' as ProductId })).toThrow(
      new RangeError('fixtureTypeOf: acme-x is not a product of type spot'),
    );
  });
});
