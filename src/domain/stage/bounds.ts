import { Box3, Quaternion, Vector3 } from 'three';
import type { StageDesign, StageScreen } from './StageDesign';
import type { StageTruss, TrussParams } from './trussTypes';
import type { StageBounds, Vec3 } from './types';

/** The axis a side screen turns about by its `yaw`. */
const UP = new Vector3(0, 1, 0);

/**
 * The box around the whole design (G7): the deck joined with every truss end point, every LED wall and side screen
 * corner and every fixture position. The camera views fit to it, so a small deck fills the view and a large one,
 * with side screens far out to the sides, is not cut off. With `scenery.ledWall` off the LED wall and side screens
 * are not drawn, so they do not count.
 */
export function boundsOf(d: StageDesign): StageBounds {
  const box = new Box3(new Vector3(d.deck.x0, 0, d.deck.z0), new Vector3(d.deck.x1, d.deck.height, d.deck.z1));
  for (const t of d.trusses) for (const p of trussPoints(t)) box.expandByPoint(p);
  const screens = d.scenery.ledWall ? d.screens : [];
  for (const s of screens) for (const p of screenPoints(s)) box.expandByPoint(p);
  for (const f of d.fixtures) box.expandByPoint(new Vector3(...f.position));
  return { min: box.min.toArray(), max: box.max.toArray() };
}

/**
 * The world points that enclose a truss: its local points (`localPoints`), turned by the transform rotation, then
 * moved to its position. The camera fit and the mirror's left/right test share it, so both judge a truss by the
 * same extents.
 */
export function trussPoints({ transform, params }: StageTruss): Vector3[] {
  const rotation = transform.rotation ? new Quaternion(...transform.rotation) : null;
  const position = new Vector3(...transform.position);
  return localPoints(params).map((p) => {
    const v = new Vector3(...p);
    if (rotation) v.applyQuaternion(rotation);
    return v.add(position);
  });
}

/** The corners of an LED wall and of its side screens; a side screen is centred on `at` and turned by `yaw` about Y. */
function screenPoints(s: StageScreen): Vector3[] {
  const wall = [new Vector3(s.x0, s.y0, s.z), new Vector3(s.x1, s.y1, s.z)];
  const sides = (s.sides ?? []).flatMap(({ at, yaw, width, height }) =>
    corners([-width / 2, -height / 2, 0], [width / 2, height / 2, 0]).map((p) =>
      new Vector3(...p).applyAxisAngle(UP, yaw).add(new Vector3(...at)),
    ),
  );
  return [...wall, ...sides];
}

/**
 * The local points that enclose a truss shape. A circle lies flat in x/z around its centre, a goalpost stands on its
 * base centre with the posts at ±width/2, and a roof is a box centred on its position. Corners of the enclosing box
 * are used, so the result still encloses the shape after a rotation.
 */
function localPoints(params: TrussParams): Vec3[] {
  switch (params.kind) {
    case 'straight':
    case 'tower':
      return [params.a, params.b];
    case 'circle':
      return corners([-params.radius, 0, -params.radius], [params.radius, 0, params.radius]);
    case 'goalpost':
      return corners([-params.width / 2, 0, 0], [params.width / 2, params.height, 0]);
    case 'roof': {
      const [x, y, z] = params.size;
      return corners([-x / 2, -y / 2, -z / 2], [x / 2, y / 2, z / 2]);
    }
  }
}

/** The eight corners of the box from `lo` to `hi`. */
function corners(lo: Vec3, hi: Vec3): Vec3[] {
  return [lo[0], hi[0]].flatMap((x) => [lo[1], hi[1]].flatMap((y) => [lo[2], hi[2]].map((z): Vec3 => [x, y, z])));
}
