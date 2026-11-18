import { Matrix4 } from 'three';
import type { GdtfNode } from '../../../mvr/gdtf/GdtfBody';
import type { Section } from './GdtfBodyProto';
import { toAppMatrix } from './gdtfFrame';
import type { PlacedGeometry } from './mergePlain';
import { find, nodeAt } from './treeNodes';
import { countBeams, isDrawn, isPixelReference } from './nodeDrawable';

/** The geometry of one part with the transform that fits it to its model size; undefined draws nothing for it. */
export type PartGeometry = (node: GdtfNode) => PlacedGeometry | undefined;

/** The origin frame of one beam in the frame of its section, with its GDTF `BeamRadius` in metres (0: none). */
export interface BeamAt {
  readonly at: Matrix4;
  readonly within: Section;
  readonly radius: number;
}

/** What one pass over a geometry tree finds: the parts of each rigid section and the frames of the joints. */
export interface TreeWalk {
  readonly parts: Record<Section, PlacedGeometry[]>;
  panAt: Matrix4;
  tiltAt: Matrix4;
  hasPan: boolean;
  hasTilt: boolean;
  /** The frame of the beam origin in the frame of `lensIn`; undefined when the tree names no beam. */
  lensAt: Matrix4 | undefined;
  lensIn: Section;
  beamRadius: number;
  /** Every beam of the tree, the cells of a pixel unit included. */
  readonly beams: BeamAt[];
  extraAxes: number;
}

interface Targets {
  readonly pan: GdtfNode | undefined;
  readonly tilt: GdtfNode | undefined;
  readonly beam: GdtfNode | undefined;
  readonly beams: number;
  readonly geometryOf: PartGeometry;
}

/** Where a part is visited: the frame of its parent in `section`, and whether a pixel reference above hides it. */
interface Scope {
  readonly frame: Matrix4;
  readonly section: Section;
  readonly hidden: boolean;
}

function visit(node: GdtfNode, scope: Scope, t: Targets, out: TreeWalk): void {
  let frame = scope.frame.clone().multiply(toAppMatrix(node.position)),
    section = scope.section;
  if (node === t.pan) {
    out.panAt = frame;
    out.hasPan = true;
    section = 'yoke';
    frame = new Matrix4();
  } else if (node === t.tilt) {
    out.tiltAt = frame;
    out.hasTilt = true;
    section = 'head';
    frame = new Matrix4();
  } else if (node.role !== 'fixed') out.extraAxes++;
  const hidden = scope.hidden || isPixelReference(node, t.beams);
  const part = !hidden && isDrawn(node, t.beams) ? t.geometryOf(node) : undefined;
  if (part) out.parts[section].push({ geometry: part.geometry, matrix: frame.clone().multiply(part.matrix) });
  if (node.beam) out.beams.push({ at: frame, within: section, radius: node.beam.beamRadius });
  if (node === t.beam) {
    out.lensAt = frame;
    out.lensIn = section;
    out.beamRadius = node.beam?.beamRadius ?? 0;
  }
  for (const child of node.children) visit(child, { frame, section, hidden }, t, out);
}

/**
 * Sorts the drawn parts of a tree into its rigid sections. The desk drives one pan and one tilt: the first pan axis
 * and the first tilt axis under it (the first tilt of the tree without a pan). Every other axis stays at rest inside
 * its section and is counted in `extraAxes`. Each joint starts a new section whose frame is the axis frame, so the
 * joint group turns the section about the real axis.
 */
export function walkTree(root: GdtfNode, beamPath: readonly number[] | undefined, geometryOf: PartGeometry): TreeWalk {
  const pan = find(root, 'pan'),
    tilt = find(pan ?? root, 'tilt');
  const out: TreeWalk = {
    parts: { base: [], yoke: [], head: [] },
    panAt: new Matrix4(),
    tiltAt: new Matrix4(),
    hasPan: false,
    hasTilt: false,
    lensAt: undefined,
    lensIn: 'base',
    beamRadius: 0,
    beams: [],
    extraAxes: 0,
  };
  const targets = { pan, tilt, beam: nodeAt(root, beamPath), beams: countBeams(root), geometryOf };
  visit(root, { frame: new Matrix4(), section: 'base', hidden: false }, targets, out);
  return out;
}
