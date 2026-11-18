/**
 * A delete keeps the design's `nextFixtureId`, so a new row takes fresh ids, and it drops the `mvr.fixtures` entry
 * with the fixture, so the export never carries the deleted fixture's MVR uuid or GDTF name.
 */
import { strFromU8, unzipSync } from 'fflate';
import { describe, expect, it } from 'vitest';
import { addFloorRow, type FloorRow } from '../../../../src/domain/stage/edit/addFixtures.ts';
import { deleteFixtures } from '../../../../src/domain/stage/edit/itemOps.ts';
import type { StageDesign } from '../../../../src/domain/stage/StageDesign.ts';
import { createTemplate } from '../../../../src/domain/stage/templates/index.ts';
import { exportMvr } from '../../../../src/mvr/export/exportMvr.ts';

const OLD_UUID = '00000000-0000-4000-8000-0000000000aa';
const ROW: FloorRow = { type: 'par', count: 2, from: [-2, 0, 2], to: [2, 0, 2] };

/** Two floor pars with ids 1 and 2, the first one imported from MVR. */
function importedRow(): StageDesign {
  const d = addFloorRow(createTemplate('empty'), ROW);
  const info = { uuid: OLD_UUID, layer: 'L', gdtfName: 'Acme@Old', gdtfMode: 'Std', type: 'par' } as const;
  return { ...d, mvr: { fixtures: { '1': info }, layers: [], hiddenLayers: [], offset: [0, 0, 0] } };
}

const sceneOf = (d: StageDesign): string =>
  strFromU8(unzipSync(exportMvr(d).bytes)['GeneralSceneDescription.xml'] ?? new Uint8Array());

describe('MVR export after a fixture is deleted and a new row is added', () => {
  it('gives the new fixtures fresh ids and neither the old uuid nor the old GDTF name', () => {
    const d = importedRow();
    expect(sceneOf(d)).toContain(OLD_UUID);
    const added = addFloorRow(deleteFixtures(d, [1, 2]), ROW);
    expect(added.fixtures.map((f) => f.id)).toEqual([101, 102]);
    const xml = sceneOf(added);
    expect([xml.includes(OLD_UUID), xml.includes('Acme@Old')]).toEqual([false, false]);
  });
});
