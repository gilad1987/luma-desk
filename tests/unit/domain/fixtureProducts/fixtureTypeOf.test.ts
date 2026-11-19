/**
 * Owns `fixtureTypeOf`: a plain fixture keeps its native type record by identity (the built-in rig's parity rests on
 * it), a product gets the exact merged record (with no GDTF identity of its base), and that record is made once per
 * product. The catalogue rows themselves are guarded by catalogueRules.test.ts.
 */
import { describe, expect, it } from 'vitest';
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

  it('makes the merged record of a product once and shares it', () => {
    const first = fixtureTypeOf({ type: 'spot', product: 'robe-esprite' });
    expect(fixtureTypeOf({ type: 'spot', product: 'robe-esprite' })).toBe(first);
  });
});
