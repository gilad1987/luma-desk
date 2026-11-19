import { Box3, CircleGeometry, Matrix4, Vector3, type BufferGeometry } from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { SECTIONS, type Section } from './GdtfBodyProto';
import type { BeamAt, TreeWalk } from './walkTree';

/** Metres a lens disc sits in front of its beam origin, so it does not fight the housing for depth. */
export const LENS_GAP = 0.002;

/** The merged geometry of each rigid section that draws something. */
export type SectionGeometries = Partial<Record<Section, BufferGeometry>>;

export interface LensFace {
  /** The frame the single cone starts in, in the frame of `within`; the light leaves along its -Y. */
  readonly at: Matrix4;
  readonly within: Section;
  readonly radius: number;
  /** One disc per beam of a unit with several, in the frame of `within`; absent for a single lens. */
  readonly discs?: BufferGeometry;
}

function centroid(beams: readonly BeamAt[]): Vector3 {
  const sum = new Vector3();
  for (const beam of beams) sum.add(new Vector3().setFromMatrixPosition(beam.at));
  return sum.divideScalar(Math.max(1, beams.length));
}

/** A disc at the origin of every beam, facing along its beam, merged so the body still draws one lens mesh. */
function discsOf(beams: readonly BeamAt[], fallback: number): BufferGeometry | undefined {
  const ahead = new Matrix4().makeTranslation(0, -LENS_GAP, 0);
  const discs = beams.map((beam) =>
    new CircleGeometry(beam.radius > 0 ? beam.radius : fallback, 16)
      .rotateX(Math.PI / 2)
      .applyMatrix4(beam.at.clone().multiply(ahead)),
  );
  const merged = mergeGeometries(discs) ?? undefined;
  discs.forEach((disc) => disc.dispose());
  return merged;
}

/**
 * The lens face of a body. A tree of the maker gives it: the origin of its `Beam` geometry (GDTF: the origin of the
 * rendered beam). A unit with several beams in one section (a bar, a blinder, a pixel unit) gets a disc at every beam
 * origin, and the one cone the desk draws for a fixture starts at the centre of those origins, on the real face;
 * a cone per cell is a later feature. A CAD symbol (`Custom@`) has no beam data to trust: its lens is on the front
 * face of the head mesh (the lowest face of its box in the hanging rest pose), under the beam axis the file names
 * when that axis runs through the mesh, else under the middle of the mesh. The radius is then a third of the width.
 */
export function lensFace(walk: TreeWalk, sections: SectionGeometries, trustBeam: boolean): LensFace {
  const within = [...SECTIONS].reverse().find((section) => sections[section]) ?? 'base';
  const geometry = sections[within];
  geometry?.computeBoundingBox();
  const box = geometry?.boundingBox ?? new Box3();
  const size = box.getSize(new Vector3()),
    centre = box.getCenter(new Vector3());
  const fromBox = Math.max(0.01, Math.min(size.x, size.z) * 0.35);
  if (trustBeam && walk.lensAt) {
    const cells = walk.beams.filter((beam) => beam.within === walk.lensIn);
    const radius = walk.beamRadius > 0 ? walk.beamRadius : fromBox;
    if (cells.length < 2) return { at: walk.lensAt, within: walk.lensIn, radius };
    const discs = discsOf(cells, fromBox);
    const at = walk.lensAt.clone().setPosition(centroid(cells));
    return { at, within: walk.lensIn, radius, ...(discs ? { discs } : {}) };
  }
  const named = walk.beams.filter((beam) => beam.within === within);
  const axis = named.length > 0 ? centroid(named) : centre;
  const inside = axis.x >= box.min.x && axis.x <= box.max.x && axis.z >= box.min.z && axis.z <= box.max.z;
  const on = inside ? axis : centre;
  return { at: new Matrix4().makeTranslation(on.x, box.min.y, on.z), within, radius: fromBox };
}
