import { isEmpty, type Aabb, type Point3 } from '../math/Aabb';

/**
 * How far (metres, on plan) a fixture may stand outside the meshes and still belong to the stage. Side, drop and
 * floor positions of a rig stand within a few metres of its set; front-of-house and delay positions stand much
 * further out (a measured plot put its FOH pair 16 m in front of every mesh) and would stretch the stage box.
 */
const OUTLIER_METRES = 8;

/** How far a point lies outside a box along one axis; 0 inside. */
const outside = (box: Aabb, p: Point3, axis: 0 | 2): number =>
  Math.max(box.min[axis] - p[axis], p[axis] - box.max[axis], 0);

/**
 * The fixtures that belong to the stage of `meshBox` (three frame): those at most `OUTLIER_METRES` outside it on plan
 * (x and z; height does not count, as hung fixtures sit high over a low set). With no mesh every fixture belongs.
 */
export function nearFixtures(points: readonly Point3[], meshBox: Aabb): readonly Point3[] {
  if (isEmpty(meshBox)) return points;
  return points.filter((p) => Math.max(outside(meshBox, p, 0), outside(meshBox, p, 2)) <= OUTLIER_METRES);
}
