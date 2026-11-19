/**
 * Owns the rule that the imported MVR/GDTF facts stop on a fixture with a catalogue product: the facts describe the
 * file's product, so a product fixture is exported and shown with its base type's GDTF. It does not own the position
 * after a round trip (tests/unit/mvr/productRoundTrip.test.ts) or the body scale (tests/unit/mvr/productMount.test.ts).
 */
import { describe, expect, it } from 'vitest';
import { TYPES } from '../../../../src/domain/fixtureTypes/index.ts';
import { setFixtureProps } from '../../../../src/domain/stage/edit/itemOps.ts';
import { importedGdtfInfo } from '../../../../src/domain/stage/importedGdtfInfo.ts';
import type { MvrDesignInfo, MvrFixtureInfo } from '../../../../src/domain/stage/mvr.ts';
import type { StageFixture } from '../../../../src/domain/stage/StageDesign.ts';
import { gdtfIdentity } from '../../../../src/mvr/export/gdtfIdentity.ts';
import { sampleDesign } from './edit/sampleDesign.ts';

const SPOT_ID = 401;
const mount = 'floor';
const info: MvrFixtureInfo = {
  uuid: 'u-401',
  layer: 'l-1',
  gdtfName: 'Acme@Foo.gdtf',
  gdtfMode: 'Mode 2',
  type: 'spot',
  bodySize: 0.9,
};
const mvr: MvrDesignInfo = { fixtures: { [String(SPOT_ID)]: info }, layers: [], hiddenLayers: [], offset: [0, 0, 0] };

describe('imported GDTF facts and catalogue products', () => {
  it('gives the imported facts back for a spot with no product', () => {
    expect(importedGdtfInfo({ id: SPOT_ID, type: 'spot' }, mvr)).toBe(info);
  });

  it('gives no imported facts for a spot with a product', () => {
    expect(importedGdtfInfo({ id: SPOT_ID, type: 'spot', product: 'robe-esprite' }, mvr)).toBeUndefined();
  });

  it("exports the base type's GDTF once an imported spot gets a product", () => {
    const d = sampleDesign();
    const spot: StageFixture = { id: SPOT_ID, type: 'spot', role: 'floor', trussId: null, position: [0, 1, 0], mount };
    const imported = { ...d, fixtures: [...d.fixtures, spot], mvr };
    const edited = setFixtureProps(imported, SPOT_ID, { product: 'robe-esprite' });
    const fixture = edited.fixtures.find((f) => f.id === SPOT_ID);
    expect(fixture && gdtfIdentity(fixture, edited.mvr)).toStrictEqual({
      spec: TYPES.spot.gdtfSpec,
      mode: TYPES.spot.gdtfMode,
      imported: false,
    });
  });
});
