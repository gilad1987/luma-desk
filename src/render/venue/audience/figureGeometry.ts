import { BufferGeometry, Float32BufferAttribute } from 'three';
import { armStations, phoneRings } from './arms';
import type { FigureSpec } from './FigureSpec';
import { hairStations } from './hair';
import { headPivot, headRings, skullBack } from './head';
import { legStations } from './legs';
import { limbRings } from './limb';
import { loft, type FigureMesh } from './loft';
import { trunkRings } from './trunk';

/** The two levels of detail: `near` for figures close to the camera, `far` for the rows behind them. */
export type Detail = 'near' | 'far';

/** Sides of the cross-sections per level. The head carries the face, so it gets the most; `extra` is hair and phone. */
const SIDES = {
  near: { trunk: 8, head: 12, arm: 5, leg: 5, extra: 5 },
  far: { trunk: 5, head: 5, arm: 3, leg: 3, extra: 0 },
} as const;
/** The rings the far level keeps: seat, shoulders, collar and neck top; jaw, eyes, upper skull and crown. */
const FAR_TRUNK = [0, 4, 5, 7] as const;
const FAR_HEAD = [1, 4, 7, 8] as const;
/** A phone is a slab: four sides. */
const PHONE_SIDES = 4;

const kept = <T>(all: readonly T[], keep: readonly number[]): T[] => keep.flatMap((i) => all[i] ?? []);

/**
 * One seated figure as one geometry: torso with neck, head, two arms and two legs, and near the camera the hanging
 * hair and the phone. Each part is a closed lofted surface; the parts run into each other like the limbs of a body,
 * so under opaque light they read as one skin. `aPart` is the colour mask and shade of each vertex, `aHead` marks
 * the vertices that turn with the head; normals are smoothed over the shared vertices of each part.
 */
export function figureGeometry(spec: FigureSpec, detail: Detail): BufferGeometry {
  const near = detail === 'near';
  const sides = SIDES[detail];
  const mesh: FigureMesh = { positions: [], parts: [], heads: [], index: [] };
  const [trunk, head, pivot] = [trunkRings(spec), headRings(spec), headPivot(spec)];
  loft(mesh, near ? trunk : kept(trunk, FAR_TRUNK), sides.trunk);
  loft(mesh, near ? head : kept(head, FAR_HEAD), sides.head, pivot);
  for (const side of [1, -1] as const) {
    loft(mesh, limbRings(armStations(spec, side, near), side), sides.arm);
    loft(mesh, limbRings(legStations(spec, side, near), side), sides.leg);
  }
  const hair = near ? hairStations(spec.hair, skullBack(spec)) : undefined;
  if (hair) loft(mesh, limbRings(hair, 1), sides.extra, pivot);
  if (near && spec.arms === 'phone') loft(mesh, phoneRings(spec), PHONE_SIDES);
  const geometry = new BufferGeometry();
  geometry.setAttribute('position', new Float32BufferAttribute(mesh.positions, 3));
  geometry.setAttribute('aPart', new Float32BufferAttribute(mesh.parts, 2));
  geometry.setAttribute('aHead', new Float32BufferAttribute(mesh.heads, 4));
  geometry.setIndex(mesh.index);
  geometry.computeVertexNormals();
  return geometry;
}
