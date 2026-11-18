import type { Group, Mesh, MeshBasicMaterial, MeshStandardMaterial } from 'three';
import type { ModelMaterials } from '../modelMaterials';
import type { ModelPrimitives } from '../ModelPrimitives';

/** The shared geometry and materials a model builds from. */
export interface ModelKit {
  readonly prims: ModelPrimitives;
  readonly materials: ModelMaterials;
}

/** Static units only: `st` is the stand (turned to the fixed pan, flipped on the floor), `aim` holds the head. */
export interface StaticMount {
  readonly aim: Group;
  readonly st: Group;
}

/** One fixture being built: its group, its own body and lens materials, and the static mount if it has one. */
export interface ModelContext {
  readonly g: Group;
  readonly bodyMat: MeshStandardMaterial;
  readonly lensMat: MeshBasicMaterial;
  readonly floor: boolean;
  readonly mount: StaticMount | null;
}

/** The yoke (pans) and the tilt group inside it, for heads that move their own joints instead of the pivot. */
export interface ModelJoints {
  readonly yoke: Group;
  readonly tiltG: Group;
}

/** What a model hands back: the parts the frame update moves, colours or picks. */
export interface BuiltModel {
  readonly head: Mesh;
  readonly lens: Mesh;
  /** Distance from the group origin to the lens face, in model units. */
  readonly lensOff: number;
  readonly joints: ModelJoints | null;
  readonly pick: readonly Mesh[];
}

/** A product model: geometry made once per scene, then built into each fixture of that model. */
export interface FixtureModel<G> {
  geometry(prims: ModelPrimitives): G;
  build(kit: ModelKit, geometry: G, c: ModelContext): BuiltModel;
}

/** The static mount of a static model; a moving fixture type mapped to a static model is a rig data error. */
export function staticMount(c: ModelContext): StaticMount {
  if (!c.mount) throw new Error('This fixture model needs a static fixture type (moving: false)');
  return c.mount;
}
