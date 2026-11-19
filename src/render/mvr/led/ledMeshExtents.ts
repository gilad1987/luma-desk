import { InstancedMesh, Matrix4, Vector3, type Mesh } from 'three';
import { partsOf } from './ledMeshParts';

/** The extent of a part on the wall axes, in metres: x along the wall's right, y along its up, z along its front. */
export interface WallExtent {
  readonly low: Vector3;
  readonly high: Vector3;
}

interface WallAxes {
  readonly right: Vector3;
  readonly up: Vector3;
  readonly front: Vector3;
}

/** The wall axes of a mesh with this `front`, as the shader maps its content (`uLedFront`). */
export function axesOf(front: Vector3): WallAxes {
  const flat = Math.abs(front.y) > 0.9;
  const right = flat ? new Vector3(1, 0, 0) : new Vector3(front.z, 0, -front.x).normalize();
  return { right, up: new Vector3().crossVectors(front, right).normalize(), front };
}

/** The extent of `corners` (three numbers per corner) moved by `world`; undefined for a part with no wall face. */
export function extentOf(corners: Float32Array, world: Matrix4 | undefined, axes: WallAxes): WallExtent | undefined {
  const { right, up, front } = axes;
  const [low, high] = [new Vector3(Infinity, Infinity, Infinity), new Vector3(-Infinity, -Infinity, -Infinity)];
  const [point, along] = [new Vector3(), new Vector3()];
  for (let i = 0; i + 2 < corners.length; i += 3) {
    point.fromArray(corners, i);
    if (world) point.applyMatrix4(world);
    along.set(point.dot(right), point.dot(up), point.dot(front));
    low.min(along);
    high.max(along);
  }
  return high.x > low.x && high.y > low.y ? { low, high } : undefined;
}

/** The eight corners of the box round `corners`, three numbers per corner. */
function boxOf(corners: Float32Array): Float32Array {
  const [low, high] = [new Vector3(Infinity, Infinity, Infinity), new Vector3(-Infinity, -Infinity, -Infinity)];
  const point = new Vector3();
  for (let i = 0; i + 2 < corners.length; i += 3) {
    point.fromArray(corners, i);
    low.min(point);
    high.max(point);
  }
  return Float32Array.from(
    [0, 1, 2, 3, 4, 5, 6, 7].flatMap((k) => [k & 1 ? high.x : low.x, k & 2 ? high.y : low.y, k & 4 ? high.z : low.z]),
  );
}

/**
 * The extents on the wall axes of `front` of the connected parts of `mesh` in the world: of the mesh, or of each
 * instance of an instanced mesh. The instances share one geometry, so its parts are found once, and each instance
 * moves only the eight corners of each part's box: the part search welds and joins every triangle, too slow to run
 * once per instance. A mirrored instance moves its box as well as any other, so it is measured where it stands.
 */
export function worldExtents(mesh: Mesh, front: Vector3): WallExtent[] {
  mesh.updateWorldMatrix(true, false);
  const axes = axesOf(front);
  if (!(mesh instanceof InstancedMesh)) {
    return partsOf(mesh, mesh.matrixWorld).flatMap((part) => extentOf(part, undefined, axes) ?? []);
  }
  const boxes = partsOf(mesh, new Matrix4()).map(boxOf);
  const at = new Matrix4();
  return Array.from({ length: mesh.count }, (_, i) => {
    mesh.getMatrixAt(i, at);
    at.premultiply(mesh.matrixWorld);
    return boxes.flatMap((box) => extentOf(box, at, axes) ?? []);
  }).flat();
}
