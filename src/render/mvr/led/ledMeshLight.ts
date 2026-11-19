import type { Mesh, Object3D, Vector3 } from 'three';
import { joinExtents } from './ledExtentJoin';
import { addWallSources, type WallSource } from './ledLightPool';
import { axesOf, worldExtents, type WallExtent } from './ledMeshExtents';

/** The call that takes the light sources of a marked mesh out again. */
const removers = new WeakMap<Object3D, () => void>();

/** The light source of one wall of `mesh`, from its extent on the wall axes of `front`. */
function sourceOf(mesh: Mesh, { low, high }: WallExtent, front: Vector3): WallSource {
  const { right, up } = axesOf(front);
  const [width, height] = [high.x - low.x, high.y - low.y];
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
 * stage in front of it. Each wall of the mesh gets a source of its own, as merged scenery or instances hold walls
 * apart; one box round them all would put a wide light in the gap. The tiles of one wall (the cabinets of a video
 * wall) join into one wall (`joinExtents`), so the wall gets one light of its full area. A wall's source is its
 * extent on the wall axes of `front` (`worldExtents`), so a turned wall is measured along itself: its width along the
 * wall, its height, and a point 0.3 m in front of its middle. `origin` is the wall coordinate of its lower left corner
 * in the mapping the shader draws (`uLedFront`), so the light has the colour of the content on this wall.
 */
export function lightMesh(mesh: Mesh, front: Vector3): void {
  unlightMesh(mesh);
  const sources = joinExtents(worldExtents(mesh, front)).map((extent) => sourceOf(mesh, extent, front));
  if (sources.length > 0) removers.set(mesh, addWallSources(sources));
}

/** Takes the light sources of `mesh` out: its mark is gone, or its stage is. */
export function unlightMesh(mesh: Object3D): void {
  removers.get(mesh)?.();
  removers.delete(mesh);
}
