// @vitest-environment jsdom
/**
 * Owns the body orientation of a desk fixture whose matrix another tool edited between a desk export and the next
 * import: the edited matrix wins over the desk pose of the luma link, for a hung unit turned over, a floor unit hung
 * and a floor unit that had the identity rotation; and the next export writes the edited matrix back unchanged.
 */
import { strFromU8, unzipSync } from 'fflate';
import { describe, expect, it } from 'vitest';
import type { Mount } from '../../../src/domain/Fixture.ts';
import type { StageDesign, StageFixture } from '../../../src/domain/stage/StageDesign.ts';
import { createTemplate } from '../../../src/domain/stage/templates/index.ts';
import type { ResolvedFixture } from '../../../src/mvr/design/DesignInput.ts';
import { toStageDesign } from '../../../src/mvr/design/toStageDesign.ts';
import { exportMvr } from '../../../src/mvr/export/exportMvr.ts';
import { applyLumaData } from '../../../src/mvr/import/applyLumaData.ts';
import { importMvr } from '../../../src/mvr/index.ts';
import type { FixtureLink, LumaStageData } from '../../../src/mvr/luma/lumaData.ts';
import { makeFixtureRecord, makeScene, makeZip } from '../../shared/index.ts';

const HANGING = '{1,0,0}{0,1,0}{0,0,1}';
const STANDING = '{1,0,0}{0,-1,0}{0,0,-1}';
/** What the file's matrix says, what the desk had at the export (the link), and the `rotation` the import must keep. */
const CASES: readonly (readonly [string, string, Mount, boolean, readonly number[] | undefined])[] = [
  ['a desk hang unit turned over in another tool', STANDING, 'hang', false, [1, 0, 0, 0]],
  ['a desk floor unit hung in another tool', HANGING, 'floor', false, [0, 0, 0, 1]],
  ['a desk floor unit with the identity rotation', HANGING, 'floor', true, [0, 0, 0, 1]],
  ['an untouched desk floor unit', STANDING, 'floor', false, undefined],
  ['an untouched desk hang unit', HANGING, 'hang', false, undefined],
  ['a hang unit whose rotation another tool reset', HANGING, 'hang', true, undefined],
];

const fixtures = CASES.map(([uuid, rotation]): ResolvedFixture => ({
  record: makeFixtureRecord({ uuid, matrix: `${rotation}{1000,2000,3000}`, layer: 'l1' }),
  type: 'spot',
  gdtfName: uuid,
  mode: 'Std',
}));
const scene = makeScene({ layers: [{ uuid: 'l1', name: 'Rig' }] });
const { design } = toStageDesign({ name: 'Edited.mvr', scene, fixtures, meshBoxes: new Map() });

/** `<FixtureID>` to `<Matrix>` text of every fixture in an exported archive. */
function matrices(xml: string): Map<string, string> {
  const blocks = xml.match(/<Fixture\b[\s\S]*?<\/Fixture>/g) ?? [];
  return new Map(
    blocks.map((block) => [/<FixtureID>(\d+)</.exec(block)?.[1] ?? '', /<Matrix>(.*?)</.exec(block)?.[1] ?? '']),
  );
}
const rows = (matrix: string | undefined): string => /^(\{[^}]*\}){3}/.exec(matrix ?? '')?.[0] ?? '';
const spot = (id: number, mount: Mount, extra: Partial<StageFixture> = {}): StageFixture => ({
  ...{ id, type: 'spot', role: mount === 'floor' ? 'floor' : 'mid', trussId: null, position: [id, 4, 0], mount },
  ...extra,
});

describe('body orientation of a desk fixture whose matrix another tool edited', () => {
  it.each(CASES.map((row, index) => ({ row, index })))('$row.0', ({ row: [, , mount, own, wanted], index }) => {
    const links = design.fixtures.map(({ id, type, role, trussId }): FixtureLink => {
      return { id, type, role, trussId, mount, ...(own ? { ownRotation: true } : {}) };
    });
    const { venue, scenery, deck, screens, risers, trusses } = design;
    const luma: LumaStageData = { venue, scenery, deck, screens, risers, trusses, offset: [0, 0, 0], links };
    const after = applyLumaData(design, luma).design.fixtures[index];
    expect([after?.mount, after?.rotation]).toEqual([mount, wanted]);
  });

  it('writes the edited matrix back unchanged: desk export, edit, import, export', async () => {
    const fixtures = [spot(1, 'hang'), spot(2, 'floor'), spot(3, 'floor', { rotation: [0, 0, 0, 1] })];
    const desk: StageDesign = { ...createTemplate('empty'), screens: [], fixtures };
    const files = unzipSync(exportMvr(desk).bytes);
    const xml = strFromU8(files['GeneralSceneDescription.xml'] ?? new Uint8Array());
    const written = matrices(xml);
    // another tool turns the hung unit over and hangs the floor unit: each takes the rotation rows of the other
    const swap = new Map([
      [written.get('1') ?? '', rows(written.get('2'))],
      [written.get('2') ?? '', rows(written.get('1'))],
    ]);
    const edited = xml.replace(/<Matrix>(.*?)</g, (all, matrix: string) => {
      const turned = swap.get(matrix);
      return turned ? `<Matrix>${turned}${matrix.slice(rows(matrix).length)}<` : all;
    });
    // unit 1 (hung on the desk) is now turned over, unit 2 (on the floor on the desk) now hangs, unit 3 is untouched
    expect(['1', '2', '3'].map((id) => rows(matrices(edited).get(id)))).toEqual([STANDING, HANGING, HANGING]);
    const archive = makeZip({ ...files, 'GeneralSceneDescription.xml': edited });
    const second = (await importMvr(archive, { name: 'Desk.mvr' })).design;
    const byId = [...second.fixtures].sort((a, b) => a.id - b.id);
    // the untouched unit 3 (a floor unit with the identity rotation) is where the desk had it, in millimetres
    const [x = NaN, y = NaN, z = NaN] = byId[2]?.position ?? [];
    expect(Math.hypot(x - 3, y - 4, z) * 1000).toBeLessThan(1.5);
    expect(byId.map((fixture) => [fixture.mount, fixture.rotation])).toEqual([
      ['hang', [1, 0, 0, 0]],
      ['floor', [0, 0, 0, 1]],
      ['floor', [0, 0, 0, 1]],
    ]);
    const again = strFromU8(unzipSync(exportMvr(second).bytes)['GeneralSceneDescription.xml'] ?? new Uint8Array());
    expect([...matrices(again)].sort()).toEqual([...matrices(edited)].sort());
  });
});
