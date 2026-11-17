import { mvrMatrix } from './mvrMatrix.ts';
import type { MvrFixtureRecord, MvrScene } from '../../../src/mvr/scene/MvrScene.ts';

/** A fixture record with plain defaults; `matrix` is MVR matrix text, so tests read like the XML they mimic. */
export function makeFixtureRecord(
  fields: Partial<Omit<MvrFixtureRecord, 'matrix'>> & { readonly matrix?: string } = {},
): MvrFixtureRecord {
  const { matrix, ...rest } = fields;
  return {
    uuid: 'fixture-uuid',
    name: 'Fixture',
    fixtureId: '',
    gdtfSpec: 'Spot.gdtf',
    gdtfMode: 'Mode 1',
    addresses: [],
    layer: 'layer-1',
    ...rest,
    matrix: mvrMatrix(matrix),
  };
}

/** A scene with the given parts and no warnings, for design tests that skip the scene walk. */
export function makeScene(fields: Partial<MvrScene> = {}): MvrScene {
  return { layers: [], fixtures: [], placements: [], focusPoints: new Map(), warnings: [], ...fields };
}
