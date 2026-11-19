// @vitest-environment jsdom
/**
 * Owns what the MVR export writes for a product fixture until Phase C5 gives products their own GDTF: the Esprite
 * names its base type's GDTF (the FORTE), and the import reads it back as a spot that still carries the product
 * through the luma link. Where the fixture lands after the round trip is owned by `productRoundTrip.test.ts`.
 */
import { describe, expect, it } from 'vitest';
import { TYPES } from '../../../../src/domain/fixtureTypes/index.ts';
import type { StageDesign } from '../../../../src/domain/stage/StageDesign.ts';
import { exportMvr } from '../../../../src/mvr/export/exportMvr.ts';
import { importMvr } from '../../../../src/mvr/index.ts';
import { PIPE, sampleDesign } from '../../domain/stage/edit/sampleDesign.ts';

/** The sample design plus one hung Esprite on the pipe, id 501. */
function withEsprite(): StageDesign {
  const d = sampleDesign();
  const esprite = {
    id: 501,
    type: 'spot',
    role: 'mid',
    trussId: PIPE.id,
    position: [-4, 7, 0],
    mount: 'hang',
    product: 'robe-esprite',
  } as const;
  return { ...d, fixtures: [...d.fixtures, esprite] };
}

describe('MVR export of a product fixture', () => {
  it('names the base type GDTF for an Esprite and reads it back as a spot with its product', async () => {
    const back = await importMvr(exportMvr(withEsprite()).bytes, { name: 'round trip' });
    const fixture = back.design.fixtures.find((f) => f.id === 501);
    expect([back.design.mvr?.fixtures['501']?.gdtfName, fixture?.type, fixture?.product]).toStrictEqual([
      TYPES.spot.gdtfSpec,
      'spot',
      'robe-esprite',
    ]);
  });
});
