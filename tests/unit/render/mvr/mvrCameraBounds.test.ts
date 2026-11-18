/**
 * The camera box of an imported stage is the main stage group: a 30 m wide stage with two follow spots 40 m in front
 * is framed by the stage alone, so the FOH eye stands in front of the spots and its distance follows the stage width.
 */
import { describe, expect, it } from 'vitest';
import type { StageDesign, StageFixture } from '../../../../src/domain/stage/StageDesign';
import { createTemplate } from '../../../../src/domain/stage/templates';
import type { SurfaceBox } from '../../../../src/domain/stage/types';
import type { MvrGeometry } from '../../../../src/mvr/index';
import { fitViews } from '../../../../src/render/camera/fitViews';
import { mvrCameraBounds } from '../../../../src/render/mvr/mvrCameraBounds';

const template = createTemplate('festival');
const model = template.fixtures[0];
if (!model) throw new Error('the festival template has no fixture');
const at = (x: number, y: number, z: number): StageFixture => ({ ...model, position: [x, y, z] });

/** A 30 m x 20 m deck with 24 fixtures over it on four trusses, 12 m high. */
const STAGE: StageDesign = {
  ...template,
  deck: { x0: -15, x1: 15, z0: -20, z1: 0, height: 1.5 },
  trusses: [],
  screens: [],
  fixtures: [-18, -12, -6, -2].flatMap((z) => [-14, -9, -4, 4, 9, 14].map((x) => at(x, 12, z))),
};
/** The same stage with two follow spots on a riser 40 m in front of the deck. */
const WITH_SPOTS: StageDesign = { ...STAGE, fixtures: [...STAGE.fixtures, at(-3, 3, 40), at(3, 3, 40)] };

const box = (min: SurfaceBox['min'], max: SurfaceBox['max']): SurfaceBox => ({ min, max, face: 'top' });
const geometry = (surfaces: readonly SurfaceBox[]): MvrGeometry => ({
  placements: [],
  offset: [0, 0, 0],
  bounds: { min: [-15, 0, -20], max: [15, 15, 41] },
  surfaces,
  layers: [],
  hallLayers: [],
});

describe('mvrCameraBounds', () => {
  it('ignores two fixtures far in front of the stage', () => {
    expect(mvrCameraBounds(WITH_SPOTS, geometry([]))).toEqual(mvrCameraBounds(STAGE, geometry([])));
    expect(mvrCameraBounds(WITH_SPOTS, geometry([])).max[2]).toBe(0);
  });

  it('frames FOH from the stage width, with the eye in front of the far spots', () => {
    const views = fitViews(mvrCameraBounds(WITH_SPOTS, geometry([])));
    expect(views.foh).toEqual(fitViews(mvrCameraBounds(STAGE, geometry([]))).foh);
    expect(views.foh.position[2]).toBeLessThan(40);
  });

  it('counts a shown side screen layer whole, and not a hidden FOH tent layer', () => {
    const layer = (id: string, { min, max }: SurfaceBox) => ({
      layer: id,
      name: id,
      box: { min, max },
      rig: false,
      drapes: false,
    });
    const layers = [layer('screen', box([18, 4, -10], [24, 12, -9])), layer('tent', box([-4, 0, 38], [4, 3, 44]))];
    const hidden: StageDesign = { ...WITH_SPOTS, mvr: { ...WITH_SPOTS.mvr, hiddenLayers: ['tent'] } } as StageDesign;
    const bounds = mvrCameraBounds(hidden, { ...geometry([]), layers });
    expect(bounds.max[0]).toBe(24);
    expect(bounds.max[2]).toBe(-2);
  });

  it('keeps every fixture of a stage on one truss line, which has no spread', () => {
    const line: StageDesign = { ...STAGE, fixtures: [at(-10, 9, -5), at(0, 9, -5), at(10, 9, -5), at(0, 0.5, 2)] };
    expect(mvrCameraBounds(line, geometry([])).max[2]).toBe(2);
  });
});
