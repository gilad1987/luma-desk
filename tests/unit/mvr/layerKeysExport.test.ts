// @vitest-environment jsdom
/**
 * The plain export writes a layer's own file uuid, not the desk's key (`L-A#1`, `#2`), and a made uuid for a layer the
 * file gave none, so another reader gets valid uuids. Its luma data still names the same hidden layers for the next
 * import. The saved show keeps the file uuid, and a show saved before it parses as before.
 */
import { describe, expect, it } from 'vitest';
import type { StageDesign } from '../../../src/domain/stage/StageDesign.ts';
import { parseStageDesign } from '../../../src/domain/stage/parse/parseStageDesign.ts';
import { exportMvr, importMvr } from '../../../src/mvr/index.ts';
import { makeMvr, sceneXml } from '../../shared/index.ts';

const UUID = /^[0-9A-F]{8}-[0-9A-F]{4}-[0-9A-F]{4}-[0-9A-F]{4}-[0-9A-F]{12}$/i;
const FILE = makeMvr(
  sceneXml(`<Layer uuid="11111111-2222-4333-8444-555555555555" name="Front"><ChildList/></Layer>
  <Layer uuid="11111111-2222-4333-8444-555555555555" name="Back"><ChildList/></Layer>
  <Layer name="Loose"><ChildList/></Layer>`),
);

/** The design of the file with the second and the third layer hidden. */
async function hiddenTwo(): Promise<StageDesign> {
  const { design } = await importMvr(FILE, { name: 'Show.mvr' });
  const { mvr } = design;
  if (!mvr) throw new Error('the import has no MVR facts');
  const hiddenLayers = mvr.layers.slice(1, 3).map((layer) => layer.uuid);
  return { ...design, mvr: { ...mvr, hiddenLayers } };
}

describe('layer keys in the plain export', () => {
  it('write valid uuids and bring the same two layers back hidden', async () => {
    const design = await hiddenTwo();
    const { bytes } = exportMvr(design);
    const back = (await importMvr(bytes, { name: 'Show.mvr' })).design.mvr;
    const names = back?.layers.filter((layer) => back.hiddenLayers.includes(layer.uuid)).map((layer) => layer.name);
    expect(names).toEqual(['Back', 'Loose']);
    expect(back?.layers.slice(0, 3).every((layer) => UUID.test(layer.fileUuid ?? layer.uuid))).toBe(true);
    // the made uuid is the same in two exports of one design
    expect(exportMvr(design).bytes).toEqual(bytes);
  });

  it('keep the file uuid in a saved show, and parse a show saved before it', async () => {
    const design = await hiddenTwo();
    const stored: unknown = JSON.parse(JSON.stringify(design));
    const parsed = parseStageDesign(stored);
    expect(parsed.ok && parsed.design.mvr?.layers).toEqual(design.mvr?.layers);
    const old = { ...design, mvr: { ...design.mvr, layers: [{ uuid: 'L-A', name: 'Front' }] } };
    const parsedOld = parseStageDesign(JSON.parse(JSON.stringify(old)));
    expect(parsedOld.ok && parsedOld.design.mvr?.layers).toEqual([{ uuid: 'L-A', name: 'Front' }]);
  });
});
