import { InstancedMesh, Matrix4, Vector3, type Mesh } from 'three';
import { ledFrontOf } from './ledFront';
import { partMesh, partsOf } from './ledMeshParts';
import { partWalls } from './ledPartWalls';
import { directionsOf, type StageSides } from './ledStageSides';

/** Most instances a front is worked out for; a mesh with more keeps every face lit and the import stays quick. */
const MOST_INSTANCES = 64;

/** The least cosine between a face and the front at which the face emits (`ledFace` in `ledShader`). */
const EMITS = 0.5;

/**
 * A wall with less front area than this share of the largest wall's is trim (a top cap, an end sheet), not a
 * screen: it may not cancel the front. A wall is the parts that face one way and touch (`partWalls`), so the
 * cabinets of a tiled wall add up to a screen, and caps apart or facing other ways do not.
 */
const TRIM_SHARE = 0.15;

/**
 * The meshes whose instances or parts agree on no front. Their search is the costly one (every face of every
 * instance or part), and a layer mark or a screen walk asks again on every `setLedLayers`; the answer stays
 * "no front" while the mesh lives, as the desk never moves the instances or the merged parts of a file mesh.
 */
const noFront = new WeakSet<Mesh>();

/** The area of the triangles in `corners` (nine numbers per triangle) as seen from `front`. */
function frontArea(corners: Float32Array, front: Vector3): number {
  const [p, q, r] = [new Vector3(), new Vector3(), new Vector3()];
  let area = 0;
  for (let i = 0; i + 8 < corners.length; i += 9) {
    p.fromArray(corners, i);
    q.fromArray(corners, i + 3).sub(p);
    r.fromArray(corners, i + 6).sub(p);
    area += Math.max(0, q.cross(r).dot(front) / 2);
  }
  return area;
}

/**
 * `front` if every wall of the connected parts of `mesh` that is a screen emits to it, else undefined. Static
 * scenery merges the screens of one material into one mesh, and one front would leave a screen that faces another
 * way dark. A wall is a screen when its area seen from its own front is at least `TRIM_SHARE` of the largest wall's.
 */
function agreed(mesh: Mesh, sides: StageSides, front: Vector3): Vector3 | undefined {
  mesh.updateWorldMatrix(true, false);
  const parts = partsOf(mesh, mesh.matrixWorld);
  if (parts.length < 2) return front;
  const world = new Matrix4();
  const walls = partWalls(
    parts.map((corners) => {
      const one = partMesh(corners);
      const own = ledFrontOf(one, { ...directionsOf(one, sides), world });
      return { corners, own, area: frontArea(corners, own) };
    }),
  );
  const largest = walls.reduce((most, { area }) => Math.max(most, area), 0);
  const apart = walls.some(({ front: own, area }) => area >= TRIM_SHARE * largest && own.dot(front) < EMITS);
  if (apart) noFront.add(mesh);
  return apart ? undefined : front;
}

/**
 * The front of `mesh` on the stage with these `sides`. An instanced mesh draws all its instances with one material,
 * and a merged mesh all its parts, so it has a front only when they agree on one; otherwise undefined, and every
 * face emits.
 */
export function meshFront(mesh: Mesh, sides: StageSides): Vector3 | undefined {
  if (noFront.has(mesh)) return undefined;
  const judge = directionsOf(mesh, sides);
  if (!(mesh instanceof InstancedMesh)) return agreed(mesh, sides, ledFrontOf(mesh, judge));
  if (mesh.count > MOST_INSTANCES) return undefined;
  mesh.updateWorldMatrix(true, false);
  let front: Vector3 | undefined;
  const at = new Matrix4();
  for (let i = 0; i < mesh.count; i += 1) {
    mesh.getMatrixAt(i, at);
    const one = ledFrontOf(mesh, { ...judge, world: at.premultiply(mesh.matrixWorld) });
    if (front && front.dot(one) < 0.99) {
      noFront.add(mesh);
      return undefined;
    }
    front ??= one;
  }
  return front;
}
