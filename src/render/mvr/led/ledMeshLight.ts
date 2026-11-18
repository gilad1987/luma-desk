import { Box3, InstancedMesh, Vector3, type Mesh, type Object3D } from 'three';
import { addWallSources } from './ledLightPool';

/** The call that takes the light source of a marked mesh out again. */
const removers = new WeakMap<Object3D, () => void>();

/** The eight corners of the mesh in the world: of its own box, or for an instanced mesh of the box of all instances. */
function corners(mesh: Mesh): Vector3[] {
  mesh.updateWorldMatrix(true, false);
  const instanced = mesh instanceof InstancedMesh;
  if (!instanced) mesh.geometry.computeBoundingBox();
  const box = instanced ? new Box3().setFromObject(mesh) : (mesh.geometry.boundingBox ?? new Box3());
  if (box.isEmpty()) return [];
  const at = (k: number, lo: number, hi: number): number => (k === 0 ? lo : hi);
  return [0, 1, 2, 3, 4, 5, 6, 7].map((i) => {
    const corner = new Vector3(
      at(i & 1, box.min.x, box.max.x),
      at(i & 2, box.min.y, box.max.y),
      at(i & 4, box.min.z, box.max.z),
    );
    return instanced ? corner : corner.applyMatrix4(mesh.matrixWorld);
  });
}

/**
 * Makes the marked `mesh` a source of wall light: a marked solid is an LED wall like a panel wall, and lights the
 * stage in front of it. The source is the face of the mesh's box on the side of `front`: its width along the wall,
 * its height, and a point 0.3 m in front of its middle. `origin` is the wall coordinate of its lower left corner in
 * the mapping the shader draws (`uLedFront`), so the light has the colour of the content on this wall.
 */
export function lightMesh(mesh: Mesh, front: Vector3): void {
  unlightMesh(mesh);
  const flat = Math.abs(front.y) > 0.9;
  const right = flat ? new Vector3(1, 0, 0) : new Vector3(front.z, 0, -front.x).normalize();
  const up = new Vector3().crossVectors(front, right).normalize();
  const [low, high] = [new Vector3(Infinity, Infinity, Infinity), new Vector3(-Infinity, -Infinity, -Infinity)];
  for (const corner of corners(mesh)) {
    const along = new Vector3(corner.dot(right), corner.dot(up), corner.dot(front));
    low.min(along);
    high.max(along);
  }
  const [width, height] = [high.x - low.x, high.y - low.y];
  if (!(width > 0 && height > 0)) return;
  const middle = right
    .clone()
    .multiplyScalar((low.x + high.x) / 2)
    .addScaledVector(up, (low.y + high.y) / 2)
    .addScaledVector(front, high.z + 0.3);
  const source = {
    position: [middle.x, middle.y, middle.z] as const,
    normal: [front.x, front.y, front.z] as const,
    width,
    height,
    seed: 0,
    origin: [low.x, low.y] as const,
    weight: width * height,
    anchor: (): Object3D => mesh,
  };
  removers.set(mesh, addWallSources([source]));
}

/** Takes the light source of `mesh` out: its mark is gone, or its stage is. */
export function unlightMesh(mesh: Object3D): void {
  removers.get(mesh)?.();
  removers.delete(mesh);
}
