import type { GdtfNode } from '../../../mvr/gdtf/GdtfBody';

/** A tree with more beams than this is a pixel unit: its beams are cells of one face, not lamps with a housing. */
const PIXEL_BEAMS = 8;

/** The archive paths of every model file the tree names. */
export function modelPaths(node: GdtfNode, into = new Set<string>()): Set<string> {
  if (node.model?.path) into.add(node.model.path);
  for (const child of node.children) modelPaths(child, into);
  return into;
}

export function countBeams(node: GdtfNode): number {
  return node.children.reduce((count, child) => count + countBeams(child), node.beam ? 1 : 0);
}

function hasAxis(node: GdtfNode): boolean {
  return node.role !== 'fixed' || node.children.some(hasAxis);
}

/**
 * A `GeometryReference` that stands for one pixel of a pixel unit. Nothing under it is drawn: a bar with 166 cells
 * would cost a mesh per cell, and the housing already shows the face. A reference with an axis is a head, not a pixel.
 */
export function isPixelReference(node: GdtfNode, beams: number): boolean {
  return beams > PIXEL_BEAMS && node.type === 'GeometryReference' && !hasAxis(node);
}

/** Whether the model of a part is drawn: not the beam cells of a pixel unit, not a pigtail and not a wiring object. */
export function isDrawn(node: GdtfNode, beams: number): boolean {
  if (!node.model) return false;
  if (node.tag === 'WiringObject' || node.model.primitiveType === 'Pigtail') return false;
  return !(beams > PIXEL_BEAMS && node.beam !== undefined);
}
