import { gdtfBodySize, gdtfTreeSize, isVendorSymbol } from './gdtfBodySize';
import type { GdtfInfo } from './GdtfInfo';

/**
 * What a fixture body can be drawn from, best first: the GDTF meshes of the maker (`mesh`), the meshes of a CAD
 * symbol in a Vectorworks `Custom@` GDTF (`meshVendorSymbol`), one box per part from the model sizes (`boxes`), or
 * nothing from the GDTF (`none`). `suspect` has data that must not be drawn as it is; `reason` says why.
 */
export type BodyClass = 'mesh' | 'meshVendorSymbol' | 'suspect' | 'boxes' | 'none';

/** A fact about the body data that a later step must know. */
export type BodyFlag = 'bakedPose' | 'unitSuspect' | 'noMesh' | 'stub';

export interface BodyVerdict {
  readonly bodyClass: BodyClass;
  /** Only on `suspect`. */
  readonly reason?: 'bakedPose' | 'unitSuspect';
  readonly flags: readonly BodyFlag[];
}

/** What the mesh step found for the model files of one geometry tree. */
export interface MeshEvidence {
  /** At least one model file of the tree was unpacked. */
  readonly hasMesh: boolean;
  /** One of its GLB files has a root node turned off the axes (`hasBakedPose`). */
  readonly baked: boolean;
}

/**
 * The body class of one fixture. This is geometry trust only: a `Custom@` GDTF holds the real symbol geometry of the
 * CAD file, so its sizes and meshes are used, while its beam data and its type stay untrusted (`classifyFixture`).
 * `unitSuspect` is judged on the overall size, not on each model: a real fixture has parts thinner than 0.05 m (a
 * lens, a bracket), but no real fixture as a whole is outside 0.05 m to 3 m, and one model over 3 m puts the whole
 * over 3 m too. `stub` is a GDTF that has neither a sized model nor a mesh file.
 */
export function gdtfBodyClass(
  info: GdtfInfo | undefined,
  modeName: string,
  spec: string,
  mesh: MeshEvidence,
): BodyVerdict {
  if (info === undefined) return { bodyClass: 'none', flags: [] };
  if (gdtfTreeSize(info, modeName) === undefined) return { bodyClass: 'none', flags: mesh.hasMesh ? [] : ['stub'] };
  const unitSuspect = gdtfBodySize(info, modeName) === undefined;
  const flags: BodyFlag[] = [];
  if (unitSuspect) flags.push('unitSuspect');
  if (!mesh.hasMesh) flags.push('noMesh');
  if (mesh.baked) flags.push('bakedPose');
  if (unitSuspect) return { bodyClass: 'suspect', reason: 'unitSuspect', flags };
  if (!mesh.hasMesh) return { bodyClass: 'boxes', flags };
  if (mesh.baked) return { bodyClass: 'suspect', reason: 'bakedPose', flags };
  return { bodyClass: isVendorSymbol(info, spec) ? 'meshVendorSymbol' : 'mesh', flags };
}
