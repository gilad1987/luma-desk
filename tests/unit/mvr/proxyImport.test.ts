// @vitest-environment jsdom
/**
 * Proxies through the whole import, and the export after it. The export writes the design only, so a file with
 * thousands of placements of empty Symdefs must export the very bytes it exports without them: no proxy shape and
 * no new element.
 */
import { strFromU8, unzipSync } from 'fflate';
import { describe, expect, it } from 'vitest';
import { exportMvr } from '../../../src/mvr/export/exportMvr.ts';
import { importMvr } from '../../../src/mvr/index.ts';
import { makeMvr, sceneXml } from '../../shared/index.ts';

const AUX = '<Symdef uuid="T" name="Part 12"><ChildList/></Symdef><Symdef uuid="C" name="Part 30"/>';
const symbol = (symdef: string, x: number, y: number, z: number): string =>
  `<Symbol uuid="s" symdef="${symdef}"><Matrix>{1,0,0}{0,1,0}{0,0,1}{${x},${y},${z}}</Matrix></Symbol>`;
const grid = (n: number, make: (i: number) => string): string => Array.from({ length: n }, (_, i) => make(i)).join('');
const WALL = grid(20, (i) => symbol('T', (i % 5) * 500, 9000, 1000 + Math.floor(i / 5) * 500));
const ROWS = grid(24, (i) => symbol('C', (i % 8) * 540, -4000 - Math.floor(i / 8) * 950, 0));
const LONE = symbol('C', 90000, 0, 0);
const FIXTURE =
  '<Fixture uuid="F1" name="Light"><Matrix>{1,0,0}{0,1,0}{0,0,1}{1000,5000,6000}</Matrix><GDTFSpec>Ghost@Wash</GDTFSpec>' +
  '<GDTFMode>Std</GDTFMode><FixtureID>1</FixtureID></Fixture>';

/** The file with `wall` and `rows` as the `<Geometries>` of two objects on two layers. */
const mvr = (wall: string, rows: string): Uint8Array =>
  makeMvr(
    sceneXml(
      `<Layer uuid="L1" name="Layer A"><ChildList>${FIXTURE}<SceneObject uuid="O1" name="Unit 1"><Geometries>${wall}` +
        `</Geometries></SceneObject></ChildList></Layer><Layer uuid="L2" name="Layer B"><ChildList>` +
        `<SceneObject uuid="O2" name="Unit 2"><Geometries>${rows}</Geometries></SceneObject></ChildList></Layer>`,
      AUX,
    ),
  );

describe('proxies in an import', () => {
  it('classifies every placement and words the summary, with counts that sum to the placements', async () => {
    const result = await importMvr(mvr(WALL, ROWS + LONE), { name: 'Plot.mvr' });
    const proxies = result.geometry.proxies ?? [];
    expect(proxies).toHaveLength(45);
    expect(proxies.filter((p) => p.kind === 'panel').map((p) => p.layer)).toEqual(Array(20).fill('L1'));
    expect(proxies.filter((p) => p.kind === 'seat')).toHaveLength(24);
    expect(result.warnings.filter((w) => w.code === 'empty-symdef').map((w) => w.message)).toEqual([
      '20 LED panels and 24 seats are shown as proxies; their size is inferred from spacing.',
      '1 object of 1 symbol has no geometry in the file and is not shown.',
    ]);
    expect(result.geometry.placements).toEqual([]);
    expect(result.summary.placementCount).toBe(0);
  });

  it('turns the seats toward the stage', async () => {
    const result = await importMvr(mvr(WALL, ROWS), { name: 'Plot.mvr' });
    const seat = (result.geometry.proxies ?? []).find((p) => p.kind === 'seat');
    expect([seat?.frame?.[4], seat?.frame?.[5], seat?.frame?.[6]]).toEqual([0, 1, 0]);
  });

  it('exports the same bytes with and without the placements, and no proxy reaches the scene', async () => {
    const withProxies = await importMvr(mvr(WALL, ROWS + LONE), { name: 'Plot.mvr' });
    const without = await importMvr(mvr('', ''), { name: 'Plot.mvr' });
    expect(without.geometry.proxies).toBeUndefined();
    const exported = exportMvr(withProxies.design);
    expect(exported.bytes).toEqual(exportMvr(without.design).bytes);
    const files = unzipSync(exported.bytes);
    expect(Object.keys(files)).toEqual(['GeneralSceneDescription.xml']);
    const xml = strFromU8(files['GeneralSceneDescription.xml'] ?? new Uint8Array());
    expect(xml).not.toMatch(/<Symbol|Part 12|Part 30|proxy|inferred|pitch/i);
    expect(JSON.stringify(withProxies.design)).toEqual(JSON.stringify(without.design));
  });
});
