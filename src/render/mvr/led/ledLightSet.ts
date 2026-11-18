import { BufferAttribute, BufferGeometry, Mesh, MeshBasicMaterial, SpotLight, type Object3D } from 'three';
import { LED_FRAME_MESH } from './ledStageSides';

/** More lights would cost every lit fragment; the four walls that count most carry nearly all the light. */
export const MAX_WALL_LIGHTS = 4;

/** The fixed set of wall lights and the mesh that syncs them. */
export interface LightSet {
  readonly lights: readonly SpotLight[];
  readonly beacon: Mesh;
}

/**
 * Makes the set. The lights are always in the scene, dark when unused, so the light count never changes and no lit
 * program compiles again when a wall comes or goes. The mesh is one hidden point-sized triangle that is never
 * culled: the renderer calls `onFrame` through it on every frame, also when no wall draws.
 */
export function makeLightSet(onFrame: () => void): LightSet {
  const lights = Array.from({ length: MAX_WALL_LIGHTS }, () => new SpotLight(0xffffff, 0, 0, 1.45, 1, 2));
  const geometry = new BufferGeometry().setAttribute('position', new BufferAttribute(new Float32Array(9), 3));
  const hidden = new MeshBasicMaterial({ colorWrite: false, depthWrite: false, depthTest: false });
  const beacon = new Mesh(geometry, hidden);
  beacon.name = LED_FRAME_MESH;
  beacon.frustumCulled = false;
  beacon.onBeforeRender = onFrame;
  return { lights, beacon };
}

/** Every object of the set, as it hangs in the scene: the mesh, the lights and their targets. */
export const nodesOf = ({ lights, beacon }: LightSet): Object3D[] => [
  beacon,
  ...lights,
  ...lights.map((light) => light.target),
];

/** The top group above `node` that is not the scene: it outlives layer changes, so the lights hang there. */
export function rootOf(node: Object3D): Object3D {
  let at = node;
  while (at.parent && !('isScene' in at.parent)) at = at.parent;
  return at;
}
