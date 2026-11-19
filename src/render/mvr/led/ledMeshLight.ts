import { InstancedMesh, Matrix4, Vector3, type Mesh, type Object3D } from 'three';
import { addWallSources, type WallSource } from './ledLightPool';
import { partsOf } from './ledMeshParts';

/** The call that takes the light sources of a marked mesh out again. */
const removers = new WeakMap<Object3D, () => void>();

/** The connected parts of `mesh` in the world: of the mesh, or of each instance of an instanced mesh. */
function worldParts(mesh: Mesh): Float32Array[] {
  mesh.updateWorldMatrix(true, false);
  if (!(mesh instanceof InstancedMesh)) return partsOf(mesh, mesh.matrixWorld);
  const at = new Matrix4();
  return Array.from({ length: mesh.count }, (_, i) => {
    mesh.getMatrixAt(i, at);
    return partsOf(mesh, at.premultiply(mesh.matrixWorld));
  }).flat();
}

/** The wall axes of a mesh with this `front`, as the shader maps its content (`uLedFront`). */
function axesOf(front: Vector3): { right: Vector3; up: Vector3 } {
  const flat = Math.abs(front.y) > 0.9;
  const right = flat ? new Vector3(1, 0, 0) : new Vector3(front.z, 0, -front.x).normalize();
  return { right, up: new Vector3().crossVectors(front, right).normalize() };
}

/** The light source of one part, from its corners on the wall axes; undefined for a part with no wall face. */
function sourceOf(mesh: Mesh, corners: Float32Array, front: Vector3): WallSource | undefined {
  const { right, up } = axesOf(front);
  const [low, high] = [new Vector3(Infinity, Infinity, Infinity), new Vector3(-Infinity, -Infinity, -Infinity)];
  const [point, along] = [new Vector3(), new Vector3()];
  for (let i = 0; i + 2 < corners.length; i += 3) {
    point.fromArray(corners, i);
    along.set(point.dot(right), point.dot(up), point.dot(front));
    low.min(along);
    high.max(along);
  }
  const [width, height] = [high.x - low.x, high.y - low.y];
  if (!(width > 0 && height > 0)) return undefined;
  const middle = right
    .clone()
    .multiplyScalar((low.x + high.x) / 2)
    .addScaledVector(up, (low.y + high.y) / 2)
    .addScaledVector(front, high.z + 0.3);
  return {
    position: [middle.x, middle.y, middle.z],
    normal: [front.x, front.y, front.z],
    width,
    height,
    seed: 0,
    origin: [low.x, low.y],
    weight: width * height,
    anchor: (): Object3D => mesh,
  };
}

/**
 * Makes the marked `mesh` a source of wall light: a marked solid is an LED wall like a panel wall, and lights the
 * stage in front of it. Each connected part of the mesh is a wall of its own, as merged scenery or instances hold
 * walls apart; one box round them all would put a wide light in the gap. A part's source is its extent on the wall
 * axes of `front`, read from its corners, so a turned wall is measured along itself: its width along the wall, its
 * height, and a point 0.3 m in front of its middle. `origin` is the wall coordinate of its lower left corner in
 * the mapping the shader draws (`uLedFront`), so the light has the colour of the content on this wall.
 */
export function lightMesh(mesh: Mesh, front: Vector3): void {
  unlightMesh(mesh);
  const sources = worldParts(mesh).flatMap((corners) => sourceOf(mesh, corners, front) ?? []);
  if (sources.length > 0) removers.set(mesh, addWallSources(sources));
}

/** Takes the light sources of `mesh` out: its mark is gone, or its stage is. */
export function unlightMesh(mesh: Object3D): void {
  removers.get(mesh)?.();
  removers.delete(mesh);
}
