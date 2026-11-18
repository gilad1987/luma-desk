import { describe, expect, it } from 'vitest';
import { STAGE } from '../../../src/domain/venue.ts';
import type { ResolvedFixture } from '../../../src/mvr/design/DesignInput.ts';
import { toStageDesign } from '../../../src/mvr/design/toStageDesign.ts';
import type { Aabb } from '../../../src/mvr/math/Aabb.ts';
import { makeFixtureRecord, makeScene, mvrMatrix } from '../../shared/index.ts';

/** A 10 m x 10 m deck and, around it, a 30 m x 30 m hall shell whose layer name says nothing. */
const MESHES = new Map([
  ['deck.3ds', { min: [-5000, -5000, 0], max: [5000, 5000, 1000] } as const],
  ['shell.3ds', { min: [-15000, -20000, 0], max: [15000, 10000, 6000] } as const],
]);
const placement = (file: string, layer: string, layerName: string) => ({
  file,
  layer,
  layerName,
  kind: 'SceneObject',
  name: file,
  uuid: file,
  matrix: mvrMatrix(undefined),
});

const fixture = (uuid: string, x: number, y: number): ResolvedFixture => ({
  record: makeFixtureRecord({ uuid, matrix: `{1,0,0}{0,1,0}{0,0,1}{${x},${y},6000}`, layer: 'l1' }),
  type: 'spot',
  gdtfName: 'Spot',
  mode: 'Std',
});

/** Four rig fixtures over the deck and a front-of-house pair 25 m in front of every mesh. */
const FIXTURES = [
  fixture('a', -4000, 4000),
  fixture('b', 4000, 4000),
  fixture('c', -4000, -4000),
  fixture('d', 4000, -4000),
  fixture('foh1', -3000, -45000),
  fixture('foh2', 3000, -45000),
];

const scene = makeScene({
  layers: [
    { uuid: 'l1', name: 'Stage' },
    { uuid: 'l2', name: 'Layer 2' },
  ],
  placements: [placement('deck.3ds', 'l1', 'Stage'), placement('shell.3ds', 'l2', 'Layer 2')],
});
const result = toStageDesign({ name: 'Show.mvr', scene, fixtures: FIXTURES, meshBoxes: MESHES });

describe('toStageDesign hall layers and stage box', () => {
  it('hides the hall layer by default and says so in one summary line', () => {
    expect(result.design.mvr?.hiddenLayers).toEqual(['l2']);
    expect(result.geometry.hallLayers).toEqual(['l2']);
    const notes = result.warnings.filter((w) => w.code === 'hidden-layers');
    expect(notes.map((w) => w.message)).toEqual([
      'Layers hidden at the start as the venue hall or stage drapes (turn them on in the layer list): Layer 2.',
    ]);
  });

  it('centres the stage box, not the hall and the FOH pair, and gives no oversize warning', () => {
    expect(result.geometry.offset.map((v) => v + 0)).toEqual([0, 0, (STAGE.z0 + STAGE.z1) / 2]);
    expect(result.warnings.map((w) => w.code)).not.toContain('oversize');
  });

  it('gives render each layer box in the fitted frame', () => {
    const z = (STAGE.z0 + STAGE.z1) / 2;
    expect(result.geometry.layers.map((l) => [l.layer, l.box.min[2], l.box.max[2]])).toEqual([
      ['l1', z - 5, z + 5],
      ['l2', z - 10, z + 20],
    ]);
  });
});

/** The scene with one more layer beside the deck whose one mesh is named `name`: a drape or a plain flat. */
function withSideLayer(name: string) {
  const side = { ...placement('side.3ds', 'l3', 'Layer 3'), name };
  const layers = [...scene.layers, { uuid: 'l3', name: 'Layer 3' }];
  const sideBox: Aabb = { min: [5000, -5000, 0], max: [8000, 5000, 9000] };
  const meshBoxes = new Map<string, Aabb>([...MESHES, ['side.3ds', sideBox]]);
  const sided = { ...scene, layers, placements: [...scene.placements, side] };
  return toStageDesign({ name: 'Show.mvr', scene: sided, fixtures: FIXTURES, meshBoxes });
}

describe('toStageDesign drape layers', () => {
  it('hides a drape-only layer but keeps it in the box that sets the fit offset', () => {
    const drape = withSideLayer('Side Drape');
    const flat = withSideLayer('Side Flat');
    expect(drape.geometry.offset).toEqual(flat.geometry.offset);
    expect(drape.design.mvr?.hiddenLayers).toEqual(['l2', 'l3']);
    expect(drape.geometry.hallLayers).toEqual(['l2']);
    expect(flat.design.mvr?.hiddenLayers).toEqual(['l2']);
  });
});
