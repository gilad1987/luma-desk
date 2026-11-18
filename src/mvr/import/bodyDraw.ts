import type { GdtfNode } from '../gdtf/GdtfBody';
import type { BodyVerdict } from '../gdtf/gdtfBodyClass';
import { isShapedTree } from '../gdtf/shapedTree';

/**
 * How the desk draws a fixture body: the GDTF geometry itself (`gdtf`), the desk model of the fixture type fitted to
 * the overall box of the GDTF (`deskAtBox`), the desk model scaled as a whole to the largest GDTF dimension
 * (`deskAtSize`, what `bodySize` already does), or the desk model at its own size (`desk`).
 */
export type BodyDraw = 'gdtf' | 'deskAtBox' | 'deskAtSize' | 'desk';

/** What the draw step does with one fixture body, decided at import so the summary and the renderer agree. */
export interface BodyPlan {
  readonly draw: BodyDraw;
  /** The overall size of the geometry tree in metres on GDTF X, Y and Z; absent when no model has a size. */
  readonly box?: readonly [number, number, number];
  /** Set when `box` is not from the GDTF: the desk's product table, or its default for the fixture type. */
  readonly sizeFrom?: 'productTable' | 'typeDefault';
  /** A mover whose GDTF geometry has no pan or tilt axis: it cannot move, so the desk model stands in. */
  readonly noAxis: boolean;
  /** The tree has more pan or tilt axes than the one head the desk drives; the other heads stay at rest. */
  readonly multiHead: boolean;
}

function axes(node: GdtfNode, role: 'pan' | 'tilt'): number {
  return node.children.reduce((count, child) => count + axes(child, role), node.role === role ? 1 : 0);
}

/**
 * The plan for one fixture. A raw box per part is never drawn: it reads as a slab, not as a light. A body without a
 * mesh file whose parts name GDTF primitives is drawn as GDTF defines it, with the default shapes of the
 * specification (`isShapedTree`). Any other body without a usable mesh gets the desk model of its type, which has a
 * base, a yoke, a head and a lens, at the GDTF size. The part sizes of a baked pose are the bounds of turned meshes,
 * so only the largest one (the height) can be trusted.
 */
export function bodyDraw(
  verdict: BodyVerdict,
  root: GdtfNode | undefined,
  size: readonly [number, number, number] | undefined,
  moving: boolean,
): BodyPlan {
  const pans = root ? axes(root, 'pan') : 0,
    tilts = root ? axes(root, 'tilt') : 0;
  const shaped = verdict.bodyClass === 'boxes' && root !== undefined && isShapedTree(root);
  const meshed = shaped || verdict.bodyClass === 'mesh' || verdict.bodyClass === 'meshVendorSymbol';
  const noAxis = meshed && moving && pans + tilts === 0;
  const plan = (draw: BodyDraw): BodyPlan => ({
    draw,
    ...(size ? { box: size } : {}),
    noAxis,
    multiHead: draw === 'gdtf' && (pans > 1 || tilts > 1),
  });
  if (verdict.bodyClass === 'none' || verdict.reason === 'unitSuspect' || !size) return plan('desk');
  if (verdict.reason === 'bakedPose') return plan('deskAtSize');
  return plan(meshed && !noAxis ? 'gdtf' : 'deskAtBox');
}
