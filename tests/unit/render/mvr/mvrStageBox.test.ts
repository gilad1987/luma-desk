/**
 * The camera frames the stage box (decision S3): the shown, non-hall layers plus the fixtures near them; a
 * fixtures-only file is framed by its fixtures and an LED-only file by its meshes. Beams land only on shown meshes.
 */
import { describe, expect, it } from 'vitest';
import type { StageDesign, StageFixture } from '../../../../src/domain/stage/StageDesign';
import { createTemplate } from '../../../../src/domain/stage/templates';
import type { LayerBox, MvrGeometry } from '../../../../src/mvr/index';
import { mvrCameraBounds } from '../../../../src/render/mvr/mvrCameraBounds';
import { mvrSurfaces } from '../../../../src/render/mvr/mvrSurfaces';

const template = createTemplate('festival');
const model = template.fixtures[0];
if (!model) throw new Error('the festival template has no fixture');
const at = (x: number, y: number, z: number): StageFixture => ({ ...model, position: [x, y, z] });
const layer = (id: string, min: LayerBox['box']['min'], max: LayerBox['box']['max']): LayerBox => ({
  layer: id,
  name: id,
  box: { min, max },
  rig: false,
});

/** A 20 m x 10 m set 8 m high, and a 100 m x 100 m hall around it. */
const SET = layer('set', [-10, 0, -10], [10, 8, 0]);
const HALL = layer('hall', [-50, 0, -60], [50, 20, 40]);
const RIG = [at(-8, 7, -5), at(8, 7, -5)];

const design = (fixtures: readonly StageFixture[], hiddenLayers: readonly string[] = []): StageDesign => ({
  ...template,
  fixtures: [...fixtures],
  mvr: { layers: [], hiddenLayers, offset: [0, 0, 0] } as unknown as NonNullable<StageDesign['mvr']>,
});
const geometry = (layers: readonly LayerBox[], hallLayers: readonly string[] = []): MvrGeometry => ({
  placements: [],
  offset: [0, 0, 0],
  bounds: { min: [-50, 0, -60], max: [50, 20, 40] },
  surfaces: [
    { min: [-10, 0, -10], max: [10, 1, 0], face: 'top' },
    { min: [-50, 0, -60], max: [50, 0.1, 40], face: 'top' },
  ],
  layers,
  hallLayers,
});

describe('mvrCameraBounds: the stage box', () => {
  it('frames the set and leaves out two fixtures 16 m in front of it', () => {
    const box = mvrCameraBounds(design([...RIG, at(-2, 3, 16), at(2, 3, 16)]), geometry([SET]));
    expect(box).toEqual({ min: [-10, 0, -10], max: [10, 8, 0] });
  });

  it('leaves out a hall layer and a hidden layer', () => {
    expect(mvrCameraBounds(design(RIG), geometry([SET, HALL], ['hall']))).toEqual(SET.box);
    expect(mvrCameraBounds(design(RIG, ['hall']), geometry([SET, HALL]))).toEqual(SET.box);
  });

  it('frames an LED-only file without fixtures by its meshes', () => {
    expect(mvrCameraBounds(design([]), geometry([SET]))).toEqual(SET.box);
  });

  it('frames a fixtures-only file by its main fixture group', () => {
    const rig = [-12, -6, 0, 6, 12].map((x) => at(x, 9, -6));
    const box = mvrCameraBounds(design([...rig, at(0, 3, 40)]), geometry([]));
    expect(box.max[2]).toBeLessThan(40);
    expect(box.min[0]).toBeLessThanOrEqual(-12);
    expect(box.max[0]).toBeGreaterThanOrEqual(12);
  });
});

describe('mvrSurfaces of hidden layers', () => {
  it('drops the tops of a hidden layer and keeps the shown set inside it', () => {
    const tops = (hidden: readonly string[]): number =>
      mvrSurfaces(design(RIG, hidden), geometry([SET, HALL])).length -
      mvrSurfaces(design(RIG, hidden), { ...geometry([]), surfaces: [] }).length;
    expect(tops([])).toBe(2);
    expect(tops(['hall'])).toBe(1);
    expect(tops(['hall', 'set'])).toBe(0);
  });
});
