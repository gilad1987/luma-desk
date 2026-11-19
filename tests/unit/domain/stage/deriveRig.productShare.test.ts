/**
 * Owns the rig-level sharing of a product record: every Esprite of a rig is driven by one merged object, the native
 * `TYPES.spot` stays the same object with the same fields, and the rig keeps the design's fixture order with products
 * mixed in. The merged record's fields are owned by fixtureTypeOf.test.ts; one Esprite by deriveRig.product.test.ts.
 */
import { describe, expect, it } from 'vitest';
import { TYPES } from '../../../../src/domain/fixtureTypes/index.ts';
import { rigFromDesign } from '../../../../src/domain/stage/deriveRig.ts';
import type { StageFixture } from '../../../../src/domain/stage/StageDesign.ts';
import { PIPE, sampleDesign } from './edit/sampleDesign.ts';

/** A spot on the pipe at `x`; an Esprite when `esprite` is true. */
function spot(id: number, x: number, esprite: boolean): StageFixture {
  const plain: StageFixture = { id, type: 'spot', role: 'mid', trussId: PIPE.id, position: [x, 7, 0], mount: 'hang' };
  return esprite ? { ...plain, product: 'robe-esprite' } : plain;
}

describe('rigFromDesign with several products', () => {
  it('shares one merged record between Esprites and leaves the native spot record untouched', () => {
    const native = TYPES.spot;
    const copy = structuredClone(TYPES.spot);
    const base = sampleDesign();
    const added = [spot(501, -4, true), spot(502, -2, false), spot(503, 0, true), spot(504, 2, false)];
    const rig = rigFromDesign({ ...base, fixtures: [...base.fixtures, ...added, spot(505, 4, true)] });
    const [a, b, c] = [501, 503, 505].map((id) => rig.get(id)?.T);
    expect([a === b, b === c, a === native, rig.get(502)?.T === native, rig.get(504)?.T === native]).toStrictEqual([
      true,
      true,
      false,
      true,
      true,
    ]);
    expect([TYPES.spot === native, TYPES.spot]).toStrictEqual([true, copy]);
    expect(rig.fixtures.map((f) => f.id)).toStrictEqual([101, 102, 201, 301, 501, 502, 503, 504, 505]);
  });
});
