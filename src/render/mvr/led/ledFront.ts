import { Vector3, type Matrix4, type Mesh } from 'three';

const [a, b, c] = [new Vector3(), new Vector3(), new Vector3()];

/**
 * The most triangles the face search reads. Its cost is triangles times face groups, and a curved wall has a group
 * per few facets, so a detailed model of 100k triangles froze the page for seconds. An LED wall in a file is a box
 * or a faceted sheet of at most a few thousand triangles; a mesh above this is a detailed model, which faces the
 * audience as the plain rule says, without the search.
 */
export const MOST_FRONT_TRIANGLES = 50_000;

/** The triangles of `mesh`, as the face search counts them. */
function triangles(mesh: Mesh): number {
  const index = mesh.geometry.getIndex();
  return Math.floor((index ? index.count : mesh.geometry.getAttribute('position').count) / 3);
}

/** Calls `visit` with the normal of every triangle of `mesh` under `world`, as long as the triangle's area. */
function eachFace(mesh: Mesh, world: Matrix4, visit: (areaNormal: Vector3) => void): void {
  const position = mesh.geometry.getAttribute('position');
  const index = mesh.geometry.getIndex();
  const count = index ? index.count : position.count;
  for (let i = 0; i + 2 < count; i += 3) {
    const corners = [a, b, c].map((corner, k) =>
      corner.fromBufferAttribute(position, index ? index.getX(i + k) : i + k).applyMatrix4(world),
    );
    const [p, q, r] = corners;
    if (p && q && r) visit(q.sub(p).cross(r.sub(p)).multiplyScalar(0.5));
  }
}

/** The faces of a mesh that look one way (within about 25 degrees): the sum of their area normals, and their area. */
interface FaceGroup {
  readonly sum: Vector3;
  area: number;
}
const SAME_FACE = 0.9;
/** A face group turned further from the audience than this is a back. */
const AWAY = -0.1;

/** What the front of a mesh is judged by: the level direction to the audience, and the way to the stage middle. */
export interface FrontJudge {
  readonly toAudience: Vector3;
  readonly inward?: Vector3;
  /** The world matrix to read the mesh under; the mesh's own when missing. */
  readonly world?: Matrix4;
}

/**
 * The front of an LED wall that the file holds as a mesh: the one world direction it emits to. The rule: the faces
 * are grouped by direction, and the front is the largest face group on the audience side, where a group counts its
 * area times (0.25 + its cosine to the audience), so the wide face of a solid wins over its top and ends, and the
 * wide face of a screen that stands side-on wins over its thin edge; of two equal faces the one toward the stage
 * middle wins. Groups within 60 degrees of it join it, which is the mean of the facets of a gently curved wall. Top,
 * bottom, ends and back stay a dark cabinet. A mesh with only faces that look away is an open sheet drawn from
 * behind: its largest face, turned round. The same axis gives the wall one content mapping, with no jump at folds.
 */
export function ledFrontOf(mesh: Mesh, judge: FrontJudge): Vector3 {
  const { toAudience, inward = toAudience } = judge;
  if (triangles(mesh) > MOST_FRONT_TRIANGLES) return toAudience.clone();
  const groups: FaceGroup[] = [];
  if (!judge.world) mesh.updateWorldMatrix(true, false);
  eachFace(mesh, judge.world ?? mesh.matrixWorld, (areaNormal) => {
    const area = areaNormal.length();
    if (area <= 0) return;
    const group = groups.find((g) => g.sum.dot(areaNormal) > SAME_FACE * g.sum.length() * area);
    if (group) group.area += area;
    (group?.sum ?? new Vector3()).add(areaNormal);
    if (!group) groups.push({ sum: areaNormal.clone(), area });
  });
  const score = ({ sum, area }: FaceGroup): number => {
    const facing = sum.dot(toAudience) / sum.length();
    return facing < AWAY ? 0 : area * (0.25 + Math.max(0, facing)) * (1 + (0.01 * sum.dot(inward)) / sum.length());
  };
  const [best] = [...groups].sort((p, q) => score(q) - score(p));
  if (!best) return toAudience.clone();
  if (score(best) === 0) {
    const [largest = best] = [...groups].sort((p, q) => q.area - p.area);
    return largest.sum.clone().normalize().negate();
  }
  const front = new Vector3();
  for (const { sum } of groups) if (sum.dot(best.sum) > 0.5 * sum.length() * best.sum.length()) front.add(sum);
  return front.normalize();
}
