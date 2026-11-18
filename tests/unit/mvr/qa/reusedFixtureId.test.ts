/**
 * A deleted fixture's id is given out again (`nextIdBlock`), so the export must not give the new fixture the deleted
 * one's MVR uuid or GDTF name: the delete drops the `mvr.fixtures` entry with the fixture.
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

describe('MVR export after a fixture id is reused', () => {
  it('gives the new fixture its own uuid and GDTF name', () => {
    const d = importedRow();
    expect(sceneOf(d)).toContain(OLD_UUID);
    const reused = addFloorRow(deleteFixtures(d, [1, 2]), ROW);
    expect(reused.fixtures.map((f) => f.id)).toEqual([1, 2]);
    const xml = sceneOf(reused);
    expect([xml.includes(OLD_UUID), xml.includes('Acme@Old')]).toEqual([false, false]);
  });
});
