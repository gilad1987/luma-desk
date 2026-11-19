// @vitest-environment jsdom
/**
 * Owns what the MVR export writes for a product fixture until Phase C5 gives products their own GDTF: the Esprite
 * names its base type's GDTF (the FORTE), and the import reads it back as a spot. The product the luma link carries,
 * and where the fixture lands after the round trip, are owned by `productRoundTrip.test.ts`.
 */
import { describe, expect, it } from 'vitest';
import { TYPES } from '../../../../src/domain/fixtureTypes/index.ts';
import { exportMvr } from '../../../../src/mvr/export/exportMvr.ts';
import { importMvr } from '../../../../src/mvr/index.ts';
import { withEsprite } from '../../domain/stage/edit/sampleDesign.ts';

describe('MVR export of a product fixture', () => {
  it('names the base type GDTF for an Esprite and reads it back as a spot', async () => {
    const back = await importMvr(exportMvr(withEsprite()).bytes, { name: 'round trip' });
    const fixture = back.design.fixtures.find((f) => f.id === 501);
    expect([back.design.mvr?.fixtures['501']?.gdtfName, fixture?.type]).toStrictEqual([TYPES.spot.gdtfSpec, 'spot']);
  });
});
