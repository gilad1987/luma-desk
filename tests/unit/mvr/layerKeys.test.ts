// @vitest-environment jsdom
/**
 * Layers that share a uuid, or have none, each get their own key, so one row of the layer list hides or marks one
 * layer. The keys follow file order, so a hidden layer saved by key comes back after an export and a new import.
 */
import { describe, expect, it } from 'vitest';
import type { StageDesign } from '../../../src/domain/stage/StageDesign.ts';
import { createTemplate } from '../../../src/domain/stage/templates/index.ts';
import { exportMvr, importMvr } from '../../../src/mvr/index.ts';
import { layerKeys } from '../../../src/mvr/scene/layerKeys.ts';
import { walkScene } from '../../../src/mvr/scene/walkScene.ts';
import { parseXml } from '../../../src/mvr/xml/parseXml.ts';
import { sceneXml } from '../../shared/index.ts';

const geo = (uuid: string): string =>
  `<SceneObject uuid="${uuid}"><Geometries><Geometry3D fileName="${uuid}.glb"/></Geometries></SceneObject>`;

const SCENE = sceneXml(`
  <Layer uuid="L-A" name="Front"><ChildList>${geo('S1')}<Fixture uuid="F1"><FixtureID>1</FixtureID></Fixture>
  </ChildList></Layer>
  <Layer uuid="L-A" name="Back"><ChildList>${geo('S2')}<Fixture uuid="F2"><FixtureID>2</FixtureID></Fixture>
  </ChildList></Layer>
  <Layer name="Loose"><ChildList>${geo('S3')}</ChildList></Layer>
  <Layer uuid="L-B" name="Own"><ChildList>${geo('S4')}</ChildList></Layer>`);

describe('layer keys', () => {
  it('keep a unique uuid and the first of a shared one, and number the rest by file order', () => {
    expect(layerKeys(['A', 'A', '', 'B', 'A', ''])).toEqual(['A', 'A#1', '#2', 'B', 'A#4', '#5']);
  });

  it('never give a key that is another layer uuid of the file', () => {
    expect(layerKeys(['A', 'A', 'A#1'])).toEqual(['A', 'A#1#', 'A#1']);
  });

  it('are the layer of every placement and fixture, and the file uuid stays apart', () => {
    const scene = walkScene(parseXml(SCENE));
    expect(scene.layers).toEqual([
      { uuid: 'L-A', name: 'Front' },
      { uuid: 'L-A#1', name: 'Back', fileUuid: 'L-A' },
      { uuid: '#2', name: 'Loose', fileUuid: '' },
      { uuid: 'L-B', name: 'Own' },
    ]);
    expect(scene.placements.map((p) => [p.uuid, p.layer])).toEqual([
      ['S1', 'L-A'],
      ['S2', 'L-A#1'],
      ['S3', '#2'],
      ['S4', 'L-B'],
    ]);
    expect(scene.fixtures.map((f) => f.layer)).toEqual(['L-A', 'L-A#1']);
  });

  it('give one warning for all the layers that share a uuid or have none', () => {
    const warnings = walkScene(parseXml(SCENE)).warnings.filter((w) => w.code === 'shared-layer-uuid');
    expect(warnings.map((w) => w.message)).toEqual([
      '3 layers share a uuid or have none; the desk tells them apart by their order.',
    ]);
  });

  it('bring the same one of two same-uuid layers back hidden after an export and an import', async () => {
    const layers = [
      { uuid: 'L-A', name: 'Front' },
      { uuid: 'L-A', name: 'Back' },
    ];
    const base: StageDesign = createTemplate('festival');
    const plain = { ...base, mvr: { fixtures: {}, layers, hiddenLayers: [], offset: [0, 0, 0] as const } };
    const original = exportMvr(plain).bytes;
    const first = await importMvr(original, { name: 'Show.mvr' });
    // the desk export adds its own part layers after the imported ones
    expect(first.design.mvr?.layers.slice(0, 2).map((layer) => layer.uuid)).toEqual(['L-A', 'L-A#1']);
    const mvr = first.design.mvr;
    if (!mvr) throw new Error('the import has no MVR facts');
    const hidden = { ...first.design, mvr: { ...mvr, hiddenLayers: ['L-A#1'] } };
    const back = await importMvr(exportMvr(hidden, { original }).bytes, { name: 'Show.mvr' });
    expect(back.design.mvr?.hiddenLayers).toEqual(['L-A#1']);
    expect(back.design.mvr?.layers.slice(0, 2)).toEqual([
      { uuid: 'L-A', name: 'Front' },
      { uuid: 'L-A#1', name: 'Back', fileUuid: 'L-A' },
    ]);
  });
});
