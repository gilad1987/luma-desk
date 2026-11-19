import { Matrix4, Vector3, type BufferGeometry } from 'three';
import type { GdtfNode } from '../../../mvr/gdtf/GdtfBody';
import { SECTIONS, type GdtfBodyProto, type Section } from './GdtfBodyProto';
import { lensFace } from './lensFace';
import { mergePlain, trianglesOf } from './mergePlain';
import { walkTree, type PartGeometry } from './walkTree';

type Sections = Partial<Record<Section, BufferGeometry>>;

/**
 * Builds the shared prototype of one geometry tree: one merged geometry per rigid section, the joint frames, the
 * lens and the point the beam turns about. Undefined when the tree draws nothing (no part has a mesh or a size).
 */
export function buildProto(
  root: GdtfNode,
  beamPath: readonly number[] | undefined,
  geometryOf: PartGeometry,
  trustBeam: boolean,
): GdtfBodyProto | undefined {
  const walk = walkTree(root, beamPath, geometryOf);
  const sections: Sections = {};
  let triangles = 0;
  for (const section of SECTIONS) {
    const merged = mergePlain(walk.parts[section]);
    if (!merged) continue;
    sections[section] = merged;
    triangles += trianglesOf(merged);
  }
  if (triangles === 0) return undefined;
  const lens = lensFace(walk, sections, trustBeam);
  const headAt = walk.panAt.clone().multiply(walk.tiltAt);
  const toRoot: Record<Section, Matrix4> = { base: new Matrix4(), yoke: walk.panAt, head: headAt };
  const aimAt = new Vector3().setFromMatrixPosition(
    walk.hasTilt ? headAt : toRoot[lens.within].clone().multiply(lens.at),
  );
  const depth = -new Vector3().setFromMatrixPosition(lens.at).y;
  return {
    ...sections,
    panAt: walk.panAt,
    tiltAt: walk.tiltAt,
    moving: walk.hasPan || walk.hasTilt,
    lensAt: lens.at,
    lensIn: lens.within,
    ...(lens.discs ? { lensDiscs: lens.discs } : {}),
    lensRadius: lens.radius,
    lensOff: walk.hasTilt && lens.within === 'head' ? Math.max(0, depth) : 0,
    aimAt,
    extraAxes: walk.extraAxes,
    triangles,
  };
}
