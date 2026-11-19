import type { Material, Object3D } from 'three';

/**
 * What a mesh is for a beam that meets it close to its lens (`OwnRigPass`). `rig` is the structure a fixture hangs
 * in: the light goes around its chords. `solid` is a thing a beam always lands on: a person, a deck, a wall, a
 * drape or screen. `unknown` has no evidence, and the footprint of the beam decides.
 */
export const RIG_KIND = { unknown: 0, rig: 1, solid: 2 } as const;

/** The key in `material.userData` under which a class look names its scenery class (`SceneryLooks`). */
export const CLASS_KEY = 'sceneryClass';

const KINDS: Readonly<Record<string, number>> = {
  truss: RIG_KIND.rig,
  scaffold: RIG_KIND.rig,
  figure: RIG_KIND.solid,
  deck: RIG_KIND.solid,
  wall: RIG_KIND.solid,
  cloth: RIG_KIND.solid,
};

/**
 * The kind of a mesh from the class of its material: the import decided the class from the file's own data (the
 * MVR element tag, the class and layer names), which says more than the size of the mesh. A speaker and a mesh
 * with no class look stay `unknown`.
 */
export function rigKindOf(node: Object3D & { material?: Material | Material[] }): number {
  const material = Array.isArray(node.material) ? node.material[0] : node.material;
  const name: unknown = material?.userData[CLASS_KEY];
  return typeof name === 'string' ? (KINDS[name] ?? RIG_KIND.unknown) : RIG_KIND.unknown;
}
