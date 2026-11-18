/**
 * Stage closure drapes: a layer whose every placed mesh is named as a drape (Vectorworks "Soft Goods", curtain, drape,
 * or the Hebrew words) starts hidden like the hall, is named in the hidden-layers line, and stays in the data.
 */
import { describe, expect, it } from 'vitest';
import { isDrapePlacement } from '../../../src/mvr/design/isDrapePlacement.ts';
import { layerBoxes } from '../../../src/mvr/design/layerBoxes.ts';
import { toStageDesign } from '../../../src/mvr/design/toStageDesign.ts';
import { makeScene, mvrMatrix } from '../../shared/index.ts';

const drape = (name: string, symdef?: string) => isDrapePlacement({ name, ...(symdef ? { symdef } : {}) });

describe('isDrapePlacement', () => {
  it('reads drape names in English and Hebrew, in the object or its symbol', () => {
    const names = ['Soft Goods', 'SoftGoods', 'Black Curtain', 'drapes 2', 'Drapery', 'וילון', 'סגירות', 'מסך בד'];
    for (const name of names) expect(drape(name), name).toBe(true);
    expect(drape('Geometry', 'Side Drape 6m')).toBe(true);
  });

  it('does not read a soft light, a goods lift, an LED screen or a plain object as a drape', () => {
    for (const name of ['Soft Light', 'Goods Lift', 'מסך', 'LED Panel', 'Geometry', '']) {
      expect(drape(name), name).toBe(false);
    }
  });
});

/** A 10 m deck, a side closure drape layer and a mixed layer of a drape and a riser. */
const MESHES = new Map([
  ['deck.3ds', { min: [-5000, -5000, 0], max: [5000, 5000, 1000] } as const],
  ['drape.3ds', { min: [-6000, -5000, 0], max: [-5800, 5000, 8000] } as const],
  ['riser.3ds', { min: [-1000, 0, 1000], max: [1000, 2000, 1400] } as const],
]);
const placement = (file: string, layer: string, name: string) => ({
  file,
  layer,
  layerName: `Layer ${layer}`,
  kind: 'SceneObject',
  name,
  uuid: `${layer}-${name}`,
  matrix: mvrMatrix(undefined),
});
const scene = makeScene({
  layers: ['l1', 'l2', 'l3'].map((uuid) => ({ uuid, name: `Layer ${uuid}` })),
  placements: [
    placement('deck.3ds', 'l1', 'Stage Deck'),
    placement('drape.3ds', 'l2', 'Soft Goods'),
    placement('drape.3ds', 'l2', 'Curtain'),
    placement('drape.3ds', 'l3', 'Soft Goods'),
    placement('riser.3ds', 'l3', 'Riser'),
  ],
});

describe('a layer of drapes only', () => {
  it('is flagged by layerBoxes; a layer with any other object is not', () => {
    const boxes = layerBoxes(scene.placements, MESHES);
    expect(boxes.map((box) => [box.layer, box.drapes])).toEqual([
      ['l1', false],
      ['l2', true],
      ['l3', false],
    ]);
  });

  it('starts hidden, is named in the hidden-layers line and keeps its placements', () => {
    const result = toStageDesign({ name: 'Show.mvr', scene, fixtures: [], meshBoxes: MESHES });
    expect(result.design.mvr?.hiddenLayers).toEqual(['l2']);
    const notes = result.warnings.filter((w) => w.code === 'hidden-layers').map((w) => w.message);
    expect(notes).toEqual([
      'Layers hidden at the start as the venue hall or stage drapes (turn them on in the layer list): Layer l2.',
    ]);
    expect(result.geometry.placements.filter((p) => p.layer === 'l2')).toHaveLength(2);
  });
});
