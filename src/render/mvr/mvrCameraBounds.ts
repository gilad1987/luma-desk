import { boundsOf } from '../../domain/stage/bounds';
import type { StageDesign } from '../../domain/stage/StageDesign';
import type { StageBounds, SurfaceBox, Vec3 } from '../../domain/stage/types';
import type { MvrGeometry } from '../../mvr/index';
import { mainRange, type AxisRange } from './mainRange';

const lowest = (a: Vec3, b: Vec3): Vec3 => [Math.min(a[0], b[0]), Math.min(a[1], b[1]), Math.min(a[2], b[2])];
const highest = (a: Vec3, b: Vec3): Vec3 => [Math.max(a[0], b[0]), Math.max(a[1], b[1]), Math.max(a[2], b[2])];
const within = (range: AxisRange, value: number): boolean => value >= range.lo && value <= range.hi;
const middle = (box: SurfaceBox, axis: 0 | 2): number => (box.min[axis] + box.max[axis]) / 2;

/**
 * The box the camera views fit to for an imported stage: the main stage group, not every object in the file. A plot
 * often holds a few objects far from the stage, such as follow spots at FOH 40 m out; a box stretched to them puts
 * the eye behind them and shrinks the stage to a third of the frame. So the fixtures count only inside the x and z
 * ranges of `mainRange` (Tukey's fences around the fixture positions, never smaller than the deck), and each scenery
 * mesh counts, whole, when its footprint centre lies inside them, so side screens and a roof just past the deck stay
 * in frame. The design's deck, trusses and screens always count, for parts the desk added after the import.
 */
export function mvrCameraBounds(design: StageDesign, geometry: MvrGeometry): StageBounds {
  const { deck, fixtures } = design;
  const xs = mainRange(
    fixtures.map((fixture) => fixture.position[0]),
    { lo: deck.x0, hi: deck.x1 },
  );
  const zs = mainRange(
    fixtures.map((fixture) => fixture.position[2]),
    { lo: deck.z0, hi: deck.z1 },
  );
  const main = fixtures.filter(({ position: [x, , z] }) => within(xs, x) && within(zs, z));
  const scenery = geometry.surfaces.filter((box) => within(xs, middle(box, 0)) && within(zs, middle(box, 2)));
  return scenery.reduce(
    (box, mesh) => ({ min: lowest(box.min, mesh.min), max: highest(box.max, mesh.max) }),
    boundsOf({ ...design, fixtures: main }),
  );
}
