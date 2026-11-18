import { InstancedMesh, Matrix4, type Mesh, type Vector3 } from 'three';
import { ledFrontOf } from './ledFront';
import { directionsOf, type StageSides } from './ledStageSides';

/** Most instances a front is worked out for; a mesh with more keeps every face lit and the import stays quick. */
const MOST_INSTANCES = 64;

/**
 * The instanced meshes whose instances agree on no front. Their search is the costly one (every face of up to
 * `MOST_INSTANCES` instances), and a layer mark or a screen walk asks again on every `setLedLayers`; the answer
 * stays "no front" while the mesh lives, as the desk never moves the instances of a file mesh.
 */
const noFront = new WeakSet<Mesh>();

/**
 * The front of `mesh` on the stage with these `sides`. An instanced mesh draws all its instances with one material,
 * so it has a front only when its instances agree on one; otherwise undefined, and every face emits.
 */
export function meshFront(mesh: Mesh, sides: StageSides): Vector3 | undefined {
  if (noFront.has(mesh)) return undefined;
  const judge = directionsOf(mesh, sides);
  if (!(mesh instanceof InstancedMesh)) return ledFrontOf(mesh, judge);
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
