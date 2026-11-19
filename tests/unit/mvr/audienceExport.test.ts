// @vitest-environment jsdom
/**
 * The audience and the export. The figures are an addition of the desk on the seat proxies of the render scene. The
 * export writes the design only, so a stage with its audience built must export the very bytes it exported before,
 * and no word of the audience may reach the scene description.
 */
import { strFromU8, unzipSync } from 'fflate';
import { Group, InstancedMesh } from 'three';
import { expect, it } from 'vitest';
import { audienceControl } from '../../../src/app/mvr/audienceControl.ts';
import { exportMvr } from '../../../src/mvr/export/exportMvr.ts';
import { importMvr } from '../../../src/mvr/index.ts';
import { addProxyMeshes } from '../../../src/render/mvr/proxies.ts';
import { addAudience } from '../../../src/render/venue/audience/addAudience.ts';
import { makeMvr, sceneXml } from '../../shared/index.ts';

const symbol = (x: number, y: number): string =>
  `<Symbol uuid="s" symdef="C"><Matrix>{1,0,0}{0,1,0}{0,0,1}{${x},${y},0}</Matrix></Symbol>`;
const ROWS = Array.from({ length: 40 }, (_, i) => symbol((i % 8) * 540, -4000 - Math.floor(i / 8) * 950)).join('');
const FIXTURE =
  '<Fixture uuid="F1" name="Light"><Matrix>{1,0,0}{0,1,0}{0,0,1}{1000,5000,6000}</Matrix><GDTFSpec>Ghost@Wash</GDTFSpec>' +
  '<GDTFMode>Std</GDTFMode><FixtureID>1</FixtureID></Fixture>';
const FILE = makeMvr(
  sceneXml(
    `<Layer uuid="L1" name="Layer A"><ChildList>${FIXTURE}</ChildList></Layer><Layer uuid="L2" name="Layer B">` +
      `<ChildList><SceneObject uuid="O2" name="Unit 2"><Geometries>${ROWS}</Geometries></SceneObject></ChildList></Layer>`,
    '<Symdef uuid="C" name="Part 30"/>',
  ),
);

it('exports the same bytes with the audience built, and the summary counts the figures on screen', async () => {
  const result = await importMvr(FILE, { name: 'Plot.mvr' });
  const design = JSON.stringify(result.design);
  const before = exportMvr(result.design).bytes;
  const layers = new Map<string, Group>();
  addProxyMeshes(layers, result.geometry);
  const root = new Group().add(...layers.values());
  const figures = addAudience(root);
  const control = audienceControl(result.geometry.proxies, () => undefined);
  expect([figures, control?.seats([]), control?.figures(0.85, [])]).toEqual([34, 40, 34]);
  const after = exportMvr(result.design).bytes;
  expect(after).toEqual(before);
  expect(JSON.stringify(result.design)).toEqual(design);
  const xml = strFromU8(unzipSync(after)['GeneralSceneDescription.xml'] ?? new Uint8Array());
  expect(xml).not.toMatch(/audience|figure|occupancy/i);
  // The audience keeps its layers until the stage frees them; free them, so the next test file starts clean.
  root.traverse((node) => {
    if (node instanceof InstancedMesh) node.dispose();
  });
});
