/**
 * Owns the G4 slot rule: every edit op copies the design with `{ ...d, field }`, so a field it does not know (the
 * MVR `mvr` info) survives. It catches an op that rebuilds the design from a fixed field list.
 */
import { describe, expect, it } from 'vitest';
import { addFixturesOnTruss, addFloorRow } from '../../../../../src/domain/stage/edit/addFixtures.ts';
import {
  addRiser,
  removeRiser,
  setDeckSize,
  setSceneryPart,
  setVenue,
} from '../../../../../src/domain/stage/edit/deckOps.ts';
import * as items from '../../../../../src/domain/stage/edit/itemOps.ts';
import { setLedWall } from '../../../../../src/domain/stage/edit/ledWall.ts';
import { mirrorLeftToRight } from '../../../../../src/domain/stage/edit/mirror.ts';
import { addPresetTruss, moveTruss, setTrussProps } from '../../../../../src/domain/stage/edit/trussOps.ts';
import type { MvrDesignInfo } from '../../../../../src/domain/stage/mvr.ts';
import type { StageDesign } from '../../../../../src/domain/stage/StageDesign.ts';
import { sampleDesign } from './sampleDesign.ts';

/** A real `mvr` block with no fixture entries, so the delete ops, which drop the entries of deleted fixtures, keep it. */
const mvr: MvrDesignInfo = {
  fixtures: {},
  layers: [{ uuid: 'L-1', name: 'Layer 1' }],
  hiddenLayers: [],
  offset: [0, 0, 0],
};

const OPS: readonly (readonly [string, (d: StageDesign) => StageDesign])[] = [
  ['addFixturesOnTruss', (d) => addFixturesOnTruss(d, { trussId: 'pipe-1', type: 'spot', count: 3 })],
  ['addFloorRow', (d) => addFloorRow(d, { type: 'par', count: 3, from: [-3, 1, 2], to: [3, 1, 2] })],
  ['addPresetTruss', (d) => addPresetTruss(d, 'circle', [0, 8, 0])],
  ['moveTruss', (d) => moveTruss(d, 'left-1', [1, 0, 0])],
  ['setTrussProps', (d) => setTrussProps(d, 'pipe-1', { name: 'P' })],
  ['duplicateFixtures', (d) => items.duplicateFixtures(d, [101])],
  ['duplicateTruss', (d) => items.duplicateTruss(d, 'pipe-1')],
  ['deleteFixtures', (d) => items.deleteFixtures(d, [101])],
  ['deleteTruss', (d) => items.deleteTruss(d, 'pipe-1')],
  ['setFixtureProps', (d) => items.setFixtureProps(d, 101, { role: 'front' })],
  ['mirrorLeftToRight', (d) => mirrorLeftToRight(d)],
  ['setDeckSize', (d) => setDeckSize(d, { width: 8, depth: 6, height: 1 })],
  ['setLedWall on', (d) => setLedWall(d, { width: 8, height: 4 })],
  ['setLedWall off', (d) => setLedWall(setLedWall(d, { width: 8, height: 4 }), null)],
  ['addRiser', (d) => addRiser(d, [0, 1.4, 0], [2, 0.4, 2])],
  ['removeRiser', (d) => removeRiser(addRiser(d, [0, 1.4, 0], [2, 0.4, 2]), 'riser-1')],
  ['setVenue', (d) => setVenue(d, 'open-field')],
  ['setSceneryPart', (d) => setSceneryPart(d, 'crowd', true)],
];

describe('edit ops keep fields they do not know (G4)', () => {
  it.each(OPS)('%s keeps the mvr field', (_name, op) => {
    const design: StageDesign = Object.assign(sampleDesign(), { mvr });
    const edited = op(design);
    expect([edited === design, 'mvr' in edited && edited.mvr]).toEqual([false, mvr]);
  });

  it('covers every exported op of itemOps', () => {
    const covered = OPS.map(([name]) => name);
    expect(Object.keys(items).filter((name) => !covered.includes(name))).toEqual([]);
  });
});
