/**
 * Owns the product side of `rigFromDesign`: a stored product reaches the rig fixture as its merged type record, the
 * fixture keeps its base `type` and stores no product of its own, and a plain fixture keeps the native record. The
 * merged record's fields are owned by fixtureTypeOf.test.ts.
 */
import { describe, expect, it } from 'vitest';
import { TYPES } from '../../../../src/domain/fixtureTypes/index.ts';
import { rigFromDesign } from '../../../../src/domain/stage/deriveRig.ts';
import { sampleDesign } from './edit/sampleDesign.ts';

describe('rigFromDesign with a product', () => {
  it('drives an Esprite with its merged record and keeps a plain spot on the native one', () => {
    const base = sampleDesign();
    const design = {
      ...base,
      fixtures: [
        ...base.fixtures,
        { id: 401, type: 'spot', role: 'mid', trussId: 'pipe-1', position: [0, 7, 0], mount: 'hang' } as const,
        {
          id: 402,
          type: 'spot',
          role: 'mid',
          trussId: 'pipe-1',
          position: [1, 7, 0],
          mount: 'hang',
          product: 'robe-esprite',
        } as const,
      ],
    };
    const rig = rigFromDesign(design);
    const esprite = rig.get(402);
    expect([
      esprite?.T.model,
      esprite?.T.name,
      esprite?.T.zr,
      esprite?.type,
      esprite !== undefined && Object.hasOwn(esprite, 'product'),
      esprite?.has('zoom'),
    ]).toStrictEqual(['robe-esprite', 'Robe Esprite', [5.5, 50], 'spot', false, true]);
    expect(rig.get(401)?.T).toBe(TYPES.spot);
  });
});
